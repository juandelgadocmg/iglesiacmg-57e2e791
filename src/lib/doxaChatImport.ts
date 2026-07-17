// Importa conversaciones DOXA IA desde archivos .txt, .md o .docx.
// Genera un ChatThread listo para fusionar con el historial.
import type { ChatMessage, ChatThread } from "@/lib/doxaChatSync";

const USER_MARKERS = [
  /^\s*\[\s*usuario\s*\]\s*:?\s*$/i,
  /^\s*(?:👤|🧑)?\s*\**\s*usuario\s*\**\s*:?\s*$/i,
  /^\s*(?:>\s*)?\*\*\s*🧑?\s*usuario\s*\**\s*:?\s*$/i,
  /^\s*user\s*:\s*$/i,
];
const ASSISTANT_MARKERS = [
  /^\s*\[\s*asistente[^\]]*\]\s*:?\s*$/i,
  /^\s*(?:🤖)?\s*\**\s*asistente(?:\s+doxa[^*]*)?\s*\**\s*:?\s*$/i,
  /^\s*assistant\s*:\s*$/i,
  /^\s*doxa\s*(?:ia)?\s*:\s*$/i,
];

const isUser = (line: string) => USER_MARKERS.some((r) => r.test(line));
const isAsst = (line: string) => ASSISTANT_MARKERS.some((r) => r.test(line));

function parseTextToMessages(raw: string): ChatMessage[] {
  const normalized = raw.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const messages: ChatMessage[] = [];
  let role: "user" | "assistant" | null = null;
  let buf: string[] = [];
  const flush = () => {
    const content = buf.join("\n").replace(/^-{3,}$/gm, "").trim();
    if (role && content) messages.push({ role, content });
    buf = [];
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^-{3,}$/.test(trimmed) || /^={3,}$/.test(trimmed)) continue;
    if (isUser(trimmed)) { flush(); role = "user"; continue; }
    if (isAsst(trimmed)) { flush(); role = "assistant"; continue; }
    if (role === null) {
      // Sin cabecera reconocida: asume mensaje de usuario para no perderlo.
      role = "user";
    }
    buf.push(line);
  }
  flush();
  return messages;
}

async function readDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const arrayBuffer = await file.arrayBuffer();
  const result = await (mammoth as any).extractRawText({ arrayBuffer });
  return result.value || "";
}

function deriveTitle(file: File, messages: ChatMessage[]): string {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (base) return base.slice(0, 80);
  const first = messages.find((m) => m.role === "user")?.content || "Conversación importada";
  return first.slice(0, 60);
}

export async function importThreadFromFile(file: File): Promise<ChatThread> {
  const name = file.name.toLowerCase();
  let text = "";
  if (name.endsWith(".docx")) {
    text = await readDocx(file);
  } else if (name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt") || file.type.startsWith("text/")) {
    text = await file.text();
  } else {
    throw new Error("Formato no soportado. Usa .txt, .md o .docx.");
  }
  const messages = parseTextToMessages(text);
  if (messages.length === 0) throw new Error("No se pudieron detectar mensajes en el archivo.");
  return {
    id: crypto.randomUUID(),
    title: deriveTitle(file, messages),
    updatedAt: Date.now(),
    messages,
    pinned: false,
  };
}
