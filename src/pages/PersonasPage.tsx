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
  MessageSquare, LayoutGrid, Table2, PanelLeftClose, PanelLeftOpen, Eye,
} from "lucide-react";
import { Icon } from "@/design-system/primitives/Icon";
import { toast } from "sonner";
import PersonaFormDialog from "@/components/forms/PersonaFormDialog";
import DeletePersonaDialog from "@/components/persona/DeletePersonaDialog";
import ExportDropdown from "@/components/shared/ExportDropdown";
import ExportPersonasDialog from "@/components/forms/ExportPersonasDialog";
import ImportPersonasDialog from "@/components/forms/ImportPersonasDialog";
import PersonaQuickView from "@/components/persona/PersonaQuickView";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SlidersHorizontal } from "lucide-react";
import { usePersonas, useDeletePersona } from "@/hooks/useDatabase";
import { useCan } from "@/hooks/useCan";
import { useActiveRole } from "@/hooks/useActiveRole";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useRolePermissions } from "@/hooks/useRolePermissions";
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
  const { activeRole } = useActiveRole();
  const { isLoading: rolesLoading } = useUserRoles();
  const { isLoading: permissionOverridesLoading, isError: permissionOverridesError } = useRolePermissions();
  const can = useCan();
  const canEdit = can("personas:edit");
  const canCreate = can("personas:create");
  const canDelete = can("personas:delete");
  const permissionsReady = !rolesLoading && (!permissionOverridesLoading || permissionOverridesError);
  const dock = useContextDock();
  const { push: pushRecent } = useRecentEntities();
  const { pins, toggle } = useUserPins();

  const [segment, setSegment] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"nombre" | "recientes">("recientes");
  const [viewMode, setViewMode] = useState<"cards" | "tabla">(() => {
    return (localStorage.getItem("personas_view_mode") as "cards" | "tabla") || "cards";
  });
  const [railOpen, setRailOpen] = useState(true);

  const handleViewModeChange = (mode: "cards" | "tabla") => {
    setViewMode(mode);
    localStorage.setItem("personas_view_mode", mode);
  };

  // Columnas de exportación seleccionables
  const ALL_EXPORT_COLS = useMemo(() => ([
    { header: "Nombres", key: "nombres" },
    { header: "Apellidos", key: "apellidos" },
    { header: "Documento", key: "documento" },
    { header: "Teléfono", key: "telefono" },
    { header: "WhatsApp", key: "whatsapp" },
    { header: "Email", key: "email" },
    { header: "Tipo", key: "tipo_persona" },
    { header: "Grupo", key: "grupoNombre" },
    { header: "Estado", key: "estado_iglesia" },
    { header: "Dirección", key: "direccion" },
    { header: "Nacimiento", key: "fecha_nacimiento" },
    { header: "Ingreso", key: "fecha_ingreso" },
  ]), []);
  const [selectedCols, setSelectedCols] = useState<string[]>(
    ["nombres", "apellidos", "telefono", "email", "tipo_persona", "grupoNombre", "estado_iglesia"]
  );

  const [autoNewOpen, setAutoNewOpen] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1"
  );
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const handleCreated = (p: any) => {
    if (!p?.id) return;
    setHighlightId(p.id);
    setSortBy("recientes");
    setPage(1);
    setSearch("");
    setSegment("todos");
    setTimeout(() => {
      document.getElementById(`persona-card-${p.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    setTimeout(() => setHighlightId((cur) => (cur === p.id ? null : cur)), 4000);
  };

  useEffect(() => {
    const state = location.state as any;
    if (state?.estadoFilter) {
      setEstado(state.estadoFilter === "Inactivo" ? "Inactivo" : state.estadoFilter);
      window.history.replaceState({}, "");
    }
    const sp = new URLSearchParams(location.search);
    if (sp.get("new") === "1") {
      setAutoNewOpen(true);
      if (!permissionsReady) return;
      if (!canCreate) {
        toast.error("No tienes permiso para crear personas", {
          id: "personas-create-permission-denied",
          description: "La pantalla se abrirá, pero el backend solo guardará si tu rol tiene personas:create.",
        });
      }
      sp.delete("new");
      navigate({ pathname: location.pathname, search: sp.toString() ? `?${sp.toString()}` : "" }, { replace: true });
    }
  }, [location.pathname, location.search, canCreate, permissionsReady, navigate]);

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
  // Datos filtrados listos para exportar (respeta segmento, estado, búsqueda, orden)
  const exportData = useMemo(
    () => filtered.map((p: any) => ({ ...p, grupoNombre: p.grupos?.nombre || "" })),
    [filtered]
  );
  const exportColumns = useMemo(
    () => ALL_EXPORT_COLS.filter(c => selectedCols.includes(c.key)),
    [ALL_EXPORT_COLS, selectedCols]
  );
  const exportFilters = { segmento: segment, estado, busqueda: search, orden: sortBy };

  if (isLoading) {
    return (
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        {(canCreate || autoNewOpen) && (
          <PersonaFormDialog open={autoNewOpen} onOpenChange={setAutoNewOpen} onCreated={handleCreated} />
        )}
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
      {(canCreate || autoNewOpen) && (
        <PersonaFormDialog open={autoNewOpen} onOpenChange={setAutoNewOpen} onCreated={handleCreated} />
      )}

      {/* Rail izquierdo — segmentos */}
      <aside className={cn(
        "hidden lg:flex flex-col shrink-0 rounded-xl border bg-card overflow-hidden transition-all duration-200",
        railOpen ? "w-60" : "w-14 items-center"
      )}>
        <div className={cn("px-4 py-3 border-b flex items-center justify-between w-full", !railOpen && "px-2 justify-center")}>
          {railOpen ? (
            <div>
              <div className="doxa-caption uppercase tracking-wider text-muted-foreground font-bold">Vistas</div>
              <div className="doxa-caption text-muted-foreground mt-0.5">
                {activeRole === "lider_red" ? "Personas de tu red" : "Toda la comunidad"}
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRailOpen(true)} title="Expandir vistas">
              <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 w-full">
          {SMART_SEGMENTS.map((s) => (
            <SegmentBtn key={s.id} seg={s} active={segment === s.id} count={segmentCount(s)} collapsed={!railOpen} onClick={() => setSegment(s.id)} />
          ))}
          <div className={cn("px-2 py-2 doxa-caption uppercase tracking-wider font-bold text-muted-foreground/70", !railOpen && "text-center text-[10px]")}>
            {railOpen ? "Por tipo" : "Tipo"}
          </div>
          {TIPO_SEGMENTS.map((s) => (
            <SegmentBtn key={s.id} seg={s} active={segment === s.id} count={segmentCount(s)} collapsed={!railOpen} onClick={() => setSegment(s.id)} />
          ))}
          {pins.filter((p) => p.kind === "persona").length > 0 && (
            <>
              <div className={cn("px-2 py-2 doxa-caption uppercase tracking-wider font-bold text-muted-foreground/70", !railOpen && "hidden")}>Anclados</div>
              {pins.filter((p) => p.kind === "persona").slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(p.to)}
                  title={p.label}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md doxa-caption text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                    railOpen ? "px-3 py-2" : "p-2 justify-center"
                  )}
                >
                  <Icon icon={Star} size="xs" className="text-amber-500 fill-amber-400 shrink-0" />
                  {railOpen && <span className="flex-1 truncate text-left">{p.label}</span>}
                </button>
              ))}
            </>
          )}
        </div>
      </aside>

      {/* Panel central */}
      <section className="flex-1 flex flex-col min-w-0 rounded-xl border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-3 border-b bg-background/40 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex h-8 w-8 shrink-0"
              onClick={() => setRailOpen(!railOpen)}
              title={railOpen ? "Contraer panel de vistas" : "Expandir panel de vistas"}
            >
              <Icon icon={railOpen ? PanelLeftClose : PanelLeftOpen} size="xs" />
            </Button>
            <Icon icon={activeSegment.icon} size="sm" className="text-primary shrink-0" />
            <h2 className="doxa-body-sm font-semibold truncate">{activeSegment.label}</h2>
            <Badge variant="secondary" className="doxa-caption shrink-0">{filtered.length}</Badge>

            <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

            {/* Selector de Vista (Tarjetas / Tabla) */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border shrink-0">
              <Button
                variant={viewMode === "cards" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5"
                onClick={() => handleViewModeChange("cards")}
                title="Vista de Tarjetas"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tarjetas</span>
              </Button>
              <Button
                variant={viewMode === "tabla" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5"
                onClick={() => handleViewModeChange("tabla")}
                title="Vista de Tabla"
              >
                <Table2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tabla</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0 justify-end">
            <div className="relative flex-1 sm:flex-initial min-w-[140px]">
              <Icon icon={Search} size="xs" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full sm:w-44 lg:w-56 doxa-caption h-8"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted">
                  <Icon icon={X} size="xs" className="text-muted-foreground" />
                </button>
              )}
            </div>

            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="w-32 sm:w-36 doxa-caption h-8">
                <Icon icon={Filter} size="xs" className="mr-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos estados</SelectItem>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
                <SelectItem value="En proceso">En proceso</SelectItem>
              </SelectContent>
            </Select>

            <Button size="sm" variant="ghost" className="gap-1 doxa-caption h-8 px-2"
              onClick={() => setSortBy((s) => s === "nombre" ? "recientes" : "nombre")}>
              <Icon icon={ArrowUpDown} size="xs" />
              <span className="hidden sm:inline">{sortBy === "nombre" ? "A–Z" : "Recientes"}</span>
            </Button>

            <div className="h-4 w-px bg-border mx-0.5 hidden sm:block" />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 px-2.5" title="Columnas de exportación">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">Columnas</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3 space-y-2">
                <p className="doxa-caption font-semibold">Columnas a exportar</p>
                <p className="doxa-caption text-muted-foreground">{selectedCols.length} de {ALL_EXPORT_COLS.length}</p>
                <div className="max-h-64 overflow-auto space-y-1 pr-1">
                  {ALL_EXPORT_COLS.map(c => (
                    <label key={c.key} className="flex items-center gap-2 py-1 doxa-caption cursor-pointer hover:bg-muted rounded px-1">
                      <Checkbox
                        checked={selectedCols.includes(c.key)}
                        onCheckedChange={(v) => setSelectedCols(prev =>
                          v ? [...prev, c.key] : prev.filter(k => k !== c.key)
                        )}
                      />
                      {c.header}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" variant="ghost" className="flex-1 doxa-caption"
                    onClick={() => setSelectedCols(ALL_EXPORT_COLS.map(c => c.key))}>Todas</Button>
                  <Button size="sm" variant="ghost" className="flex-1 doxa-caption"
                    onClick={() => setSelectedCols([])}>Ninguna</Button>
                </div>
              </PopoverContent>
            </Popover>

            <ExportDropdown
              title="Personas"
              filename={`personas${segment !== "todos" ? "_" + segment.replace(":", "-") : ""}${estado !== "all" ? "_" + estado : ""}`}
              columns={exportColumns.length ? exportColumns : ALL_EXPORT_COLS.slice(0, 7)}
              data={exportData}
              filters={exportFilters}
            />
            <ExportPersonasDialog />
            {canCreate && <ImportPersonasDialog />}
            {canCreate && <PersonaFormDialog onCreated={handleCreated} />}
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

        {/* Contenido: Galería de personas o Tabla */}
        <div className="flex-1 overflow-auto p-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="Sin resultados"
              description="Ajusta los filtros o la vista para encontrar personas."
              action={canCreate ? <PersonaFormDialog onCreated={handleCreated} /> : undefined}
            />
          ) : viewMode === "tabla" ? (
            <div className="overflow-x-auto border rounded-xl bg-card">
              <table className="w-full text-left doxa-caption border-collapse">
                <thead className="bg-muted/60 border-b sticky top-0 z-10 font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <Checkbox
                        checked={pageItems.length > 0 && pageItems.every((p: any) => selected.has(p.id))}
                        onCheckedChange={(v) => {
                          if (v) {
                            setSelected(new Set([...selected, ...pageItems.map((p: any) => p.id)]));
                          } else {
                            const copy = new Set(selected);
                            pageItems.forEach((p: any) => copy.delete(p.id));
                            setSelected(copy);
                          }
                        }}
                      />
                    </th>
                    <th className="p-3">Persona</th>
                    <th className="p-3">Teléfono</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Grupo</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Fecha Alta</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-card">
                  {pageItems.map((p: any) => {
                    const isSel = selected.has(p.id);
                    const initials = `${p.nombres?.[0] ?? ""}${p.apellidos?.[0] ?? ""}`.toUpperCase();
                    const tipos = getTipos(p);
                    const estado = p.estado_iglesia || "—";
                    const estadoTone =
                      estado === "Activo" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" :
                      estado === "Inactivo" ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20" :
                      "bg-amber-500/15 text-amber-700 dark:text-amber-500 border-amber-500/20";

                    return (
                      <tr
                        key={p.id}
                        onClick={() => openQuickView(p)}
                        onDoubleClick={() => navigate(`/personas/${p.id}`)}
                        className={cn(
                          "hover:bg-muted/50 transition-colors cursor-pointer",
                          isSel && "bg-primary/5"
                        )}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={isSel} onCheckedChange={() => toggleSelect(p.id)} />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground hover:underline truncate max-w-[220px]" title={`${p.nombres} ${p.apellidos}`}>
                                {p.nombres} {p.apellidos}
                              </div>
                              {p.documento && (
                                <div className="text-xs text-muted-foreground">Doc: {p.documento}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {p.telefono ? (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Icon icon={Phone} size="xs" />
                              <span>{p.telefono}</span>
                              <a
                                href={`https://web.whatsapp.com/send?phone=${(p.telefono || "").replace(/\D/g, "")}`}
                                target="_blank" rel="noopener noreferrer"
                                title="Abrir WhatsApp"
                                onClick={(e) => e.stopPropagation()}
                                className="ml-1 p-1 hover:bg-muted rounded text-emerald-600"
                              >
                                <Icon icon={MessageSquare} size="xs" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          {p.email ? (
                            <div className="flex items-center gap-1.5 text-muted-foreground max-w-[220px] truncate" title={p.email}>
                              <Icon icon={Mail} size="xs" className="shrink-0" />
                              <span className="truncate">{p.email}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {p.grupos?.nombre ? (
                            <Badge variant="outline" className="font-normal" title={p.grupos.nombre}>{p.grupos.nombre}</Badge>
                          ) : (
                            <span className="text-muted-foreground/50">Sin grupo</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {tipos.slice(0, 2).map((t) => (
                              <Badge key={t} variant="secondary" className="font-normal text-[11px] px-1.5 py-0">{t}</Badge>
                            ))}
                            {tipos.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{tipos.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={cn("px-2 py-0.5 rounded-full border text-xs font-medium", estadoTone)}>
                            {estado}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap text-muted-foreground">
                          {p.created_at ? format(new Date(p.created_at), "dd MMM yyyy") : "—"}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              title="Ver perfil"
                              onClick={() => navigate(`/personas/${p.id}`)}
                            >
                              <Icon icon={Eye} size="xs" />
                            </Button>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                title="Editar"
                                onClick={() => setEditing({ ...p })}
                              >
                                <Icon icon={Pencil} size="xs" className="text-muted-foreground" />
                              </Button>
                            )}
                            {canDelete && (
                              <DeletePersonaDialog
                                personaId={p.id}
                                personaNombre={`${p.nombres} ${p.apellidos}`}
                                onConfirm={() => handleDelete(p.id)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
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
                    id={`persona-card-${p.id}`}
                    onClick={() => openQuickView(p)}
                    onDoubleClick={() => navigate(`/personas/${p.id}`)}
                    className={cn(
                      "group relative rounded-2xl border bg-gradient-to-br from-card to-muted/30 overflow-hidden cursor-pointer",
                      "hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200",
                      isSel && "ring-2 ring-primary border-primary/40",
                      highlightId === p.id && "ring-2 ring-emerald-500 border-emerald-500/50 animate-pulse"
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
                          <div className="font-semibold doxa-body-sm leading-tight truncate" title={`${p.nombres} ${p.apellidos}`}>
                            {p.nombres} {p.apellidos}
                          </div>
                          <div className="doxa-caption text-muted-foreground mt-0.5 truncate" title={p.grupos?.nombre || "Sin grupo"}>
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
                          <div className="flex items-center gap-2 truncate" title={p.telefono}>
                            <Icon icon={Phone} size="xs" />
                            <span className="truncate">{p.telefono}</span>
                          </div>
                        )}
                        {p.email && (
                          <div className="flex items-center gap-2 truncate" title={p.email}>
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
                            <DeletePersonaDialog
                              personaId={p.id}
                              personaNombre={`${p.nombres} ${p.apellidos}`}
                              onConfirm={() => handleDelete(p.id)}
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
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-t bg-background/40 doxa-caption text-muted-foreground shrink-0">
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

function SegmentBtn({ seg, active, count, collapsed, onClick }: { seg: Segment; active: boolean; count: number; collapsed?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={`${seg.label} (${count})`}
      className={cn(
        "w-full flex items-center gap-2 rounded-md doxa-caption transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
        collapsed ? "p-2 justify-center" : "px-3 py-2"
      )}
    >
      <Icon icon={seg.icon} size="xs" className={cn("shrink-0", active && "text-primary")} />
      {!collapsed && <span className="flex-1 text-left truncate">{seg.label}</span>}
      {!collapsed && <span className={cn("doxa-caption tabular-nums", active ? "text-primary" : "text-muted-foreground/70")}>{count}</span>}
    </button>
  );
}
