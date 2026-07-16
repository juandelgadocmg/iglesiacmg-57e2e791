import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, Users, CalendarDays, HandHeart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import PageHeader from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const PROMPT_CARDS: { icon: any; title: string; prompt: string; variant: string }[] = [
  { icon: Users, title: "Personas activas", prompt: "¿Cuántas personas activas hay actualmente y cómo se comparan con el mes anterior?", variant: "bg-primary/8 text-primary" },
  { icon: HandHeart, title: "Peticiones de oración", prompt: "Resúmeme las peticiones de oración pendientes y en oración.", variant: "bg-accent/10 text-accent" },
  { icon: CalendarDays, title: "Próximos eventos", prompt: "Lístame los próximos eventos con sus cupos disponibles.", variant: "bg-info/10 text-info" },
  { icon: TrendingUp, title: "Crecimiento", prompt: "Muéstrame el crecimiento de membresía de los últimos 6 meses.", variant: "bg-success/10 text-success" },
];

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const sendWith = async (text: string) => {
    const clean = text.trim();
    if (!clean || isLoading) return;
    const userMsg: Message = { role: "user", content: clean };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
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

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <PageHeader title="Asistente IA" description="Pregúntame lo que necesites sobre la gestión de la iglesia" />

      <div className="flex-1 overflow-hidden px-4 pb-4">
        <div className="flex flex-col h-full max-w-3xl mx-auto">
          {/* Messages / Empty */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 pr-2">
            {isEmpty ? (
              <div className="h-full flex flex-col items-center justify-center gap-8 animate-fade-in">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg">
                    <Sparkles className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">¿En qué puedo ayudarte hoy?</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Asistente conectado con toda la información de tu iglesia: personas, grupos, finanzas, academia y más.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {PROMPT_CARDS.map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.title}
                        onClick={() => sendWith(c.prompt)}
                        className="surface-card card-hover text-left p-4 group"
                      >
                        <div className={cn("inline-flex p-2 rounded-lg mb-3", c.variant)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-semibold text-foreground mb-1">{c.title}</p>
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

          {/* Composer */}
          <div className="pt-3">
            <div className="relative surface-card p-2 flex items-end gap-2 focus-within:shadow-md transition-shadow">
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
      </div>
    </div>
  );
}
