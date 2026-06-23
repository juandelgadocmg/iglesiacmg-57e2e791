import { useState, useMemo } from "react";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import ServicioFormDialog from "@/components/forms/ServicioFormDialog";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import MetricCard from "@/components/shared/MetricCard";
import QrAttendanceScanner from "@/components/attendance/QrAttendanceScanner";
import { Church, Pencil, ClipboardCheck, Check, X, Save, Search, TrendingUp, Calendar, Eye, FileText, Users, MapPin, Clock as ClockIcon, QrCode, Share2, Heart } from "lucide-react";
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

type ActiveView = "reuniones" | "reportes" | "reporte-detalle" | "consejeria" | "programacion";

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
      <div className="animate-fade-in space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
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

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Reuniones" description="Lista de reuniones establecidas en la iglesia">
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
      </PageHeader>

      {editing && <ServicioFormDialog initialData={editing} onClose={() => setEditing(null)} />}

      {/* Navigation tabs */}
      <div className="flex gap-1 border-b">
        <button onClick={() => { setActiveView("reuniones"); setSelectedReunion(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === "reuniones" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <Church className="h-4 w-4 inline mr-1.5" />Lista de reuniones
        </button>
        <button onClick={() => setActiveView("reportes")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === "reportes" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <FileText className="h-4 w-4 inline mr-1.5" />Reportar reunión
        </button>
        <button onClick={() => setActiveView("consejeria")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === "consejeria" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <Heart className="h-4 w-4 inline mr-1.5" />Consejería
        </button>
        <button onClick={() => setActiveView("programacion")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === "programacion" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <Users className="h-4 w-4 inline mr-1.5" />Programación
        </button>
      </div>

      {activeView === "consejeria" && <ConsejeriaTab />}
      {activeView === "programacion" && <ProgramacionTab />}

      {/* ===== REUNIONES LIST (Card Grid) ===== */}
      {activeView === "reuniones" && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-2 border-primary/20">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Church className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Todos</p>
                  <p className="text-2xl font-bold text-foreground">{totalActivos}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <X className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dados De Baja</p>
                  <p className="text-2xl font-bold text-foreground">{totalBaja}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar aquí..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          {/* Card grid */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredServicios.map(s => (
              <Card key={s.id} className="hover:shadow-lg transition-shadow cursor-pointer group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-foreground text-sm uppercase tracking-wide">{s.nombre}</h3>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditing({ ...s }); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <DeleteConfirmDialog onConfirm={() => handleDelete(s.id)} title="¿Eliminar reunión?" description={`Se eliminará "${s.nombre}" permanentemente.`} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] ${s.habilitado_reserva ? "bg-success/10 text-success border-success/30" : "bg-warning/10 text-warning border-warning/30"}`}>
                        Reservar: {s.habilitado_reserva ? "Sí" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <Badge variant="secondary" className="text-[10px]">{(s as any).sede || "Principal"}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ClockIcon className="h-3 w-3" />
                      <Badge variant="secondary" className="text-[10px]">{s.hora || "—"}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <Badge variant="secondary" className="text-[10px]">{(s as any).dia_reunion || s.fecha}</Badge>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="w-full mt-2 text-xs" onClick={() => openReunionDetail(s)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Ver detalle / Reportar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">1 – {filteredServicios.length} de {filteredServicios.length} registros.</p>
        </div>
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
