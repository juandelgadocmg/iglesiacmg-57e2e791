import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { LifeBuoy, User, AlertCircle, Loader2, Copy, Check, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { fetchShare, type SharePayload } from "@/lib/doxaChatShare";
import { toast } from "sonner";

export default function ChatSharePage() {
  const { token = "" } = useParams();
  const [state, setState] = useState<"loading" | "expired" | "notfound" | "ok" | "error">("loading");
  const [share, setShare] = useState<SharePayload | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    setState("loading");
    fetchShare(token)
      .then((s) => {
        if (!mounted) return;
        if (!s) { setState("notfound"); return; }
        if (new Date(s.expires_at).getTime() < Date.now()) { setState("expired"); return; }
        setShare(s);
        setState("ok");
      })
      .catch(() => { if (mounted) setState("error"); });
    return () => { mounted = false; };
  }, [token]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
            <LifeBuoy className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate">
              {share?.title || "Conversación compartida"}
            </p>
            <p className="text-[10.5px] text-muted-foreground">
              Vista de solo lectura · Asistente DOXA IA
            </p>
          </div>
          {state === "ok" && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={copyLink}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline text-[12px]">Copiar enlace</span>
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        {state === "loading" && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando conversación…
          </div>
        )}

        {(state === "notfound" || state === "expired" || state === "error") && (
          <div className="rounded-xl border bg-card p-6 text-center space-y-3 mt-8">
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <h1 className="text-lg font-semibold">
              {state === "expired" && "Este enlace ha expirado"}
              {state === "notfound" && "Enlace no encontrado"}
              {state === "error" && "No se pudo cargar el enlace"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {state === "expired" && "La persona que compartió esta conversación configuró una fecha de expiración que ya se alcanzó."}
              {state === "notfound" && "El enlace es incorrecto o fue eliminado."}
              {state === "error" && "Ocurrió un error de conexión. Inténtalo de nuevo más tarde."}
            </p>
            <div>
              <Link to="/">
                <Button size="sm" variant="outline">Ir al inicio</Button>
              </Link>
            </div>
          </div>
        )}

        {state === "ok" && share && (
          <>
            <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground mb-4">
              <Clock className="h-3.5 w-3.5" />
              Expira {formatDistanceToNowStrict(new Date(share.expires_at), { addSuffix: true, locale: es })}
              <span className="opacity-60">·</span>
              <span>{format(new Date(share.expires_at), "PPpp", { locale: es })}</span>
            </div>

            <div className="space-y-6">
              {share.messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
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
            </div>

            <p className="text-[10.5px] text-muted-foreground text-center mt-10">
              Esta es una copia de solo lectura generada por el Asistente DOXA IA.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
