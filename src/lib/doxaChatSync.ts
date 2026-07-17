// Sincronización de conversaciones DOXA IA entre dispositivos.
// - Persistencia local: localStorage (fallback offline / usuarios sin sesión).
// - Persistencia remota: tabla `doxa_chat_threads` protegida por RLS por usuario.
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  pinned?: boolean;
};

const TOMBSTONE_PREFIX = "doxa.chat.tombstones.v1::";
const tombstoneKey = (uid: string) => `${TOMBSTONE_PREFIX}${uid}`;

export function loadTombstones(uid: string): string[] {
  try {
    const raw = localStorage.getItem(tombstoneKey(uid));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}
export function addTombstone(uid: string, id: string) {
  try {
    const cur = new Set(loadTombstones(uid));
    cur.add(id);
    localStorage.setItem(tombstoneKey(uid), JSON.stringify([...cur]));
  } catch { /* ignore */ }
}
export function clearTombstone(uid: string, id: string) {
  try {
    const cur = loadTombstones(uid).filter((x) => x !== id);
    localStorage.setItem(tombstoneKey(uid), JSON.stringify(cur));
  } catch { /* ignore */ }
}

type Row = {
  id: string;
  title: string;
  pinned: boolean;
  updated_at_ms: number;
  messages: ChatMessage[];
};

export async function fetchRemoteThreads(userId: string): Promise<ChatThread[]> {
  const { data, error } = await supabase
    .from("doxa_chat_threads" as any)
    .select("id,title,pinned,updated_at_ms,messages")
    .eq("user_id", userId);
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    pinned: !!r.pinned,
    updatedAt: Number(r.updated_at_ms) || 0,
    messages: Array.isArray(r.messages) ? r.messages : [],
  }));
}

export async function upsertRemoteThread(userId: string, t: ChatThread): Promise<void> {
  const { error } = await supabase.from("doxa_chat_threads" as any).upsert({
    id: t.id,
    user_id: userId,
    title: t.title,
    pinned: !!t.pinned,
    updated_at_ms: t.updatedAt,
    messages: t.messages,
  } as any, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteRemoteThread(_userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("doxa_chat_threads" as any).delete().eq("id", id);
  if (error) throw error;
}

/** Merge remota + local por updatedAt más reciente. */
export function mergeThreads(local: ChatThread[], remote: ChatThread[], tombstones: string[]): {
  merged: ChatThread[];
  toPushRemote: ChatThread[];   // están más frescas localmente
} {
  const dead = new Set(tombstones);
  const byId = new Map<string, ChatThread>();
  for (const t of remote) if (!dead.has(t.id)) byId.set(t.id, t);
  const toPush: ChatThread[] = [];
  for (const t of local) {
    if (dead.has(t.id)) continue;
    const r = byId.get(t.id);
    if (!r) { byId.set(t.id, t); toPush.push(t); continue; }
    if (t.updatedAt > r.updatedAt) { byId.set(t.id, t); toPush.push(t); }
  }
  return { merged: [...byId.values()], toPushRemote: toPush };
}
