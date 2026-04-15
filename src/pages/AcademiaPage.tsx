import { useState, useMemo, useCallback, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import MetricCard from "@/components/shared/MetricCard";
import CursoFormDialog from "@/components/forms/CursoFormDialog";
import PeriodoFormDialog from "@/components/forms/PeriodoFormDialog";
import MateriaFormDialog from "@/components/forms/MateriaFormDialog";
import MatriculaFormDialog from "@/components/forms/MatriculaFormDialog";
import AulaFormDialog from "@/components/forms/AulaFormDialog";
import CorteFormDialog from "@/components/forms/CorteFormDialog";
import ItemCalificableFormDialog from "@/components/forms/ItemCalificableFormDialog";
import ConceptoPagoFormDialog from "@/components/forms/ConceptoPagoFormDialog";
import RecursoFormDialog from "@/components/forms/RecursoFormDialog";
import HomologacionFormDialog from "@/components/forms/HomologacionFormDialog";
import MaestroFormDialog from "@/components/academia/MaestroFormDialog";
import MaestroSearchPickerShared from "@/components/academia/MaestroSearchPicker";
import HistorialCalificacionesSection from "@/components/academia/HistorialCalificacionesSection";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import MateriaAttendanceTrendChart from "@/components/charts/MateriaAttendanceTrendChart";
import ExportDropdown from "@/components/shared/ExportDropdown";
import ImportAcademiaDialog from "@/components/forms/ImportAcademiaDialog";
import {
  useEscuelas, useAllMatriculas, useCertificados, usePeriodos,
  useMaterias, useMatriculas, useUpdateMatricula, useCreateCertificado,
  useUpdatePeriodo, useDeleteMateria, useUpdateMateria, useAllPeriodos,
  useAulas, useUpdateAula, useDeleteAula,
  useCortes, useAllItemsByCorte, useDeleteCorte, useDeleteItemCalificable,
  useCalificacionesByMateriaCorte, useBulkUpsertCalificaciones,
  useAsistenciaMaterias, useUpsertAsistenciaMateria,
} from "@/hooks/useAcademia";
import {
  useConceptosPago, useDeleteConceptoPago, usePagosMatricula, useUpdatePagoMatricula,
  useRecursos, useAllRecursos, useDeleteRecurso,
  useHomologaciones, useDeleteHomologacion,
  usePagosEscuela,
} from "@/hooks/useAcademiaExtras";
import { usePersonas } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  GraduationCap, BookOpen, Award, Users, Clock, CalendarDays,
  Search, UserCheck, ChevronRight, FileText, Lock, Unlock,
  MoreVertical, Trash2, BookText, ArrowLeft, Building2,
  BarChart3, Eye, ClipboardCheck, CheckCircle2, XCircle,
  Save, Check, X, History, Download, User,
  DollarSign, FolderOpen, RefreshCw, ExternalLink, File, TrendingUp, PieChart, AlertTriangle,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

const ESTADO_PERIODO: Record<string, { icon: any; color: string }> = {
  Abierto: { icon: Unlock, color: "bg-success/10 text-success border-success/20" },
  Cerrado: { icon: Lock, color: "bg-destructive/10 text-destructive border-destructive/20" },
};

// ========== SIDEBAR NAVIGATION ==========
const SIDEBAR_ITEMS = [
  { id: "escuelas", label: "Escuelas", icon: BookOpen },
  { id: "periodos", label: "Periodos", icon: CalendarDays },
  { id: "estudiantes", label: "Estudiantes", icon: Users },
  { id: "maestros", label: "Maestros", icon: UserCheck },
  { id: "calificaciones", label: "Calificaciones", icon: BarChart3 },
  { id: "historial-calificaciones", label: "Historial calificaciones", icon: FileText },
  { id: "historial-matriculas", label: "Historial matrículas", icon: History },
  { id: "pagos", label: "Pagos", icon: DollarSign },
  { id: "dashboard-financiero", label: "Dashboard financiero", icon: PieChart },
  { id: "recursos", label: "Recursos", icon: FolderOpen },
  { id: "homologaciones", label: "Homologaciones", icon: RefreshCw },
  { id: "certificados", label: "Certificados", icon: Award },
  { id: "aulas", label: "Aulas", icon: Building2 },
];

function AcademiaSidebar({ activeSection, onSectionChange }: { activeSection: string; onSectionChange: (s: string) => void }) {
  return (
    <nav className="w-56 shrink-0 border-r bg-card/50 hidden md:block">
      <div className="p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Academia</h2>
        <div className="space-y-0.5">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                activeSection === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

// Mobile tabs
function MobileNav({ activeSection, onSectionChange }: { activeSection: string; onSectionChange: (s: string) => void }) {
  return (
    <div className="md:hidden overflow-x-auto border-b">
      <div className="flex gap-0.5 px-2 py-1 min-w-max">
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
              activeSection === item.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ========== ESCUELAS SECTION ==========
function EscuelasSection({ escuelas, allPeriodos, allMatriculas, onSelectEscuela }: any) {
  const [search, setSearch] = useState("");
  const enriched = useMemo(() => {
    return (escuelas || []).map((e: any) => {
      const periodos = (allPeriodos || []).filter((p: any) => p.escuela_id === e.id);
      const periodosAbiertos = periodos.filter((p: any) => p.estado === "Abierto").length;
      const mats = (allMatriculas || []).filter((m: any) => m.curso_id === e.id);
      return { ...e, periodosCount: periodos.length, periodosAbiertos, estudiantesCount: new Set(mats.map((m: any) => m.persona_id)).size, matriculasCount: mats.length };
    });
  }, [escuelas, allPeriodos, allMatriculas]);

  const filtered = useMemo(() => {
    if (!search) return enriched;
    const q = search.toLowerCase();
    return enriched.filter((e: any) => e.nombre.toLowerCase().includes(q));
  }, [enriched, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar escuela..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <CursoFormDialog />
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay escuelas registradas.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e: any) => (
            <div key={e.id} onClick={() => onSelectEscuela(e)} className="group rounded-xl border bg-card p-5 cursor-pointer hover:shadow-md transition-all hover:border-primary/30">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="outline" className={e.estado === "Activo" ? "bg-success/10 text-success border-success/20 text-[10px]" : "text-[10px]"}>
                  {e.estado}
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{e.nombre}</h3>
              {e.descripcion && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{e.descripcion}</p>}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {e.periodosCount} período(s)</span>
                {e.periodosAbiertos > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">{e.periodosAbiertos} abierto(s)</Badge>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 font-medium"><Users className="h-3 w-3" /> {e.estudiantesCount}</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><GraduationCap className="h-3 w-3" /> {e.matriculasCount} mat.</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== PERIODOS SECTION ==========
function PeriodosSection({ escuelas, allPeriodos, allMatriculas }: any) {
  const [selectedEscuela, setSelectedEscuela] = useState<string>("");
  const [selectedPeriodo, setSelectedPeriodo] = useState<string | null>(null);
  const updatePeriodo = useUpdatePeriodo();

  const periodos = useMemo(() => {
    if (!selectedEscuela || selectedEscuela === "all") return allPeriodos || [];
    return (allPeriodos || []).filter((p: any) => p.escuela_id === selectedEscuela);
  }, [allPeriodos, selectedEscuela]);

  const enriched = useMemo(() => {
    return periodos.map((p: any) => {
      const mats = (allMatriculas || []).filter((m: any) => m.periodo_id === p.id);
      const escuela = (escuelas || []).find((e: any) => e.id === p.escuela_id);
      return { ...p, estudiantesActivos: mats.filter((m: any) => m.estado === "Activo").length, totalMatriculas: mats.length, escuelaNombre: escuela?.nombre || "" };
    });
  }, [periodos, allMatriculas, escuelas]);

  const toggleEstado = async (p: any) => {
    const nuevo = p.estado === "Abierto" ? "Cerrado" : "Abierto";
    try { await updatePeriodo.mutateAsync({ id: p.id, estado: nuevo }); toast.success(`Período ${nuevo.toLowerCase()}`); }
    catch { toast.error("Error al actualizar"); }
  };

  if (selectedPeriodo) {
    const periodo = enriched.find((p: any) => p.id === selectedPeriodo);
    const escuela = (escuelas || []).find((e: any) => e.id === periodo?.escuela_id);
    if (periodo && escuela) {
      return <PeriodoDetailView escuela={escuela} periodo={periodo} onBackToPeriodos={() => setSelectedPeriodo(null)} />;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={selectedEscuela} onValueChange={setSelectedEscuela}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Todas las escuelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las escuelas</SelectItem>
            {(escuelas || []).map((e: any) => (
              <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedEscuela && selectedEscuela !== "all" && <PeriodoFormDialog escuelaId={selectedEscuela} />}
        {(!selectedEscuela || selectedEscuela === "all") && (
          <p className="text-xs text-muted-foreground italic">Selecciona una escuela para crear períodos</p>
        )}
      </div>

      {enriched.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Selecciona una escuela para ver sus períodos.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enriched.map((p: any) => {
            const cfg = ESTADO_PERIODO[p.estado] || ESTADO_PERIODO.Abierto;
            const Icon = cfg.icon;
            return (
              <div key={p.id} onClick={() => setSelectedPeriodo(p.id)} className="group rounded-xl border bg-card p-5 cursor-pointer hover:shadow-md transition-all hover:border-primary/30">
                <div className="text-center mb-3">
                  <p className="text-[10px] text-muted-foreground mb-1">{p.escuelaNombre}</p>
                  <h3 className="font-bold text-foreground uppercase text-sm group-hover:text-primary transition-colors">{p.nombre}</h3>
                  <Badge variant="outline" className={`mt-2 text-[10px] cursor-pointer ${cfg.color}`} onClick={(e) => { e.stopPropagation(); toggleEstado(p); }}>
                    <Icon className="h-3 w-3 mr-1" /> {p.estado.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 mb-4">
                  {p.fecha_inicio && <p className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {format(parseISO(p.fecha_inicio), "yyyy-MM-dd")}{p.fecha_fin ? ` al ${format(parseISO(p.fecha_fin), "yyyy-MM-dd")}` : ""}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Estudiantes activos</span>
                    <Badge className="bg-primary text-primary-foreground"><Users className="h-3 w-3 mr-1" /> {p.estudiantesActivos}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Total matrículas</span>
                    <Badge className="bg-primary text-primary-foreground"><GraduationCap className="h-3 w-3 mr-1" /> {p.totalMatriculas}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ========== MAESTROS SECTION ==========
function MaestrosSection({ escuelas, allPeriodos }: any) {
  const { data: personas } = usePersonas();
  const [search, setSearch] = useState("");
  const [selectedMaestro, setSelectedMaestro] = useState<any>(null);

  // Include ALL teacher types: Seminario, Discipulado, Maestro, Mentor
  const TIPOS_MAESTRO = ["Maestro Seminario", "Maestro Discipulado", "Maestro", "Mentor", "Pastor Principal"];
  const maestros = useMemo(() => {
    if (!personas) return [];
    return personas.filter((p: any) =>
      TIPOS_MAESTRO.includes(p.tipo_persona) ||
      (p.tipos_persona || []).some((t: string) => TIPOS_MAESTRO.includes(t))
    );
  }, [personas]);

  const filtered = useMemo(() => {
    if (!search) return maestros;
    const q = search.toLowerCase();
    return maestros.filter((m: any) => `${m.nombres} ${m.apellidos}`.toLowerCase().includes(q));
  }, [maestros, search]);

  if (selectedMaestro) {
    return <GestionarComoMaestro maestro={selectedMaestro} escuelas={escuelas} allPeriodos={allPeriodos} onBack={() => setSelectedMaestro(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar maestro..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Badge variant="outline" className="text-xs">{filtered.length} Maestro(s)</Badge>
        <MaestroFormDialog />
      </div>

      <p className="text-xs text-muted-foreground">
        Aquí encontrarás el listado de los maestros. Para asignar materias, ve a un período y asigna el maestro en la materia.
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay maestros registrados. Asigna tipo "Maestro Seminario" o "Maestro Discipulado" a una persona.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m: any) => {
            const initials = `${m.nombres?.[0] || ""}${m.apellidos?.[0] || ""}`.toUpperCase();
            return (
              <div key={m.id} className="rounded-xl border bg-card p-4 hover:shadow-md transition-all hover:border-primary/30 cursor-pointer group"
                onClick={() => setSelectedMaestro(m)}>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={m.foto_url || undefined} />
                    <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors truncate">{m.nombres} {m.apellidos}</h4>
                    <p className="text-xs text-muted-foreground">{m.tipo_persona}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {m.email && <><span className="truncate max-w-[150px]">{m.email}</span></>}
                  </span>
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={(e) => { e.stopPropagation(); setSelectedMaestro(m); }}>
                    <Eye className="h-3 w-3" /> Gestionar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ========== GESTIONAR COMO MAESTRO ==========
function GestionarComoMaestro({ maestro, escuelas, allPeriodos, onBack }: any) {
  const [selectedEscuela, setSelectedEscuela] = useState<string>("");
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("");
  const { data: materias } = useMaterias(selectedPeriodo || null);
  const { data: cortes } = useCortes(selectedPeriodo || null);
  const { data: matriculas } = useMatriculas(selectedPeriodo || null);
  const [activeTab, setActiveTab] = useState<"calificaciones" | "asistencia">("calificaciones");

  // Filter materias assigned to this maestro
  const misMaterias = useMemo(() => {
    if (!materias) return [];
    return materias.filter((m: any) => m.maestro_id === maestro.id);
  }, [materias, maestro.id]);

  const periodosForEscuela = useMemo(() => {
    if (!selectedEscuela) return [];
    return (allPeriodos || []).filter((p: any) => p.escuela_id === selectedEscuela);
  }, [allPeriodos, selectedEscuela]);

  const initials = `${maestro.nombres?.[0] || ""}${maestro.apellidos?.[0] || ""}`.toUpperCase();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Maestros</Button>
      </div>

      {/* Teacher profile card */}
      <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={maestro.foto_url || undefined} />
          <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-lg font-bold text-foreground">{maestro.nombres} {maestro.apellidos}</h2>
          <p className="text-sm text-muted-foreground">{maestro.tipo_persona} · Gestionar como maestro</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Escuela:</label>
          <Select value={selectedEscuela} onValueChange={(v) => { setSelectedEscuela(v); setSelectedPeriodo(""); }}>
            <SelectTrigger><SelectValue placeholder="Seleccionar escuela" /></SelectTrigger>
            <SelectContent>
              {(escuelas || []).map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Período:</label>
          <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo} disabled={!selectedEscuela}>
            <SelectTrigger><SelectValue placeholder="Seleccionar período" /></SelectTrigger>
            <SelectContent>
              {periodosForEscuela.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedPeriodo && (
        <>
          {/* My subjects */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BookText className="h-4 w-4 text-primary" /> Mis materias asignadas
              <Badge variant="outline" className="text-[10px] ml-auto">{misMaterias.length} materia(s)</Badge>
            </h3>
            {misMaterias.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No tienes materias asignadas en este período.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {misMaterias.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                    <BookText className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.nombre}</p>
                      {m.horario && <p className="text-[10px] text-muted-foreground">{m.horario}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabs: Calificaciones / Asistencia */}
          <div className="flex gap-1 border-b">
            <button onClick={() => setActiveTab("calificaciones")}
              className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", activeTab === "calificaciones" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <BarChart3 className="h-4 w-4 inline mr-1.5" />Calificaciones
            </button>
            <button onClick={() => setActiveTab("asistencia")}
              className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", activeTab === "asistencia" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <ClipboardCheck className="h-4 w-4 inline mr-1.5" />Asistencia
            </button>
          </div>

          {activeTab === "calificaciones" && (
            <GradingGrid cortes={cortes} materias={misMaterias} periodoId={selectedPeriodo} maestroId={maestro.id} />
          )}

          {activeTab === "asistencia" && (
            <AsistenciaMateriaTab materias={misMaterias} periodoId={selectedPeriodo} />
          )}
        </>
      )}
    </div>
  );
}

// ========== ESTUDIANTES SECTION ==========
function EstudiantesSection({ escuelas, allPeriodos, allMatriculas }: any) {
  const [search, setSearch] = useState("");
  const [selectedEscuela, setSelectedEscuela] = useState<string>("");
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("");

  const periodosForEscuela = useMemo(() => {
    if (!selectedEscuela || selectedEscuela === "all") return allPeriodos || [];
    return (allPeriodos || []).filter((p: any) => p.escuela_id === selectedEscuela);
  }, [allPeriodos, selectedEscuela]);

  const filtered = useMemo(() => {
    let mats = allMatriculas || [];
    if (selectedEscuela && selectedEscuela !== "all") mats = mats.filter((m: any) => m.curso_id === selectedEscuela);
    if (selectedPeriodo && selectedPeriodo !== "all") mats = mats.filter((m: any) => m.periodo_id === selectedPeriodo);
    if (search) {
      const q = search.toLowerCase();
      mats = mats.filter((m: any) => `${m.personas?.nombres} ${m.personas?.apellidos}`.toLowerCase().includes(q));
    }
    return mats;
  }, [allMatriculas, selectedEscuela, selectedPeriodo, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={selectedEscuela} onValueChange={(v) => { setSelectedEscuela(v); setSelectedPeriodo(""); }}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Todas las escuelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {(escuelas || []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Todos los períodos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {periodosForEscuela.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Badge variant="outline" className="text-xs">{filtered.length} estudiante(s)</Badge>

      <div className="rounded-xl border bg-card divide-y">
        {!filtered.length ? (
          <p className="text-xs text-muted-foreground text-center py-8">No hay estudiantes matriculados.</p>
        ) : (
          filtered.slice(0, 50).map((m: any) => {
            const initials = `${m.personas?.nombres?.[0] || ""}${m.personas?.apellidos?.[0] || ""}`.toUpperCase();
            const escuela = (escuelas || []).find((e: any) => e.id === m.curso_id);
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.personas?.foto_url || undefined} />
                  <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.personas?.nombres} {m.personas?.apellidos}</p>
                  <p className="text-xs text-muted-foreground">
                    {escuela?.nombre || m.cursos?.nombre || ""}
                    {m.materias?.nombre && <> · {m.materias.nombre}</>}
                  </p>
                </div>
                <Badge variant="outline" className={cn("text-[10px]",
                  m.estado === "Activo" ? "bg-success/10 text-success border-success/20" :
                  m.estado === "Aprobó" ? "bg-primary/10 text-primary border-primary/20" :
                  m.estado === "No Aprobó" ? "bg-destructive/10 text-destructive border-destructive/20" :
                  "bg-muted text-muted-foreground"
                )}>
                  {m.estado}
                </Badge>
                {m.nota_final != null && <span className="text-xs font-semibold">{m.nota_final}</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ========== HISTORIAL MATRICULAS SECTION ==========
function HistorialMatriculasSection({ escuelas, allPeriodos, allMatriculas }: any) {
  const [selectedEscuela, setSelectedEscuela] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const updateMatricula = useUpdateMatricula();
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("");
  const { data: aulas } = useAulas();

  const periodosForEscuela = useMemo(() => {
    if (!selectedEscuela || selectedEscuela === "all") return allPeriodos || [];
    return (allPeriodos || []).filter((p: any) => p.escuela_id === selectedEscuela);
  }, [allPeriodos, selectedEscuela]);

  const filtered = useMemo(() => {
    let mats = allMatriculas || [];
    if (selectedEscuela && selectedEscuela !== "all") mats = mats.filter((m: any) => m.curso_id === selectedEscuela);
    if (selectedPeriodo && selectedPeriodo !== "all") mats = mats.filter((m: any) => m.periodo_id === selectedPeriodo);
    return mats;
  }, [allMatriculas, selectedEscuela, selectedPeriodo]);

  const getResultado = (m: any) => {
    if (m.estado === "Activo") return { label: "En curso", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    if (m.estado === "Aprobó") return { label: "Aprobó", color: "bg-success/10 text-success border-success/20" };
    if (m.estado === "No Aprobó") return { label: "No Aprobó", color: "bg-destructive/10 text-destructive border-destructive/20" };
    return { label: m.estado, color: "bg-muted text-muted-foreground" };
  };

  const exportExcel = () => {
    exportToExcel({
      title: "Historial Matrículas",
      columns: [
        { header: "Estudiante", key: "estudiante" },
        { header: "Escuela", key: "escuela" },
        { header: "Materia", key: "materia" },
        { header: "Estado", key: "estado" },
        { header: "Fecha Matrícula", key: "fecha" },
        { header: "Nota Final", key: "nota" },
        { header: "Resultado", key: "resultado" },
      ],
      data: filtered.map((m: any) => {
        const escuela = (escuelas || []).find((e: any) => e.id === m.curso_id);
        const res = getResultado(m);
        return {
          estudiante: `${m.personas?.nombres || ""} ${m.personas?.apellidos || ""}`,
          escuela: escuela?.nombre || "",
          materia: m.materias?.nombre || m.cursos?.nombre || "",
          estado: m.estado,
          fecha: m.fecha_matricula,
          nota: m.nota_final ?? "",
          resultado: res.label,
        };
      }),
      filename: "historial-matriculas",
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Aquí encontrarás el listado de las matrículas de los periodos de cualquier escuela.</p>

      <div className="flex flex-wrap gap-3">
        <Select value={selectedEscuela} onValueChange={(v) => { setSelectedEscuela(v); setSelectedPeriodo(""); }}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Selecciona una escuela" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {(escuelas || []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Selecciona un período" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {periodosForEscuela.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={exportExcel} disabled={!filtered.length} className="gap-1.5 ml-auto">
          <Download className="h-3.5 w-3.5" /> Excel
        </Button>
        <Button size="sm" variant="outline" disabled={!filtered.length} className="gap-1.5" onClick={() => {
          const jsPDFModule = import("jspdf");
          const autoTableModule = import("jspdf-autotable");
          Promise.all([jsPDFModule, autoTableModule]).then(([{ default: jsPDF }, { default: autoTable }]) => {
            const doc = new jsPDF();
            doc.setFontSize(14);
            doc.text("Historial de Matrículas", 14, 20);
            const body = filtered.map((m: any) => {
              const esc = (escuelas || []).find((e: any) => e.id === m.curso_id);
              const res = getResultado(m);
              return [
                `${m.personas?.nombres || ""} ${m.personas?.apellidos || ""}`,
                m.materias?.nombre || m.cursos?.nombre || "",
                m.estado,
                m.fecha_matricula,
                m.nota_final ?? "—",
                res.label,
              ];
            });
            autoTable(doc, {
              head: [["Estudiante", "Materia", "Estado", "Fecha", "Nota", "Resultado"]],
              body,
              startY: 30,
              styles: { fontSize: 9 },
              headStyles: { fillColor: [99, 102, 241] },
            });
            doc.save("historial-matriculas.pdf");
          });
        }}>
          <FileText className="h-3.5 w-3.5" /> PDF
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Estudiante</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Materia</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Estado Matrícula</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Fecha Matrícula</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Nota Final</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-xs">No hay matrículas.</td></tr>
              ) : (
                filtered.slice(0, 100).map((m: any) => {
                  const res = getResultado(m);
                  return (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={m.personas?.foto_url || undefined} />
                            <AvatarFallback className="text-[10px]">{`${m.personas?.nombres?.[0] || ""}${m.personas?.apellidos?.[0] || ""}`}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate">{m.personas?.nombres} {m.personas?.apellidos}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{m.materias?.nombre || m.cursos?.nombre || "—"}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className={cn("text-[10px]",
                          m.estado === "Activo" ? "bg-success/10 text-success" :
                          m.estado === "Aprobó" ? "bg-primary/10 text-primary" :
                          m.estado === "No Aprobó" ? "bg-destructive/10 text-destructive" : ""
                        )}>{m.estado}</Badge>
                      </td>
                      <td className="p-3 text-center text-muted-foreground">{m.fecha_matricula}</td>
                      <td className="p-3 text-center font-semibold">
                        {editingId === m.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-16 h-7 text-center text-xs p-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const val = editValue.trim() === "" ? null : parseFloat(editValue);
                                  updateMatricula.mutate({ id: m.id, nota_final: val } as any);
                                  setEditingId(null);
                                } else if (e.key === "Escape") {
                                  setEditingId(null);
                                }
                              }}
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                              const val = editValue.trim() === "" ? null : parseFloat(editValue);
                              updateMatricula.mutate({ id: m.id, nota_final: val } as any);
                              setEditingId(null);
                            }}><Check className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingId(m.id); setEditValue(m.nota_final != null ? String(m.nota_final) : ""); }}
                            className="cursor-pointer hover:bg-muted/50 rounded px-2 py-0.5 transition-colors"
                            title="Clic para editar nota final"
                          >
                            {m.nota_final ?? "—"}
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className={cn("text-[10px]", res.color)}>{res.label}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ========== CERTIFICADOS SECTION ==========
function CertificadosSection() {
  const { data: certificados, isLoading } = useCertificados();

  if (isLoading) return <Skeleton className="h-32" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Certificados emitidos a estudiantes que completaron sus cursos.</p>
      {!certificados?.length ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <Award className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay certificados emitidos.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {certificados.map((cert: any) => (
            <div key={cert.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{cert.personas?.nombres} {cert.personas?.apellidos}</p>
                <p className="text-xs text-muted-foreground">{cert.cursos?.nombre}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono text-muted-foreground">{cert.codigo}</p>
                <p className="text-[10px] text-muted-foreground">{format(parseISO(cert.fecha_emision), "d MMM yyyy", { locale: es })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== GRADING GRID ==========
function GradingGrid({ cortes, materias, periodoId, maestroId, escuelaName }: any) {
  const [selectedCorte, setSelectedCorte] = useState<string | null>(null);
  const [selectedMateria, setSelectedMateria] = useState<string | null>(null);
  const { data: items } = useAllItemsByCorte(selectedCorte);
  const { data: matriculas } = useMatriculas(periodoId);
  const { data: calificaciones } = useCalificacionesByMateriaCorte(selectedCorte, selectedMateria);
  const bulkUpsert = useBulkUpsertCalificaciones();
  const deleteItem = useDeleteItemCalificable();

  // Get the selected materia object for teacher validation
  const selectedMateriaObj = useMemo(() => {
    return (materias || []).find((m: any) => m.id === selectedMateria);
  }, [materias, selectedMateria]);

  // VALIDATION: Check if current user is the assigned teacher
  const isMaestroMismatch = maestroId && selectedMateriaObj?.maestro_id && selectedMateriaObj.maestro_id !== maestroId;

  const materiaItems = useMemo(() => {
    if (!items || !selectedMateria) return [];
    return items.filter((i: any) => i.materia_id === selectedMateria && i.es_calificable !== false);
  }, [items, selectedMateria]);

  // VALIDATION: Check percentage totals
  const totalPorcentaje = useMemo(() => {
    return materiaItems.reduce((sum: number, i: any) => sum + (Number(i.porcentaje) || 0), 0);
  }, [materiaItems]);

  const activeStudents = useMemo(() => {
    return (matriculas || []).filter((m: any) => m.materia_id === selectedMateria && m.estado !== "Retirado");
  }, [matriculas, selectedMateria]);

  const [localGrades, setLocalGrades] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState<string | null>(null);

  const gradeKey = `${selectedCorte}_${selectedMateria}`;
  if (calificaciones && initialized !== gradeKey) {
    const map: Record<string, string> = {};
    calificaciones.forEach((c: any) => {
      map[`${c.matricula_id}_${c.item_id}`] = c.nota != null ? String(c.nota) : "";
    });
    setLocalGrades(map);
    setInitialized(gradeKey);
  }

  const handleGradeChange = (matriculaId: string, itemId: string, value: string) => {
    setLocalGrades(prev => ({ ...prev, [`${matriculaId}_${itemId}`]: value }));
  };

  // VALIDATION: Check if item is within date range
  const isItemOutOfDate = (item: any) => {
    const today = format(new Date(), "yyyy-MM-dd");
    if (item.fecha_inicio && today < item.fecha_inicio) return true;
    if (item.fecha_fin && today > item.fecha_fin) return true;
    return false;
  };

  const saveGrades = async () => {
    // VALIDATION: Block if teacher mismatch
    if (isMaestroMismatch) {
      toast.error("Solo el maestro asignado puede calificar esta materia");
      return;
    }

    const records: { item_id: string; matricula_id: string; nota: number | null }[] = [];
    let dateBlocked = false;

    activeStudents.forEach((m: any) => {
      materiaItems.forEach((item: any) => {
        const val = localGrades[`${m.id}_${item.id}`];
        // VALIDATION: Check date ranges
        if (isItemOutOfDate(item) && val !== undefined && val !== "") {
          dateBlocked = true;
          return;
        }
        if (val !== undefined && val !== "") {
          records.push({ item_id: item.id, matricula_id: m.id, nota: parseFloat(val) });
        } else if (val === "") {
          records.push({ item_id: item.id, matricula_id: m.id, nota: null });
        }
      });
    });

    if (dateBlocked) {
      toast.error("No se pueden registrar calificaciones fuera de las fechas definidas");
      return;
    }

    if (!records.length) return;
    try {
      await bulkUpsert.mutateAsync(records);

      // INTEGRATION: Update growth module for Discipulado schools
      const isDiscipulado = escuelaName?.toLowerCase().includes("discipulado") || escuelaName?.toLowerCase().includes("discipul");
      if (isDiscipulado) {
        await syncWithGrowthModule(activeStudents, materiaItems, localGrades);
      }

      toast.success("Calificaciones guardadas");
    } catch { toast.error("Error al guardar"); }
  };

  // Sync approved grades with persona_procesos
  const syncWithGrowthModule = async (students: any[], items: any[], grades: Record<string, string>) => {
    try {
      // Get all procesos for matching
      const { data: procesos } = await supabase
        .from("procesos_crecimiento")
        .select("*")
        .order("orden");

      if (!procesos?.length) return;

      const today = format(new Date(), "yyyy-MM-dd");
      const upsertRecords: any[] = [];

      for (const student of students) {
        // Calculate average for this student across all items
        const studentGrades = items.map((item: any) => {
          const val = grades[`${student.id}_${item.id}`];
          return val ? parseFloat(val) : null;
        }).filter((g): g is number => g !== null);

        if (!studentGrades.length) continue;
        const avg = studentGrades.reduce((s, v) => s + v, 0) / studentGrades.length;

        // If student passed (avg >= 3), try to match with a growth process
        if (avg >= 3 && selectedMateriaObj) {
          const materiaName = selectedMateriaObj.nombre?.toLowerCase() || "";
          const matchedProceso = procesos.find((p: any) =>
            materiaName.includes(p.nombre.toLowerCase()) || p.nombre.toLowerCase().includes(materiaName)
          );

          if (matchedProceso) {
            upsertRecords.push({
              persona_id: student.persona_id,
              proceso_id: matchedProceso.id,
              estado: "Realizado",
              fecha_completado: today,
            });
          }
        }
      }

      if (upsertRecords.length > 0) {
        await supabase
          .from("persona_procesos")
          .upsert(upsertRecords, { onConflict: "persona_id,proceso_id" });
        toast.success(`${upsertRecords.length} proceso(s) de crecimiento actualizado(s)`);
      }
    } catch (err) {
      console.error("Error syncing growth module:", err);
    }
  };

  const exportGrades = () => {
    if (!materiaItems.length || !activeStudents.length) return;
    const columns = [
      { header: "Estudiante", key: "estudiante" },
      ...materiaItems.map((i: any) => ({ header: i.nombre, key: i.id })),
    ];
    const data = activeStudents.map((m: any) => {
      const row: any = { estudiante: `${m.personas?.nombres} ${m.personas?.apellidos}` };
      materiaItems.forEach((item: any) => {
        row[item.id] = localGrades[`${m.id}_${item.id}`] || "";
      });
      return row;
    });
    exportToExcel({ title: "Calificaciones", columns, data, filename: "calificaciones" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(cortes || []).map((c: any) => (
          <Button key={c.id} size="sm" variant={selectedCorte === c.id ? "default" : "outline"}
            onClick={() => { setSelectedCorte(c.id); setSelectedMateria(null); setInitialized(null); }}>
            {c.nombre} ({c.porcentaje}%)
          </Button>
        ))}
        {!cortes?.length && <p className="text-sm text-muted-foreground">Configura cortes en el período primero.</p>}
      </div>

      {selectedCorte && (
        <div className="rounded-xl border bg-card p-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Materia:</label>
          <Select value={selectedMateria || ""} onValueChange={(v) => { setSelectedMateria(v); setInitialized(null); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar materia" /></SelectTrigger>
            <SelectContent>
              {(materias || []).map((m: any) => (
                <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* VALIDATION warnings */}
      {isMaestroMismatch && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          Solo el maestro asignado puede calificar esta materia. Las notas no se guardarán.
        </div>
      )}

      {totalPorcentaje > 0 && totalPorcentaje !== 100 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          Los porcentajes de los ítems suman {totalPorcentaje}% (deben sumar 100%).
        </div>
      )}

      {selectedCorte && selectedMateria && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <ItemCalificableFormDialog corteId={selectedCorte} materiaId={selectedMateria} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportGrades} disabled={!materiaItems.length}>
                Exportar Excel
              </Button>
              <Button size="sm" onClick={saveGrades} disabled={bulkUpsert.isPending || !!isMaestroMismatch} className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> {bulkUpsert.isPending ? "Guardando..." : "Guardar notas"}
              </Button>
            </div>
          </div>

          {!materiaItems.length ? (
            <p className="text-xs text-muted-foreground text-center py-6">No hay ítems calificables. Agrega uno primero.</p>
          ) : !activeStudents.length ? (
            <p className="text-xs text-muted-foreground text-center py-6">No hay estudiantes matriculados en esta materia.</p>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-muted/30 min-w-[200px]">Estudiante</th>
                      {materiaItems.map((item: any) => {
                        const outOfDate = isItemOutOfDate(item);
                        return (
                          <th key={item.id} className={cn("text-center p-3 font-medium min-w-[100px]", outOfDate ? "text-destructive/60" : "text-muted-foreground")}>
                            <div>{item.nombre}</div>
                            <div className="text-[10px] font-normal flex items-center justify-center gap-1">
                              <span>{item.tipo}</span>
                              {item.porcentaje != null && <span>· {item.porcentaje}%</span>}
                            </div>
                            {outOfDate && <div className="text-[9px] text-destructive">Fuera de fechas</div>}
                          </th>
                        );
                      })}
                      <th className="text-center p-3 font-medium text-muted-foreground min-w-[80px]">Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStudents.map((m: any) => {
                      const initials = `${m.personas?.nombres?.[0] || ""}${m.personas?.apellidos?.[0] || ""}`.toUpperCase();
                      const grades = materiaItems.map((item: any) => {
                        const val = localGrades[`${m.id}_${item.id}`];
                        return val ? parseFloat(val) : null;
                      });
                      const validGrades = grades.filter((g): g is number => g !== null);
                      const avg = validGrades.length ? (validGrades.reduce((s, v) => s + v, 0) / validGrades.length).toFixed(1) : "—";
                      return (
                        <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 sticky left-0 bg-card">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={m.personas?.foto_url || undefined} />
                                <AvatarFallback className="text-[10px] font-semibold">{initials}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium truncate">{m.personas?.nombres} {m.personas?.apellidos}</span>
                            </div>
                          </td>
                          {materiaItems.map((item: any) => {
                            const outOfDate = isItemOutOfDate(item);
                            return (
                              <td key={item.id} className="p-2 text-center">
                                <Input
                                  type="number"
                                  min={0}
                                  max={5}
                                  step={0.1}
                                  className={cn("h-8 w-20 mx-auto text-center text-sm", outOfDate && "opacity-50")}
                                  disabled={outOfDate || !!isMaestroMismatch}
                                  value={localGrades[`${m.id}_${item.id}`] ?? ""}
                                  onChange={(e) => handleGradeChange(m.id, item.id, e.target.value)}
                                />
                              </td>
                            );
                          })}
                          <td className="p-3 text-center font-semibold">{avg}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ========== ASISTENCIA MATERIA TAB ==========
function AsistenciaMateriaTab({ materias, periodoId }: any) {
  const [selectedMateria, setSelectedMateria] = useState<string | null>(null);
  const [fecha, setFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data: matriculas } = useMatriculas(periodoId);
  const { data: asistenciaData } = useAsistenciaMaterias(selectedMateria, fecha);
  const upsertAsistencia = useUpsertAsistenciaMateria();
  const [localAtt, setLocalAtt] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState<string | null>(null);

  const activeStudents = useMemo(() => (matriculas || []).filter((m: any) => m.materia_id === selectedMateria && m.estado !== "Retirado"), [matriculas, selectedMateria]);

  const attKey = `${selectedMateria}_${fecha}`;
  if (asistenciaData && initialized !== attKey) {
    const map: Record<string, boolean> = {};
    asistenciaData.forEach((a: any) => { map[a.matricula_id] = a.presente; });
    setLocalAtt(map);
    setInitialized(attKey);
  }

  const toggleAtt = (id: string) => setLocalAtt(prev => ({ ...prev, [id]: !prev[id] }));
  const markAll = (v: boolean) => {
    const map: Record<string, boolean> = {};
    activeStudents.forEach((m: any) => { map[m.id] = v; });
    setLocalAtt(map);
  };

  const saveAtt = async () => {
    if (!selectedMateria) return;
    const records = activeStudents.map((m: any) => ({
      materia_id: selectedMateria,
      matricula_id: m.id,
      fecha,
      presente: !!localAtt[m.id],
    }));
    try {
      await upsertAsistencia.mutateAsync(records);
      toast.success("Asistencia guardada");
    } catch { toast.error("Error al guardar"); }
  };

  const totalPresent = Object.values(localAtt).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Materia:</label>
          <Select value={selectedMateria || ""} onValueChange={(v) => { setSelectedMateria(v); setInitialized(null); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar materia" /></SelectTrigger>
            <SelectContent>
              {(materias || []).map((m: any) => (
                <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha:</label>
          <Input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setInitialized(null); }} className="h-9 w-44" />
        </div>
      </div>

      {selectedMateria && (
        <>
          <div className="flex items-center gap-2 justify-between">
            <div className="flex gap-3 text-sm">
              <span className="text-success font-medium">Presentes: {totalPresent}</span>
              <span className="text-muted-foreground">Ausentes: {activeStudents.length - totalPresent}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => markAll(true)} className="text-xs gap-1"><Check className="h-3.5 w-3.5" /> Todos</Button>
              <Button variant="outline" size="sm" onClick={() => markAll(false)} className="text-xs gap-1"><X className="h-3.5 w-3.5" /> Ninguno</Button>
              <Button size="sm" onClick={saveAtt} disabled={upsertAsistencia.isPending} className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> Guardar
              </Button>
            </div>
          </div>

          <div className="rounded-xl border bg-card divide-y">
            {!activeStudents.length ? (
              <p className="text-xs text-muted-foreground text-center py-8">No hay estudiantes matriculados en esta materia.</p>
            ) : (
              activeStudents.map((m: any) => {
                const isPresent = !!localAtt[m.id];
                const initials = `${m.personas?.nombres?.[0] || ""}${m.personas?.apellidos?.[0] || ""}`.toUpperCase();
                return (
                  <div key={m.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 cursor-pointer" onClick={() => toggleAtt(m.id)}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.personas?.foto_url || undefined} />
                        <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{m.personas?.nombres} {m.personas?.apellidos}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleAtt(m.id); }}
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0",
                        isPresent ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isPresent ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <MateriaAttendanceTrendChart materias={materias || []} periodoId={periodoId} />
        </>
      )}
    </div>
  );
}

// ========== PERIODO DETAIL VIEW ==========
function PeriodoDetailView({ escuela, periodo, onBackToPeriodos }: any) {
  const { data: materias, isLoading: loadingMaterias } = useMaterias(periodo.id);
  const { data: matriculas } = useMatriculas(periodo.id);
  const { data: cortes } = useCortes(periodo.id);
  const { data: personas } = usePersonas();
  const { data: aulasData } = useAulas();
  const updateMatricula = useUpdateMatricula();
  const createCertificado = useCreateCertificado();
  const deleteMateria = useDeleteMateria();
  const updateMateria = useUpdateMateria();
  const deleteCorte = useDeleteCorte();
  const updatePeriodo = useUpdatePeriodo();
  const [activeTab, setActiveTab] = useState<string>("info");
  const [editingMateria, setEditingMateria] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ nombre: string; descripcion: string; maestro_id: string; aula_id: string; horario: string }>({ nombre: "", descripcion: "", maestro_id: "", aula_id: "", horario: "" });

  const handleEstadoMatricula = async (id: string, estado: string) => {
    try { await updateMatricula.mutateAsync({ id, estado }); toast.success("Estado actualizado"); }
    catch { toast.error("Error al actualizar"); }
  };

  const handleEmitirCertificado = async (m: any) => {
    try { await createCertificado.mutateAsync({ matricula_id: m.id, persona_id: m.persona_id, curso_id: escuela.id }); toast.success("Certificado emitido"); }
    catch (err: any) { toast.error(err.message?.includes("duplicate") ? "Ya tiene certificado" : "Error al emitir"); }
  };

  const totalPorcentajeCortes = (cortes || []).reduce((sum: number, c: any) => sum + (Number(c.porcentaje) || 0), 0);

  const exportMatriculas = () => {
    if (!matriculas?.length) return;
    exportToExcel({
      title: "Matrículas",
      columns: [
        { header: "Nombres", key: "nombres" },
        { header: "Apellidos", key: "apellidos" },
        { header: "Fecha Matrícula", key: "fecha_matricula" },
        { header: "Estado", key: "estado" },
        { header: "Nota Final", key: "nota_final" },
        { header: "Materia", key: "materia" },
      ],
      data: matriculas.map((m: any) => ({
        nombres: m.personas?.nombres || "",
        apellidos: m.personas?.apellidos || "",
        fecha_matricula: m.fecha_matricula,
        estado: m.estado,
        nota_final: m.nota_final ?? "",
        materia: m.materias?.nombre || "",
      })),
      filename: `matriculas-${periodo.nombre}`,
    });
  };

  const tabs = [
    { id: "info", label: "Información general", icon: Eye },
    { id: "pensum", label: "Pensum", icon: BookText },
    { id: "estudiantes", label: "Alumnos", icon: Users },
    { id: "calificaciones", label: "Calificaciones", icon: BarChart3 },
    { id: "asistencia", label: "Asistencia", icon: ClipboardCheck },
    { id: "materias", label: "Materias", icon: BookText },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBackToPeriodos}><ArrowLeft className="h-4 w-4 mr-1" /> Atrás</Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">{periodo.nombre}</h2>
          <p className="text-sm text-muted-foreground">{escuela.nombre} · Período académico</p>
        </div>
        <div className="flex gap-2">
          {periodo.estado === "Abierto" && (
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={async () => {
                if (!confirm("¿Estás seguro de finalizar este período? Se cerrará y no se podrán realizar cambios.")) return;
                try {
                  await updatePeriodo.mutateAsync({ id: periodo.id, estado: "Cerrado" });
                  toast.success("Período finalizado");
                } catch { toast.error("Error al finalizar período"); }
              }}>
              <Lock className="h-3.5 w-3.5" /> Finalizar período
            </Button>
          )}
          {periodo.estado === "Cerrado" && (
            <Button size="sm" variant="outline" className="gap-1.5"
              onClick={async () => {
                try {
                  await updatePeriodo.mutateAsync({ id: periodo.id, estado: "Abierto" });
                  toast.success("Período reabierto");
                } catch { toast.error("Error al reabrir"); }
              }}>
              <Unlock className="h-3.5 w-3.5" /> Reabrir período
            </Button>
          )}
          <MatriculaFormDialog cursoId={escuela.id} periodoId={periodo.id} />
        </div>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="h-4 w-4 inline mr-1.5" />{t.label}
          </button>
        ))}
      </div>

      {activeTab === "info" && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarDays className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-foreground">{periodo.nombre}</h2>
                  <Badge variant="outline" className={ESTADO_PERIODO[periodo.estado]?.color}>{periodo.estado}</Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {escuela.nombre}</span>
                  {periodo.fecha_inicio && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {format(parseISO(periodo.fecha_inicio), "d MMM yyyy", { locale: es })}{periodo.fecha_fin ? ` — ${format(parseISO(periodo.fecha_fin), "d MMM yyyy", { locale: es })}` : ""}</span>}
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <div className="text-center px-4 py-2 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-foreground">{matriculas?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Estudiantes</p>
                </div>
                <div className="text-center px-4 py-2 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-foreground">{materias?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Materias</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" /> Configuración de cortes
              </h3>
              <CorteFormDialog periodoId={periodo.id} />
            </div>
            {!cortes?.length ? (
              <p className="text-xs text-muted-foreground text-center py-4">No hay cortes configurados.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {cortes.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-semibold">{c.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          Porcentaje: {c.porcentaje}%
                          {c.fecha_inicio && <> · {format(parseISO(c.fecha_inicio), "yyyy-MM-dd")}{c.fecha_fin ? ` al ${format(parseISO(c.fecha_fin), "yyyy-MM-dd")}` : ""}</>}
                        </p>
                      </div>
                      <DeleteConfirmDialog title="Eliminar corte" description={`¿Eliminar "${c.nombre}"?`} onConfirm={() => deleteCorte.mutateAsync(c.id)} />
                    </div>
                  ))}
                </div>
                <p className={`text-xs mt-3 font-medium ${totalPorcentajeCortes === 100 ? "text-success" : "text-destructive"}`}>
                  {totalPorcentajeCortes === 100 ? <><CheckCircle2 className="h-3 w-3 inline mr-1" />Los porcentajes están completos (100%).</> : <><XCircle className="h-3 w-3 inline mr-1" />Porcentaje total: {totalPorcentajeCortes}% (debe ser 100%).</>}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "estudiantes" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={exportMatriculas} disabled={!matriculas?.length}>
              Exportar Matrículas a Excel
            </Button>
          </div>
          <div className="space-y-2">
            {!matriculas?.length ? (
              <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No hay estudiantes matriculados.</p>
              </div>
            ) : (
              matriculas.map((m: any) => {
                const initials = `${m.personas?.nombres?.[0] || ""}${m.personas?.apellidos?.[0] || ""}`.toUpperCase();
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-sm transition-shadow">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={m.personas?.foto_url || undefined} />
                      <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{m.personas?.nombres} {m.personas?.apellidos}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(m.fecha_matricula), "d MMM yyyy", { locale: es })}
                        {m.materias?.nombre && <> · {m.materias.nombre}</>}
                        {m.nota_final != null && <> · Nota: <strong>{m.nota_final}</strong></>}
                      </p>
                    </div>
                    <Select value={m.estado} onValueChange={(v) => handleEstadoMatricula(m.id, v)}>
                      <SelectTrigger className="h-8 w-28 text-xs" onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Activo">Activo</SelectItem>
                        <SelectItem value="Aprobó">Aprobó</SelectItem>
                        <SelectItem value="No Aprobó">No Aprobó</SelectItem>
                      </SelectContent>
                    </Select>
                    {m.estado === "Aprobó" && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0" onClick={() => handleEmitirCertificado(m)}>
                        <Award className="h-3.5 w-3.5" /> Certificado
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === "pensum" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Materias del pensum del período <strong>{periodo.nombre}</strong>.
            </p>
            <MateriaFormDialog periodoId={periodo.id} />
          </div>
          {loadingMaterias ? <Skeleton className="h-32" /> : !materias?.length ? (
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
              <BookText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay materias en el pensum. Agrega una materia.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {materias.map((m: any) => {
                const matriculasMateria = (matriculas || []).filter((mat: any) => mat.materia_id === m.id && mat.estado !== "Retirado").length;
                return (
                  <div key={m.id} className="rounded-xl border bg-card p-4 space-y-3 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => { setActiveTab("calificaciones"); }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-foreground text-sm uppercase">{m.nombre}</h4>
                        {m.codigo && <p className="text-[10px] text-muted-foreground font-mono">CÓDIGO: {m.codigo}</p>}
                      </div>
                      <Badge variant="outline" className={cn("text-[10px]",
                        (m as any).estado === "Finalizada" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-success/10 text-success border-success/20"
                      )}>
                        {(m as any).estado || "En Curso"}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Hab. calificaciones:</span>
                        <Badge variant="outline" className={cn("text-[10px]", (m as any).hab_calificaciones !== false ? "text-success" : "text-destructive")}>
                          {(m as any).hab_calificaciones !== false ? "SÍ" : "NO"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Hab. asistencia:</span>
                        <Badge variant="outline" className={cn("text-[10px]", (m as any).hab_asistencia !== false ? "text-success" : "text-destructive")}>
                          {(m as any).hab_asistencia !== false ? "SÍ" : "NO"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Hab. auto matrícula:</span>
                        <Badge variant="outline" className={cn("text-[10px]", (m as any).hab_auto_matricula ? "text-success" : "text-destructive")}>
                          {(m as any).hab_auto_matricula ? "SÍ" : "NO"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Asistencias mínimas:</span>
                        <span className="font-semibold text-foreground">{(m as any).asistencias_minimas || 0}</span>
                      </div>
                      {(m as any).alerta_inasistencias && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-warning" /> Alerta inasistencias:</span>
                          <span className="font-semibold text-foreground">{(m as any).cantidad_inasistencias_alerta || 0}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border space-y-1 text-xs text-muted-foreground">
                      {(m.personas || m.maestro_nombre) && (
                        <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> {m.personas ? `${m.personas.nombres} ${m.personas.apellidos}` : m.maestro_nombre}</span>
                      )}
                      {m.horario && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {m.horario}</span>}
                      {(m.aulas || m.aula) && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {m.aulas?.nombre || m.aula}</span>}
                      {(m as any).cupos && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Cupos: {(m as any).cupos}</span>}
                      <span className="flex items-center gap-1 font-medium text-foreground"><GraduationCap className="h-3 w-3" /> {matriculasMateria} matriculados</span>
                    </div>

                    <div className="flex gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                      {(m as any).estado !== "Finalizada" ? (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1 gap-1"
                          onClick={async () => {
                            if (!confirm(`¿Finalizar la materia "${m.nombre}"?`)) return;
                            try {
                              await updateMateria.mutateAsync({ id: m.id, estado: "Finalizada" });
                              toast.success("Materia finalizada");
                            } catch { toast.error("Error"); }
                          }}>
                          <Lock className="h-3 w-3" /> Finalizar
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1 gap-1 text-success border-success/30 hover:bg-success/10"
                          onClick={async () => {
                            if (!confirm(`¿Reabrir la materia "${m.nombre}" para corregir calificaciones?`)) return;
                            try {
                              await updateMateria.mutateAsync({ id: m.id, estado: "En Curso" });
                              toast.success("Materia reabierta");
                            } catch { toast.error("Error"); }
                          }}>
                          <Unlock className="h-3 w-3" /> Reabrir
                        </Button>
                      )}
                      <DeleteConfirmDialog title="Eliminar materia" description={`¿Eliminar "${m.nombre}"?`} onConfirm={() => deleteMateria.mutateAsync(m.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "calificaciones" && (
        <GradingGrid cortes={cortes} materias={materias} periodoId={periodo.id} escuelaName={escuela?.nombre} />
      )}

      {activeTab === "asistencia" && (
        <AsistenciaMateriaTab materias={materias} periodoId={periodo.id} />
      )}

      {activeTab === "materias" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <MateriaFormDialog periodoId={periodo.id} />
          </div>
          {loadingMaterias ? <Skeleton className="h-32" /> : !materias?.length ? (
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
              <BookText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay materias.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {materias.map((m: any) => {
                const isEditing = editingMateria === m.id;
                return (
                  <div key={m.id} className="rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-foreground text-sm">{m.nombre}</h4>
                      <div className="flex items-center gap-1">
                        {!isEditing && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                            setEditingMateria(m.id);
                            setEditForm({
                              nombre: m.nombre || "",
                              descripcion: m.descripcion || "",
                              maestro_id: m.maestro_id || "",
                              aula_id: m.aula_id || "",
                              horario: m.horario || "",
                            });
                          }}>
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <DeleteConfirmDialog title="Eliminar materia" description={`¿Eliminar "${m.nombre}"?`} onConfirm={() => deleteMateria.mutateAsync(m.id)} />
                      </div>
                    </div>
                    {m.descripcion && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{m.descripcion}</p>}

                    {isEditing ? (
                      <div className="space-y-2 mt-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground font-medium">Nombre</label>
                          <Input value={editForm.nombre} onChange={(e) => setEditForm(f => ({ ...f, nombre: e.target.value }))} className="h-8 text-xs" placeholder="Nombre de la materia" />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-medium">Descripción</label>
                          <Input value={editForm.descripcion} onChange={(e) => setEditForm(f => ({ ...f, descripcion: e.target.value }))} className="h-8 text-xs" placeholder="Descripción (opcional)" />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-medium">Maestro</label>
                          <MaestroSearchPickerShared
                            personas={(personas || []).filter((p: any) => {
                              const TIPOS = ["Maestro Seminario", "Maestro Discipulado", "Maestro", "Mentor", "Pastor Principal"];
                              return TIPOS.includes(p.tipo_persona) || (p.tipos_persona || []).some((t: string) => TIPOS.includes(t));
                            })}
                            value={editForm.maestro_id || ""}
                            onChange={(v) => setEditForm(f => ({ ...f, maestro_id: v }))}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-medium">Aula</label>
                          <Select value={editForm.aula_id} onValueChange={(v) => setEditForm(f => ({ ...f, aula_id: v }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar aula" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin aula</SelectItem>
                              {(aulasData || []).filter((a: any) => a.activo).map((a: any) => (
                                <SelectItem key={a.id} value={a.id}>{a.nombre} {a.sede ? `(${a.sede})` : ""}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-medium">Horario</label>
                          <Input value={editForm.horario} onChange={(e) => setEditForm(f => ({ ...f, horario: e.target.value }))} className="h-8 text-xs" placeholder="Ej: 7:00 pm" />
                        </div>
                        <div className="flex gap-1.5 pt-1">
                          <Button size="sm" className="h-7 text-xs flex-1" disabled={!editForm.nombre?.trim()} onClick={async () => {
                            if (!editForm.nombre?.trim()) {
                              toast.error("El nombre de la materia es obligatorio");
                              return;
                            }
                            try {
                              const maestro = (personas || []).find((p: any) => p.id === editForm.maestro_id);
                              const aula = (aulasData || []).find((a: any) => a.id === editForm.aula_id);
                              await updateMateria.mutateAsync({
                                id: m.id,
                                nombre: editForm.nombre.trim(),
                                descripcion: editForm.descripcion || null,
                                maestro_id: editForm.maestro_id === "none" ? null : editForm.maestro_id || null,
                                maestro_nombre: maestro ? `${maestro.nombres} ${maestro.apellidos}` : null,
                                aula_id: editForm.aula_id === "none" ? null : editForm.aula_id || null,
                                aula: aula?.nombre || null,
                                horario: editForm.horario || null,
                              });
                              toast.success("Materia actualizada");
                              setEditingMateria(null);
                            } catch { toast.error("Error al actualizar"); }
                          }}>
                            <Save className="h-3 w-3 mr-1" /> Guardar
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingMateria(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {(m.personas || m.maestro_nombre) ? (
                          <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> {m.personas ? `${m.personas.nombres} ${m.personas.apellidos}` : m.maestro_nombre}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-warning"><UserCheck className="h-3 w-3" /> Sin maestro asignado</span>
                        )}
                        {m.horario && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {m.horario}</span>}
                        {(m.aulas || m.aula) && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {m.aulas?.nombre || m.aula}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========== AULAS MANAGEMENT ==========
function AulasSection() {
  const { data: aulas, isLoading } = useAulas();
  const updateAula = useUpdateAula();
  const deleteAula = useDeleteAula();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Gestiona las aulas y sedes disponibles.</p>
        <AulaFormDialog />
      </div>
      {isLoading ? <Skeleton className="h-24" /> : !aulas?.length ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay aulas registradas.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {aulas.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium">{a.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {a.direccion && <>Dirección: {a.direccion}</>}
                  {a.sede && <> · Sede: {a.sede}</>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={a.activo} onCheckedChange={(v) => updateAula.mutateAsync({ id: a.id, activo: v })} />
                  <span className={`text-xs font-medium ${a.activo ? "text-success" : "text-muted-foreground"}`}>{a.activo ? "Activa" : "Inactiva"}</span>
                </div>
                <DeleteConfirmDialog title="Eliminar aula" description={`¿Eliminar "${a.nombre}"?`} onConfirm={() => deleteAula.mutateAsync(a.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== CALIFICACIONES SECTION (global) ==========
function CalificacionesSection({ escuelas, allPeriodos }: any) {
  const [selectedEscuela, setSelectedEscuela] = useState<string>("");
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("");
  const { data: materias } = useMaterias(selectedPeriodo || null);
  const { data: cortes } = useCortes(selectedPeriodo || null);

  const periodosForEscuela = useMemo(() => {
    if (!selectedEscuela) return [];
    return (allPeriodos || []).filter((p: any) => p.escuela_id === selectedEscuela);
  }, [allPeriodos, selectedEscuela]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Escuela:</label>
          <Select value={selectedEscuela} onValueChange={(v) => { setSelectedEscuela(v); setSelectedPeriodo(""); }}>
            <SelectTrigger><SelectValue placeholder="Seleccionar escuela" /></SelectTrigger>
            <SelectContent>
              {(escuelas || []).map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Período:</label>
          <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo} disabled={!selectedEscuela}>
            <SelectTrigger><SelectValue placeholder="Seleccionar período" /></SelectTrigger>
            <SelectContent>
              {periodosForEscuela.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedPeriodo ? (
        <GradingGrid cortes={cortes} materias={materias} periodoId={selectedPeriodo} />
      ) : (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Selecciona una escuela y período para ver las calificaciones.</p>
        </div>
      )}
    </div>
  );
}

// ========== PAGOS SECTION ==========
function PagosSection({ escuelas, allMatriculas }: any) {
  const [selectedEscuela, setSelectedEscuela] = useState<string>("");
  const [selectedMatricula, setSelectedMatricula] = useState<string | null>(null);
  const [searchPago, setSearchPago] = useState("");
  const { data: conceptos } = useConceptosPago(selectedEscuela || null);
  const { data: pagos, isLoading: loadingPagos } = usePagosMatricula(selectedMatricula);
  const { data: allPagosEscuela } = usePagosEscuela(selectedEscuela || null);
  const updatePago = useUpdatePagoMatricula();
  const deleteConcepto = useDeleteConceptoPago();

  const exportPagosExcel = () => {
    if (!allPagosEscuela?.length) return;
    const escuelaNombre = escuelas?.find((e: any) => e.id === selectedEscuela)?.nombre || "Escuela";
    exportToExcel({
      title: `Pagos - ${escuelaNombre}`,
      columns: [
        { header: "Estudiante", key: "estudiante" },
        { header: "Concepto", key: "concepto" },
        { header: "Monto", key: "monto" },
        { header: "Estado", key: "estado" },
        { header: "Monto Pagado", key: "monto_pagado" },
        { header: "Fecha Pago", key: "fecha_pago" },
      ],
      data: allPagosEscuela.map((p: any) => ({
        estudiante: `${p.matricula?.personas?.nombres || ""} ${p.matricula?.personas?.apellidos || ""}`.trim(),
        concepto: p.conceptos_pago?.nombre || "",
        monto: p.conceptos_pago?.monto || 0,
        estado: p.estado,
        monto_pagado: p.monto_pagado || 0,
        fecha_pago: p.fecha_pago || "",
      })),
      filename: `pagos_${escuelaNombre.toLowerCase().replace(/\s+/g, "_")}`,
    });
  };

  const matriculasEscuela = useMemo(() => {
    if (!selectedEscuela || !allMatriculas) return [];
    return allMatriculas.filter((m: any) => m.curso_id === selectedEscuela);
  }, [selectedEscuela, allMatriculas]);

  const filteredMatriculas = useMemo(() => {
    if (!searchPago) return matriculasEscuela;
    const q = searchPago.toLowerCase();
    return matriculasEscuela.filter((m: any) =>
      `${m.personas?.nombres} ${m.personas?.apellidos}`.toLowerCase().includes(q)
    );
  }, [matriculasEscuela, searchPago]);

  const selectedStudent = useMemo(() => {
    if (!selectedMatricula) return null;
    return allMatriculas?.find((m: any) => m.id === selectedMatricula);
  }, [selectedMatricula, allMatriculas]);

  const handleUpdatePago = async (pagoId: string, estado: string) => {
    try {
      const updates: any = { id: pagoId, estado };
      if (estado === "Pagado") {
        updates.fecha_pago = new Date().toISOString().split("T")[0];
        const pago = pagos?.find((p: any) => p.id === pagoId);
        if (pago?.conceptos_pago?.monto) updates.monto_pagado = pago.conceptos_pago.monto;
      }
      await updatePago.mutateAsync(updates);
      toast.success(estado === "Pagado" ? "Pago registrado" : "Estado actualizado");
    } catch {
      toast.error("Error al actualizar pago");
    }
  };

  const totalConceptos = pagos?.length || 0;
  const totalPagados = pagos?.filter((p: any) => p.estado === "Pagado").length || 0;
  const totalMonto = pagos?.reduce((s: number, p: any) => s + (p.conceptos_pago?.monto || 0), 0) || 0;
  const totalPagado = pagos?.reduce((s: number, p: any) => s + (p.monto_pagado || 0), 0) || 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Gestiona los conceptos de pago por escuela y el estado de pagos por estudiante.</p>
      
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedEscuela} onValueChange={(v) => { setSelectedEscuela(v); setSelectedMatricula(null); }}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Selecciona una escuela" /></SelectTrigger>
          <SelectContent>
            {(escuelas || []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedEscuela && <ConceptoPagoFormDialog cursoId={selectedEscuela} />}
        {selectedEscuela && (
          <Button size="sm" variant="outline" onClick={exportPagosExcel} disabled={!allPagosEscuela?.length} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Exportar Excel
          </Button>
        )}
      </div>

      {selectedEscuela && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Conceptos de pago configurados */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Conceptos de pago</h3>
            <div className="rounded-xl border bg-card divide-y">
              {!conceptos?.length ? (
                <p className="text-xs text-muted-foreground text-center py-8">No hay conceptos configurados.</p>
              ) : (
                conceptos.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-medium">{c.nombre}</p>
                      <p className="text-xs text-muted-foreground">${c.monto}</p>
                    </div>
                    <DeleteConfirmDialog title="Eliminar concepto" description={`¿Eliminar "${c.nombre}"?`} onConfirm={() => deleteConcepto.mutateAsync(c.id)} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Lista de estudiantes matriculados */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Estudiantes matriculados</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar estudiante..." value={searchPago} onChange={(e) => setSearchPago(e.target.value)} className="pl-10 h-9" />
            </div>
            <div className="rounded-xl border bg-card divide-y max-h-72 overflow-auto">
              {!filteredMatriculas.length ? (
                <p className="text-xs text-muted-foreground text-center py-8">No hay matrículas.</p>
              ) : (
                filteredMatriculas.map((m: any) => {
                  const initials = `${m.personas?.nombres?.[0] || ""}${m.personas?.apellidos?.[0] || ""}`.toUpperCase();
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMatricula(m.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/30",
                        selectedMatricula === m.id && "bg-primary/5 border-l-2 border-l-primary"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.personas?.foto_url || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.personas?.nombres} {m.personas?.apellidos}</p>
                        <p className="text-xs text-muted-foreground">{m.estado}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detalle de pagos del estudiante seleccionado */}
      {selectedMatricula && (
        <div className="space-y-3 mt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Pagos de {selectedStudent?.personas?.nombres} {selectedStudent?.personas?.apellidos}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setSelectedMatricula(null)} className="text-xs gap-1">
              <X className="h-3 w-3" /> Cerrar
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Conceptos</p>
              <p className="text-lg font-bold text-foreground">{totalConceptos}</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Pagados</p>
              <p className="text-lg font-bold text-success">{totalPagados}/{totalConceptos}</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-foreground">${totalMonto}</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Pagado</p>
              <p className="text-lg font-bold text-success">${totalPagado}</p>
            </div>
          </div>

          {loadingPagos ? <Skeleton className="h-24" /> : !pagos?.length ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay pagos registrados para esta matrícula.</p>
              <p className="text-xs mt-1">Los pagos se generan automáticamente al matricular según los conceptos configurados.</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Concepto</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Monto</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Estado</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Fecha pago</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p: any) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-medium">{p.conceptos_pago?.nombre || "—"}</td>
                      <td className="p-3 text-center">${p.conceptos_pago?.monto || 0}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className={cn("text-xs",
                          p.estado === "Pagado"
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-warning/10 text-warning border-warning/20"
                        )}>
                          {p.estado === "Pagado" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                          {p.estado}
                        </Badge>
                      </td>
                      <td className="p-3 text-center text-muted-foreground text-xs">
                        {p.fecha_pago ? format(parseISO(p.fecha_pago), "d MMM yyyy", { locale: es }) : "—"}
                      </td>
                      <td className="p-3 text-center">
                        {p.estado === "Pendiente" ? (
                          <Button size="sm" variant="outline" className="text-xs gap-1 text-success border-success/30 hover:bg-success/10"
                            onClick={() => handleUpdatePago(p.id, "Pagado")} disabled={updatePago.isPending}>
                            <CheckCircle2 className="h-3 w-3" /> Marcar pagado
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-xs gap-1 text-muted-foreground"
                            onClick={() => handleUpdatePago(p.id, "Pendiente")} disabled={updatePago.isPending}>
                            <XCircle className="h-3 w-3" /> Revertir
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========== RECURSOS SECTION ==========
function RecursosSection({ escuelas, allPeriodos }: any) {
  const [selectedEscuela, setSelectedEscuela] = useState<string>("");
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("");
  const { data: materias } = useMaterias(selectedPeriodo || null);
  const [selectedMateria, setSelectedMateria] = useState<string>("");
  const { data: recursos } = useRecursos(selectedMateria || null);
  const deleteRecurso = useDeleteRecurso();

  const periodosForEscuela = useMemo(() => {
    if (!selectedEscuela) return [];
    return (allPeriodos || []).filter((p: any) => p.escuela_id === selectedEscuela);
  }, [allPeriodos, selectedEscuela]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Recursos y materiales de apoyo por materia. Los maestros pueden subir archivos y enlaces.</p>
      <div className="flex flex-wrap gap-3">
        <Select value={selectedEscuela} onValueChange={(v) => { setSelectedEscuela(v); setSelectedPeriodo(""); setSelectedMateria(""); }}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Escuela" /></SelectTrigger>
          <SelectContent>
            {(escuelas || []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedPeriodo} onValueChange={(v) => { setSelectedPeriodo(v); setSelectedMateria(""); }} disabled={!selectedEscuela}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Período" /></SelectTrigger>
          <SelectContent>
            {periodosForEscuela.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedMateria} onValueChange={setSelectedMateria} disabled={!selectedPeriodo}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Materia" /></SelectTrigger>
          <SelectContent>
            {(materias || []).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedMateria && <RecursoFormDialog materiaId={selectedMateria} />}
      </div>

      {selectedMateria && (
        <div className="space-y-3">
          {!recursos?.length ? (
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay recursos para esta materia.</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card divide-y">
              {recursos.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 p-4 hover:bg-muted/20">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    r.tipo === "enlace" ? "bg-blue-500/10" : "bg-accent/10"
                  )}>
                    {r.tipo === "enlace" ? <ExternalLink className="h-4 w-4 text-blue-500" /> : <File className="h-4 w-4 text-accent" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.titulo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.tipo === "enlace" ? r.url : r.archivo_nombre}
                      {r.personas && <> · {r.personas.nombres} {r.personas.apellidos}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.tipo === "enlace" && r.url && (
                      <Button size="sm" variant="ghost" asChild><a href={r.url} target="_blank" rel="noopener"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                    )}
                    {r.tipo === "archivo" && r.archivo_url && (
                      <Button size="sm" variant="ghost" asChild><a href={r.archivo_url} target="_blank" rel="noopener"><Download className="h-3.5 w-3.5" /></a></Button>
                    )}
                    <DeleteConfirmDialog title="Eliminar recurso" description={`¿Eliminar "${r.titulo}"?`} onConfirm={() => deleteRecurso.mutateAsync(r.id)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========== HOMOLOGACIONES SECTION ==========
function HomologacionesSection() {
  const { data: homologaciones, isLoading } = useHomologaciones();
  const deleteHomologacion = useDeleteHomologacion();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!homologaciones) return [];
    if (!search) return homologaciones;
    const q = search.toLowerCase();
    return homologaciones.filter((h: any) =>
      `${h.personas?.nombres} ${h.personas?.apellidos} ${h.materia_nombre} ${h.institucion_origen}`.toLowerCase().includes(q)
    );
  }, [homologaciones, search]);

  const exportExcel = () => {
    exportToExcel({
      title: "Homologaciones",
      columns: [
        { header: "Persona", key: "persona" },
        { header: "Materia", key: "materia" },
        { header: "Institución", key: "institucion" },
        { header: "Calificación", key: "calificacion" },
        { header: "Fecha", key: "fecha" },
        { header: "Observaciones", key: "observaciones" },
      ],
      data: filtered.map((h: any) => ({
        persona: `${h.personas?.nombres || ""} ${h.personas?.apellidos || ""}`,
        materia: h.materia_nombre,
        institucion: h.institucion_origen,
        calificacion: h.calificacion_obtenida ?? "",
        fecha: h.fecha_homologacion,
        observaciones: h.observaciones || "",
      })),
      filename: "homologaciones",
    });
  };

  if (isLoading) return <Skeleton className="h-32" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Registro de materias homologadas de otras instituciones.</p>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <HomologacionFormDialog />
        <Button size="sm" variant="outline" onClick={exportExcel} disabled={!filtered.length} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Excel
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Persona</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Materia</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Institución</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Calificación</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Fecha</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-xs">No hay homologaciones registradas.</td></tr>
              ) : (
                filtered.map((h: any) => (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-medium">{h.personas?.nombres} {h.personas?.apellidos}</td>
                    <td className="p-3 text-muted-foreground">{h.materia_nombre}</td>
                    <td className="p-3 text-muted-foreground">{h.institucion_origen}</td>
                    <td className="p-3 text-center font-semibold">{h.calificacion_obtenida ?? "—"}</td>
                    <td className="p-3 text-center text-muted-foreground">{h.fecha_homologacion}</td>
                    <td className="p-3 text-center">
                      <DeleteConfirmDialog title="Eliminar homologación" description="¿Eliminar esta homologación?" onConfirm={() => deleteHomologacion.mutateAsync(h.id)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ========== DASHBOARD FINANCIERO ==========
function DashboardFinancieroSection({ escuelas, allMatriculas }: any) {
  const [allPagosData, setAllPagosData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Fetch all payments for all schools on mount
  useEffect(() => {
    if (!escuelas?.length) return;
    setLoading(true);
    const fetchAll = async () => {
      const result: Record<string, any[]> = {};
      for (const esc of escuelas) {
        const matriculas = (allMatriculas || []).filter((m: any) => m.curso_id === esc.id);
        if (!matriculas.length) { result[esc.id] = []; continue; }
        const ids = matriculas.map((m: any) => m.id);
        const { data } = await supabase
          .from("pagos_matricula")
          .select("*, conceptos_pago(nombre, monto)")
          .in("matricula_id", ids);
        result[esc.id] = data || [];
      }
      setAllPagosData(result);
      setLoading(false);
    };
    fetchAll();
  }, [escuelas, allMatriculas]);

  // Filter payments by date range
  const filteredPagosData = useMemo(() => {
    if (!fechaDesde && !fechaHasta) return allPagosData;
    const filtered: Record<string, any[]> = {};
    for (const [escId, pagos] of Object.entries(allPagosData)) {
      filtered[escId] = (pagos as any[]).filter((p: any) => {
        const fecha = p.fecha_pago || p.created_at?.split("T")[0];
        if (!fecha) return true;
        if (fechaDesde && fecha < fechaDesde) return false;
        if (fechaHasta && fecha > fechaHasta) return false;
        return true;
      });
    }
    return filtered;
  }, [allPagosData, fechaDesde, fechaHasta]);

  const escuelasStats = useMemo(() => {
    return (escuelas || []).map((esc: any) => {
      const pagos = filteredPagosData[esc.id] || [];
      const totalMonto = pagos.reduce((s: number, p: any) => s + (p.conceptos_pago?.monto || 0), 0);
      const totalPagado = pagos.reduce((s: number, p: any) => s + (p.monto_pagado || 0), 0);
      const totalPagados = pagos.filter((p: any) => p.estado === "Pagado").length;
      const totalPendientes = pagos.filter((p: any) => p.estado === "Pendiente").length;
      const cobranza = totalMonto > 0 ? (totalPagado / totalMonto) * 100 : 0;
      const matriculados = (allMatriculas || []).filter((m: any) => m.curso_id === esc.id).length;
      return {
        id: esc.id,
        nombre: esc.nombre,
        matriculados,
        totalConceptos: pagos.length,
        totalPagados,
        totalPendientes,
        totalMonto,
        totalPagado,
        morosidad: totalMonto - totalPagado,
        cobranza,
      };
    });
  }, [escuelas, filteredPagosData, allMatriculas]);

  const globalTotalMonto = escuelasStats.reduce((s: number, e: any) => s + e.totalMonto, 0);
  const globalTotalPagado = escuelasStats.reduce((s: number, e: any) => s + e.totalPagado, 0);
  const globalMorosidad = globalTotalMonto - globalTotalPagado;
  const globalCobranza = globalTotalMonto > 0 ? (globalTotalPagado / globalTotalMonto) * 100 : 0;

  const exportDashboard = () => {
    exportToExcel({
      title: "Dashboard Financiero Académico",
      columns: [
        { header: "Escuela", key: "nombre" },
        { header: "Matriculados", key: "matriculados" },
        { header: "Total Esperado", key: "totalMonto" },
        { header: "Total Pagado", key: "totalPagado" },
        { header: "Morosidad", key: "morosidad" },
        { header: "% Cobranza", key: "cobranza" },
        { header: "Pagos Realizados", key: "totalPagados" },
        { header: "Pagos Pendientes", key: "totalPendientes" },
      ],
      data: escuelasStats.map((e: any) => ({
        ...e,
        cobranza: `${e.cobranza.toFixed(1)}%`,
      })),
      filename: "dashboard_financiero_academico",
    });
  };

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Resumen financiero de ingresos, cobranza y morosidad por escuela.</p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Desde:</label>
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="h-8 w-36 text-xs" />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Hasta:</label>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="h-8 w-36 text-xs" />
          </div>
          {(fechaDesde || fechaHasta) && (
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setFechaDesde(""); setFechaHasta(""); }}>
              <X className="h-3 w-3 mr-1" /> Limpiar
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={exportDashboard} className="gap-1.5 h-8">
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
        </div>
      </div>

      {/* Global metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground font-medium">Total esperado</p>
          </div>
          <p className="text-2xl font-bold text-foreground">${globalTotalMonto.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-success" />
            <p className="text-xs text-muted-foreground font-medium">Total recaudado</p>
          </div>
          <p className="text-2xl font-bold text-success">${globalTotalPagado.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-xs text-muted-foreground font-medium">Morosidad</p>
          </div>
          <p className="text-2xl font-bold text-destructive">${globalMorosidad.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="h-4 w-4 text-info" />
            <p className="text-xs text-muted-foreground font-medium">% Cobranza</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{globalCobranza.toFixed(1)}%</p>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${Math.min(globalCobranza, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Per-school breakdown */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Escuela</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Matriculados</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Esperado</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Recaudado</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Morosidad</th>
              <th className="text-center p-3 font-medium text-muted-foreground">% Cobranza</th>
            </tr>
          </thead>
          <tbody>
            {!escuelasStats.length ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-xs">No hay datos.</td></tr>
            ) : (
              escuelasStats.map((e: any) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3 font-medium">{e.nombre}</td>
                  <td className="p-3 text-center">{e.matriculados}</td>
                  <td className="p-3 text-center">${e.totalMonto.toLocaleString()}</td>
                  <td className="p-3 text-center text-success font-semibold">${e.totalPagado.toLocaleString()}</td>
                  <td className="p-3 text-center">
                    {e.morosidad > 0 ? (
                      <span className="text-destructive font-semibold">${e.morosidad.toLocaleString()}</span>
                    ) : (
                      <span className="text-success">$0</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-success transition-all" style={{ width: `${Math.min(e.cobranza, 100)}%` }} />
                      </div>
                      <span className="text-xs font-medium">{e.cobranza.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      {escuelasStats.filter((e: any) => e.totalMonto > 0).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar Chart - Collection by School */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Cobranza por escuela</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={escuelasStats.filter((e: any) => e.totalMonto > 0)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="totalMonto" name="Esperado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalPagado" name="Recaudado" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Distribution */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Distribución de cobranza</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RechartsPie>
                <Pie
                  data={escuelasStats.filter((e: any) => e.totalMonto > 0).map((e: any, i: number) => ({
                    name: e.nombre,
                    value: e.totalPagado,
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {escuelasStats.filter((e: any) => e.totalMonto > 0).map((_: any, i: number) => (
                    <Cell key={i} fill={["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--accent))", "hsl(var(--warning))", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"][i % 8]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AcademiaPage() {
  const { data: escuelas, isLoading } = useEscuelas();
  const { data: allMatriculas } = useAllMatriculas();
  const { data: allPeriodos } = useAllPeriodos();
  const { data: certificados } = useCertificados();

  const [activeSection, setActiveSection] = useState("escuelas");

  const totalEscuelas = escuelas?.length || 0;
  const totalEstudiantes = new Set(allMatriculas?.map((m: any) => m.persona_id)).size;
  const totalCertificados = certificados?.length || 0;
  const periodosAbiertos = (allPeriodos || []).filter((p: any) => p.estado === "Abierto").length;

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const sectionTitle: Record<string, string> = {
    escuelas: "Escuelas",
    periodos: "Períodos",
    estudiantes: "Estudiantes",
    maestros: "Maestros",
    calificaciones: "Calificaciones",
    "historial-calificaciones": "Historial de Calificaciones",
    "historial-matriculas": "Historial de Matrículas",
    pagos: "Gestión de Pagos",
    "dashboard-financiero": "Dashboard Financiero",
    recursos: "Recursos y Contenido",
    homologaciones: "Homologaciones",
    certificados: "Certificados",
    aulas: "Gestionar Aulas",
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Escuelas" value={totalEscuelas} icon={BookOpen} />
        <MetricCard title="Períodos Abiertos" value={periodosAbiertos} icon={Unlock} variant="success" />
        <MetricCard title="Estudiantes" value={totalEstudiantes} icon={Users} variant="info" />
        <MetricCard title="Certificados" value={totalCertificados} icon={Award} variant="accent" />
      </div>

      {/* Mobile nav */}
      <MobileNav activeSection={activeSection} onSectionChange={setActiveSection} />

      {/* Layout with sidebar */}
      <div className="flex gap-0 rounded-xl border bg-background overflow-hidden min-h-[500px]">
        <AcademiaSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <div className="flex-1 p-5 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">{sectionTitle[activeSection] || "Academia"}</h2>
            <ImportAcademiaDialog />
          </div>

          {activeSection === "escuelas" && (
            <EscuelasSection escuelas={escuelas} allPeriodos={allPeriodos} allMatriculas={allMatriculas}
              onSelectEscuela={() => setActiveSection("periodos")} />
          )}
          {activeSection === "periodos" && (
            <PeriodosSection escuelas={escuelas} allPeriodos={allPeriodos} allMatriculas={allMatriculas} />
          )}
          {activeSection === "estudiantes" && (
            <EstudiantesSection escuelas={escuelas} allPeriodos={allPeriodos} allMatriculas={allMatriculas} />
          )}
          {activeSection === "maestros" && (
            <MaestrosSection escuelas={escuelas} allPeriodos={allPeriodos} />
          )}
          {activeSection === "calificaciones" && (
            <CalificacionesSection escuelas={escuelas} allPeriodos={allPeriodos} />
          )}
          {activeSection === "historial-matriculas" && (
            <HistorialMatriculasSection escuelas={escuelas} allPeriodos={allPeriodos} allMatriculas={allMatriculas} />
          )}
          {activeSection === "historial-calificaciones" && <HistorialCalificacionesSection />}
          {activeSection === "pagos" && <PagosSection escuelas={escuelas} allMatriculas={allMatriculas} />}
          {activeSection === "dashboard-financiero" && <DashboardFinancieroSection escuelas={escuelas} allMatriculas={allMatriculas} />}
          {activeSection === "recursos" && <RecursosSection escuelas={escuelas} allPeriodos={allPeriodos} />}
          {activeSection === "homologaciones" && <HomologacionesSection />}
          {activeSection === "certificados" && <CertificadosSection />}
          {activeSection === "aulas" && <AulasSection />}
        </div>
      </div>
    </div>
  );
}
