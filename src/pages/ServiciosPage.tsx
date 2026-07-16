import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ModuleHero from "@/components/shell/ModuleHero";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import ServicioFormDialog from "@/components/forms/ServicioFormDialog";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import MetricCard from "@/components/shared/MetricCard";
import QrAttendanceScanner from "@/components/attendance/QrAttendanceScanner";
import WeeklyTimeline from "@/components/servicios/WeeklyTimeline";
import { Church, Pencil, ClipboardCheck, Check, X, Save, Search, TrendingUp, Calendar, Eye, FileText, Users, MapPin, Clock as ClockIcon, QrCode, Share2, Heart, CalendarDays, List } from "lucide-react";
import ConsejeriaTab from "@/components/consejeria/ConsejeriaTab";
import ProgramacionTab from "@/components/programa/ProgramacionTab";
import { useServicios, useDeleteServicio, usePersonas, useAsistencia, useUpsertAsistencia } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import ExportDropdown from "@/components/shared/ExportDropdown";
import AttendanceTrendChart from "@/components/charts/AttendanceTrendChart";
import PageSkeleton from "@/components/shared/PageSkeleton";

type ActiveView = "reuniones" | "reportes" | "reporte-detalle" | "consejeria" | "programacion";

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const normStr = (s: any) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");


export default function ServiciosPage() {
  const { data: servicios, isLoading } = useServicios();
  const { data: personas, isLoading: loadingPersonas } = usePersonas();
  const deleteServicio = useDeleteServicio();
  const [editing, setEditing] = useState<any>(null);
  const [activeView, setActiveView] = useState<ActiveView>("reuniones");
  const [selectedReunion, setSelectedReunion] = useState<any>(null);
  const [search, setSearch] = useState("");

  // Asistencia state
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "present" | "absent">("all");
  const [localAttendance, setLocalAttendance] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState<string | null>(null);

  const upsertAsistencia = useUpsertAsistencia();
  const effectiveService = selectedService || null;
  const { data: asistenciaData, isLoading: loadingAsistencia } = useAsistencia(effectiveService);

  if (effectiveService && asistenciaData && initialized !== effectiveService) {
    const map: Record<string, boolean> = {};
    asistenciaData.forEach(a => { map[a.persona_id] = a.presente; });
    setLocalAttendance(map);
    setInitialized(effectiveService);
  }

  if (isLoading || loadingPersonas) {
    return (
      <PageSkeleton variant="dashboard" />
    );
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteServicio.mutateAsync(id);
      toast.success("Reunión eliminada");
    } catch { toast.error("Error al eliminar"); }
  };

  const personasList = personas || [];
  const serviciosList = servicios || [];

  const filteredServicios = serviciosList.filter(s =>
    s.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const totalActivos = serviciosList.filter(s => s.estado !== "Cancelado").length;
  const totalBaja = serviciosList.filter(s => s.estado === "Cancelado").length;

  const toggleAttendance = (personId: string) => {
    setLocalAttendance(prev => ({ ...prev, [personId]: !prev[personId] }));
  };

  const markAll = (present: boolean) => {
    const updated: Record<string, boolean> = {};
    personasList.forEach(p => { updated[p.id] = present; });
    setLocalAttendance(updated);
  };

  const saveAttendance = async () => {
    if (!effectiveService) return;
    const records = personasList.map(p => ({
      servicio_id: effectiveService,
      persona_id: p.id,
      presente: !!localAttendance[p.id],
    }));
    try {
      await upsertAsistencia.mutateAsync(records);
      const svc = serviciosList.find(s => s.id === effectiveService);
      toast.success("Asistencia guardada", {
        description: `${svc?.nombre} — ${Object.values(localAttendance).filter(Boolean).length} presentes`,
      });
    } catch (err: any) {
      toast.error("Error al guardar", { description: err.message });
    }
  };

  const filteredPersonas = personasList.filter(p => {
    const matchesSearch = `${p.nombres} ${p.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === "present") return matchesSearch && localAttendance[p.id];
    if (filterStatus === "absent") return matchesSearch && !localAttendance[p.id];
    return matchesSearch;
  });

  const totalPresent = Object.values(localAttendance).filter(Boolean).length;
  const totalAbsent = personasList.length - totalPresent;
  const attendanceRate = personasList.length > 0 ? Math.round((totalPresent / personasList.length) * 100) : 0;

  const openReunionDetail = (s: any) => {
    setSelectedReunion(s);
    setActiveView("reporte-detalle");
    setSelectedService(s.id);
    setInitialized(null);
  };

  // KPIs for the hero
  const hoyStr = new Date().toISOString().slice(0, 10);
  const proximas = serviciosList.filter((s: any) => (s.fecha || "") >= hoyStr && s.estado !== "Cancelado").length;
  const semanaTipos = new Set(serviciosList.map((s: any) => s.tipo).filter(Boolean)).size;

  const VIEWS: { id: ActiveView; label: string; icon: any }[] = [
    { id: "reuniones",    label: "Lista de reuniones", icon: Church },
    { id: "reportes",     label: "Reportar reunión",   icon: FileText },
    { id: "consejeria",   label: "Consejería",         icon: Heart },
    { id: "programacion", label: "Programación",       icon: Users },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <ModuleHero
        variant="reuniones"
        title="Reuniones"
        eyebrow="Worship Operations"
        description="Planifica, reporta y analiza las reuniones de la iglesia — asistencia, consejería y programación de servidores."
        status={{ label: `${totalActivos} activas`, tone: totalActivos > 0 ? "ok" : "warn" }}
        kpis={[
          { label: "Activas",     value: totalActivos,  hint: "Reuniones en agenda",  tone: "ok" },
          { label: "Canceladas",  value: totalBaja,     hint: "Últimos periodos",      tone: totalBaja > 0 ? "warn" : "info" },
          { label: "Próximas",    value: proximas,      hint: "De hoy en adelante",    tone: "info" },
          { label: "Tipos",       value: semanaTipos,   hint: "Categorías distintas" },
        ]}
        actions={
          <>
            <ExportDropdown
              title="Reuniones"
              filename="reuniones"
              columns={[
                { header: "Nombre", key: "nombre" },
                { header: "Tipo", key: "tipo" },
                { header: "Fecha", key: "fecha" },
                { header: "Hora", key: "hora" },
                { header: "Predicador", key: "predicador" },
                { header: "Estado", key: "estado" },
              ]}
              data={servicios || []}
            />
            <ServicioFormDialog />
          </>
        }
      />

      {editing && <ServicioFormDialog initialData={editing} onClose={() => setEditing(null)} />}

      {/* Navigation tabs — premium pill switcher */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl border bg-card/60 backdrop-blur w-fit">
        {VIEWS.map((v) => {
          const active = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => { setActiveView(v.id); if (v.id === "reuniones") setSelectedReunion(null); }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-gradient-to-br from-rose-600 to-orange-500 text-white shadow-md shadow-rose-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <v.icon className="h-4 w-4" />
              {v.label}
            </button>
          );
        })}
      </div>

      {activeView === "consejeria" && <ConsejeriaTab />}
      {activeView === "programacion" && <ProgramacionTab />}

      {/* ===== REUNIONES — TIMELINE SEMANAL ===== */}
      {activeView === "reuniones" && (
        <ReunionesTimelineView
          servicios={serviciosList}
          filteredServicios={filteredServicios}
          search={search}
          onSearchChange={setSearch}
          onOpen={openReunionDetail}
          onEdit={(s) => setEditing({ ...s })}
          onDelete={handleDelete}
        />
      )}


      {/* ===== REPORTAR REUNIÓN ===== */}
      {activeView === "reportes" && (
        <ReportarReunionView
          servicios={serviciosList}
          personas={personasList}
          onSelectReunion={openReunionDetail}
        />
      )}

      {/* ===== REPORTE DETALLE ===== */}
      {activeView === "reporte-detalle" && selectedReunion && (
        <ReporteDetalleView
          reunion={selectedReunion}
          personas={personasList}
          localAttendance={localAttendance}
          setLocalAttendance={setLocalAttendance}
          toggleAttendance={toggleAttendance}
          markAll={markAll}
          saveAttendance={saveAttendance}
          isPending={upsertAsistencia.isPending}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filteredPersonas={filteredPersonas}
          totalPresent={totalPresent}
          totalAbsent={totalAbsent}
          attendanceRate={attendanceRate}
          loadingAsistencia={loadingAsistencia}
          onBack={() => { setActiveView("reuniones"); setSelectedReunion(null); }}
        />
      )}
    </div>
  );
}

// ============ REPORTAR REUNIÓN VIEW ============
function ReportarReunionView({ servicios, personas, onSelectReunion }: any) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seleccionar reunión para reportar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {servicios.map((s: any) => (
              <Button key={s.id} variant="outline" className="h-auto p-4 flex flex-col items-start gap-1" onClick={() => onSelectReunion(s)}>
                <span className="font-semibold text-foreground">{s.nombre}</span>
                <span className="text-xs text-muted-foreground">{s.fecha} · {s.hora || "—"}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ REPORTE DETALLE VIEW ============
function ReporteDetalleView({
  reunion, personas, localAttendance, setLocalAttendance, toggleAttendance, markAll, saveAttendance,
  isPending, searchTerm, setSearchTerm, filterStatus, setFilterStatus,
  filteredPersonas, totalPresent, totalAbsent, attendanceRate, loadingAsistencia, onBack
}: any) {
  // Classify by tipo_persona
  const clasificacion: Record<string, number> = {};
  const vinculacion: Record<string, number> = {};

  personas.forEach((p: any) => {
    const tipo = p.tipo_persona || "Sin tipo";
    clasificacion[tipo] = (clasificacion[tipo] || 0) + (localAttendance[p.id] ? 1 : 0);
    const vinc = p.vinculacion || "Sin vinculación";
    vinculacion[vinc] = (vinculacion[vinc] || 0) + (localAttendance[p.id] ? 1 : 0);
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-1.5 text-sm">
        ← Volver a reuniones
      </Button>

      {/* Header */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-5">
          <h2 className="text-xl font-bold text-foreground">REPORTE: {reunion.nombre}</h2>
          <p className="text-sm text-muted-foreground">Fecha de reunión: {reunion.fecha}</p>
          <div className="flex gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1"><Check className="h-4 w-4 text-success" /> Asisten: {totalPresent}</span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4 text-info" /> Crecim. Preliminar: {totalPresent}</span>
            <span className="flex items-center gap-1"><X className="h-4 w-4 text-destructive" /> Primerizo/Invitados: 0</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Attendance List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" /> Registrar Asistencia
            </h3>
            <div className="flex items-center gap-2">
              <QrAttendanceScanner
                servicioId={reunion.id}
                onPersonaScanned={async (personaId, nombre) => {
                  // 1. Update local state immediately for UI feedback
                  setLocalAttendance((prev: Record<string, boolean>) => ({ ...prev, [personaId]: true }));
                  // 2. Persist directly to Supabase — don't wait for "Guardar"
                  try {
                    await supabase
                      .from("asistencia")
                      .upsert(
                        { servicio_id: reunion.id, persona_id: personaId, presente: true },
                        { onConflict: "servicio_id,persona_id" }
                      );
                  } catch (err: any) {
                    toast.error("Error al registrar asistencia por QR", { description: err.message });
                  }
                }}
              />
              <Button
                variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => {
                  const url = `${window.location.origin}/check-in/${reunion.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Enlace copiado", { description: "Comparte el enlace para check-in con Google" });
                }}
              >
                <Share2 className="h-3.5 w-3.5" /> Compartir check-in
              </Button>
              <Button size="sm" onClick={saveAttendance} disabled={isPending} className="gap-1.5 text-xs">
                <Save className="h-3.5 w-3.5" /> {isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MetricCard title="Presentes" value={totalPresent} icon={Check} variant="success" />
            <MetricCard title="Ausentes" value={totalAbsent} icon={X} variant="default" />
            <MetricCard title="Tasa" value={`${attendanceRate}%`} icon={TrendingUp} variant="accent" />
          </div>

          {/* Rol-based attendance toggles */}
          <div className="bg-card rounded-lg border">
            <div className="p-3 border-b flex gap-2">
              <Button variant="outline" size="sm" onClick={() => markAll(true)} className="text-xs gap-1">
                <Check className="h-3 w-3" /> Todos
              </Button>
              <Button variant="outline" size="sm" onClick={() => markAll(false)} className="text-xs gap-1">
                <X className="h-3 w-3" /> Ninguno
              </Button>
            </div>
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar persona..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-8 text-sm" />
              </div>
            </div>

            {loadingAsistencia ? (
              <div className="p-8 text-center text-muted-foreground">Cargando...</div>
            ) : (
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {filteredPersonas.map((p: any) => {
                  const isPresent = !!localAttendance[p.id];
                  return (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 cursor-pointer" onClick={() => toggleAttendance(p.id)}>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{p.nombres[0]}{p.apellidos[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{p.nombres} {p.apellidos}</p>
                          <p className="text-[10px] text-muted-foreground">{p.tipo_persona}</p>
                        </div>
                      </div>
                      <button className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0",
                        isPresent ? "bg-success text-success-foreground" : "bg-destructive/20 text-destructive"
                      )} onClick={e => { e.stopPropagation(); toggleAttendance(p.id); }}>
                        {isPresent ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </button>
                    </div>
                  );
                })}
                {filteredPersonas.length === 0 && (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">No se encontraron personas</div>
                )}
              </div>
            )}
            <div className="p-2 border-t text-xs text-muted-foreground text-center">
              Total: {filteredPersonas.length}
            </div>
          </div>
        </div>

        {/* Right: Classification tables */}
        <div className="space-y-4">
          {/* Vinculación */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Vinculación</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {Object.entries(vinculacion).map(([key, val]) => (
                    <TableRow key={key}>
                      <TableCell className="text-sm">{key}</TableCell>
                      <TableCell className="text-right"><Badge variant="secondary">{val as number}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Clasificación */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Clasificación</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {Object.entries(clasificacion).map(([key, val]) => (
                    <TableRow key={key}>
                      <TableCell className="text-sm">{key}</TableCell>
                      <TableCell className="text-right"><Badge variant="secondary">{val as number}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Trend chart */}
          <AttendanceTrendChart />
        </div>
      </div>
    </div>
  );
}

// ============ REUNIONES TIMELINE VIEW ============
function ReunionesTimelineView({
  servicios, filteredServicios, search, onSearchChange, onOpen, onEdit, onDelete,
}: {
  servicios: any[];
  filteredServicios: any[];
  search: string;
  onSearchChange: (v: string) => void;
  onOpen: (s: any) => void;
  onEdit: (s: any) => void;
  onDelete: (id: string) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinServicioId, setCheckinServicioId] = useState<string>("");

  const todayName = DAYS_ES[new Date().getDay()];
  const reunionesHoy = useMemo(
    () => (servicios || []).filter((s) => normStr((s as any).dia_reunion) === normStr(todayName))
      .sort((a, b) => String(a.hora || "").localeCompare(String(b.hora || ""))),
    [servicios, todayName]
  );

  // ?tab=checkin → abrir panel de check-in y preseleccionar la primera reunión de hoy
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tab") === "checkin") {
      setCheckinOpen(true);
      if (!checkinServicioId && reunionesHoy[0]) setCheckinServicioId(reunionesHoy[0].id);
    }
  }, [location.search, reunionesHoy]);

  const totalActivos = servicios.filter((s) => s.estado !== "Cancelado").length;
  const sedes = Array.from(new Set(servicios.map((s: any) => s.sede || "Principal")));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
      <div className="space-y-4 min-w-0">
        {/* Toolbar compacto */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-[13px]">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="font-semibold">Vista semanal</span>
            <Badge variant="secondary" className="text-[10px]">{totalActivos} activas</Badge>
            <Badge variant="outline" className="text-[10px]">{sedes.length} sede{sedes.length === 1 ? "" : "s"}</Badge>
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar reunión…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 h-8 w-56 text-[12.5px]"
            />
          </div>
        </div>

        {/* Timeline hero */}
        <WeeklyTimeline servicios={filteredServicios} onOpen={onOpen} />

        {/* Lista compacta */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            <List className="h-3.5 w-3.5" />
            Todas las reuniones ({filteredServicios.length})
          </div>
          {filteredServicios.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Sin reuniones que coincidan con la búsqueda.</div>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="border-b">
                <tr className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-2 py-2 hidden md:table-cell">Día</th>
                  <th className="px-2 py-2 hidden md:table-cell">Hora</th>
                  <th className="px-2 py-2 hidden lg:table-cell">Sede</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="w-24 px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredServicios.map((s: any) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40 cursor-pointer group" onClick={() => onOpen(s)}>
                    <td className="px-3 py-2 font-medium truncate max-w-[220px]">{s.nombre}</td>
                    <td className="px-2 py-2 hidden md:table-cell text-muted-foreground">{s.dia_reunion || "—"}</td>
                    <td className="px-2 py-2 hidden md:table-cell text-muted-foreground">{s.hora || "—"}</td>
                    <td className="px-2 py-2 hidden lg:table-cell text-muted-foreground">{s.sede || "Principal"}</td>
                    <td className="px-2 py-2">
                      <Badge variant={s.estado === "Cancelado" ? "destructive" : "secondary"} className="text-[10px]">
                        {s.estado || "Activa"}
                      </Badge>
                    </td>
                    <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button title="QR" onClick={() => { setCheckinServicioId(s.id); setCheckinOpen(true); }} className="p-1 rounded hover:bg-muted">
                          <QrCode className="h-3.5 w-3.5 text-primary" />
                        </button>
                        <button title="Editar" onClick={() => onEdit(s)} className="p-1 rounded hover:bg-muted">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <DeleteConfirmDialog
                          onConfirm={() => onDelete(s.id)}
                          title="¿Eliminar reunión?"
                          description={`Se eliminará "${s.nombre}" permanentemente.`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Rail derecho — Hoy + Check-in */}
      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              Hoy — {todayName}
              <Badge variant="secondary" className="ml-auto text-[10px]">{reunionesHoy.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {reunionesHoy.length === 0 ? (
              <p className="text-[12px] text-muted-foreground py-3 text-center">No hay reuniones programadas hoy.</p>
            ) : (
              reunionesHoy.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg border hover:border-primary/40 transition-colors">
                  <div className="w-9 text-center shrink-0">
                    <div className="text-[10px] uppercase text-muted-foreground">Hora</div>
                    <div className="text-[11px] font-bold leading-none">{s.hora || "—"}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium truncate">{s.nombre}</div>
                    <div className="text-[10.5px] text-muted-foreground truncate">{s.sede || "Principal"}</div>
                  </div>
                  <button
                    title="Check-in QR"
                    onClick={() => { setCheckinServicioId(s.id); setCheckinOpen(true); }}
                    className="p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className={cn(checkinOpen && "border-primary/40 shadow-sm")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] flex items-center gap-2">
              <QrCode className="h-3.5 w-3.5 text-primary" />
              Check-in rápido
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <Select value={checkinServicioId} onValueChange={setCheckinServicioId}>
              <SelectTrigger className="h-8 text-[12.5px]"><SelectValue placeholder="Elegir reunión" /></SelectTrigger>
              <SelectContent>
                {servicios.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre} · {s.dia_reunion || "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {checkinServicioId ? (
              <div className="space-y-1.5">
                <QrAttendanceScanner
                  servicioId={checkinServicioId}
                  onPersonaScanned={async (personaId, nombre) => {
                    try {
                      await supabase.from("asistencia").upsert(
                        { servicio_id: checkinServicioId, persona_id: personaId, presente: true },
                        { onConflict: "servicio_id,persona_id" }
                      );
                      toast.success("Asistencia registrada", { description: nombre });
                    } catch (err: any) {
                      toast.error("Error al registrar", { description: err.message });
                    }
                  }}
                />
                <Button
                  size="sm" variant="outline" className="w-full h-8 text-[12px] gap-1.5"
                  onClick={() => {
                    const url = `${window.location.origin}/check-in/${checkinServicioId}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Enlace copiado");
                  }}
                >
                  <Share2 className="h-3 w-3" /> Compartir enlace público
                </Button>
                <Button
                  size="sm" variant="ghost" className="w-full h-8 text-[12px]"
                  onClick={() => {
                    const s = servicios.find((x: any) => x.id === checkinServicioId);
                    if (s) onOpen(s);
                  }}
                >
                  Abrir reporte completo →
                </Button>
              </div>
            ) : (
              <p className="text-[11.5px] text-muted-foreground text-center py-2">
                Selecciona una reunión para activar el escáner.
              </p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

