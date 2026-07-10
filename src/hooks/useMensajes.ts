import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { createElement } from "react";

export type Folder = "inbox" | "unread" | "sent" | "drafts" | "important" | "archived" | "deleted" | "favorites";

export interface ThreadRow {
  id: string;
  subject: string;
  last_message_at: string;
  created_by: string;
  is_read: boolean;
  is_important: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  participants: { user_id: string; role: string; display_name: string | null; avatar_url: string | null }[];
  last_message: { body: string; sender_id: string | null; is_system: boolean; system_sender_key: string | null } | null;
}

export interface SystemSender {
  key: string;
  display_name: string;
  avatar_url: string | null;
}

export function useSystemSenders() {
  return useQuery({
    queryKey: ["msg_system_senders"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SystemSender[]> => {
      const { data } = await supabase.from("msg_system_senders").select("key, display_name, avatar_url");
      return (data || []) as SystemSender[];
    },
  });
}

export function useProfilesDirectory() {
  return useQuery({
    queryKey: ["msg_directory"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .order("display_name");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const rolesByUser = new Map<string, string[]>();
      (roles || []).forEach((r: any) => {
        if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, []);
        rolesByUser.get(r.user_id)!.push(r.role);
      });
      return (profiles || []).map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name || "(sin nombre)",
        avatar_url: p.avatar_url,
        roles: rolesByUser.get(p.user_id) || [],
      }));
    },
  });
}

export interface ThreadFilters {
  folder: Folder;
  search: string;
  searchField?: "all" | "subject" | "from" | "body";
  page?: number;
  pageSize?: number;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export function useThreads(filters: ThreadFilters) {
  const { folder, search, searchField = "all", page = 0, pageSize = 25, dateFrom, dateTo } = filters;
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    // Debounce realtime invalidations so bursts of postgres_changes
    // don't retrigger the unread query dozens of times per second.
    let t: any = null;
    const scheduleInvalidate = () => {
      if (t) return;
      t = setTimeout(() => {
        t = null;
        qc.invalidateQueries({ queryKey: ["msg_threads"] });
        qc.invalidateQueries({ queryKey: ["msg_thread"] });
        qc.invalidateQueries({ queryKey: ["msg_unread"] });
      }, 250);
    };
    const ch = supabase
      .channel("msg-rt-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "msg_messages" }, scheduleInvalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "msg_participants", filter: `user_id=eq.${user.id}` }, scheduleInvalidate)
      .subscribe();
    return () => { if (t) clearTimeout(t); supabase.removeChannel(ch); };
  }, [user?.id, qc]);


  return useQuery({
    queryKey: ["msg_threads", folder, search, searchField, page, pageSize, dateFrom, dateTo, user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<{ rows: ThreadRow[]; total: number }> => {
      if (folder === "drafts") return { rows: [], total: 0 };

      // Body search: pre-filter thread ids from messages
      let restrictThreadIds: string[] | null = null;
      const s = search.trim();
      if (s && (searchField === "body" || searchField === "all")) {
        const { data: msgs } = await supabase
          .from("msg_messages")
          .select("thread_id")
          .ilike("body", `%${s}%`)
          .limit(500);
        const ids = Array.from(new Set((msgs || []).map((m: any) => m.thread_id)));
        if (searchField === "body") restrictThreadIds = ids;
        else restrictThreadIds = ids; // we'll OR in client side via subject too
      }

      let q = supabase
        .from("msg_participants")
        .select("thread_id, is_read, is_important, is_favorite, is_archived, is_deleted, role, thread:msg_threads!inner(id, subject, last_message_at, created_by)", { count: "exact" })
        .eq("user_id", user!.id)
        .order("thread(last_message_at)", { ascending: false });

      if (folder === "deleted") q = q.eq("is_deleted", true);
      else q = q.eq("is_deleted", false);

      if (folder === "archived") q = q.eq("is_archived", true);
      else if (folder !== "deleted") q = q.eq("is_archived", false);

      if (folder === "unread") q = q.eq("is_read", false);
      if (folder === "important") q = q.eq("is_important", true);
      if (folder === "favorites") q = q.eq("is_favorite", true);
      if (folder === "sent") q = q.eq("role", "from");

      // Subject search server-side
      if (s && (searchField === "subject" || searchField === "all")) {
        q = q.ilike("thread.subject", `%${s}%`);
      }

      // Date range filter on thread last_message_at
      if (dateFrom) q = q.gte("thread.last_message_at", dateFrom);
      if (dateTo) q = q.lte("thread.last_message_at", dateTo);



      // Pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      q = q.range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;

      let rawRows = (data || []) as any[];

      // If body-search active and not pure body mode, union with subject results (already in rawRows when search hit subject)
      if (restrictThreadIds && searchField === "body") {
        rawRows = rawRows.filter((r) => restrictThreadIds!.includes(r.thread_id));
      }

      const threadIds = rawRows.map((r: any) => r.thread_id);
      if (threadIds.length === 0) return { rows: [], total: count || 0 };

      const { data: parts } = await supabase
        .from("msg_participants")
        .select("thread_id, user_id, role")
        .in("thread_id", threadIds);

      const uids = Array.from(new Set((parts || []).map((p: any) => p.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", uids.length ? uids : ["00000000-0000-0000-0000-000000000000"]);
      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));

      const { data: lastMsgs } = await supabase
        .from("msg_messages")
        .select("thread_id, body, sender_id, is_system, system_sender_key, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false });
      const lastByThread = new Map<string, any>();
      (lastMsgs || []).forEach((m: any) => {
        if (!lastByThread.has(m.thread_id)) lastByThread.set(m.thread_id, m);
      });

      let rows: ThreadRow[] = rawRows.map((r: any) => ({
        id: r.thread_id,
        subject: r.thread?.subject || "(sin asunto)",
        last_message_at: r.thread?.last_message_at,
        created_by: r.thread?.created_by,
        is_read: r.is_read,
        is_important: r.is_important,
        is_favorite: r.is_favorite,
        is_archived: r.is_archived,
        is_deleted: r.is_deleted,
        participants: (parts || [])
          .filter((p: any) => p.thread_id === r.thread_id)
          .map((p: any) => ({
            user_id: p.user_id,
            role: p.role,
            display_name: (profMap.get(p.user_id) as any)?.display_name || null,
            avatar_url: (profMap.get(p.user_id) as any)?.avatar_url || null,
          })),
        last_message: lastByThread.get(r.thread_id)
          ? {
              body: lastByThread.get(r.thread_id).body,
              sender_id: lastByThread.get(r.thread_id).sender_id,
              is_system: !!lastByThread.get(r.thread_id).is_system,
              system_sender_key: lastByThread.get(r.thread_id).system_sender_key || null,
            }
          : null,
      }));

      // Client-side filter "from" (sender display name)
      if (s && searchField === "from") {
        const sl = s.toLowerCase();
        rows = rows.filter((r) =>
          r.participants.some((p) => (p.display_name || "").toLowerCase().includes(sl))
        );
      }

      return { rows, total: count || rows.length };
    },
  });
}

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["msg_unread", user?.id],
    enabled: !!user?.id,
    // Keep the badge fresh across tabs / realtime bursts / delayed backends.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { count } = await supabase
        .from("msg_participants")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false)
        .eq("is_deleted", false)
        .eq("is_archived", false);
      return count || 0;
    },
  });
}

// Look up a thread's current `is_read` for the active user from any cached
// msg_threads page. Returns null if we don't know (skip optimistic delta then).
function readThreadFlagFromCache(
  qc: ReturnType<typeof useQueryClient>,
  threadId: string,
): { is_read: boolean; is_archived: boolean; is_deleted: boolean } | null {
  const caches = qc.getQueriesData<{ rows: ThreadRow[]; total: number }>({ queryKey: ["msg_threads"] });
  for (const [, data] of caches) {
    const row = data?.rows?.find((r) => r.id === threadId);
    if (row) return { is_read: !!row.is_read, is_archived: !!row.is_archived, is_deleted: !!row.is_deleted };
  }
  return null;
}

function computeUnreadDelta(
  before: { is_read: boolean; is_archived: boolean; is_deleted: boolean },
  patch: Partial<{ is_read: boolean; is_archived: boolean; is_deleted: boolean }>,
): number {
  const after = {
    is_read: patch.is_read ?? before.is_read,
    is_archived: patch.is_archived ?? before.is_archived,
    is_deleted: patch.is_deleted ?? before.is_deleted,
  };
  const wasUnread = !before.is_read && !before.is_archived && !before.is_deleted;
  const isUnread = !after.is_read && !after.is_archived && !after.is_deleted;
  if (wasUnread === isUnread) return 0;
  return isUnread ? 1 : -1;
}


export function useThread(threadId: string | null) {
  return useQuery({
    queryKey: ["msg_thread", threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const { data: thread } = await supabase
        .from("msg_threads")
        .select("*")
        .eq("id", threadId!)
        .maybeSingle();
      const { data: messages } = await supabase
        .from("msg_messages")
        .select("*, attachments:msg_attachments(*)")
        .eq("thread_id", threadId!)
        .order("created_at", { ascending: true });
      const { data: parts } = await supabase
        .from("msg_participants")
        .select("*")
        .eq("thread_id", threadId!);
      const uids = Array.from(new Set([
        ...(parts || []).map((p: any) => p.user_id),
        ...(messages || []).map((m: any) => m.sender_id).filter(Boolean),
      ]));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", uids.length ? uids : ["00000000-0000-0000-0000-000000000000"]);
      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      const { data: sysSenders } = await supabase.from("msg_system_senders").select("*");
      const sysMap = new Map((sysSenders || []).map((s: any) => [s.key, s]));
      return { thread, messages: messages || [], participants: parts || [], profiles: profMap, systemSenders: sysMap };
    },
  });
}

// Allowed attachment types and size limit
export const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_ATTACHMENT_MIMES = [
  "image/png","image/jpeg","image/gif","image/webp","image/svg+xml",
  "application/pdf",
  "application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain","text/csv",
  "application/zip","application/x-rar-compressed","application/x-7z-compressed",
  "video/mp4","video/webm","audio/mpeg","audio/wav",
];

export function validateAttachment(f: File): string | null {
  if (f.size > ATTACHMENT_MAX_BYTES) return `"${f.name}" supera 25 MB`;
  if (f.type && !ALLOWED_ATTACHMENT_MIMES.includes(f.type)) {
    // allow by extension fallback
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    const okExt = ["pdf","doc","docx","xls","xlsx","ppt","pptx","png","jpg","jpeg","gif","webp","svg","txt","csv","zip","rar","7z","mp4","webm","mp3","wav"];
    if (!okExt.includes(ext)) return `"${f.name}" tipo no permitido`;
  }
  return null;
}

export interface ComposePayload {
  subject: string;
  body: string;
  recipientUserIds: string[];
  files: File[];
  replyThreadId?: string | null;
}

export function useSendMessage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: ComposePayload) => {
      if (!user?.id) throw new Error("No autenticado");
      const recipients = Array.from(new Set(p.recipientUserIds.filter((u) => u && u !== user.id)));
      if (recipients.length === 0) throw new Error("Selecciona al menos un destinatario");

      // Validate files early
      for (const f of p.files) {
        const err = validateAttachment(f);
        if (err) throw new Error(err);
      }

      let threadId = p.replyThreadId || null;
      if (!threadId) {
        const { data: t, error: te } = await supabase
          .from("msg_threads")
          .insert({ subject: p.subject || "(sin asunto)", created_by: user.id })
          .select()
          .single();
        if (te) throw te;
        threadId = t.id;
        const rows = [
          { thread_id: threadId, user_id: user.id, role: "from", is_read: true, last_read_at: new Date().toISOString() },
          ...recipients.map((uid) => ({ thread_id: threadId!, user_id: uid, role: "to", is_read: false, last_read_at: null })),
        ];
        const { error: pe } = await supabase.from("msg_participants").insert(rows);
        if (pe) throw pe;
      } else {
        const { data: existing } = await supabase
          .from("msg_participants")
          .select("user_id")
          .eq("thread_id", threadId);
        const have = new Set((existing || []).map((r: any) => r.user_id));
        const toAdd = recipients.filter((r) => !have.has(r)).map((uid) => ({ thread_id: threadId!, user_id: uid, role: "to" }));
        if (toAdd.length) await supabase.from("msg_participants").insert(toAdd);
      }

      const { data: msg, error: me } = await supabase
        .from("msg_messages")
        .insert({ thread_id: threadId, sender_id: user.id, body: p.body || "", is_system: false })
        .select()
        .single();
      if (me) throw me;

      for (const f of p.files) {
        const safe = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `${threadId}/${msg.id}/${Date.now()}_${safe}`;
        const { error: ue } = await supabase.storage.from("mensajes-adjuntos").upload(path, f, { upsert: false, contentType: f.type || undefined });
        if (ue) throw ue;
        await supabase.from("msg_attachments").insert({
          message_id: msg.id, file_path: path, file_name: f.name, file_size: f.size, mime_type: f.type,
        });
      }

      return { threadId, messageId: msg.id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["msg_threads"] });
      qc.invalidateQueries({ queryKey: ["msg_unread"] });
      qc.invalidateQueries({ queryKey: ["msg_thread"] });
      qc.invalidateQueries({ queryKey: ["msg_drafts"] });
    },
  });
}

export function useUpdateFlag() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId, patch }: { threadId: string; patch: Partial<{ is_read: boolean; is_important: boolean; is_favorite: boolean; is_archived: boolean; is_deleted: boolean }> }) => {
      const body: any = { ...patch };
      if (patch.is_read) body.last_read_at = new Date().toISOString();
      const { error } = await supabase
        .from("msg_participants")
        .update(body)
        .eq("thread_id", threadId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["msg_threads"] });
      qc.invalidateQueries({ queryKey: ["msg_unread"] });
      qc.invalidateQueries({ queryKey: ["msg_thread"] });
    },
  });
}

export function useBulkUpdateFlags() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadIds, patch }: { threadIds: string[]; patch: Partial<{ is_read: boolean; is_important: boolean; is_favorite: boolean; is_archived: boolean; is_deleted: boolean }> }) => {
      if (!threadIds.length) return { updatedIds: [] as string[], skippedIds: [] as string[], error: null as string | null };
      const body: any = { ...patch };
      if (patch.is_read) body.last_read_at = new Date().toISOString();
      // RLS on msg_participants only allows updating rows where user_id = auth.uid();
      // the .eq(user_id) is defense-in-depth so a stale threadIds list can never affect other participants.
      const { data, error } = await supabase
        .from("msg_participants")
        .update(body)
        .in("thread_id", threadIds)
        .eq("user_id", user!.id)
        .select("thread_id");
      if (error) return { updatedIds: [] as string[], skippedIds: threadIds, error: error.message };
      const updatedIds = (data || []).map((r: any) => r.thread_id as string);
      const updatedSet = new Set(updatedIds);
      const skippedIds = threadIds.filter((id) => !updatedSet.has(id));
      return { updatedIds, skippedIds, error: null as string | null };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["msg_threads"] });
      qc.invalidateQueries({ queryKey: ["msg_unread"] });
      qc.invalidateQueries({ queryKey: ["msg_thread"] });
    },
  });
}

export function useDrafts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["msg_drafts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("msg_drafts")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      return data || [];
    },
  });
}

export function useSaveDraft() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; subject: string; body: string; recipientUserIds: string[]; replyThreadId?: string | null }) => {
      const row = {
        user_id: user!.id,
        subject: p.subject,
        body: p.body,
        recipients: p.recipientUserIds,
        reply_thread_id: p.replyThreadId ?? null,
      };
      if (p.id) {
        const { error } = await supabase.from("msg_drafts").update(row).eq("id", p.id);
        if (error) throw error;
        return p.id;
      }
      const { data, error } = await supabase.from("msg_drafts").insert(row).select().single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["msg_drafts"] }),
  });
}

export function useDeleteDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("msg_drafts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["msg_drafts"] }),
  });
}

export async function getAttachmentUrl(path: string) {
  const { data } = await supabase.storage.from("mensajes-adjuntos").createSignedUrl(path, 60 * 10);
  return data?.signedUrl || null;
}

// Mass recipient helpers
export function useOfertasForMessaging() {
  return useQuery({
    queryKey: ["msg_ofertas"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("sem_ofertas")
        .select("id, materia:sem_materias(id, nombre, codigo), periodo:sem_periodos(id, nombre)")
        .order("id", { ascending: false })
        .limit(200);
      return (data || []).map((o: any) => ({
        id: o.id,
        label: `${o.materia?.nombre || "Materia"}${o.materia?.codigo ? " (" + o.materia.codigo + ")" : ""} — ${o.periodo?.nombre || ""}`,
      }));
    },
  });
}

export function useProgramasForMessaging() {
  return useQuery({
    queryKey: ["msg_programas"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("sem_programas").select("*").order("nombre");
      return (data || []) as any[];
    },
  });
}

export async function fetchRecipientsByOferta(ofertaId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("msg_recipients_by_oferta", { _oferta_id: ofertaId });
  if (error) throw error;
  return (data || []).map((r: any) => r.user_id);
}

export async function fetchRecipientsByPrograma(programaId: string, semestre?: number | null): Promise<string[]> {
  const { data, error } = await supabase.rpc("msg_recipients_by_programa", { _programa_id: programaId, _semestre: semestre ?? null });
  if (error) throw error;
  return (data || []).map((r: any) => r.user_id);
}

export async function fetchRecipientsByRole(role: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("msg_recipients_by_role", { _role: role as any });
  if (error) throw error;
  return (data || []).map((r: any) => r.user_id);
}

// ============================================================
// Plantillas, programados, auditoría y recibos de lectura
// ============================================================

export interface MsgTemplate {
  id: string;
  name: string;
  category: string | null;
  subject: string;
  body: string;
  variables: string[];
  is_shared: boolean;
  created_by: string | null;
}

export function useMsgTemplates() {
  return useQuery({
    queryKey: ["msg_templates"],
    queryFn: async (): Promise<MsgTemplate[]> => {
      const { data } = await supabase.from("msg_templates").select("*").order("name");
      return (data || []) as MsgTemplate[];
    },
  });
}

export function useSaveTemplate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<MsgTemplate> & { id?: string }) => {
      const vars = extractVariables(`${t.subject || ""} ${t.body || ""}`);
      const row: any = {
        name: t.name, category: t.category || null,
        subject: t.subject || "", body: t.body || "",
        variables: vars, is_shared: !!t.is_shared,
      };
      if (t.id) {
        const { error } = await supabase.from("msg_templates").update(row).eq("id", t.id);
        if (error) throw error;
        return t.id;
      }
      row.created_by = user?.id;
      const { data, error } = await supabase.from("msg_templates").insert(row).select().single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["msg_templates"] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("msg_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["msg_templates"] }),
  });
}

export function extractVariables(text: string): string[] {
  const out = new Set<string>();
  const re = /\{([a-zA-Z0-9_]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.add(m[1]);
  return Array.from(out);
}

export function applyVariables(text: string, values: Record<string, string>): string {
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => (values[k] ?? `{${k}}`));
}

// ----- Programados -----
export interface MsgScheduled {
  id: string;
  scheduled_for: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  scope_type: "oferta" | "programa" | "role" | "users";
  scope_ref: string | null;
  semestre: number | null;
  user_ids: string[] | null;
  subject: string;
  body: string;
  variables: Record<string, string>;
  sent_at: string | null;
  thread_id: string | null;
  error: string | null;
  created_at: string;
  system_sender_key: string;
}

export function useScheduledMessages() {
  return useQuery({
    queryKey: ["msg_scheduled"],
    queryFn: async (): Promise<MsgScheduled[]> => {
      const { data } = await supabase.from("msg_scheduled").select("*").order("scheduled_for", { ascending: false }).limit(200);
      return (data || []) as any;
    },
  });
}

export function useCreateScheduled() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Omit<MsgScheduled, "id" | "status" | "sent_at" | "thread_id" | "error" | "created_at">) => {
      const row: any = { ...p, sender_user_id: user?.id, status: "pending" };
      const { data, error } = await supabase.from("msg_scheduled").insert(row).select().single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["msg_scheduled"] }),
  });
}

export function useCancelScheduled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("msg_scheduled").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["msg_scheduled"] }),
  });
}

// ----- Auditoría de envíos masivos -----
export function useBulkSendLog() {
  return useQuery({
    queryKey: ["msg_bulk_log"],
    queryFn: async () => {
      const { data } = await supabase.from("msg_bulk_send_log").select("*").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
  });
}

export async function logBulkSend(p: {
  scope_type: string;
  scope_ref?: string | null;
  scope_detail?: any;
  subject: string;
  body: string;
  recipients_count: number;
  threads_created: number;
  threads_failed: number;
  errors?: any;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  await supabase.from("msg_bulk_send_log").insert({
    sender_user_id: user.id,
    sender_display: prof?.display_name || null,
    scope_type: p.scope_type,
    scope_ref: p.scope_ref || null,
    scope_detail: p.scope_detail || null,
    subject: p.subject,
    body_preview: (p.body || "").slice(0, 200),
    recipients_count: p.recipients_count,
    threads_created: p.threads_created,
    threads_failed: p.threads_failed,
    errors: p.errors || null,
  });
}

// ----- Confirmaciones de lectura por hilo -----
export function useReadReceipts(threadId: string | null) {
  return useQuery({
    queryKey: ["msg_receipts", threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const { data: parts } = await supabase
        .from("msg_participants")
        .select("user_id, is_read, last_read_at, role")
        .eq("thread_id", threadId!);
      const uids = (parts || []).map((p: any) => p.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", uids.length ? uids : ["00000000-0000-0000-0000-000000000000"]);
      const pm = new Map((profs || []).map((p: any) => [p.user_id, p]));
      return (parts || []).map((p: any) => ({
        ...p,
        display_name: pm.get(p.user_id)?.display_name || "Usuario",
        avatar_url: pm.get(p.user_id)?.avatar_url || null,
      }));
    },
  });
}

// In-app notification preferences (localStorage per browser/user)
export type MsgToastPrefs = { enabled: boolean; onlyInbox: boolean };
const MSG_PREFS_KEY = "cmg.msg.toastPrefs.v1";
const MSG_PREFS_EVT = "cmg:msg:toastPrefs:changed";
const DEFAULT_PREFS: MsgToastPrefs = { enabled: true, onlyInbox: false };

export function getMsgToastPrefs(): MsgToastPrefs {
  try {
    const raw = localStorage.getItem(MSG_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw);
    return { enabled: p.enabled !== false, onlyInbox: !!p.onlyInbox };
  } catch { return DEFAULT_PREFS; }
}

export function setMsgToastPrefs(prefs: MsgToastPrefs) {
  try {
    localStorage.setItem(MSG_PREFS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent(MSG_PREFS_EVT));
  } catch {}
}

export function useMsgToastPrefs(): [MsgToastPrefs, (p: MsgToastPrefs) => void] {
  const [prefs, setPrefs] = useState<MsgToastPrefs>(getMsgToastPrefs);
  useEffect(() => {
    const handler = () => setPrefs(getMsgToastPrefs());
    window.addEventListener(MSG_PREFS_EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(MSG_PREFS_EVT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return [prefs, (p) => { setMsgToastPrefs(p); setPrefs(p); }];
}

// Global in-app notifier: shows a toast when a new message arrives in a thread
// where the current user is a participant (and they are not the sender).
export function useMessageNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const prefsRef = useRef<MsgToastPrefs>(getMsgToastPrefs());
  useEffect(() => {
    const refresh = () => { prefsRef.current = getMsgToastPrefs(); };
    window.addEventListener(MSG_PREFS_EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(MSG_PREFS_EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel("msg-notify-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "msg_messages" }, async (payload: any) => {
        try {
          const m = payload.new;
          if (!m?.thread_id) return;
          if (m.sender_id === user.id) return;
          // Always invalidate counters, even if toast is disabled
          qc.invalidateQueries({ queryKey: ["msg_unread"] });
          qc.invalidateQueries({ queryKey: ["msg_threads"] });

          const prefs = prefsRef.current;
          if (!prefs.enabled) return;

          // Confirm current user is participant (RLS-safe)
          const { data: part } = await supabase
            .from("msg_participants")
            .select("role, is_archived, is_deleted")
            .eq("thread_id", m.thread_id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (!part) return;
          if (prefs.onlyInbox) {
            // "Inbox" = user is recipient (role != 'from') and not archived/deleted
            if ((part as any).role === "from" || (part as any).is_archived || (part as any).is_deleted) return;
          }

          const { data: th } = await supabase
            .from("msg_threads")
            .select("subject")
            .eq("id", m.thread_id)
            .maybeSingle();
          let senderName = "Sistema";
          if (m.sender_id) {
            const { data: p } = await supabase.from("profiles").select("display_name").eq("user_id", m.sender_id).maybeSingle();
            senderName = p?.display_name || "Usuario";
          } else if (m.system_sender_key) {
            const { data: s } = await supabase.from("msg_system_senders").select("display_name").eq("key", m.system_sender_key).maybeSingle();
            senderName = s?.display_name || "Sistema";
          }
          toast(senderName, {
            description: `${th?.subject || "(sin asunto)"} — ${String(m.body || "").slice(0, 80)}`,
            icon: createElement(Mail, { className: "h-4 w-4" }),
            action: {
              label: "Ver",
              onClick: () => { window.location.href = "/mensajes"; },
            },
          });
        } catch {}
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);
}


