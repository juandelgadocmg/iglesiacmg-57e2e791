import { useState, useRef, useEffect, useMemo } from "react";
import {
  Send, Bot, User, Loader2, Sparkles, Users, CalendarDays, HandHeart, TrendingUp,
  Plus, MessageSquare, Trash2, Search, PanelRightClose, PanelRightOpen,
  BookOpen, Database, Zap, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type Message = { role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; updatedAt: number; messages: Message[] };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const STORAGE_KEY = "doxa.chat.threads.v1";
const ACTIVE_KEY = "doxa.chat.activeThread.v1";

const PROMPT_CARDS: { icon: any; title: string; prompt: string; color: string }[] = [
  { icon: Users, title: "Personas activas", prompt: "¿Cuántas personas activas hay actualmente y cómo se comparan con el mes anterior?", color: "text-primary bg-primary/10" },
  { icon: HandHeart, title: "Peticiones de oración", prompt: "Resúmeme las peticiones de oración pendientes y en oración.", color: "text-rose-600 bg-rose-500/10" },
  { icon: CalendarDays, title: "Próximos eventos", prompt: "Lístame los próximos eventos con sus cupos disponibles.", color: "text-blue-600 bg-blue-500/10" },
  { icon: TrendingUp, title: "Crecimiento", prompt: "Muéstrame el crecimiento de membresía de los últimos 6 meses.", color: "text-emerald-600 bg-emerald-500/10" },
];

const CAPABILITIES = [
  { icon: Database, title: "Consulta la base", desc: "Pregunta por personas, grupos, eventos, finanzas o academia con lenguaje natural." },
  { icon: Zap, title: "Resúmenes rápidos", desc: "Genera resúmenes de peticiones, asistencias o estados financieros." },
  { icon: Wand2, title: "Ideas pastorales", desc: "Sugerencias de mensajes, seguimientos o dinámicas para grupos." },
  { icon: BookOpen, title: "Referencias", desc: "Solicita citas bíblicas, enseñanzas o material de apoyo." },
];

// ------- helpers -------
function newThread(): Thread {
  return { id: crypto.randomUUID(), title: "Nueva conversación", updatedAt: Date.now(), messages: [] };
}

function loadThreads(): { threads: Thread[]; activeId: string } {
  if (typeof window === "undefined") {
    const t = newThread();
    return { threads: [t], activeId: t.id };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const active = localStorage.getItem(ACTIVE_KEY) || "";
    if (raw) {
      const parsed: Thread[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const activeId = parsed.find((t) => t.id === active)?.id || parsed[0].id;
        return { threads: parsed, activeId };
      }
    }
  } catch { /* fall through */ }
  const t = newThread();
  return { threads: [t], activeId: t.id };
}

function saveThreads(threads: Thread[], activeId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    localStorage.setItem(ACTIVE_KEY, activeId);
  } catch { /* ignore */ }
}

function deriveTitle(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 44 ? t.slice(0, 44) + "…" : t || "Nueva conversación";
}

async function streamChat({
  messages, onDelta, onDone,
}: { messages: Message[]; onDelta: (text: string) => void; onDone: () => void }) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || `Error ${resp.status}`);
  }
  if (!resp.body) throw new Error("No stream body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamDone = false;
  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  if (buffer.trim()) {
    for (let raw of buffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }
  onDone();
}

export default function ChatPage() {
  // Bootstrap threads once (client-safe)
  const [{ threads, activeId }, setState] = useState(() => loadThreads());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadQuery, setThreadQuery] = useState("");
  const [contextOpen, setContextOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const active = threads.find((t) => t.id === activeId) || threads[0];
  const messages = active?.messages || [];

  // Persist on change
  useEffect(() => { saveThreads(threads, activeId); }, [threads, activeId]);

  // Scroll on new message
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, activeId]);

  // Focus input on mount + thread switch
  useEffect(() => { inputRef.current?.focus(); }, [activeId]);

  const updateActive = (updater: (t: Thread) => Thread) => {
    setState((prev) => ({
      ...prev,
      threads: prev.threads.map((t) => (t.id === prev.activeId ? updater(t) : t)),
    }));
  };

  const createThread = () => {
    const t = newThread();
    setState((prev) => ({ threads: [t, ...prev.threads], activeId: t.id }));
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const selectThread = (id: string) => {
    setState((prev) => ({ ...prev, activeId: id }));
  };

  const deleteThread = (id: string) => {
    setState((prev) => {
      const remaining = prev.threads.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        const t = newThread();
        return { threads: [t], activeId: t.id };
      }
      const nextActive = prev.activeId === id ? remaining[0].id : prev.activeId;
      return { threads: remaining, activeId: nextActive };
    });
  };

  const sendWith = async (text: string) => {
    const clean = text.trim();
    if (!clean || isLoading) return;
    const userMsg: Message = { role: "user", content: clean };
    const isFirst = messages.length === 0;

    updateActive((t) => ({
      ...t,
      messages: [...t.messages, userMsg],
      title: isFirst ? deriveTitle(clean) : t.title,
      updatedAt: Date.now(),
    }));
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      updateActive((t) => {
        const last = t.messages[t.messages.length - 1];
        const next = last?.role === "assistant"
          ? t.messages.map((m, i) => (i === t.messages.length - 1 ? { ...m, content: assistantSoFar } : m))
          : [...t.messages, { role: "assistant" as const, content: assistantSoFar }];
        return { ...t, messages: next, updatedAt: Date.now() };
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsert,
        onDone: () => { setIsLoading(false); setTimeout(() => inputRef.current?.focus(), 50); },
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error al comunicarse con el asistente");
      setIsLoading(false);
    }
  };

  const send = () => sendWith(input);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const filteredThreads = useMemo(() => {
    const q = threadQuery.trim().toLowerCase();
    const sorted = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [threads, threadQuery]);

  const isEmpty = messages.length === 0;

  return (
    <div className="animate-fade-in -m-3 md:-m-6 flex h-[calc(100vh-3.5rem)] bg-background">
      {/* Rail izquierdo: threads */}
      <aside className="hidden md:flex w-64 shrink-0 border-r bg-card/40 flex-col">
        <div className="p-3 border-b space-y-2">
          <Button onClick={createThread} className="w-full justify-start gap-2 h-9" size="sm">
            <Plus className="h-4 w-4" /> Nueva conversación
          </Button>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={threadQuery}
              onChange={(e) => setThreadQuery(e.target.value)}
              placeholder="Buscar…"
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {filteredThreads.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Sin conversaciones</p>
          )}
          {filteredThreads.map((t) => {
            const isActive = t.id === activeId;
            return (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 mx-1 rounded-md cursor-pointer transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                )}
                onClick={() => selectThread(t.id)}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{t.title}</p>
                  <p className="text-[10.5px] text-muted-foreground truncate">
                    {t.messages.length > 0
                      ? formatDistanceToNow(t.updatedAt, { addSuffix: true, locale: es })
                      : "Vacía"}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="p-3 border-t text-[10.5px] text-muted-foreground">
          {threads.length} conversación{threads.length === 1 ? "" : "es"} guardada{threads.length === 1 ? "" : "s"} en este navegador.
        </div>
      </aside>

      {/* Centro: hilo */}
      <section className="flex-1 min-w-0 flex flex-col">
        {/* Header hilo */}
        <header className="h-12 shrink-0 border-b flex items-center gap-3 px-4 bg-background/95 backdrop-blur">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate">{active?.title || "Asistente IA"}</p>
            <p className="text-[10.5px] text-muted-foreground">Conectado a los datos de tu iglesia</p>
          </div>
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setContextOpen((v) => !v)}
            aria-label="Panel de contexto"
          >
            {contextOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </header>

        {/* Mensajes */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
            {isEmpty ? (
              <div className="h-full flex flex-col items-center justify-center gap-6 py-10 animate-fade-in">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg">
                    <Sparkles className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-semibold">¿En qué puedo ayudarte hoy?</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Asistente pastoral conectado con toda la información de tu iglesia: personas, grupos, finanzas, academia y más.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {PROMPT_CARDS.map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.title}
                        onClick={() => sendWith(c.prompt)}
                        className="text-left rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all group"
                      >
                        <div className={cn("inline-flex p-2 rounded-lg mb-3", c.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-semibold mb-1">{c.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{c.prompt}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-3 animate-fade-in", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-sm">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 max-w-[82%] text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
                          : "bg-card border border-border/70 text-foreground rounded-tl-sm shadow-sm"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>*:last-child]:mb-0 prose-headings:text-foreground prose-strong:text-foreground prose-a:text-accent">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-accent flex items-center justify-center shadow-sm">
                        <User className="h-4 w-4 text-accent-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-3 animate-fade-in">
                    <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="bg-card border border-border/70 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t bg-background/95 backdrop-blur px-4 md:px-6 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-xl border bg-card p-2 flex items-end gap-2 focus-within:shadow-md focus-within:border-primary/40 transition-all">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu pregunta… (Enter para enviar, Shift+Enter para salto de línea)"
                className="min-h-[44px] max-h-[160px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent px-3 py-2"
                rows={1}
                disabled={isLoading}
              />
              <Button onClick={send} disabled={isLoading || !input.trim()} size="icon" className="shrink-0 h-9 w-9 rounded-lg">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Respuestas generadas con IA. Verifica los datos importantes antes de tomar decisiones.
            </p>
          </div>
        </div>
      </section>

      {/* Panel derecho de contexto */}
      {contextOpen && (
        <aside className="hidden xl:flex w-72 shrink-0 border-l bg-card/40 flex-col animate-in slide-in-from-right">
          <div className="p-4 border-b">
            <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold">Contexto</p>
            <h3 className="text-sm font-semibold mt-0.5">Capacidades del asistente</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <c.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-[13px] font-semibold">{c.title}</p>
                </div>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            ))}

            <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-card p-3 mt-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Consejos</p>
              <ul className="space-y-1.5 text-[12px] text-muted-foreground">
                <li>• Sé específico con fechas y sedes.</li>
                <li>• Solicita el formato: tabla, lista o resumen.</li>
                <li>• Pide desglose por red o grupo cuando aplique.</li>
                <li>• Reformula si la respuesta no cubre el punto.</li>
              </ul>
            </div>
          </div>
          <div className="p-3 border-t text-[10.5px] text-muted-foreground">
            Hilo activo: <span className="font-mono">{active?.id.slice(0, 8)}</span> · {messages.length} mensajes
          </div>
        </aside>
      )}
    </div>
  );
}
