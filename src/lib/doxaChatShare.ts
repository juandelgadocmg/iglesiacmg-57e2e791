// Enlaces de solo lectura (compartir) para conversaciones DOXA IA.
import { supabase } from "@/integrations/supabase/client";
import type { ChatThread, ChatMessage } from "@/lib/doxaChatSync";

export type SharePayload = {
  token: string;
  title: string;
  messages: ChatMessage[];
  expires_at: string;
  created_at: string;
};

function randomToken(): string {
  // 22-char URL-safe token derived from crypto.randomUUID()
  const uuid = crypto.randomUUID().replace(/-/g, "");
  return uuid.slice(0, 22);
}

export async function createShare(
  ownerUserId: string,
  thread: ChatThread,
  ttlHours: number
): Promise<{ token: string; url: string; expiresAt: Date }> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
  const { error } = await supabase.from("doxa_chat_shares" as any).insert({
    token,
    owner_user_id: ownerUserId,
    thread_id: thread.id,
    title: thread.title || "Conversación DOXA IA",
    messages: thread.messages,
    expires_at: expiresAt.toISOString(),
  } as any);
  if (error) throw error;
  const url = `${window.location.origin}/chat/compartida/${token}`;
  return { token, url, expiresAt };
}

export async function fetchShare(token: string): Promise<SharePayload | null> {
  const { data, error } = await supabase
    .from("doxa_chat_shares" as any)
    .select("token,title,messages,expires_at,created_at")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as any;
  return {
    token: row.token,
    title: row.title,
    messages: Array.isArray(row.messages) ? row.messages : [],
    expires_at: row.expires_at,
    created_at: row.created_at,
  };
}
