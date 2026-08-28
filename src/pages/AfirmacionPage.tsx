import { useState, useMemo, useRef } from "react";
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
  Target,
  Home,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ConsolidacionDashboardTab } from "@/components/persona/ConsolidacionDashboardTab";
import { RegistrarLlamadaConsolidacionDialog } from "@/components/persona/RegistrarLlamadaConsolidacionDialog";
import ExportPersonasDialog from "@/components/forms/ExportPersonasDialog";
import { useAfirmacionRuta, PersonaAfirmacionRuta, HITOS_AFIRMACION_16 } from "@/hooks/useAfirmacionRuta";
import { AfirmacionTimelineModal } from "@/components/afirmacion/AfirmacionTimelineModal";

// Short labels for table column headers
const HITO_SHORT_LABELS = [
  "Llam 1", "Msj 1", "Llam 2", "Msj 2", "Llam 3", "Msj 3",
  "Msj 4", "Msj 5", "Msj 6", "Visita", "Consej.",
  "Fiesta", "NPT", "SdP 1", "SdP 2", "SdP 3",
];

export default function AfirmacionPage() {
  const { personasRuta, isLoading, stats, updateHito } = useAfirmacionRuta();

  // Filters
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");

  // Selected persona for Timeline modal
  const [selectedPersona, setSelectedPersona] = useState<PersonaAfirmacionRuta | null>(null);
  const [openTimelineModal, setOpenTimelineModal] = useState(false);
  const [openRegistrarLlamadaDialog, setOpenRegistrarLlamadaDialog] = useState(false);

  // Filtered personas list (All personas returned here entered through Personas module)
  const filteredPersonas = useMemo(() => {
    const s = search.toLowerCase().trim();
    return personasRuta.filter((p) => {
      const matchSearch =
        !s ||
        p.nombreCompleto.toLowerCase().includes(s) ||
        (p.telefono && p.telefono.includes(s)) ||
        (p.consolidadorNombre && p.consolidadorNombre.toLowerCase().includes(s));

      if (!matchSearch) return false;

      // Filter by status
      if (filterEstado === "en_curso") return p.estadoGeneral === "En curso";
      if (filterEstado === "finalizado") return p.estadoGeneral === "Finalizado";
      if (filterEstado === "pendiente") return p.estadoGeneral === "Pendiente";
      if (filterEstado === "atrasado") return p.tieneAtrasos;

      return true;
    });
  }, [personasRuta, search, filterEstado]);

  const handleOpenTimeline = (p: PersonaAfirmacionRuta) => {
    setSelectedPersona(p);
    setOpenTimelineModal(true);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* ── HERO BANNER AFIRMACIÓN ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/95 to-emerald-900 text-primary-foreground p-6 sm:p-8 shadow-xl border border-primary-glow/20">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15 text-xs font-semibold text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Ruta de 16 Hitos de Crecimiento
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight leading-tight">
              Afirmación del Creyente
            </h1>
            <p className="text-sm sm:text-base text-primary-foreground/80 leading-relaxed font-sans">
              Sistema de seguimiento individual basado en la ruta oficial de 16 hitos, exclusivo para las personas que ingresaron a través del módulo Personas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setOpenRegistrarLlamadaDialog(true)}
              className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold shadow-lg rounded-xl px-4 gap-2"
            >
              <PhoneCall className="h-4 w-4" /> Registrar Llamada
            </Button>
            <ExportPersonasDialog
              trigger={
                <Button
                  variant="outline"
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur rounded-xl px-4 gap-2 font-semibold"
                >
                  <Download className="h-4 w-4" /> Informe de Afirmación
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* ── REAL KPI METRICS SUMMARY (PERSONAS INTAKE ONLY) ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              En Afirmación
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold mt-2 tabular-nums">
            {stats.totalPersonasEnAfirmacion}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Ingresadas por Personas</div>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
              En Proceso
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold mt-2 tabular-nums text-sky-600">
            {stats.personasEnProceso}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Avanzando en la ruta</div>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Hitos Logrados
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold mt-2 tabular-nums text-emerald-600">
            {stats.hitosCompletadosTotales}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Hitos superados acumulados</div>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Llamadas Realizadas
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
              <PhoneCall className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold mt-2 tabular-nums">
            {stats.totalLlamadasRegistradas}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Llamadas consolidadas</div>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              Atrasados
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold mt-2 tabular-nums text-rose-600">
            {stats.seguimientosAtrasados}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Requieren atención urgente</div>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Avance General
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold mt-2 tabular-nums text-primary">
            {stats.porcentajeAvanceGeneral}%
          </div>
          <Progress value={stats.porcentajeAvanceGeneral} className="h-1.5 mt-1.5" />
        </Card>
      </div>

      {/* ── MAIN TABS SYSTEM ────────────────────────────────────────── */}
      <Tabs defaultValue="personas" className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
          <TabsList className="bg-muted/70 p-1 rounded-2xl">
            <TabsTrigger
              value="personas"
              className="rounded-xl px-4 py-2 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Users size={15} /> Personas en Ruta de 16 Hitos ({filteredPersonas.length})
            </TabsTrigger>
            <TabsTrigger
              value="consolidacion"
              className="rounded-xl px-4 py-2 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <PhoneCall size={15} /> Consolidación & Llamadas (45 Días)
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: PERSONAS EN AFIRMACIÓN — TABLA */}
        <TabsContent value="personas" className="space-y-6 m-0">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-4 rounded-2xl border border-border/70 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, teléfono o consolidador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl bg-background border-border/70 text-xs sm:text-sm h-10"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="h-10 rounded-xl bg-background border-border text-xs min-w-[160px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">
                    Todos los estados
                  </SelectItem>
                  <SelectItem value="en_curso" className="text-xs">
                    🔵 En curso
                  </SelectItem>
                  <SelectItem value="finalizado" className="text-xs">
                    🟢 Finalizados
                  </SelectItem>
                  <SelectItem value="pendiente" className="text-xs">
                    ⚪ Pendientes
                  </SelectItem>
                  <SelectItem value="atrasado" className="text-xs">
                    🔴 Con Atrasos
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table View */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm font-medium">
              Cargando personas y sus rutas de 16 hitos...
            </div>
          ) : filteredPersonas.length === 0 ? (
            <div className="text-center py-12 border rounded-2xl bg-card text-muted-foreground">
              <p className="font-semibold text-base">No se encontraron personas con ese criterio.</p>
              <p className="text-xs mt-1">Intenta ajustando la búsqueda o los filtros de origen y estado.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border/70">
                      <th className="sticky left-0 z-20 bg-muted/95 backdrop-blur px-3 py-3 text-left font-bold text-foreground whitespace-nowrap min-w-[180px]">
                        Nombre
                      </th>
                      <th className="px-2 py-3 text-left font-bold text-muted-foreground whitespace-nowrap min-w-[110px]">
                        Origen
                      </th>
                      <th className="px-2 py-3 text-left font-bold text-muted-foreground whitespace-nowrap min-w-[80px]">
                        Teléfono
                      </th>
                      <th className="px-2 py-3 text-left font-bold text-muted-foreground whitespace-nowrap min-w-[85px]">
                        Ingreso
                      </th>
                      <th className="px-2 py-3 text-center font-bold text-muted-foreground whitespace-nowrap min-w-[50px]">
                        Días
                      </th>
                      <th className="px-2 py-3 text-left font-bold text-muted-foreground whitespace-nowrap min-w-[110px]">
                        Consolidador
                      </th>
                      <th className="px-2 py-3 text-left font-bold text-muted-foreground whitespace-nowrap min-w-[80px]">
                        Red
                      </th>
                      {/* 16 Hitos columns */}
                      {HITO_SHORT_LABELS.map((label, i) => (
                        <th
                          key={i}
                          className="px-1 py-3 text-center font-bold text-muted-foreground whitespace-nowrap min-w-[52px]"
                          title={HITOS_AFIRMACION_16[i]?.nombre}
                        >
                          <span className="block text-[9px] leading-tight">{label}</span>
                        </th>
                      ))}
                      <th className="px-2 py-3 text-center font-bold text-muted-foreground whitespace-nowrap min-w-[55px]">
                        Avance
                      </th>
                      <th className="px-2 py-3 text-center font-bold text-muted-foreground whitespace-nowrap min-w-[70px]">
                        Estado
                      </th>
                      <th className="px-2 py-3 text-center font-bold text-muted-foreground whitespace-nowrap min-w-[50px]">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPersonas.map((p, rowIdx) => {
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
                          <td className="sticky left-0 z-10 bg-inherit px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                {p.nombreCompleto.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[140px]">{p.nombreCompleto}</span>
                            </div>
                          </td>

                          {/* Origen (Directo vs Grupo) */}
                          <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap text-[10px]">
                            {p.origen === "Directo" ? (
                              <Badge variant="outline" className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20 text-[10px] whitespace-nowrap font-semibold">
                                🎯 Directo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] whitespace-nowrap font-semibold" title={p.grupoNombre || "Casa de Paz"}>
                                🏠 {p.grupoNombre !== "Sin grupo" ? p.grupoNombre : "Casa de Paz"}
                              </Badge>
                            )}
                          </td>

                          {/* Teléfono */}
                          <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">
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
                          <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap text-[10px]">
                            {p.fechaIngreso ? format(parseISO(p.fechaIngreso), "dd/MM/yyyy") : "—"}
                          </td>

                          {/* Días */}
                          <td className="px-2 py-2.5 text-center font-semibold text-primary whitespace-nowrap tabular-nums">
                            {p.diasDesdeIngreso}
                          </td>

                          {/* Consolidador */}
                          <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap truncate max-w-[110px] text-[10px]">
                            {p.consolidadorNombre}
                          </td>

                          {/* Red */}
                          <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap truncate max-w-[80px] text-[10px]">
                            {p.redNombre}
                          </td>

                          {/* 16 Hitos cells */}
                          {p.hitos.map((h, hi) => {
                            const done = h.estado === "Finalizado";
                            const inProgress = h.estado === "En curso";
                            const overdue = h.atrasado;

                            return (
                              <td
                                key={hi}
                                className="px-1 py-2.5 text-center"
                                title={`${h.hitoDef.nombre}: ${h.estado}${h.fechaRealizada ? ` (${h.fechaRealizada})` : ""}${h.resultadoLlamada ? ` — ${h.resultadoLlamada}` : ""}`}
                              >
                                {done ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </span>
                                ) : inProgress ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-500/15 text-sky-600">
                                    <span className="block w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                                  </span>
                                ) : overdue ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/10 text-rose-500">
                                    <AlertTriangle className="h-3 w-3" />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted/60 text-muted-foreground/30">
                                    <span className="block w-1.5 h-1.5 rounded-full bg-current" />
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* Avance % */}
                          <td className="px-2 py-2.5 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-extrabold text-primary tabular-nums text-[11px]">
                                {p.porcentajeCompletado}%
                              </span>
                              <span className="text-[9px] text-muted-foreground">{p.hitosCompletados}/16</span>
                            </div>
                          </td>

                          {/* Estado */}
                          <td className="px-2 py-2.5 text-center whitespace-nowrap">
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

                          {/* Acción */}
                          <td className="px-2 py-2.5 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenTimeline(p)}
                              className="rounded-lg h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                              title="Ver Timeline"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Footer count */}
              <div className="px-4 py-2.5 bg-muted/40 border-t border-border/50 text-[11px] text-muted-foreground font-medium flex items-center justify-between">
                <span>Mostrando {filteredPersonas.length} de {personasRuta.length} personas</span>
                <span className="text-primary font-bold">{stats.hitosCompletadosTotales} hitos completados en total</span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: CONSOLIDACIÓN Y LLAMADAS (45 DÍAS) */}
        <TabsContent value="consolidacion" className="space-y-6 m-0">
          <ConsolidacionDashboardTab />
        </TabsContent>
      </Tabs>

      {/* Timeline Modal */}
      <AfirmacionTimelineModal
        open={openTimelineModal}
        onOpenChange={setOpenTimelineModal}
        persona={selectedPersona}
        onSaveHito={updateHito}
      />

      {/* Registrar Llamada Dialog */}
      <RegistrarLlamadaConsolidacionDialog
        open={openRegistrarLlamadaDialog}
        onOpenChange={setOpenRegistrarLlamadaDialog}
      />
    </div>
  );
}
