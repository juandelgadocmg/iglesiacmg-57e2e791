import { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import MetricCard from "@/components/shared/MetricCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Users, TrendingUp, CalendarDays, Check, X, Search, Save, Church } from "lucide-react";
import { useServicios, usePersonas, useAsistencia, useUpsertAsistencia } from "@/hooks/useDatabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ExportDropdown from "@/components/shared/ExportDropdown";
import ImportAsistenciaDialog from "@/components/forms/ImportAsistenciaDialog";
import PageSkeleton from "@/components/shared/PageSkeleton";

export default function AsistenciaPage() {
  const { data: servicios, isLoading: loadingServicios } = useServicios();
  const { data: personas, isLoading: loadingPersonas } = usePersonas();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "present" | "absent">("all");
  const [localAttendance, setLocalAttendance] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState<string | null>(null);

  const upsertAsistencia = useUpsertAsistencia();

  // Auto-select first service
  const effectiveService = selectedService || servicios?.[0]?.id || null;
  const { data: asistenciaData, isLoading: loadingAsistencia } = useAsistencia(effectiveService);

  // Initialize local state from DB data
  if (effectiveService && asistenciaData && initialized !== effectiveService) {
    const map: Record<string, boolean> = {};
    asistenciaData.forEach(a => { map[a.persona_id] = a.presente; });
    setLocalAttendance(map);
    setInitialized(effectiveService);
  }

  if (loadingServicios || loadingPersonas) {
    return (
      <PageSkeleton variant="list" />
    );
  }

  const personasList = personas || [];
  const serviciosList = servicios || [];
  const currentService = serviciosList.find(s => s.id === effectiveService);

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
      toast.success("Asistencia guardada correctamente", {
        description: `${currentService?.nombre} — ${Object.values(localAttendance).filter(Boolean).length} presentes`,
      });
    } catch (err: any) {
      toast.error("Error al guardar asistencia", { description: err.message });
    }
  };

  const handleServiceChange = (id: string) => {
    setSelectedService(id);
    setInitialized(null);
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

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Asistencia" description="Control de asistencia por servicio">
        {effectiveService && (
          <>
            <ImportAsistenciaDialog
              servicioId={effectiveService}
              servicioNombre={currentService?.nombre || ""}
            />
            <ExportDropdown
              title={`Asistencia - ${currentService?.nombre || ""}`}
              filename={`asistencia-${currentService?.nombre || "servicio"}`}
              columns={[
                { header: "Nombres", key: "nombres" },
                { header: "Apellidos", key: "apellidos" },
                { header: "Tipo", key: "tipo_persona" },
                { header: "Presente", key: "presente" },
              ]}
              data={filteredPersonas.map(p => ({
                nombres: p.nombres,
                apellidos: p.apellidos,
                tipo_persona: p.tipo_persona,
                presente: localAttendance[p.id] ? "Sí" : "No",
              }))}
            />
          </>
        )}
      </PageHeader>

      {/* Service selector */}
      <div className="bg-card rounded-lg border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
            <Church className="h-5 w-5 text-info" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Servicio</label>
            <Select value={effectiveService || ""} onValueChange={handleServiceChange}>
              <SelectTrigger className="mt-1 border-0 bg-muted/30 h-9">
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                {serviciosList.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre} — {s.fecha}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => markAll(true)} className="text-xs gap-1.5">
            <Check className="h-3.5 w-3.5" /> Marcar todos
          </Button>
          <Button variant="outline" size="sm" onClick={() => markAll(false)} className="text-xs gap-1.5">
            <X className="h-3.5 w-3.5" /> Desmarcar todos
          </Button>
          <Button size="sm" onClick={saveAttendance} disabled={upsertAsistencia.isPending} className="text-xs gap-1.5 bg-primary text-primary-foreground">
            <Save className="h-3.5 w-3.5" /> {upsertAsistencia.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Presentes" value={totalPresent} icon={Check} variant="success" />
        <MetricCard title="Ausentes" value={totalAbsent} icon={X} variant="default" />
        <MetricCard title="Tasa de Asistencia" value={`${attendanceRate}%`} icon={TrendingUp} variant="accent" />
      </div>

      {/* Attendance list */}
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar persona..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-muted/30 border-0"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="present">Presentes</SelectItem>
              <SelectItem value="absent">Ausentes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loadingAsistencia ? (
          <div className="p-8 text-center text-muted-foreground">Cargando...</div>
        ) : (
          <div className="divide-y">
            {filteredPersonas.map(p => {
              const isPresent = !!localAttendance[p.id];
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => toggleAttendance(p.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {p.nombres[0]}{p.apellidos[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{p.nombres} {p.apellidos}</p>
                      <p className="text-xs text-muted-foreground">{p.tipo_persona}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAttendance(p.id); }}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shrink-0",
                      isPresent
                        ? "bg-success text-success-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {isPresent ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                  </button>
                </div>
              );
            })}
            {filteredPersonas.length === 0 && (
              <div className="px-4 py-12 text-center text-muted-foreground text-sm">
                No se encontraron personas
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
