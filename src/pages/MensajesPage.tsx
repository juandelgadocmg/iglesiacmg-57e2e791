import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Inbox, Send, FileText, Star, AlertCircle, Archive, Trash2, Plus, Search, Mail, MailOpen, Bot,
  ClipboardList, Calendar, BookMarked, X, ChevronDown,
} from "lucide-react";
import ShareLinkButton from "@/components/shared/ShareLinkButton";
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
  const [searchParams, setSearchParams] = useSearchParams();

  const initialView = (searchParams.get("view") as View) || "folder";
  const initialFolder = (searchParams.get("folder") as Folder) || "inbox";
  const [view, setView] = useState<View>(initialView);
  const [folder, setFolder] = useState<Folder>(initialFolder);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [searchField, setSearchField] = useState<"all" | "subject" | "from" | "body">(
    (searchParams.get("field") as any) || "all"
  );
  const [dateFrom, setDateFrom] = useState<string>(searchParams.get("from") || "");
  const [dateTo, setDateTo] = useState<string>(searchParams.get("to") || "");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(searchParams.get("t") || null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitial, setComposerInitial] = useState<any>(undefined);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [accumulated, setAccumulated] = useState<ThreadRow[]>([]);

  // Track previous "navigational" state to decide push vs replace so that
  // browser Back/Forward cleanly reverses view/folder/thread changes without
  // flooding history on every keystroke of the search box.
  const prevNavRef = useRef({ view, folder, selected });
  // Sync state -> URL (shareable link)
  useEffect(() => {
    const next = new URLSearchParams();
    if (view !== "folder") next.set("view", view);
    if (view === "folder" && folder !== "inbox") next.set("folder", folder);
    if (search) next.set("q", search);
    if (searchField !== "all") next.set("field", searchField);
    if (dateFrom) next.set("from", dateFrom);
    if (dateTo) next.set("to", dateTo);
    if (selected) next.set("t", selected);
    // Preserve existing list scroll (ly) — persisted separately below
    const ly = searchParams.get("ly");
    if (ly) next.set("ly", ly);
    const prev = prevNavRef.current;
    const isNavChange =
      prev.view !== view || prev.folder !== folder || prev.selected !== selected;
    prevNavRef.current = { view, folder, selected };
    setSearchParams(next, { replace: !isNavChange });
  }, [view, folder, search, searchField, dateFrom, dateTo, selected, setSearchParams, searchParams]);

  // React to Back/Forward — pull state out of the URL without flicker
  useEffect(() => {
    const urlView = (searchParams.get("view") as View) || "folder";
    const urlFolder = (searchParams.get("folder") as Folder) || "inbox";
    const urlSelected = searchParams.get("t");
    if (urlView !== view) setView(urlView);
    if (urlFolder !== folder) setFolder(urlFolder);
    if ((urlSelected || null) !== selected) setSelected(urlSelected || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ─── Thread list scroll persistence (survives Back navigation + shareable) ───
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const listScrollKey = `doxa:mensajes-list-scroll:${folder}|${search}|${searchField}|${dateFrom}|${dateTo}`;
  useEffect(() => {
    const root = listScrollRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLDivElement>("[data-radix-scroll-area-viewport]");
    if (!viewport) return;
    // Restore: prefer explicit ?ly= from a shared/back link, else session
    const fromUrl = searchParams.get("ly");
    const stored = fromUrl ?? sessionStorage.getItem(listScrollKey);
    const y = stored ? parseInt(stored, 10) : NaN;
    if (!Number.isNaN(y)) {
      requestAnimationFrame(() => viewport.scrollTo({ top: y, behavior: "auto" }));
    }
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        try { sessionStorage.setItem(listScrollKey, String(Math.round(viewport.scrollTop))); } catch {}
      });
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listScrollKey, accumulated.length]);


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

  type BulkPatch = Parameters<typeof bulkFlags.mutate>[0]["patch"];
  const [confirmState, setConfirmState] = useState<null | { title: string; description: string; onConfirm: () => void }>(null);

  const doBulk = async (ids: string[], patch: BulkPatch, label: string, removeFromList: boolean) => {
    // Snapshot rows for undo (in case removed from view)
    const snapshot = accumulated.filter((t) => ids.includes(t.id));
    try {
      const res: any = await bulkFlags.mutateAsync({ threadIds: ids, patch });
      const updated: string[] = res?.updatedIds || [];
      const skipped: string[] = res?.skippedIds || [];
      const updatedSet = new Set(updated);
      if (removeFromList) {
        setAccumulated((prev) => prev.filter((t) => !updatedSet.has(t.id)));
      } else {
        setAccumulated((prev) => prev.map((t) => (updatedSet.has(t.id) ? ({ ...t, ...patch } as ThreadRow) : t)));
      }
      setChecked(new Set());

      const summary = skipped.length
        ? `${updated.length} ${label} · ${skipped.length} sin cambios`
        : `${updated.length} ${label}`;

      if (updated.length > 0) {
        // Build inverse patch for undo
        const invert: BulkPatch = {};
        (Object.keys(patch) as (keyof BulkPatch)[]).forEach((k) => {
          if (k === "is_read" || k === "is_important" || k === "is_favorite" || k === "is_archived" || k === "is_deleted") {
            (invert as any)[k] = !(patch as any)[k];
          }
        });
        toast.success(summary, {
          duration: 6000,
          action: {
            label: "Deshacer",
            onClick: async () => {
              try {
                const r: any = await bulkFlags.mutateAsync({ threadIds: updated, patch: invert });
                const restored: string[] = r?.updatedIds || [];
                const rSet = new Set(restored);
                if (removeFromList) {
                  setAccumulated((prev) => {
                    const map = new Map(prev.map((t) => [t.id, t]));
                    for (const s of snapshot) if (rSet.has(s.id) && !map.has(s.id)) map.set(s.id, s);
                    return Array.from(map.values());
                  });
                } else {
                  setAccumulated((prev) => prev.map((t) => (rSet.has(t.id) ? ({ ...t, ...invert } as ThreadRow) : t)));
                }
                toast.success(`Acción deshecha (${restored.length})`);
              } catch (e: any) {
                toast.error(e.message || "No se pudo deshacer");
              }
            },
          },
        });
      } else {
        toast.error(`No se aplicaron cambios${skipped.length ? ` (${skipped.length} sin permisos o ya en ese estado)` : ""}`);
      }
      if (res?.error) toast.error(res.error);
    } catch (e: any) {
      toast.error(e.message || "Error");
    }
  };

  const bulkApply = (patch: BulkPatch, label: string, removeFromList = false, confirm?: { title: string; description: string }) => {
    const ids = Array.from(checked);
    if (!ids.length) return;
    if (confirm) {
      setConfirmState({
        title: confirm.title,
        description: confirm.description.replace("{n}", String(ids.length)),
        onConfirm: () => doBulk(ids, patch, label, removeFromList),
      });
      return;
    }
    void doBulk(ids, patch, label, removeFromList);
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
        <Button size="sm" variant="ghost" onClick={() => bulkApply({ is_archived: true }, "archivado(s)", true, {
          title: "¿Archivar seleccionados?",
          description: "Se archivarán {n} hilo(s). Podrás deshacer esta acción o restaurarlos desde Archivados.",
        })}>
          <Archive className="h-3.5 w-3.5 mr-1" /> Archivar
        </Button>
      )}
      {folder === "archived" && (
        <Button size="sm" variant="ghost" onClick={() => bulkApply({ is_archived: false }, "restaurado(s)", true)}>
          <Inbox className="h-3.5 w-3.5 mr-1" /> Restaurar
        </Button>
      )}
      {folder !== "deleted" ? (
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => bulkApply({ is_deleted: true }, "eliminado(s)", true, {
          title: "¿Enviar a Eliminados?",
          description: "Se moverán {n} hilo(s) a la carpeta Eliminados. Podrás deshacer o restaurarlos desde ahí.",
        })}>
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => bulkApply({ is_deleted: false }, "restaurado(s)", true)}>
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
          <ShareLinkButton
            toastMessage="Enlace de Correo interno copiado"
            buildUrl={() => {
              const p = new URLSearchParams();
              if (view !== "folder") p.set("view", view);
              if (view === "folder" && folder !== "inbox") p.set("folder", folder);
              if (search) p.set("q", search);
              if (searchField !== "all") p.set("field", searchField);
              if (dateFrom) p.set("from", dateFrom);
              if (dateTo) p.set("to", dateTo);
              if (selected) p.set("t", selected);
              const qs = p.toString();
              return `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
            }}
          />
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
    <div className="flex flex-col h-[calc(100dvh-4rem)] min-h-0 overflow-hidden">
      <div className="px-3 md:px-6 pt-3 md:pt-4 shrink-0">
        <PageHeader title="Correo Interno" description="Mensajería interna del seminario" />
      </div>
      <div className="flex-1 flex min-h-0 mt-2 border-t overflow-hidden">
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
              <div
                className="overflow-x-auto whitespace-nowrap px-2 py-2 flex gap-2 border-b w-full snap-x snap-mandatory"
                role="tablist"
                aria-label="Carpetas de correo"
              >
                {FOLDERS.map((f) => (
                  <Button
                    key={f.id}
                    size="sm"
                    variant={folder === f.id ? "default" : "outline"}
                    onClick={() => setFolder(f.id)}
                    role="tab"
                    aria-selected={folder === f.id}
                    className="min-h-11 px-4 snap-start focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <f.icon className="h-4 w-4 mr-1.5" />
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              className="m-3 min-h-11"
              onClick={() => { setComposerInitial(undefined); setComposerOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-1" /> Nuevo mensaje
            </Button>

            {listPanel}
          </div>
        )}
      </div>
      <MensajeComposer open={composerOpen} onOpenChange={setComposerOpen} initial={composerInitial} />
      <AlertDialog open={!!confirmState} onOpenChange={(o) => !o && setConfirmState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmState?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const fn = confirmState?.onConfirm; setConfirmState(null); fn?.(); }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
