import { useState, useRef, useEffect, useMemo } from "react";
import {
  Send, Bot, User, Loader2, LifeBuoy, Plus, MessageSquare, Trash2, Search,
  PanelRightClose, PanelRightOpen, BookOpen, Compass, ListChecks, ShieldCheck,
  Users, UsersRound, Award, GraduationCap, DollarSign, BarChart3, ClipboardList,
  Filter, Settings as SettingsIcon, LayoutGrid, CalendarDays, HeartHandshake,
  Megaphone, FileText, HandHeart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

type Message = { role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; updatedAt: number; messages: Message[] };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const STORAGE_PREFIX = "doxa.chat.threads.v2::";
const ACTIVE_PREFIX = "doxa.chat.activeThread.v2::";
const storageKeyFor = (uid: string) => `${STORAGE_PREFIX}${uid}`;
const activeKeyFor = (uid: string) => `${ACTIVE_PREFIX}${uid}`;


// Sugerencias iniciales (tarjetas de bienvenida)
const PROMPT_CARDS: { icon: any; title: string; prompt: string; color: string }[] = [
  { icon: Users, title: "Crear una persona", prompt: "¿Cómo crear una persona?", color: "text-primary bg-primary/10" },
  { icon: ClipboardList, title: "Registrar asistencia", prompt: "¿Cómo registrar una asistencia?", color: "text-blue-600 bg-blue-500/10" },
  { icon: UsersRound, title: "Crear un grupo", prompt: "¿Cómo crear un grupo o Casa de Paz?", color: "text-emerald-600 bg-emerald-500/10" },
  { icon: Award, title: "Generar un certificado", prompt: "¿Cómo generar un certificado?", color: "text-amber-600 bg-amber-500/10" },
  { icon: GraduationCap, title: "Crear un curso", prompt: "¿Cómo crear un curso en Academia?", color: "text-violet-600 bg-violet-500/10" },
  { icon: DollarSign, title: "Administrar Finanzas", prompt: "¿Cómo administrar las finanzas?", color: "text-teal-600 bg-teal-500/10" },
  { icon: BarChart3, title: "Exportar un reporte", prompt: "¿Cómo exportar un reporte?", color: "text-rose-600 bg-rose-500/10" },
  { icon: SettingsIcon, title: "Configurar usuarios", prompt: "¿Cómo configurar usuarios?", color: "text-slate-600 bg-slate-500/10" },
];

// Chips rápidos debajo del composer
const QUICK_CHIPS = [
  "¿Cómo crear una persona?",
  "¿Cómo registrar una asistencia?",
  "¿Cómo crear un grupo?",
  "¿Cómo crear un curso?",
  "¿Cómo generar un certificado?",
  "¿Cómo exportar un reporte?",
  "¿Cómo configurar un usuario?",
  "¿Cómo usar el módulo de Finanzas?",
  "¿Cómo administrar la Academia?",
];

const CAPABILITIES = [
  { icon: Compass, title: "Guía por módulos", desc: "Aprende cómo funciona cada módulo: Personas, Grupos, Reuniones, Academia, Finanzas y más." },
  { icon: ListChecks, title: "Procedimientos paso a paso", desc: "Recibe instrucciones numeradas para completar cualquier tarea dentro de DOXA." },
  { icon: Filter, title: "Uso de filtros y formularios", desc: "Explica cómo usar filtros, buscadores y formularios de cada pantalla." },
  { icon: BookOpen, title: "Buenas prácticas", desc: "Recomendaciones para sacar el máximo provecho de la plataforma." },
];

const LIMITATIONS = [
  "No consulta datos almacenados en DOXA.",
  "No genera estadísticas ni reportes.",
  "No responde temas fuera del uso de la plataforma.",
];

// ------- helpers -------
function newThread(): Thread {
  return { id: crypto.randomUUID(), title: "Nueva conversación", updatedAt: Date.now(), messages: [] };
}

function loadThreads(uid: string): { threads: Thread[]; activeId: string } {
  if (typeof window === "undefined") {
    const t = newThread();
    return { threads: [t], activeId: t.id };
  }
  try {
    const raw = localStorage.getItem(storageKeyFor(uid));
    const active = localStorage.getItem(activeKeyFor(uid)) || "";
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

function saveThreads(uid: string, threads: Thread[], activeId: string) {
  try {
    localStorage.setItem(storageKeyFor(uid), JSON.stringify(threads));
    localStorage.setItem(activeKeyFor(uid), activeId);
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
  const [{ threads, activeId }, setState] = useState(() => loadThreads());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadQuery, setThreadQuery] = useState("");
  const [contextOpen, setContextOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const active = threads.find((t) => t.id === activeId) || threads[0];
  const messages = active?.messages || [];

  useEffect(() => { saveThreads(threads, activeId); }, [threads, activeId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, activeId]);

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
            <LifeBuoy className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate">{active?.title || "Asistente DOXA IA"}</p>
            <p className="text-[10.5px] text-muted-foreground">Aprende a utilizar la plataforma DOXA</p>
          </div>
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setContextOpen((v) => !v)}
            aria-label="Panel de ayuda"
          >
            {contextOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </header>

        {/* Mensajes */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
            {isEmpty ? (
              <div className="h-full flex flex-col items-center justify-center gap-6 py-6 animate-fade-in">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg">
                    <LifeBuoy className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h1 className="text-2xl font-semibold">👋 Hola, soy Asistente DOXA IA</h1>
                  <p className="text-sm text-muted-foreground max-w-lg">
                    Estoy aquí para ayudarte a <span className="font-medium text-foreground">aprender a utilizar la plataforma DOXA</span>.
                    Pregúntame cómo hacer cualquier tarea y te guiaré paso a paso.
                  </p>
                </div>

                <div className="w-full max-w-2xl rounded-xl border bg-card/60 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                    Puedes preguntarme, por ejemplo
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                    <li>• ¿Cómo crear una persona?</li>
                    <li>• ¿Cómo registrar una asistencia?</li>
                    <li>• ¿Cómo crear un grupo?</li>
                    <li>• ¿Cómo generar un certificado?</li>
                    <li>• ¿Cómo crear un curso?</li>
                    <li>• ¿Cómo administrar las finanzas?</li>
                    <li>• ¿Cómo exportar un reporte?</li>
                    <li>• ¿Cómo configurar usuarios?</li>
                    <li>• ¿Cómo usar los filtros?</li>
                    <li>• ¿Qué hace este módulo?</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-3xl">
                  {PROMPT_CARDS.map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.title}
                        onClick={() => sendWith(c.prompt)}
                        className="text-left rounded-xl border bg-card p-3 hover:border-primary/40 hover:shadow-sm transition-all group"
                      >
                        <div className={cn("inline-flex p-2 rounded-lg mb-2", c.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-[13px] font-semibold mb-0.5">{c.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{c.prompt}</p>
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
                        <LifeBuoy className="h-4 w-4 text-primary-foreground" />
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
                      <LifeBuoy className="h-4 w-4 text-primary-foreground" />
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
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="relative rounded-xl border bg-card p-2 flex items-end gap-2 focus-within:shadow-md focus-within:border-primary/40 transition-all">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregúntame cómo usar DOXA… (Enter para enviar, Shift+Enter para salto de línea)"
                className="min-h-[44px] max-h-[160px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent px-3 py-2"
                rows={1}
                disabled={isLoading}
              />
              <Button onClick={send} disabled={isLoading || !input.trim()} size="icon" className="shrink-0 h-9 w-9 rounded-lg">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            {/* Chips de sugerencias rápidas */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CHIPS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendWith(q)}
                  disabled={isLoading}
                  className="text-[11.5px] px-2.5 py-1 rounded-full border bg-card hover:bg-muted/60 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              Asistente DOXA IA · Solo enseña a usar la plataforma. No consulta datos internos.
            </p>
          </div>
        </div>
      </section>

      {/* Panel derecho de ayuda */}
      {contextOpen && (
        <aside className="hidden xl:flex w-72 shrink-0 border-l bg-card/40 flex-col animate-in slide-in-from-right">
          <div className="p-4 border-b">
            <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold">Acerca del asistente</p>
            <h3 className="text-sm font-semibold mt-0.5">¿En qué puedo ayudarte?</h3>
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

            <div className="rounded-lg border bg-gradient-to-br from-amber-500/5 to-card p-3 mt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Limitaciones</p>
              </div>
              <ul className="space-y-1 text-[12px] text-muted-foreground">
                {LIMITATIONS.map((l) => (
                  <li key={l}>• {l}</li>
                ))}
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
