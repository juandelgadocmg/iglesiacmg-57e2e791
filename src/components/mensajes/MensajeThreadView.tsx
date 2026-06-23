import { useEffect, useState } from "react";
import { useThread, useUpdateFlag, getAttachmentUrl } from "@/hooks/useMensajes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Archive, Trash2, CornerUpLeft, Forward, Paperclip, AlertCircle, Mail, MailOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MensajeComposer from "./MensajeComposer";

interface Props {
  threadId: string;
  onClose?: () => void;
}

export default function MensajeThreadView({ threadId }: Props) {
  const { user } = useAuth();
  const { data, isLoading } = useThread(threadId);
  const updateFlag = useUpdateFlag();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyMode, setReplyMode] = useState<"reply" | "replyAll" | "forward">("reply");

  // Mark as read on open
  useEffect(() => {
    if (threadId) updateFlag.mutate({ threadId, patch: { is_read: true } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  if (isLoading || !data?.thread) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando…</div>;
  }

  const self = data.participants.find((p: any) => p.user_id === user?.id);
  const others = data.participants.filter((p: any) => p.user_id !== user?.id);
  const fromIds = others.map((o: any) => o.user_id);

  const replyInitial = () => {
    const lastMsg = [...data.messages].reverse()[0];
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
      recipients: replyMode === "replyAll" ? fromIds : (lastMsg ? [lastMsg.sender_id].filter((id) => id !== user?.id) : []),
      replyThreadId: threadId,
    };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
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
      </div>

      {/* Subject */}
      <div className="px-6 pt-4 pb-2">
        <h2 className="text-xl font-semibold">{data.thread.subject}</h2>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {others.map((p: any) => {
            const pr = data.profiles.get(p.user_id);
            return <Badge key={p.user_id} variant="outline" className="text-[11px]">{pr?.display_name || "Usuario"}</Badge>;
          })}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {data.messages.map((m: any) => {
          const pr = data.profiles.get(m.sender_id);
          return (
            <div key={m.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={pr?.avatar_url || undefined} />
                  <AvatarFallback>{(pr?.display_name || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm font-medium">{pr?.display_name || "Usuario"}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(m.created_at), "PPp", { locale: es })}</div>
                </div>
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</div>
              {m.attachments?.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div className="space-y-1">
                    {m.attachments.map((a: any) => (
                      <button
                        key={a.id}
                        onClick={async () => {
                          const url = await getAttachmentUrl(a.file_path);
                          if (url) window.open(url, "_blank");
                        }}
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {a.file_name}
                        <span className="text-xs text-muted-foreground">({Math.round(a.file_size / 1024)} KB)</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <MensajeComposer open={replyOpen} onOpenChange={setReplyOpen} initial={replyInitial()} />
    </div>
  );
}
