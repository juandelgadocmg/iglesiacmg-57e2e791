import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Inbox, Send, FileText, Star, AlertCircle, Archive, Trash2, Plus, Search, Mail, MailOpen, Bot,
  ClipboardList, Calendar, BookMarked, X, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  useThreads, useDrafts, useDeleteDraft, useUnreadCount, useSystemSenders, useBulkUpdateFlags,
  type Folder, type ThreadRow,
} from "@/hooks/useMensajes";
import MensajeComposer from "@/components/mensajes/MensajeComposer";
import MensajeThreadView from "@/components/mensajes/MensajeThreadView";
import MensajeTemplatesPanel from "@/components/mensajes/MensajeTemplatesPanel";
import MensajeScheduledPanel from "@/components/mensajes/MensajeScheduledPanel";
import MensajeAuditPanel from "@/components/mensajes/MensajeAuditPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

type View = "folder" | "templates" | "scheduled" | "audit";

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

const PAGE_SIZE = 25;

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Ayer";
  return format(d, "d MMM", { locale: es });
}

export default function MensajesPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>("folder");
  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<"all" | "subject" | "from" | "body">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitial, setComposerInitial] = useState<any>(undefined);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [accumulated, setAccumulated] = useState<ThreadRow[]>([]);

  // Reset accumulation + selection whenever filters change
  const filterKey = `${folder}|${search}|${searchField}|${dateFrom}|${dateTo}`;
  useEffect(() => {
    setAccumulated([]);
    setChecked(new Set());
    setPage(0);
  }, [filterKey]);

  const { data: threadsResult, isLoading, isFetching } = useThreads({
    folder, search, searchField, page, pageSize: PAGE_SIZE,
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : null,
    dateTo: dateTo ? new Date(dateTo + "T23:59:59").toISOString() : null,
  });
  const total = threadsResult?.total || 0;

  // Merge new page into accumulated list (dedupe by id, preserve order)
  useEffect(() => {
    const rows = threadsResult?.rows;
    if (!rows) return;
    setAccumulated((prev) => {
      if (page === 0) return rows;
      const seen = new Set(prev.map((r) => r.id));
      const merged = [...prev];
      for (const r of rows) if (!seen.has(r.id)) merged.push(r);
      return merged;
    });
  }, [threadsResult, page]);

  const threads = accumulated;
  const canLoadMore = threads.length < total;

  const { data: drafts = [] } = useDrafts();
  const deleteDraft = useDeleteDraft();
  const { data: unread = 0 } = useUnreadCount();
  const { data: sysSenders = [] } = useSystemSenders();
  const sysMap = new Map(sysSenders.map((s) => [s.key, s]));
  const bulkFlags = useBulkUpdateFlags();

  const EXTRA_VIEWS: { id: View; label: string; icon: any }[] = [
    { id: "templates", label: "Plantillas", icon: BookMarked },
    { id: "scheduled", label: "Programados", icon: Calendar },
    { id: "audit", label: "Auditoría", icon: ClipboardList },
  ];

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allVisibleChecked = threads.length > 0 && threads.every((t) => checked.has(t.id));
  const toggleCheckAll = () => {
    setChecked((prev) => {
      if (allVisibleChecked) return new Set();
      const next = new Set(prev);
      threads.forEach((t) => next.add(t.id));
      return next;
    });
  };

  const bulkApply = async (patch: Parameters<typeof bulkFlags.mutate>[0]["patch"], label: string, removeFromList = false) => {
    const ids = Array.from(checked);
    if (!ids.length) return;
    try {
      await bulkFlags.mutateAsync({ threadIds: ids, patch });
      toast.success(`${ids.length} hilo(s) — ${label}`);
      if (removeFromList) {
        setAccumulated((prev) => prev.filter((t) => !checked.has(t.id)));
      } else {
        // Merge patch into local rows so UI reflects immediately
        setAccumulated((prev) => prev.map((t) => checked.has(t.id) ? { ...t, ...patch } as ThreadRow : t));
      }
      setChecked(new Set());
    } catch (e: any) { toast.error(e.message || "Error"); }
  };

  const sidebar = (
    <div className="flex flex-col h-full w-60 border-r bg-muted/30">
      <div className="p-3">
        <Button className="w-full" onClick={() => { setComposerInitial(undefined); setComposerOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo mensaje
        </Button>
      </div>
      <nav className="px-2 space-y-0.5">
        {FOLDERS.map((f) => {
          const active = view === "folder" && folder === f.id;
          const showBadge = f.id === "inbox" && unread > 0;
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              onClick={() => { setView("folder"); setFolder(f.id); setSelected(null); }}
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
        <div className="border-t my-2" />
        {EXTRA_VIEWS.map((v) => {
          const active = view === v.id;
          const Icon = v.icon;
          return (
            <button key={v.id}
              onClick={() => { setView(v.id); setSelected(null); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                active ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-accent"
              )}>
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{v.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  const bulkBar = folder !== "drafts" && checked.size > 0 && (
    <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b bg-primary/5">
      <span className="text-xs font-medium mr-2">{checked.size} seleccionado(s)</span>
      <Button size="sm" variant="ghost" onClick={() => bulkApply({ is_read: true }, "marcados como leídos")}>
        <MailOpen className="h-3.5 w-3.5 mr-1" /> Leído
      </Button>
      <Button size="sm" variant="ghost" onClick={() => bulkApply({ is_read: false }, "marcados como no leídos")}>
        <Mail className="h-3.5 w-3.5 mr-1" /> No leído
      </Button>
      {folder !== "archived" && (
        <Button size="sm" variant="ghost" onClick={() => bulkApply({ is_archived: true }, "archivados", true)}>
          <Archive className="h-3.5 w-3.5 mr-1" /> Archivar
        </Button>
      )}
      {folder === "archived" && (
        <Button size="sm" variant="ghost" onClick={() => bulkApply({ is_archived: false }, "restaurados", true)}>
          <Inbox className="h-3.5 w-3.5 mr-1" /> Restaurar
        </Button>
      )}
      {folder !== "deleted" ? (
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => bulkApply({ is_deleted: true }, "eliminados", true)}>
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => bulkApply({ is_deleted: false }, "restaurados", true)}>
          <Inbox className="h-3.5 w-3.5 mr-1" /> Restaurar
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => bulkApply({ is_important: true }, "marcados como importantes")}>
        <AlertCircle className="h-3.5 w-3.5 mr-1" /> Importante
      </Button>
      <div className="flex-1" />
      <Button size="sm" variant="ghost" onClick={() => setChecked(new Set())}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  const listPanel = (
    <div className="flex-1 flex flex-col border-r min-w-0">
      <div className="p-3 border-b space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en mensajes…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={searchField} onValueChange={(v: any) => setSearchField(v)}>
            <SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo</SelectItem>
              <SelectItem value="subject">Asunto</SelectItem>
              <SelectItem value="from">Remitente</SelectItem>
              <SelectItem value="body">Contenido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="text-muted-foreground shrink-0">Desde</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs" />
          <label className="text-muted-foreground shrink-0">Hasta</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs" />
          {(dateFrom || dateTo) && (
            <Button size="sm" variant="ghost" className="h-8" onClick={() => { setDateFrom(""); setDateTo(""); }}>Limpiar</Button>
          )}
        </div>
        {folder !== "drafts" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={allVisibleChecked}
              onCheckedChange={toggleCheckAll}
              aria-label="Seleccionar todos"
            />
            <span>Seleccionar todos ({threads.length}{total > threads.length ? ` de ${total}` : ""})</span>
          </div>
        )}
      </div>
      {bulkBar}
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
        ) : isLoading && threads.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Cargando…</div>
        ) : threads.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No hay mensajes en esta carpeta</div>
        ) : (
          <>
            {threads.map((t) => {
              const isActive = selected === t.id;
              const isChecked = checked.has(t.id);
              const others = t.participants.filter((p) => p.user_id !== user?.id);
              const isSystem = !!t.last_message?.is_system;
              const sys = isSystem ? sysMap.get(t.last_message?.system_sender_key || "") : null;
              const headline = isSystem
                ? sys?.display_name || "Sistema"
                : others.map((o) => o.display_name).filter(Boolean).slice(0, 2).join(", ") || "Yo";
              return (
                <div
                  key={t.id}
                  className={cn(
                    "w-full text-left px-3 py-3 border-b flex gap-2 transition-colors",
                    isActive ? "bg-primary/10" : "hover:bg-accent/40",
                    isChecked && "bg-primary/5",
                    !t.is_read && !isActive && "bg-blue-50/40 dark:bg-blue-950/20"
                  )}
                >
                  <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isChecked} onCheckedChange={() => toggleCheck(t.id)} aria-label="Seleccionar hilo" />
                  </div>
                  <button onClick={() => setSelected(t.id)} className="flex-1 flex gap-3 min-w-0 text-left">
                    <Avatar className="h-9 w-9 mt-0.5 shrink-0">
                      {isSystem ? (
                        <AvatarFallback className="bg-primary/10 text-primary"><Bot className="h-4 w-4" /></AvatarFallback>
                      ) : (
                        <>
                          <AvatarImage src={others[0]?.avatar_url || undefined} />
                          <AvatarFallback>{(others[0]?.display_name || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm truncate", !t.is_read ? "font-semibold" : "font-medium")}>{headline}</span>
                        {isSystem && <Badge variant="outline" className="h-4 text-[9px] px-1">Sistema</Badge>}
                        {t.is_important && <AlertCircle className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                        {t.is_favorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />}
                        <span className="ml-auto text-[11px] text-muted-foreground shrink-0">{formatDate(t.last_message_at)}</span>
                      </div>
                      <div className={cn("text-sm truncate", !t.is_read ? "font-medium" : "text-muted-foreground")}>{t.subject}</div>
                      <div className="text-xs text-muted-foreground truncate">{t.last_message?.body || "—"}</div>
                    </div>
                  </button>
                </div>
              );
            })}
            {canLoadMore && (
              <div className="p-3 flex justify-center">
                <Button size="sm" variant="outline" disabled={isFetching} onClick={() => setPage((p) => p + 1)}>
                  {isFetching ? "Cargando…" : (<><ChevronDown className="h-3.5 w-3.5 mr-1" /> Cargar más ({total - threads.length} restantes)</>)}
                </Button>
              </div>
            )}
            {!canLoadMore && threads.length > 0 && (
              <div className="p-4 text-center text-[11px] text-muted-foreground">
                Mostrando {threads.length} de {total}
              </div>
            )}
          </>
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
        {view !== "folder" ? (
          <div className="flex-1 min-w-0">
            {view === "templates" && <MensajeTemplatesPanel onUse={(t) => {
              setComposerInitial({ subject: t.subject, body: t.body });
              setComposerOpen(true);
            }} />}
            {view === "scheduled" && <MensajeScheduledPanel />}
            {view === "audit" && <MensajeAuditPanel />}
          </div>
        ) : !isMobile ? (
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
