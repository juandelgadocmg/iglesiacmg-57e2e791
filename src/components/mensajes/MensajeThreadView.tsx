import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useThread, useUpdateFlag, getAttachmentUrl, useReadReceipts } from "@/hooks/useMensajes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Star, Archive, Trash2, CornerUpLeft, Forward, Paperclip, AlertCircle, Mail, MailOpen, Download, Eye, Bot, FileText, Image as ImageIcon, CheckCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import MensajeComposer from "./MensajeComposer";
import AssetPreview from "@/components/shared/AssetPreview";
import { openAsset as openAssetSafe } from "@/lib/openAsset";
import ShareLinkButton from "@/components/shared/ShareLinkButton";

interface Props {
  threadId: string;
  onClose?: () => void;
}

function attachmentKind(mime: string | null, name: string): "image" | "pdf" | "video" | "audio" | "other" {
  const m = (mime || "").toLowerCase();
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (m.startsWith("image/") || ["png","jpg","jpeg","gif","webp","svg"].includes(ext)) return "image";
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  return "other";
}

export default function MensajeThreadView({ threadId }: Props) {
  const { user } = useAuth();
  const { data, isLoading } = useThread(threadId);
  const updateFlag = useUpdateFlag();
  const { data: receipts = [] } = useReadReceipts(threadId);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyMode, setReplyMode] = useState<"reply" | "replyAll" | "forward">("reply");
  const [preview, setPreview] = useState<{ url: string; kind: string; name: string } | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const restoredRef = useRef(false);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (threadId) updateFlag.mutate({ threadId, patch: { is_read: true } });
    restoredRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Restore last scroll position for this thread once messages are rendered.
  // Priority: URL (?ty= or ?m=<msgId>) → sessionStorage. This ensures shared
  // links and Back navigation land on exactly the same point without flicker.
  useEffect(() => {
    if (restoredRef.current) return;
    if (!data?.messages || !scrollRef.current) return;
    const focusMsg = searchParams.get("m");
    const urlTy = searchParams.get("ty");
    try {
      if (focusMsg) {
        // Defer so refs are attached, then scroll and highlight
        requestAnimationFrame(() => {
          const el = messageRefs.current[focusMsg];
          if (el && scrollRef.current) {
            el.scrollIntoView({ block: "center", behavior: "auto" });
            setFocusedMessageId(focusMsg);
            // Fade the highlight after a moment
            setTimeout(() => setFocusedMessageId(null), 2400);
          }
        });
      } else {
        const saved = urlTy ?? sessionStorage.getItem(`doxa:msg-scroll:${threadId}`);
        const y = saved ? Number(saved) : NaN;
        if (Number.isFinite(y)) {
          requestAnimationFrame(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = y;
          });
        }
      }
    } catch {}
    restoredRef.current = true;
  }, [data?.messages, threadId, searchParams]);

  // Persist scroll position (debounced via rAF)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        try {
          sessionStorage.setItem(`doxa:msg-scroll:${threadId}`, String(el.scrollTop));
        } catch {}
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [threadId, data?.messages]);


  // Pre-fetch signed URLs for image attachments for inline preview
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!data?.messages) return;
      const next: Record<string, string> = {};
      for (const m of data.messages as any[]) {
        for (const a of m.attachments || []) {
          if (urls[a.id]) { next[a.id] = urls[a.id]; continue; }
          const kind = attachmentKind(a.mime_type, a.file_name);
          if (kind === "image" || kind === "pdf") {
            const u = await getAttachmentUrl(a.file_path);
            if (u) next[a.id] = u;
          }
        }
      }
      if (!cancel) setUrls((prev) => ({ ...prev, ...next }));
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.messages]);

  if (isLoading || !data?.thread) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando…</div>;
  }

  const self = data.participants.find((p: any) => p.user_id === user?.id);
  const others = data.participants.filter((p: any) => p.user_id !== user?.id);
  const fromIds = others.map((o: any) => o.user_id);

  const replyInitial = () => {
    const lastMsg = [...(data.messages as any[])].reverse().find((m) => !m.is_system) || (data.messages as any[]).slice(-1)[0];
    if (replyMode === "forward") {
      return {
        subject: data.thread.subject.startsWith("Fwd:") ? data.thread.subject : `Fwd: ${data.thread.subject}`,
        body: `\n\n---------- Mensaje reenviado ----------\n${lastMsg?.body || ""}`,
        recipients: [],
        replyThreadId: null,
      };
    }
    return {
      subject: data.thread.subject.startsWith("Re:") ? data.thread.subject : `Re: ${data.thread.subject}`,
      recipients: replyMode === "replyAll" ? fromIds : (lastMsg?.sender_id ? [lastMsg.sender_id].filter((id) => id !== user?.id) : []),
      replyThreadId: threadId,
    };
  };

  const openAttachment = async (a: any) => {
    const url = urls[a.id] || await getAttachmentUrl(a.file_path);
    if (!url) return;
    const kind = attachmentKind(a.mime_type, a.file_name);
    if (kind === "image" || kind === "pdf" || kind === "video" || kind === "audio") {
      setPreview({ url, kind, name: a.file_name });
    } else {
      openAssetSafe({ url, filename: a.file_name });
    }
  };

  const downloadAttachment = async (a: any) => {
    const url = urls[a.id] || await getAttachmentUrl(a.file_path);
    if (!url) return;
    openAssetSafe({ url, filename: a.file_name, download: true });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-4 py-2 border-b">
        <Button size="sm" variant="ghost" onClick={() => { setReplyMode("reply"); setReplyOpen(true); }}>
          <CornerUpLeft className="h-4 w-4 mr-1" /> Responder
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setReplyMode("replyAll"); setReplyOpen(true); }}>
          <CornerUpLeft className="h-4 w-4 mr-1" /> Responder a todos
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setReplyMode("forward"); setReplyOpen(true); }}>
          <Forward className="h-4 w-4 mr-1" /> Reenviar
        </Button>
        <div className="flex-1" />
        <ShareLinkButton
          size="sm"
          variant="ghost"
          toastMessage="Enlace del hilo copiado"
          qrTitle="Abrir hilo en otro dispositivo"
          qrDescription="Escanea con la cámara para abrir este hilo en el mismo punto de lectura."
          buildUrl={() => {
            const p = new URLSearchParams(window.location.search);
            p.set("t", threadId);
            // Include scroll position and focused message so returning users
            // land exactly where the sender was reading.
            const y = scrollRef.current?.scrollTop ?? 0;
            if (y > 0) p.set("ty", String(Math.round(y))); else p.delete("ty");
            if (focusedMessageId) p.set("m", focusedMessageId); else p.delete("m");
            return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
          }}
        />
        <Button size="sm" variant="ghost" onClick={() => updateFlag.mutate({ threadId, patch: { is_favorite: !self?.is_favorite } })}>
          <Star className={`h-4 w-4 ${self?.is_favorite ? "fill-amber-400 text-amber-400" : ""}`} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => updateFlag.mutate({ threadId, patch: { is_important: !self?.is_important } })}>
          <AlertCircle className={`h-4 w-4 ${self?.is_important ? "text-orange-500" : ""}`} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => updateFlag.mutate({ threadId, patch: { is_read: !self?.is_read } })}>
          {self?.is_read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => updateFlag.mutate({ threadId, patch: { is_archived: true } })}>
          <Archive className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => updateFlag.mutate({ threadId, patch: { is_deleted: true } })}>
          <Trash2 className="h-4 w-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" title="Confirmaciones de lectura">
              <CheckCheck className="h-4 w-4" />
              <span className="ml-1 text-xs">{receipts.filter((r: any) => r.is_read && r.user_id !== user?.id).length}/{Math.max(0, receipts.length - 1)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 border-b text-sm font-semibold">Confirmaciones de lectura</div>
            <div className="max-h-72 overflow-y-auto">
              {receipts.length === 0 && <div className="p-4 text-xs text-muted-foreground">Sin participantes</div>}
              {receipts.map((r: any) => (
                <div key={r.user_id} className="flex items-center gap-2 px-3 py-2 border-b text-xs">
                  <Avatar className="h-6 w-6"><AvatarImage src={r.avatar_url || undefined} /><AvatarFallback>{r.display_name.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{r.display_name}{r.user_id === user?.id && " (tú)"}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {r.is_read
                        ? (r.last_read_at ? `Leído ${formatDistanceToNow(new Date(r.last_read_at), { addSuffix: true, locale: es })}` : "Leído")
                        : "Sin leer"}
                    </div>
                  </div>
                  {r.is_read ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Mail className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>


      <div className="px-6 pt-4 pb-2">
        <h2 className="text-xl font-semibold">{data.thread.subject}</h2>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {others.map((p: any) => {
            const pr = data.profiles.get(p.user_id);
            return <Badge key={p.user_id} variant="outline" className="text-[11px]">{pr?.display_name || "Usuario"}</Badge>;
          })}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {(data.messages as any[]).map((m: any) => {
          const isSys = !!m.is_system;
          const sys = isSys ? data.systemSenders.get(m.system_sender_key) : null;
          const pr = !isSys ? data.profiles.get(m.sender_id) : null;
          const senderName = isSys ? (sys?.display_name || "Sistema") : (pr?.display_name || "Usuario");
          return (
            <div key={m.id} className={`rounded-lg border p-4 ${isSys ? "bg-primary/5 border-primary/20" : "bg-card"}`}>
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-9 w-9">
                  {isSys ? (
                    <AvatarFallback className="bg-primary/10 text-primary"><Bot className="h-4 w-4" /></AvatarFallback>
                  ) : (
                    <>
                      <AvatarImage src={pr?.avatar_url || undefined} />
                      <AvatarFallback>{(pr?.display_name || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </>
                  )}
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {senderName}
                    {isSys && <Badge variant="outline" className="text-[9px] h-4 px-1">Sistema</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{format(new Date(m.created_at), "PPp", { locale: es })}</div>
                </div>
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</div>
              {m.attachments?.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {m.attachments.map((a: any) => {
                      const kind = attachmentKind(a.mime_type, a.file_name);
                      const url = urls[a.id];
                      return (
                        <div key={a.id} className="border rounded-md overflow-hidden bg-background">
                          {kind === "image" && url ? (
                            <button onClick={() => openAttachment(a)} className="block w-full">
                              <img src={url} alt={a.file_name} className="w-full h-32 object-cover" />
                            </button>
                          ) : kind === "pdf" ? (
                            <button onClick={() => openAttachment(a)} className="flex items-center justify-center h-32 w-full bg-red-50 dark:bg-red-950/20">
                              <FileText className="h-10 w-10 text-red-500" />
                            </button>
                          ) : (
                            <button onClick={() => openAttachment(a)} className="flex items-center justify-center h-32 w-full bg-muted">
                              {kind === "image" ? <ImageIcon className="h-10 w-10 text-muted-foreground" /> : <Paperclip className="h-10 w-10 text-muted-foreground" />}
                            </button>
                          )}
                          <div className="flex items-center gap-1 p-2 text-xs">
                            <span className="flex-1 truncate" title={a.file_name}>{a.file_name}</span>
                            <span className="text-muted-foreground shrink-0">{(a.file_size / 1024).toFixed(0)} KB</span>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openAttachment(a)} title="Vista previa">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => downloadAttachment(a)} title="Descargar">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <MensajeComposer open={replyOpen} onOpenChange={setReplyOpen} initial={replyInitial()} />

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {preview && preview.kind !== "other" && (
            <AssetPreview url={preview.url} kind={preview.kind as any} filename={preview.name} className={
              preview.kind === "image" ? "w-full max-h-[80vh] object-contain bg-black" :
              preview.kind === "pdf" ? "w-full h-[80vh] border-0" :
              preview.kind === "video" ? "w-full max-h-[80vh] bg-black" :
              "w-full"
            } />
          )}
          <div className="flex items-center justify-between p-3 border-t bg-background">
            <span className="text-sm truncate">{preview?.name}</span>
            <Button size="sm" variant="outline" onClick={() => preview && openAssetSafe({ url: preview.url, filename: preview.name, download: true })}>
              <Download className="h-4 w-4 mr-1" /> Descargar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
