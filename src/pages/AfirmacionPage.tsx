import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Users,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  Download,
  Award,
  AlertTriangle,
  TrendingUp,
  Phone,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  UserPlus,
  Table as TableIcon,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ConsolidacionDashboardTab } from "@/components/persona/ConsolidacionDashboardTab";
import { RegistrarLlamadaConsolidacionDialog } from "@/components/persona/RegistrarLlamadaConsolidacionDialog";
import AfirmacionExportDialog from "@/components/afirmacion/AfirmacionExportDialog";
import { AfirmacionRegistroVisitanteDialog } from "@/components/afirmacion/AfirmacionRegistroVisitanteDialog";
import { useAfirmacionRuta, PersonaAfirmacionRuta, HITOS_AFIRMACION_16, PersonaHitoEstado } from "@/hooks/useAfirmacionRuta";
import { AfirmacionTimelineModal } from "@/components/afirmacion/AfirmacionTimelineModal";
import { HitoEditDialog } from "@/components/afirmacion/HitoEditDialog";

// Short labels for table column headers
const HITO_SHORT_LABELS = [
  "Llam 1", "Msj 1", "Llam 2", "Msj 2", "Llam 3", "Msj 3",
  "Msj 4", "Msj 5", "Msj 6", "Visita", "Consej.",
  "Fiesta", "NPT", "SdP 1", "SdP 2", "SdP 3",
];

export default function AfirmacionPage() {
  const { personasRuta, isLoading, stats, updateHito, refetch } = useAfirmacionRuta();

  // Filters
  const [search, setSearch] = useState("");
  const [filterCdp, setFilterCdp] = useState<string>("todos");
  const [filterFecha, setFilterFecha] = useState<string>("todas");
  const [filterConsolidador, setFilterConsolidador] = useState<string>("todos");
  const [filterEstado, setFilterEstado] = useState<string>("todos");

  // Pagination for high-performance table rendering
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Registro rápido de visitantes desde el celular
  const [openRegistroVisitante, setOpenRegistroVisitante] = useState(false);

  // Selected persona for Timeline modal & HitoEditDialog
  const [selectedPersona, setSelectedPersona] = useState<PersonaAfirmacionRuta | null>(null);
  const [openTimelineModal, setOpenTimelineModal] = useState(false);
  const [openRegistrarLlamadaDialog, setOpenRegistrarLlamadaDialog] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    personaId: string;
    personaNombre: string;
    hito: PersonaHitoEstado;
  } | null>(null);

  const consolidadoresOptions = useMemo(() => {
    const set = new Set<string>();
    personasRuta.forEach((p) => {
      if (p.consolidadorNombre && p.consolidadorNombre !== "Sin asignación") {
        set.add(p.consolidadorNombre);
      }
    });
    return Array.from(set).sort();
  }, [personasRuta]);

  // Filtered personas list
  const filteredPersonas = useMemo(() => {
    const s = search.toLowerCase().trim();
    const now = new Date();
    const todayTime = now.getTime();

    return personasRuta.filter((p) => {
      const matchSearch =
        !s ||
        p.nombreCompleto.toLowerCase().includes(s) ||
        (p.telefono && p.telefono.includes(s)) ||
        (p.consolidadorNombre && p.consolidadorNombre.toLowerCase().includes(s));

      if (!matchSearch) return false;

      if (filterCdp === "con_cdp" && !p.grupoId) return false;
      if (filterCdp === "sin_cdp" && p.grupoId) return false;

      if (filterConsolidador !== "todos" && p.consolidadorNombre !== filterConsolidador) {
        return false;
      }

      if (filterFecha !== "todas" && p.fechaIngreso) {
        const ingTime = new Date(p.fechaIngreso).getTime();
        const diffDays = (todayTime - ingTime) / (1000 * 60 * 60 * 24);

        if (filterFecha === "7dias" && diffDays > 7) return false;
        if (filterFecha === "15dias" && diffDays > 15) return false;
        if (filterFecha === "30dias" && diffDays > 30) return false;
        if (filterFecha === "este_mes") {
          const ingDate = new Date(p.fechaIngreso);
          if (ingDate.getMonth() !== now.getMonth() || ingDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
        if (filterFecha === "mes_anterior") {
          const ingDate = new Date(p.fechaIngreso);
          const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          if (ingDate.getMonth() !== prevMonth || ingDate.getFullYear() !== prevYear) {
            return false;
          }
        }
        if (filterFecha === "este_anio") {
          const ingDate = new Date(p.fechaIngreso);
          if (ingDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      if (filterEstado === "en_curso") return p.estadoGeneral === "En curso";
      if (filterEstado === "finalizado") return p.estadoGeneral === "Finalizado";
      if (filterEstado === "pendiente") return p.estadoGeneral === "Pendiente";
      if (filterEstado === "atrasado") return p.tieneAtrasos;

      return true;
    });
  }, [personasRuta, search, filterCdp, filterFecha, filterConsolidador, filterEstado]);

  // Paginated subset
  const totalPages = Math.ceil(filteredPersonas.length / (pageSize || 1)) || 1;
  const paginatedPersonas = useMemo(() => {
    if (pageSize === 0) return filteredPersonas;
    const start = (page - 1) * pageSize;
    return filteredPersonas.slice(start, start + pageSize);
  }, [filteredPersonas, page, pageSize]);

  const handleOpenTimeline = (p: PersonaAfirmacionRuta) => {
    setSelectedPersona(p);
    setOpenTimelineModal(true);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ── HERO BANNER AFIRMACIÓN ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/95 to-emerald-900 text-primary-foreground p-5 sm:p-7 shadow-xl border border-primary-glow/20">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15 text-xs font-semibold text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Tabla de Seguimiento de 16 Hitos
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold tracking-tight leading-tight">
              Afirmación del Creyente
            </h1>
            <p className="text-xs sm:text-sm text-primary-foreground/80 leading-relaxed font-sans">
              Tabla interactiva de alto rendimiento para el control individual de la ruta de 16 hitos de crecimiento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => setOpenRegistroVisitante(true)}
              className="bg-white text-primary hover:bg-white/90 font-bold shadow-md rounded-xl px-3.5 h-9 gap-2 text-xs"
            >
              <UserPlus className="h-4 w-4" /> Registrar Visitante
            </Button>
            <Button
              onClick={() => setOpenRegistrarLlamadaDialog(true)}
              className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold shadow-md rounded-xl px-3.5 h-9 gap-2 text-xs"
            >
              <PhoneCall className="h-4 w-4" /> Registrar Llamada
            </Button>
            <AfirmacionExportDialog
              personas={personasRuta}
              trigger={
                <Button
                  variant="outline"
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur rounded-xl px-3.5 h-9 gap-2 font-semibold text-xs"
                >
                  <Download className="h-4 w-4" /> Exportar Excel
                </Button>
              }
            />
            <Button
              variant="outline"
              onClick={async () => {
                toast.info("Actualizando datos...");
                await refetch();
              }}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur rounded-xl px-3 h-9 gap-1.5 font-semibold text-xs"
              title="Recargar datos de la tabla"
            >
              <RotateCw className="h-3.5 w-3.5" /> Recargar
            </Button>
          </div>
        </div>
      </div>

      <AfirmacionRegistroVisitanteDialog open={openRegistroVisitante} onOpenChange={setOpenRegistroVisitante} />

      {/* ── KPI RESUMEN ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              En Afirmación
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-extrabold mt-1 tabular-nums">
            {stats.totalPersonasEnAfirmacion}
          </div>
          <div className="text-[10px] text-muted-foreground">Personas activas</div>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">
              En Proceso
            </span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 shrink-0">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-extrabold mt-1 tabular-nums text-sky-600">
            {stats.personasEnProceso}
          </div>
          <div className="text-[10px] text-muted-foreground">Avanzando en la ruta</div>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Hitos Logrados
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
              <Award className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-extrabold mt-1 tabular-nums text-emerald-600">
            {stats.hitosCompletadosTotales}
          </div>
          <div className="text-[10px] text-muted-foreground">Hitos superados</div>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Llamadas
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
              <PhoneCall className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-extrabold mt-1 tabular-nums">
            {stats.totalLlamadasRegistradas}
          </div>
          <div className="text-[10px] text-muted-foreground">Llamadas registradas</div>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
              Atrasados
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 shrink-0">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-extrabold mt-1 tabular-nums text-rose-600">
            {stats.seguimientosAtrasados}
          </div>
          <div className="text-[10px] text-muted-foreground">Atención pendiente</div>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Avance General
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-extrabold mt-1 tabular-nums text-primary">
            {stats.porcentajeAvanceGeneral}%
          </div>
          <Progress value={stats.porcentajeAvanceGeneral} className="h-1.5 mt-1" />
        </Card>
      </div>

      {/* ── TABS ────────────────────────────────────────── */}
      <Tabs defaultValue="tabla" className="w-full space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-2.5">
          <TabsList className="bg-muted/70 p-1 rounded-2xl">
            <TabsTrigger
              value="tabla"
              className="rounded-xl px-4 py-1.5 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <TableIcon size={14} /> Tabla de Hitos ({filteredPersonas.length})
            </TabsTrigger>
            <TabsTrigger
              value="consolidacion"
              className="rounded-xl px-4 py-1.5 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <PhoneCall size={14} /> Consolidación & Llamadas (45 Días)
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: TABLA GENERAL DE AFIRMACIÓN */}
        <TabsContent value="tabla" className="space-y-4 m-0">
          {/* Filtros Toolbar */}
          <div className="flex flex-col gap-2.5 bg-card p-3.5 rounded-2xl border border-border/70 shadow-sm">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, teléfono o consolidador..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 rounded-xl bg-background border-border/70 text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
              <Select value={filterCdp} onValueChange={(v) => { setFilterCdp(v); setPage(1); }}>
                <SelectTrigger className="h-8 rounded-xl bg-background border-border text-xs">
                  <SelectValue placeholder="CDP Asignada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">Todas (con/sin CDP)</SelectItem>
                  <SelectItem value="con_cdp" className="text-xs">🏠 Con CDP asignada</SelectItem>
                  <SelectItem value="sin_cdp" className="text-xs">Sin CDP asignada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterFecha} onValueChange={(v) => { setFilterFecha(v); setPage(1); }}>
                <SelectTrigger className="h-8 rounded-xl bg-background border-border text-xs">
                  <SelectValue placeholder="Fecha Ingreso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas" className="text-xs">📅 Todas las Fechas (por defecto)</SelectItem>
                  <SelectItem value="15dias" className="text-xs">Últimos 15 Días</SelectItem>
                  <SelectItem value="7dias" className="text-xs">Últimos 7 Días</SelectItem>
                  <SelectItem value="30dias" className="text-xs">Últimos 30 Días</SelectItem>
                  <SelectItem value="este_mes" className="text-xs">Este Mes</SelectItem>
                  <SelectItem value="mes_anterior" className="text-xs">Mes Anterior</SelectItem>
                  <SelectItem value="este_anio" className="text-xs">Este Año</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterConsolidador} onValueChange={(v) => { setFilterConsolidador(v); setPage(1); }}>
                <SelectTrigger className="h-8 rounded-xl bg-background border-border text-xs">
                  <SelectValue placeholder="Consolidador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">Todos los Consolidadores</SelectItem>
                  {consolidadoresOptions.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterEstado} onValueChange={(v) => { setFilterEstado(v); setPage(1); }}>
                <SelectTrigger className="h-8 rounded-xl bg-background border-border text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">Todos los Estados</SelectItem>
                  <SelectItem value="en_curso" className="text-xs">🔵 En curso</SelectItem>
                  <SelectItem value="finalizado" className="text-xs">🟢 Finalizados</SelectItem>
                  <SelectItem value="pendiente" className="text-xs">⚪ Pendientes</SelectItem>
                  <SelectItem value="atrasado" className="text-xs">🔴 Con Atrasos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 rounded-xl bg-background border-border text-xs">
                  <SelectValue placeholder="Filas por página" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25" className="text-xs">25 filas / pág</SelectItem>
                  <SelectItem value="50" className="text-xs">50 filas / pág</SelectItem>
                  <SelectItem value="100" className="text-xs">100 filas / pág</SelectItem>
                  <SelectItem value="0" className="text-xs">Mostrar todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* VISTA DE TABLA */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-xs font-medium">
              Cargando personas y tabla de hitos...
            </div>
          ) : filteredPersonas.length === 0 ? (
            <div className="text-center py-12 border rounded-2xl bg-card text-muted-foreground">
              <p className="font-semibold text-sm">No se encontraron personas con ese criterio.</p>
              <p className="text-xs mt-1">Ajusta la búsqueda o el filtro seleccionado.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/70 border-b border-border/70">
                      <th className="sticky left-0 z-20 bg-muted/95 backdrop-blur px-3 py-2.5 text-left font-bold text-foreground whitespace-nowrap min-w-[170px]">
                        Nombre
                      </th>
                      <th className="px-2 py-2.5 text-left font-bold text-muted-foreground whitespace-nowrap min-w-[110px]">
                        CDP Asignada
                      </th>
                      <th className="px-2 py-2.5 text-left font-bold text-muted-foreground whitespace-nowrap min-w-[80px]">
                        Teléfono
                      </th>
                      <th className="px-2 py-2.5 text-left font-bold text-muted-foreground whitespace-nowrap min-w-[80px]">
                        Ingreso
                      </th>
                      <th className="px-2 py-2.5 text-center font-bold text-muted-foreground whitespace-nowrap min-w-[45px]">
                        Días
                      </th>
                      <th className="px-2 py-2.5 text-left font-bold text-muted-foreground whitespace-nowrap min-w-[100px]">
                        Consolidador
                      </th>

                      {/* 16 Hitos Headers */}
                      {HITO_SHORT_LABELS.map((label, i) => (
                        <th
                          key={i}
                          className="px-1 py-2.5 text-center font-bold text-muted-foreground whitespace-nowrap min-w-[50px]"
                          title={`Hito #${i + 1}: ${HITOS_AFIRMACION_16[i]?.nombre}`}
                        >
                          <span className="block text-[9px] leading-tight">{label}</span>
                        </th>
                      ))}

                      <th className="px-2 py-2.5 text-center font-bold text-muted-foreground whitespace-nowrap min-w-[50px]">
                        Avance
                      </th>
                      <th className="px-2 py-2.5 text-center font-bold text-muted-foreground whitespace-nowrap min-w-[65px]">
                        Estado
                      </th>
                      <th className="px-2 py-2.5 text-center font-bold text-muted-foreground whitespace-nowrap min-w-[45px]">
                        Ver
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPersonas.map((p, rowIdx) => {
                      const isDone = p.estadoGeneral === "Finalizado";
                      const isDoing = p.estadoGeneral === "En curso";
                      const cleanPhone = p.whatsapp || p.telefono ? (p.whatsapp || p.telefono)!.replace(/\D/g, "") : "";

                      return (
                        <tr
                          key={p.id}
                          className={`border-b border-border/40 hover:bg-muted/30 transition-colors ${
                            rowIdx % 2 === 0 ? "bg-card" : "bg-muted/10"
                          }`}
                        >
                          {/* Nombre (sticky) */}
                          <td className="sticky left-0 z-10 bg-inherit px-3 py-2 font-semibold text-foreground whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                                {p.nombreCompleto.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[130px]" title={p.nombreCompleto}>
                                {p.nombreCompleto}
                              </span>
                            </div>
                          </td>

                          {/* CDP Asignada */}
                          <td className="px-2 py-2 text-muted-foreground whitespace-nowrap text-[10px]">
                            {p.grupoId && p.grupoNombre ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] whitespace-nowrap font-semibold" title={p.grupoNombre}>
                                🏠 {p.grupoNombre}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] whitespace-nowrap">
                                Sin asignar
                              </Badge>
                            )}
                          </td>

                          {/* Teléfono */}
                          <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {p.telefono ? (
                                <>
                                  <a href={`tel:${p.telefono}`} className="hover:text-primary transition-colors" title="Llamar">
                                    <Phone className="h-3 w-3" />
                                  </a>
                                  <span className="text-[10px]">{p.telefono}</span>
                                  {cleanPhone.length >= 7 && (
                                    <a
                                      href={`https://wa.me/${cleanPhone.length === 10 ? '57' + cleanPhone : cleanPhone}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-emerald-600 hover:text-emerald-500 transition-colors"
                                      title="WhatsApp"
                                    >
                                      <MessageSquare className="h-3 w-3" />
                                    </a>
                                  )}
                                </>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/50">—</span>
                              )}
                            </div>
                          </td>

                          {/* Fecha Ingreso */}
                          <td className="px-2 py-2 text-muted-foreground whitespace-nowrap text-[10px]">
                            {p.fechaIngreso ? format(parseISO(p.fechaIngreso), "dd/MM/yyyy") : "—"}
                          </td>

                          {/* Días */}
                          <td className="px-2 py-2 text-center font-semibold text-primary whitespace-nowrap tabular-nums text-[10px]">
                            {p.diasDesdeIngreso}
                          </td>

                          {/* Consolidador */}
                          <td className="px-2 py-2 text-muted-foreground whitespace-nowrap truncate max-w-[100px] text-[10px]" title={p.consolidadorNombre}>
                            {p.consolidadorNombre}
                          </td>

                          {/* 16 Hitos Cell Icons */}
                          {p.hitos.map((h, hi) => {
                            const done = h.estado === "Finalizado";
                            const inProgress = h.estado === "En curso";
                            const overdue = h.atrasado;

                            const tooltipText = `Hito #${h.hitoDef.index}: ${h.hitoDef.nombre}\nEstado: ${
                              done ? "REALIZADO" : inProgress ? "EN CURSO" : overdue ? "ATRASADO" : "PENDIENTE"
                            }${h.fechaRealizada ? `\nRealizado: ${format(parseISO(h.fechaRealizada), "dd/MM/yyyy")}` : ""}${
                              h.observacion ? `\nObs: ${h.observacion}` : ""
                            }\nHaz clic para editar`;

                            return (
                              <td key={hi} className="px-1 py-1.5 text-center align-middle">
                                <button
                                  type="button"
                                  title={tooltipText}
                                  onClick={() =>
                                    setEditingCell({
                                      personaId: p.id,
                                      personaNombre: p.nombreCompleto,
                                      hito: h,
                                    })
                                  }
                                  className="p-0.5 rounded-full hover:scale-110 transition-transform focus:outline-none"
                                >
                                  {done ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shadow-sm font-bold">
                                      <CheckCircle2 className="h-3 w-3 stroke-[2.5]" />
                                    </span>
                                  ) : inProgress ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-500 text-white shadow-sm">
                                      <span className="block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    </span>
                                  ) : overdue ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white shadow-sm">
                                      <AlertTriangle className="h-3 w-3" />
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-muted-foreground/30 hover:bg-muted/80">
                                      <span className="block w-1 h-1 rounded-full bg-current" />
                                    </span>
                                  )}
                                </button>
                              </td>
                            );
                          })}

                          {/* Avance % */}
                          <td className="px-2 py-2 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-extrabold text-primary tabular-nums text-[10px]">
                                {p.porcentajeCompletado}%
                              </span>
                              <span className="text-[8px] text-muted-foreground">{p.hitosCompletados}/16</span>
                            </div>
                          </td>

                          {/* Estado */}
                          <td className="px-2 py-2 text-center whitespace-nowrap">
                            <Badge
                              variant={isDone ? "default" : isDoing ? "secondary" : "outline"}
                              className={`text-[9px] font-bold px-1.5 py-0.5 ${
                                isDone
                                  ? "bg-emerald-500 text-white"
                                  : isDoing
                                  ? "bg-sky-500/15 text-sky-700 border-sky-500/30"
                                  : p.tieneAtrasos
                                  ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {isDone ? "Finalizado" : isDoing ? "En curso" : p.tieneAtrasos ? "Atrasado" : "Pendiente"}
                            </Badge>
                          </td>

                          {/* Acciones */}
                          <td className="px-2 py-2 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenTimeline(p)}
                              className="rounded-lg h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
                              title="Ver línea de tiempo de hitos"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación de la Tabla */}
              <div className="px-4 py-3 bg-muted/30 border-t border-border/50 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="font-medium">
                  Mostrando {filteredPersonas.length === 0 ? 0 : (page - 1) * (pageSize || filteredPersonas.length) + 1} - {pageSize === 0 ? filteredPersonas.length : Math.min(page * pageSize, filteredPersonas.length)} de {filteredPersonas.length} personas
                </div>

                {pageSize > 0 && totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-7 px-2 text-xs rounded-lg gap-1"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                    </Button>
                    <span className="text-xs font-semibold px-2">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="h-7 px-2 text-xs rounded-lg gap-1"
                    >
                      Siguiente <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: CONSOLIDACIÓN Y LLAMADAS */}
        <TabsContent value="consolidacion" className="space-y-5 m-0">
          <ConsolidacionDashboardTab />
        </TabsContent>
      </Tabs>

      {/* Timeline Modal */}
      <AfirmacionTimelineModal
        open={openTimelineModal}
        onOpenChange={setOpenTimelineModal}
        persona={selectedPersona}
        onSaveHito={async (payload) => {
          await updateHito(payload);
        }}
      />

      {/* Registrar Llamada Dialog */}
      <RegistrarLlamadaConsolidacionDialog
        open={openRegistrarLlamadaDialog}
        onOpenChange={setOpenRegistrarLlamadaDialog}
      />

      {/* Hito Direct Edit Dialog */}
      <HitoEditDialog
        open={!!editingCell}
        onOpenChange={(open) => {
          if (!open) setEditingCell(null);
        }}
        personaId={editingCell?.personaId || ""}
        personaNombre={editingCell?.personaNombre || ""}
        hito={editingCell?.hito || null}
        onSave={async (payload) => {
          await updateHito(payload);
          setEditingCell(null);
        }}
      />
    </div>
  );
}
