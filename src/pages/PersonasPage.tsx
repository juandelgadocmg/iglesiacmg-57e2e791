import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Search, Phone, Mail, Filter, X, ChevronLeft, ChevronRight,
  Cake, UsersRound, Sparkles, UserX, Pencil, Star, ArrowUpDown, MoreHorizontal,
  MessageSquare,
} from "lucide-react";
import { Icon } from "@/design-system/primitives/Icon";
import { toast } from "sonner";
import PersonaFormDialog from "@/components/forms/PersonaFormDialog";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import ExportDropdown from "@/components/shared/ExportDropdown";
import ExportPersonasDialog from "@/components/forms/ExportPersonasDialog";
import ImportPersonasDialog from "@/components/forms/ImportPersonasDialog";
import PersonaQuickView from "@/components/persona/PersonaQuickView";
import { usePersonas, useDeletePersona } from "@/hooks/useDatabase";
import { useUserRoles } from "@/hooks/useUserRoles";
import { canPerform } from "@/lib/permissions";
import { useActiveRole } from "@/hooks/useActiveRole";
import { useContextDock } from "@/components/layout/context-dock/ContextDock";
import { useRecentEntities } from "@/hooks/useRecentEntities";
import { useUserPins } from "@/hooks/useUserPins";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import EmptyState from "@/components/shared/EmptyState";

type Segment = {
  id: string;
  label: string;
  icon: any;
  filter: (p: any) => boolean;
};

const norm = (s: any) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const onlyDigits = (s: any) => String(s ?? "").replace(/\D/g, "");
const getTipos = (p: any) => [p.tipo_persona, ...(Array.isArray(p.tipos_persona) ? p.tipos_persona : [])].filter(Boolean);
const hasTipo = (p: any, tipo: string) => getTipos(p).some((t: string) => norm(t) === norm(tipo));

const SMART_SEGMENTS: Segment[] = [
  { id: "todos",       label: "Todas las personas", icon: Users,     filter: () => true },
  { id: "nuevos",      label: "Nuevos (30 días)",   icon: Sparkles,  filter: (p) => p.created_at && (Date.now() - new Date(p.created_at).getTime()) < 30 * 86400000 },
  { id: "sin-grupo",   label: "Sin grupo",          icon: UserX,     filter: (p) => !(p.grupo_id || p.grupos?.id) },
  { id: "cumples",     label: "Cumpleaños del mes", icon: Cake,      filter: (p) => p.fecha_nacimiento && new Date(p.fecha_nacimiento).getMonth() === new Date().getMonth() },
  { id: "inactivos",   label: "Inactivos",          icon: UserX,     filter: (p) => p.estado_iglesia === "Inactivo" },
];

const TIPO_SEGMENTS: Segment[] = [
  "Miembro","Visitante","Líder","Servidor","CDP","Discípulo",
  "Líder Casa de Paz","Líder de Red","Maestro Seminario","Estudiante Seminario",
].map((t) => ({ id: `tipo:${t}`, label: t, icon: UsersRound, filter: (p) => hasTipo(p, t) }));

const PAGE_SIZE = 20;

export default function PersonasPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: personas, isLoading } = usePersonas();
  const deletePersona = useDeletePersona();
  const [editing, setEditing] = useState<any>(null);
  const { roles } = useUserRoles();
  const { activeRole } = useActiveRole();
  const canEdit = canPerform(roles, "personas:edit");
  const canCreate = canPerform(roles, "personas:create");
  const canDelete = canPerform(roles, "personas:delete");
  const dock = useContextDock();
  const { push: pushRecent } = useRecentEntities();
  const { pins, toggle } = useUserPins();

  const [segment, setSegment] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"nombre" | "recientes">("recientes");

  const [autoNewOpen, setAutoNewOpen] = useState(false);

  useEffect(() => {
    const state = location.state as any;
    if (state?.estadoFilter) {
      setEstado(state.estadoFilter === "Inactivo" ? "Inactivo" : state.estadoFilter);
      window.history.replaceState({}, "");
    }
    const sp = new URLSearchParams(location.search);
    if (sp.get("new") === "1" && canCreate) {
      setAutoNewOpen(true);
      sp.delete("new");
      navigate({ pathname: location.pathname, search: sp.toString() ? `?${sp.toString()}` : "" }, { replace: true });
    }
  }, [location.search, canCreate]);

  const activeSegment = useMemo(
    () => [...SMART_SEGMENTS, ...TIPO_SEGMENTS].find((s) => s.id === segment) || SMART_SEGMENTS[0],
    [segment]
  );

  const filtered = useMemo(() => {
    if (!personas) return [];
    const q = norm(search.trim());
    const qDigits = onlyDigits(search);
    let list = personas.filter((p: any) => {
      if (!activeSegment.filter(p)) return false;
      if (estado !== "all" && p.estado_iglesia !== estado) return false;
      if (q) {
        const hay = norm(`${p.nombres ?? ""} ${p.apellidos ?? ""} ${p.email ?? ""} ${p.documento ?? ""}`);
        const phones = `${onlyDigits(p.telefono)} ${onlyDigits(p.whatsapp)}`;
        if (!hay.includes(q) && !(qDigits.length >= 3 && phones.includes(qDigits))) return false;
      }
      return true;
    });
    if (sortBy === "nombre") {
      list = [...list].sort((a: any, b: any) =>
        `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, "es")
      );
    } else {
      list = [...list].sort((a: any, b: any) =>
        (b.created_at || "").localeCompare(a.created_at || "")
      );
    }
    return list;
  }, [personas, activeSegment, estado, search, sortBy]);

  useEffect(() => setPage(1), [segment, search, estado, sortBy]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const openQuickView = (p: any) => {
    pushRecent({ id: `persona:${p.id}`, kind: "persona", label: `${p.nombres} ${p.apellidos}`, to: `/personas/${p.id}` });
    dock.open(`${p.nombres} ${p.apellidos}`, <PersonaQuickView persona={p} onEdit={(pe) => { dock.close(); setEditing({ ...pe }); }} />);
  };

  const handleDelete = async (id: string) => {
    try { await deletePersona.mutateAsync(id); toast.success("Persona eliminada"); }
    catch { toast.error("Error al eliminar"); }
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const segmentCount = (seg: Segment) => (personas || []).filter(seg.filter).length;
  const tableData = (personas || []).map((p: any) => ({ ...p, grupoNombre: p.grupos?.nombre || "" }));

  if (isLoading) {
    return (
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        <Skeleton className="w-56 h-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 md:gap-6 h-[calc(100vh-6.5rem)] min-h-[560px]">
      {editing && <PersonaFormDialog initialData={editing} onClose={() => setEditing(null)} />}
      {canCreate && (
        <PersonaFormDialog open={autoNewOpen} onOpenChange={setAutoNewOpen} />
      )}

      {/* Rail izquierdo — segmentos */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <div className="doxa-caption uppercase tracking-wider text-muted-foreground font-bold">Vistas</div>
          <div className="doxa-caption text-muted-foreground mt-1">
            {activeRole === "lider_red" ? "Personas de tu red" : "Toda la comunidad"}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {SMART_SEGMENTS.map((s) => (
            <SegmentBtn key={s.id} seg={s} active={segment === s.id} count={segmentCount(s)} onClick={() => setSegment(s.id)} />
          ))}
          <div className="px-2 py-2 doxa-caption uppercase tracking-wider font-bold text-muted-foreground/70">Por tipo</div>
          {TIPO_SEGMENTS.map((s) => (
            <SegmentBtn key={s.id} seg={s} active={segment === s.id} count={segmentCount(s)} onClick={() => setSegment(s.id)} />
          ))}
          {pins.filter((p) => p.kind === "persona").length > 0 && (
            <>
              <div className="px-2 py-2 doxa-caption uppercase tracking-wider font-bold text-muted-foreground/70">Anclados</div>
              {pins.filter((p) => p.kind === "persona").slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(p.to)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md doxa-caption text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Icon icon={Star} size="xs" className="text-amber-500 fill-amber-400" />
                  <span className="flex-1 truncate text-left">{p.label}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </aside>

      {/* Panel central */}
      <section className="flex-1 flex flex-col min-w-0 rounded-xl border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/40">
          <div className="flex items-center gap-2 min-w-0">
            <Icon icon={activeSegment.icon} size="sm" className="text-primary" />
            <h2 className="doxa-body-sm font-semibold truncate">{activeSegment.label}</h2>
            <Badge variant="secondary" className="doxa-caption shrink-0">{filtered.length}</Badge>
          </div>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-2">
            <div className="relative">
              <Icon icon={Search} size="xs" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64 doxa-caption"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted">
                  <Icon icon={X} size="xs" className="text-muted-foreground" />
                </button>
              )}
            </div>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="w-36 doxa-caption">
                <Icon icon={Filter} size="xs" className="mr-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos estados</SelectItem>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
                <SelectItem value="En proceso">En proceso</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="gap-1 doxa-caption"
              onClick={() => setSortBy((s) => s === "nombre" ? "recientes" : "nombre")}>
              <Icon icon={ArrowUpDown} size="xs" />
              {sortBy === "nombre" ? "A–Z" : "Recientes"}
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <ExportDropdown title="Personas" filename="personas" columns={[
              { header: "Nombres", key: "nombres" }, { header: "Apellidos", key: "apellidos" },
              { header: "Teléfono", key: "telefono" }, { header: "Email", key: "email" },
              { header: "Tipo", key: "tipo_persona" }, { header: "Grupo", key: "grupoNombre" },
              { header: "Estado", key: "estado_iglesia" },
            ]} data={tableData} />
            <ExportPersonasDialog />
            {canCreate && <ImportPersonasDialog />}
            {canCreate && <PersonaFormDialog />}
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b">
          <div className="relative flex-1">
            <Icon icon={Search} size="xs" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 doxa-caption" />
          </div>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-44 doxa-caption"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...SMART_SEGMENTS, ...TIPO_SEGMENTS].map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Galería de personas */}
        <div className="flex-1 overflow-auto p-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="Sin resultados"
              description="Ajusta los filtros o la vista para encontrar personas."
              action={canCreate ? <PersonaFormDialog /> : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {pageItems.map((p: any) => {
                const tipos = getTipos(p);
                const isSel = selected.has(p.id);
                const pinnedId = `persona:${p.id}`;
                const pinned = pins.some((x) => x.id === pinnedId);
                const initials = `${p.nombres?.[0] ?? ""}${p.apellidos?.[0] ?? ""}`.toUpperCase();
                const estado = p.estado_iglesia || "—";
                const estadoTone =
                  estado === "Activo" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" :
                  estado === "Inactivo" ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20" :
                  "bg-amber-500/15 text-amber-700 dark:text-amber-500 border-amber-500/20";
                return (
                  <div
                    key={p.id}
                    onClick={() => openQuickView(p)}
                    onDoubleClick={() => navigate(`/personas/${p.id}`)}
                    className={cn(
                      "group relative rounded-2xl border bg-gradient-to-br from-card to-muted/30 overflow-hidden cursor-pointer",
                      "hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200",
                      isSel && "ring-2 ring-primary border-primary/40"
                    )}
                  >
                    {/* banda superior con color por estado */}
                    <div className={cn(
                      "h-16 relative",
                      estado === "Activo" ? "bg-gradient-to-r from-emerald-500/20 via-primary/15 to-primary/25" :
                      estado === "Inactivo" ? "bg-gradient-to-r from-rose-500/20 via-muted to-muted/40" :
                      "bg-gradient-to-r from-amber-400/20 via-primary/10 to-primary/20"
                    )}>
                      <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSel} onCheckedChange={() => toggleSelect(p.id)} className="bg-background/80 backdrop-blur" />
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          title={pinned ? "Desanclar" : "Anclar"}
                          onClick={() => toggle({ id: pinnedId, kind: "persona", label: `${p.nombres} ${p.apellidos}`, to: `/personas/${p.id}` })}
                          className="p-2 rounded-full bg-background/80 backdrop-blur hover:bg-background transition-colors"
                        >
                          <Icon icon={Star} size="xs" className={cn(pinned ? "fill-amber-400 text-amber-500" : "text-muted-foreground")} />
                        </button>
                      </div>
                    </div>

                    {/* avatar sobresaliente */}
                    <div className="px-4 -mt-8 relative">
                      <Avatar className="h-16 w-16 ring-4 ring-card shadow-md">
                        <AvatarFallback className="doxa-body font-bold bg-gradient-to-br from-primary/20 to-primary/40 text-primary">
                          {initials || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* cuerpo */}
                    <div className="px-4 pt-3 pb-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold doxa-body-sm leading-tight truncate">
                            {p.nombres} {p.apellidos}
                          </div>
                          <div className="doxa-caption text-muted-foreground mt-0.5 truncate">
                            {p.grupos?.nombre || "Sin grupo"}
                          </div>
                        </div>
                        <span className={cn("doxa-caption px-2 py-0.5 rounded-full border font-medium shrink-0", estadoTone)}>
                          {estado}
                        </span>
                      </div>

                      {/* tipos */}
                      {tipos.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tipos.slice(0, 3).map((t) => (
                            <Badge key={t} variant="secondary" className="doxa-caption px-2 py-0 font-normal">{t}</Badge>
                          ))}
                          {tipos.length > 3 && (
                            <span className="doxa-caption text-muted-foreground self-center">+{tipos.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* contacto */}
                      <div className="mt-3 space-y-1 doxa-caption text-muted-foreground">
                        {p.telefono && (
                          <div className="flex items-center gap-2 truncate">
                            <Icon icon={Phone} size="xs" />
                            <span className="truncate">{p.telefono}</span>
                          </div>
                        )}
                        {p.email && (
                          <div className="flex items-center gap-2 truncate">
                            <Icon icon={Mail} size="xs" />
                            <span className="truncate">{p.email}</span>
                          </div>
                        )}
                        {p.created_at && (
                          <div className="doxa-caption text-muted-foreground/70 pt-1">
                            Alta {format(new Date(p.created_at), "dd MMM yy")}
                          </div>
                        )}
                      </div>

                      {/* acciones hover */}
                      <div
                        className="mt-3 pt-3 border-t flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          {p.telefono && (
                            <a
                              title="WhatsApp"
                              href={`https://web.whatsapp.com/send?phone=${(p.telefono || "").replace(/\D/g, "")}`}
                              target="_blank" rel="noopener noreferrer"
                              className="p-2 rounded-md hover:bg-muted text-emerald-600"
                            >
                              <Icon icon={MessageSquare} size="xs" />
                            </a>
                          )}
                          {canEdit && (
                            <button title="Editar" onClick={() => setEditing({ ...p })} className="p-2 rounded-md hover:bg-muted">
                              <Icon icon={Pencil} size="xs" className="text-muted-foreground" />
                            </button>
                          )}
                          {canDelete && (
                            <DeleteConfirmDialog
                              onConfirm={() => handleDelete(p.id)}
                              title="¿Eliminar persona?"
                              description={`Se eliminará a ${p.nombres} ${p.apellidos} permanentemente.`}
                            />
                          )}
                        </div>
                        <button
                          onClick={() => navigate(`/personas/${p.id}`)}
                          className="doxa-caption font-medium text-primary hover:underline"
                        >
                          Ver perfil →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


        {/* Footer paginación */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-t bg-background/40 doxa-caption text-muted-foreground">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
              {selected.size > 0 && <span className="ml-3 text-primary font-medium">· {selected.size} seleccionadas</span>}
            </span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <Icon icon={ChevronLeft} size="xs" />
              </Button>
              <span className="tabular-nums px-1">{page} / {totalPages}</span>
              <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <Icon icon={ChevronRight} size="xs" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Barra flotante de acciones bulk */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border bg-card shadow-lg px-4 py-2">
          <span className="doxa-caption font-medium px-1">{selected.size} seleccionadas</span>
          <div className="w-px h-5 bg-border" />
          <Button size="sm" variant="ghost" className="gap-1 doxa-caption" onClick={() => setSelected(new Set())}>
            Limpiar
          </Button>
          <Button size="sm" variant="ghost" className="gap-1 doxa-caption"
            onClick={() => toast.info("Acción masiva próximamente")}>
            <Icon icon={MoreHorizontal} size="xs" /> Acción
          </Button>
        </div>
      )}
    </div>
  );
}

function SegmentBtn({ seg, active, count, onClick }: { seg: Segment; active: boolean; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-md doxa-caption transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon icon={seg.icon} size="xs" className={cn(active && "text-primary")} />
      <span className="flex-1 text-left truncate">{seg.label}</span>
      <span className={cn("doxa-caption tabular-nums", active ? "text-primary" : "text-muted-foreground/70")}>{count}</span>
    </button>
  );
}
