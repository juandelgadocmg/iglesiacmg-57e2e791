import { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Inbox, Send, FileText, Star, AlertCircle, Archive, Trash2, Plus, Search, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useThreads, useDrafts, useDeleteDraft, useUnreadCount, type Folder } from "@/hooks/useMensajes";
import MensajeComposer from "@/components/mensajes/MensajeComposer";
import MensajeThreadView from "@/components/mensajes/MensajeThreadView";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";

const FOLDERS: { id: Folder; label: string; icon: any }[] = [
  { id: "inbox", label: "Entrada", icon: Inbox },
  { id: "unread", label: "No leídos", icon: Mail },
  { id: "sent", label: "Enviados", icon: Send },
  { id: "drafts", label: "Borradores", icon: FileText },
  { id: "important", label: "Importantes", icon: AlertCircle },
  { id: "favorites", label: "Favoritos", icon: Star },
  { id: "archived", label: "Archivados", icon: Archive },
  { id: "deleted", label: "Eliminados", icon: Trash2 },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Ayer";
  return format(d, "d MMM", { locale: es });
}

export default function MensajesPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitial, setComposerInitial] = useState<any>(undefined);

  const { data: threads = [], isLoading } = useThreads(folder, search);
  const { data: drafts = [] } = useDrafts();
  const deleteDraft = useDeleteDraft();
  const { data: unread = 0 } = useUnreadCount();

  const sidebar = (
    <div className="flex flex-col h-full w-60 border-r bg-muted/30">
      <div className="p-3">
        <Button className="w-full" onClick={() => { setComposerInitial(undefined); setComposerOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo mensaje
        </Button>
      </div>
      <nav className="px-2 space-y-0.5">
        {FOLDERS.map((f) => {
          const active = folder === f.id;
          const showBadge = f.id === "inbox" && unread > 0;
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              onClick={() => { setFolder(f.id); setSelected(null); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                active ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{f.label}</span>
              {showBadge && <Badge variant="default" className="h-5 px-1.5 text-[10px]">{unread}</Badge>}
              {f.id === "drafts" && drafts.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{drafts.length}</Badge>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );

  const listPanel = (
    <div className="flex-1 flex flex-col border-r min-w-0">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en mensajes…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {folder === "drafts" ? (
          drafts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No tienes borradores</div>
          ) : (
            drafts.map((d: any) => (
              <div key={d.id} className="px-4 py-3 border-b flex items-center gap-3 hover:bg-accent/40">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.subject || "(sin asunto)"}</div>
                  <div className="text-xs text-muted-foreground truncate">{d.body || "Sin contenido"}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => {
                  setComposerInitial({
                    draftId: d.id, subject: d.subject, body: d.body,
                    recipients: Array.isArray(d.recipients) ? d.recipients : [],
                    replyThreadId: d.reply_thread_id,
                  });
                  setComposerOpen(true);
                }}>Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => deleteDraft.mutate(d.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )
        ) : isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Cargando…</div>
        ) : threads.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No hay mensajes en esta carpeta</div>
        ) : (
          threads.map((t) => {
            const isActive = selected === t.id;
            const others = t.participants.filter((p) => p.user_id !== user?.id);
            const headline = others.map((o) => o.display_name).filter(Boolean).slice(0, 2).join(", ") || "Yo";
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b flex gap-3 transition-colors",
                  isActive ? "bg-primary/10" : "hover:bg-accent/40",
                  !t.is_read && !isActive && "bg-blue-50/40 dark:bg-blue-950/20"
                )}
              >
                <Avatar className="h-9 w-9 mt-0.5">
                  <AvatarImage src={others[0]?.avatar_url || undefined} />
                  <AvatarFallback>{(others[0]?.display_name || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm truncate", !t.is_read ? "font-semibold" : "font-medium")}>{headline}</span>
                    {t.is_important && <AlertCircle className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                    {t.is_favorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />}
                    <span className="ml-auto text-[11px] text-muted-foreground shrink-0">{formatDate(t.last_message_at)}</span>
                  </div>
                  <div className={cn("text-sm truncate", !t.is_read ? "font-medium" : "text-muted-foreground")}>{t.subject}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.last_message?.body || "—"}</div>
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );

  const detailPanel = selected ? (
    <MensajeThreadView threadId={selected} onClose={() => setSelected(null)} />
  ) : (
    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
      Selecciona un mensaje para ver su contenido
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-6 pt-4">
        <PageHeader title="Correo Interno" description="Mensajería interna del seminario" />
      </div>
      <div className="flex-1 flex min-h-0 mt-2 border-t">
        {!isMobile && sidebar}
        {!isMobile ? (
          <>
            {listPanel}
            <div className="flex-1 flex flex-col min-w-0">{detailPanel}</div>
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            {selected ? (
              <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
                <SheetContent side="right" className="w-full sm:w-[90%] p-0 overflow-hidden">
                  <MensajeThreadView threadId={selected} onClose={() => setSelected(null)} />
                </SheetContent>
              </Sheet>
            ) : null}
            <div className="flex">
              <div className="overflow-x-auto whitespace-nowrap px-2 py-2 flex gap-2 border-b w-full">
                {FOLDERS.map((f) => (
                  <Button
                    key={f.id}
                    size="sm"
                    variant={folder === f.id ? "default" : "outline"}
                    onClick={() => setFolder(f.id)}
                  >
                    <f.icon className="h-3.5 w-3.5 mr-1" />
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button className="m-3" onClick={() => { setComposerInitial(undefined); setComposerOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo mensaje
            </Button>
            {listPanel}
          </div>
        )}
      </div>
      <MensajeComposer open={composerOpen} onOpenChange={setComposerOpen} initial={composerInitial} />
    </div>
  );
}
