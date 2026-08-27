import { useState, useMemo, lazy, Suspense } from "react";
import { LayoutGrid, KanbanSquare, Map as MapIcon, Calendar as CalendarIcon, Table2, Users, Pencil, MapPin, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import { cn } from "@/lib/utils";

const MapaGruposContent = lazy(() => import("@/pages/MapaGruposPage"));

type ViewMode = "cards" | "kanban" | "mapa" | "calendario" | "tabla";

const VIEWS: Array<{ id: ViewMode; label: string; icon: any }> = [
  { id: "cards", label: "Cards", icon: LayoutGrid },
  { id: "kanban", label: "Kanban", icon: KanbanSquare },
  { id: "mapa", label: "Mapa", icon: MapIcon },
  { id: "calendario", label: "Calendario", icon: CalendarIcon },
  { id: "tabla", label: "Tabla", icon: Table2 },
];

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const norm = (s: any) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function healthFor(g: any): { pct: number; label: string; tone: string } {
  const m = g.miembrosCount || 0;
  if (g.estado === "Inactivo") return { pct: 10, label: "Cerrado", tone: "bg-rose-500" };
  if (m === 0) return { pct: 25, label: "Nuevo", tone: "bg-amber-500" };
  if (m < 5) return { pct: 55, label: "En riesgo", tone: "bg-amber-500" };
  if (m < 12) return { pct: 80, label: "Saludable", tone: "bg-emerald-500" };
  return { pct: 100, label: "Excelente", tone: "bg-emerald-600" };
}

interface Props {
  grupos: any[];
  onOpen: (id: string) => void;
  onEdit?: (g: any) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export default function GruposViewSwitcher({ grupos, onOpen, onEdit, onDelete, canEdit, canDelete }: Props) {
  const [view, setView] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = norm(search.trim());
    return grupos.filter((g) => {
      if (tipoFilter !== "all" && g.tipo !== tipoFilter) return false;
      if (!q) return true;
      return (
        norm(`${g.nombre} ${g.liderNombre} ${g.red}`).includes(q)
      );
    });
  }, [grupos, search, tipoFilter]);

  const tipos = useMemo(() => {
    const set = new Set(grupos.map((g) => g.tipo).filter(Boolean));
    return Array.from(set);
  }, [grupos]);

  return (
    <div className="space-y-4">
      {/* Barra de vista */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 max-w-full overflow-x-auto no-scrollbar shrink-0">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12.5px] font-medium transition-all shrink-0",
                view === v.id
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <v.icon className="h-3.5 w-3.5" /> {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Input
            placeholder="Buscar grupo, líder, red…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar grupo, líder o red"
            className="h-8 w-full sm:w-56 text-[12.5px]"
          />
          {tipos.length > 1 && (
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 max-w-full overflow-x-auto shrink-0">
              <button
                onClick={() => setTipoFilter("all")}
                aria-pressed={tipoFilter === "all"}
                className={cn("px-2.5 h-7 rounded-md text-[11.5px] shrink-0", tipoFilter === "all" ? "bg-card shadow-sm" : "text-muted-foreground")}
              >
                Todos
              </button>
              {tipos.map((t) => (
                <button
                  key={t}
                  onClick={() => setTipoFilter(t)}
                  aria-pressed={tipoFilter === t}
                  className={cn("px-2.5 h-7 rounded-md text-[11.5px] shrink-0", tipoFilter === t ? "bg-card shadow-sm" : "text-muted-foreground")}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>


      {view === "cards" && <CardsView grupos={filtered} onOpen={onOpen} onEdit={onEdit} canEdit={canEdit} />}
      {view === "kanban" && <KanbanView grupos={filtered} onOpen={onOpen} />}
      {view === "mapa" && (
        <div className="rounded-xl border overflow-hidden bg-card">
          <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
            <MapaGruposContent />
          </Suspense>
        </div>
      )}
      {view === "calendario" && <CalendarView grupos={filtered} onOpen={onOpen} />}
      {view === "tabla" && (
        <DataTable
          data={filtered}
          searchKey="nombre"
          columns={[
            {
              key: "nombre", label: "Grupo",
              render: (g: any) => (
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onOpen(g.id)}>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm hover:underline">{g.nombre}</p>
                    <p className="text-xs text-muted-foreground">{g.tipo}</p>
                  </div>
                </div>
              ),
            },
            { key: "red", label: "Red", render: (g: any) => g.red || "—" },
            { key: "liderNombre", label: "Líder" },
            { key: "dia_reunion", label: "Día", render: (g: any) => `${g.dia_reunion || "—"} ${g.hora_reunion || ""}` },
            { key: "miembrosCount", label: "Miembros" },
            { key: "estado", label: "Estado", render: (g: any) => <StatusBadge status={g.estado} /> },
            {
              key: "actions", label: "",
              render: (g: any) => (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {canEdit && onEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit({ ...g })}><Pencil className="h-4 w-4" /></Button>}
                  {canDelete && onDelete && <DeleteConfirmDialog onConfirm={() => onDelete(g.id)} title="¿Eliminar grupo?" description={`Se eliminará "${g.nombre}" permanentemente.`} />}
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

/* ------- Vistas ------- */

function CardsView({ grupos, onOpen, onEdit, canEdit }: { grupos: any[]; onOpen: (id: string) => void; onEdit?: (g: any) => void; canEdit?: boolean }) {
  if (grupos.length === 0) {
    return <EmptyState />;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
      {grupos.map((g) => {
        const health = healthFor(g);
        return (
          <div
            key={g.id}
            onClick={() => onOpen(g.id)}
            className="group relative rounded-2xl border bg-gradient-to-br from-card to-muted/20 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 transition-all"
          >
            <div className="h-1.5 bg-muted">
              <div className={cn("h-full transition-all", health.tone)} style={{ width: `${health.pct}%` }} />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{g.red || "Sin red"}</span>
                    <span className="text-[10px] text-muted-foreground/50">·</span>
                    <span className="text-[10px] text-muted-foreground">{g.tipo}</span>
                  </div>
                  <h3 className="font-semibold text-[15px] line-clamp-2 break-words mt-0.5" title={g.nombre}>{g.nombre}</h3>
                </div>
                <StatusBadge status={g.estado} />
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{health.label}</span>
                <span>· {health.pct}%</span>
              </div>

              <div className="mt-3 space-y-1.5 text-[11.5px] text-muted-foreground">
                <div className="flex items-center gap-1.5 truncate">
                  <Users className="h-3 w-3 shrink-0" />
                  <span className="truncate">{g.liderNombre || "Sin líder"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>{g.dia_reunion || "—"} {g.hora_reunion || ""}</span>
                </div>
                {(g.direccion || g.barrio) && (
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{g.barrio || g.direccion}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1">
                    {Array.from({ length: Math.min(4, g.miembrosCount || 0) }).map((_, i) => (
                      <div key={i} className="h-5 w-5 rounded-full bg-primary/15 border-2 border-card" />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold">{g.miembrosCount || 0}</span>
                  <span className="text-[10px] text-muted-foreground">miembros</span>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {canEdit && onEdit && (
                    <button onClick={() => onEdit({ ...g })} className="p-1.5 rounded-md hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                  <button onClick={() => onOpen(g.id)} className="text-[11px] font-medium text-primary hover:underline">
                    Abrir →
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanView({ grupos, onOpen }: { grupos: any[]; onOpen: (id: string) => void }) {
  const columns = useMemo(() => {
    const buckets: Record<string, any[]> = {
      "Nuevo": [],
      "En riesgo": [],
      "Saludable": [],
      "Excelente": [],
      "Cerrado": [],
    };
    grupos.forEach((g) => {
      const h = healthFor(g);
      (buckets[h.label] || (buckets[h.label] = [])).push(g);
    });
    return Object.entries(buckets);
  }, [grupos]);

  return (
    <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto pb-3 snap-x max-w-full scrollbar-none">
      {columns.map(([label, items]) => (
        <div key={label} className="w-[260px] sm:w-auto shrink-0 snap-start rounded-xl border bg-muted/30 flex flex-col min-h-[300px]">
          <div className="px-3 py-2.5 border-b flex items-center justify-between bg-card/50 rounded-t-xl">
            <span className="text-[12px] font-semibold">{label}</span>
            <Badge variant="secondary" className="h-5 text-[10px]">{items.length}</Badge>
          </div>
          <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px]">
            {items.map((g: any) => (
              <div
                key={g.id}
                onClick={() => onOpen(g.id)}
                className="p-3 rounded-lg bg-card border hover:shadow-md hover:border-primary/30 cursor-pointer transition-all"
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{g.red || "—"}</div>
                <div className="font-medium text-[13px] mt-0.5 truncate">{g.nombre}</div>
                <div className="mt-2 flex items-center justify-between text-[10.5px] text-muted-foreground">
                  <span className="truncate">{g.liderNombre}</span>
                  <span className="inline-flex items-center gap-0.5"><Users className="h-3 w-3" />{g.miembrosCount || 0}</span>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-[11px] text-muted-foreground/60 text-center py-4">Sin grupos</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarView({ grupos, onOpen }: { grupos: any[]; onOpen: (id: string) => void }) {
  const porDia = useMemo(() => {
    const map: Record<string, any[]> = {};
    DIAS.forEach((d) => (map[d] = []));
    map["Sin día"] = [];
    grupos.forEach((g) => {
      const d = g.dia_reunion && DIAS.includes(g.dia_reunion) ? g.dia_reunion : "Sin día";
      map[d].push(g);
    });
    return map;
  }, [grupos]);

  return (
    <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2 overflow-x-auto pb-3 snap-x max-w-full scrollbar-none">
      {[...DIAS, "Sin día"].map((dia) => {
        const items = porDia[dia];
        return (
          <div key={dia} className="w-[240px] sm:w-auto shrink-0 snap-start rounded-xl border bg-card overflow-hidden flex flex-col min-h-[220px]">
            <div className="px-3 py-2 border-b bg-primary/5 flex items-center justify-between">
              <span className="text-[11.5px] font-semibold">{dia}</span>
              <span className="text-[10px] text-muted-foreground">{items.length}</span>
            </div>
            <div className="flex-1 p-2 space-y-1.5 overflow-y-auto max-h-[500px]">
              {items
                .sort((a: any, b: any) => (a.hora_reunion || "").localeCompare(b.hora_reunion || ""))
                .map((g: any) => (
                  <button
                    key={g.id}
                    onClick={() => onOpen(g.id)}
                    className="w-full text-left p-2 rounded-md bg-muted/40 hover:bg-muted border-l-2 border-primary/60 transition-colors"
                  >
                    <div className="text-[10.5px] font-mono text-primary">{g.hora_reunion || "—"}</div>
                    <div className="text-[12px] font-medium truncate">{g.nombre}</div>
                    <div className="text-[10.5px] text-muted-foreground truncate">{g.liderNombre}</div>
                  </button>
                ))}
              {items.length === 0 && (
                <div className="text-[10.5px] text-muted-foreground/60 text-center py-3">Sin reuniones</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 px-8 py-14 flex flex-col items-center justify-center text-center animate-fade-in">
      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent/10 via-accent/5 to-transparent ring-1 ring-accent/15 flex items-center justify-center mb-4">
        <Users className="h-5 w-5 text-accent" strokeWidth={1.75} />
      </div>
      <h3 className="font-semibold text-[15px] text-foreground">Sin grupos</h3>
      <p className="text-[13px] text-muted-foreground max-w-md mt-1.5">
        Ajusta los filtros para ampliar la búsqueda o crea un nuevo grupo desde el panel principal.
      </p>
    </div>
  );
}

