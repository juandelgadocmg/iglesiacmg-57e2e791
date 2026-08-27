import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Users,
  Home,
  Network,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  Download,
  Award,
  Clock,
  TrendingUp,
  Phone,
  PhoneOff,
  MessageSquare,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Filter,
  UserCheck,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ConsolidacionDashboardTab } from "@/components/persona/ConsolidacionDashboardTab";
import { RegistrarLlamadaConsolidacionDialog } from "@/components/persona/RegistrarLlamadaConsolidacionDialog";
import ExportPersonasDialog from "@/components/forms/ExportPersonasDialog";
import { useAfirmacionRuta, PersonaAfirmacionRuta } from "@/hooks/useAfirmacionRuta";
import { AfirmacionTimelineModal } from "@/components/afirmacion/AfirmacionTimelineModal";

export default function AfirmacionPage() {
  const { personasRuta, isLoading, stats, updateHito } = useAfirmacionRuta();

  // Filters
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");

  // Selected persona for Timeline modal
  const [selectedPersona, setSelectedPersona] = useState<PersonaAfirmacionRuta | null>(null);
  const [openTimelineModal, setOpenTimelineModal] = useState(false);
  const [openRegistrarLlamadaDialog, setOpenRegistrarLlamadaDialog] = useState(false);

  // Filtered personas list
  const filteredPersonas = useMemo(() => {
    const s = search.toLowerCase().trim();
    return personasRuta.filter((p) => {
      const matchSearch =
        !s ||
        p.nombreCompleto.toLowerCase().includes(s) ||
        (p.telefono && p.telefono.includes(s)) ||
        (p.consolidadorNombre && p.consolidadorNombre.toLowerCase().includes(s));

      if (!matchSearch) return false;

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
              Sistema de seguimiento individual basado en la ruta oficial de 16 hitos, calculada de forma independiente desde la fecha de ingreso real de cada persona.
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

      {/* ── REAL KPI METRICS SUMMARY ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* KPI 1: Personas en Afirmación */}
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
          <div className="text-[10px] text-muted-foreground mt-0.5">Personas registradas</div>
        </Card>

        {/* KPI 2: Personas en Proceso */}
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

        {/* KPI 3: Hitos Completados */}
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

        {/* KPI 4: Llamadas Registradas */}
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

        {/* KPI 5: Seguimientos Atrasados */}
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

        {/* KPI 6: Porcentaje Avance General */}
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

        {/* TAB 1: PERSONAS EN AFIRMACIÓN (RUTA DE 16 HITOS) */}
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

          {/* Personas Grid */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm font-medium">
              Cargando personas y sus rutas de 16 hitos...
            </div>
          ) : filteredPersonas.length === 0 ? (
            <div className="text-center py-12 border rounded-2xl bg-card text-muted-foreground">
              <p className="font-semibold text-base">No se encontraron personas con ese criterio.</p>
              <p className="text-xs mt-1">Intenta ajustando la búsqueda o el filtro de estado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPersonas.map((p) => {
                const isDone = p.estadoGeneral === "Finalizado";
                const isDoing = p.estadoGeneral === "En curso";
                const cleanPhone = p.whatsapp || p.telefono ? (p.whatsapp || p.telefono)!.replace(/\D/g, "") : "";

                return (
                  <Card
                    key={p.id}
                    className="p-5 rounded-2xl border border-border/70 hover:border-primary/40 hover:shadow-md transition-all bg-card/95 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Row: Avatar + Name + Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-11 w-11 border border-primary/20 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                              {p.nombreCompleto.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 space-y-0.5">
                            <h3 className="font-bold text-sm truncate text-foreground">{p.nombreCompleto}</h3>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                              <span>Ingreso: {p.fechaIngreso ? format(parseISO(p.fechaIngreso), "dd/MM/yyyy") : "—"}</span>
                              <span>·</span>
                              <span className="font-semibold text-primary">Día {p.diasDesdeIngreso}</span>
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant={isDone ? "default" : isDoing ? "secondary" : "outline"}
                          className={`text-[10px] shrink-0 font-bold ${
                            isDone
                              ? "bg-emerald-500 text-white"
                              : isDoing
                              ? "bg-sky-500/15 text-sky-700 border-sky-500/30"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isDone ? "🟢 Finalizado" : isDoing ? "🔵 En curso" : "⚪ Pendiente"}
                        </Badge>
                      </div>

                      {/* Progress Bar & Hito Info */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">
                            Hito {p.hitoActualNum} de 16
                          </span>
                          <span className="font-extrabold text-primary tabular-nums">
                            {p.porcentajeCompletado}%
                          </span>
                        </div>
                        <Progress value={p.porcentajeCompletado} className="h-2 rounded-full" />
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                          <span className="truncate max-w-[180px]">
                            <strong className="text-foreground">Próximo:</strong> {p.proximoHitoNombre}
                          </span>
                          <span>{p.hitosCompletados}/16 hitos</span>
                        </div>
                      </div>

                      {/* Responsable info */}
                      <div className="text-[11px] text-muted-foreground pt-1 flex items-center justify-between border-t border-border/50">
                        <span>Consolidador: <strong className="text-foreground">{p.consolidadorNombre}</strong></span>
                        {p.tieneAtrasos && (
                          <Badge variant="destructive" className="text-[9px] py-0 font-medium">
                            Atrasado
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-4 mt-3 border-t border-border/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {p.telefono && (
                          <a
                            href={`tel:${p.telefono}`}
                            className="p-2 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                            title="Llamar"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {cleanPhone.length >= 7 && (
                          <a
                            href={`https://wa.me/${cleanPhone.length === 10 ? '57' + cleanPhone : cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 transition-colors"
                            title="Enviar WhatsApp"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleOpenTimeline(p)}
                        className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground shadow-sm hover:opacity-90"
                      >
                        Ver Timeline <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
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
