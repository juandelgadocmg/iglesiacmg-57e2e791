import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  last_message: { body: string; sender_id: string } | null;
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

export function useThreads(folder: Folder, search: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel("msg-rt-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "msg_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["msg_threads"] });
        qc.invalidateQueries({ queryKey: ["msg_thread"] });
        qc.invalidateQueries({ queryKey: ["msg_unread"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "msg_participants", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["msg_threads"] });
        qc.invalidateQueries({ queryKey: ["msg_unread"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  return useQuery({
    queryKey: ["msg_threads", folder, search, user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ThreadRow[]> => {
      if (folder === "drafts") return [];
      let q = supabase
        .from("msg_participants")
        .select("thread_id, is_read, is_important, is_favorite, is_archived, is_deleted, role, thread:msg_threads(id, subject, last_message_at, created_by)")
        .eq("user_id", user!.id)
        .order("thread(last_message_at)", { ascending: false })
        .limit(200);

      if (folder === "deleted") q = q.eq("is_deleted", true);
      else q = q.eq("is_deleted", false);

      if (folder === "archived") q = q.eq("is_archived", true);
      else if (folder !== "deleted") q = q.eq("is_archived", false);

      if (folder === "unread") q = q.eq("is_read", false);
      if (folder === "important") q = q.eq("is_important", true);
      if (folder === "favorites") q = q.eq("is_favorite", true);
      if (folder === "sent") q = q.eq("role", "from");

      const { data, error } = await q;
      if (error) throw error;

      const threadIds = (data || []).map((r: any) => r.thread_id);
      if (threadIds.length === 0) return [];

      // participants for these threads
      const { data: parts } = await supabase
        .from("msg_participants")
        .select("thread_id, user_id, role")
        .in("thread_id", threadIds);

      // user profiles
      const uids = Array.from(new Set((parts || []).map((p: any) => p.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", uids);
      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));

      // last message per thread
      const { data: lastMsgs } = await supabase
        .from("msg_messages")
        .select("thread_id, body, sender_id, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false });
      const lastByThread = new Map<string, any>();
      (lastMsgs || []).forEach((m: any) => {
        if (!lastByThread.has(m.thread_id)) lastByThread.set(m.thread_id, m);
      });

      const rows: ThreadRow[] = (data || []).map((r: any) => ({
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
          ? { body: lastByThread.get(r.thread_id).body, sender_id: lastByThread.get(r.thread_id).sender_id }
          : null,
      }));

      const s = search.trim().toLowerCase();
      if (!s) return rows;
      return rows.filter((r) =>
        r.subject.toLowerCase().includes(s) ||
        r.last_message?.body.toLowerCase().includes(s) ||
        r.participants.some((p) => (p.display_name || "").toLowerCase().includes(s))
      );
    },
  });
}

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["msg_unread", user?.id],
    enabled: !!user?.id,
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
      const uids = Array.from(new Set([...(parts || []).map((p: any) => p.user_id), ...(messages || []).map((m: any) => m.sender_id)]));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", uids.length ? uids : ["00000000-0000-0000-0000-000000000000"]);
      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      return { thread, messages: messages || [], participants: parts || [], profiles: profMap };
    },
  });
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

      let threadId = p.replyThreadId || null;
      if (!threadId) {
        const { data: t, error: te } = await supabase
          .from("msg_threads")
          .insert({ subject: p.subject || "(sin asunto)", created_by: user.id })
          .select()
          .single();
        if (te) throw te;
        threadId = t.id;
        // participants
        const rows = [
          { thread_id: threadId, user_id: user.id, role: "from", is_read: true, last_read_at: new Date().toISOString() },
          ...recipients.map((uid) => ({ thread_id: threadId!, user_id: uid, role: "to" })),
        ];
        const { error: pe } = await supabase.from("msg_participants").insert(rows);
        if (pe) throw pe;
      } else {
        // ensure recipients are participants (for replies)
        const { data: existing } = await supabase
          .from("msg_participants")
          .select("user_id")
          .eq("thread_id", threadId);
        const have = new Set((existing || []).map((r: any) => r.user_id));
        const toAdd = recipients.filter((r) => !have.has(r)).map((uid) => ({ thread_id: threadId!, user_id: uid, role: "to" }));
        if (toAdd.length) await supabase.from("msg_participants").insert(toAdd);
      }

      // create message
      const { data: msg, error: me } = await supabase
        .from("msg_messages")
        .insert({ thread_id: threadId, sender_id: user.id, body: p.body || "" })
        .select()
        .single();
      if (me) throw me;

      // upload attachments
      for (const f of p.files) {
        const safe = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `${threadId}/${msg.id}/${Date.now()}_${safe}`;
        const { error: ue } = await supabase.storage.from("mensajes-adjuntos").upload(path, f, { upsert: false });
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
