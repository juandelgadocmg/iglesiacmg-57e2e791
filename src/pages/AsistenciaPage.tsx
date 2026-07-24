import { useState, useEffect, useMemo } from "react";
import PageHeader from "@/components/shared/PageHeader";
import MetricCard from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Check, X, Search, Save, Church, Printer, QrCode as QrIcon } from "lucide-react";
import { useServicios, usePersonas, useAsistencia, useUpsertAsistencia } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ExportDropdown from "@/components/shared/ExportDropdown";
import ImportAsistenciaDialog from "@/components/forms/ImportAsistenciaDialog";
import PageSkeleton from "@/components/shared/PageSkeleton";
import GenerateQrDialog from "@/components/servicios/GenerateQrDialog";
import QrAuditLogSection from "@/components/attendance/QrAuditLogSection";
import { useQrScanNotifier } from "@/hooks/useQrScanNotifier";
import { useQueryClient } from "@tanstack/react-query";

const PUNT_COLOR: Record<string, string> = {
  "Excelente": "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  "Puntual": "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  "Tarde leve": "bg-amber-500/15 text-amber-700 border-amber-500/30",
  "Tarde": "bg-orange-500/15 text-orange-700 border-orange-500/30",
  "Muy tarde": "bg-destructive/15 text-destructive border-destructive/30",
};

export default function AsistenciaPage() {
  const { data: servicios, isLoading: loadingServicios } = useServicios();
  const { data: personas, isLoading: loadingPersonas } = usePersonas();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "present" | "absent">("all");
  const [localAttendance, setLocalAttendance] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState<string | null>(null);
  const qc = useQueryClient();

  const upsertAsistencia = useUpsertAsistencia();
  const effectiveService = selectedService || servicios?.[0]?.id || null;
  const { data: asistenciaData, isLoading: loadingAsistencia } = useAsistencia(effectiveService);

  // Realtime QR scan notifications for the organizer of this meeting.
  useQrScanNotifier(effectiveService, !!effectiveService);


  // Realtime subscription — actualiza planilla al llegar nuevos check-ins
  useEffect(() => {
    if (!effectiveService) return;
    const channel = supabase
      .channel(`asistencia-${effectiveService}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "asistencia", filter: `servicio_id=eq.${effectiveService}` },
        () => {
          qc.invalidateQueries({ queryKey: ["asistencia", effectiveService] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [effectiveService, qc]);

  if (effectiveService && asistenciaData && initialized !== effectiveService) {
    const map: Record<string, boolean> = {};
    asistenciaData.forEach((a: any) => { map[a.persona_id] = a.presente; });
    setLocalAttendance(map);
    setInitialized(effectiveService);
  }

  const asistMap = useMemo(() => {
    const m = new Map<string, any>();
    (asistenciaData || []).forEach((a: any) => m.set(a.persona_id, a));
    return m;
  }, [asistenciaData]);

  if (loadingServicios || loadingPersonas) return <PageSkeleton variant="list" />;

  const personasList = personas || [];
  const serviciosList = servicios || [];
  const currentService = serviciosList.find((s: any) => s.id === effectiveService);

  const toggleAttendance = (personId: string) => {
    setLocalAttendance((prev) => ({ ...prev, [personId]: !prev[personId] }));
  };

  const markAll = (present: boolean) => {
    const updated: Record<string, boolean> = {};
    personasList.forEach((p: any) => { updated[p.id] = present; });
    setLocalAttendance(updated);
  };

  const saveAttendance = async () => {
    if (!effectiveService) return;
    const records = personasList.map((p: any) => ({
      servicio_id: effectiveService,
      persona_id: p.id,
      presente: !!localAttendance[p.id],
    }));
    try {
      await upsertAsistencia.mutateAsync(records);
      toast.success("Asistencia guardada");
    } catch (err: any) {
      toast.error("Error al guardar", { description: err.message });
    }
  };

  const handleServiceChange = (id: string) => { setSelectedService(id); setInitialized(null); };

  const filteredPersonas = personasList.filter((p: any) => {
    const matchesSearch = `${p.nombres} ${p.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === "present") return matchesSearch && localAttendance[p.id];
    if (filterStatus === "absent") return matchesSearch && !localAttendance[p.id];
    return matchesSearch;
  });

  const totalPresent = Object.values(localAttendance).filter(Boolean).length;
  const totalAbsent = personasList.length - totalPresent;
  const attendanceRate = personasList.length > 0 ? Math.round((totalPresent / personasList.length) * 100) : 0;

  const imprimir = () => {
    if (!currentService) return;
    const presentes = personasList
      .filter((p: any) => localAttendance[p.id])
      .map((p: any) => {
        const a = asistMap.get(p.id);
        return {
          nombre: `${p.nombres} ${p.apellidos}`,
          hora: a?.checkin_time ? new Date(a.checkin_time).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "—",
          puntualidad: a?.puntualidad || "—",
          metodo: a?.metodo_registro || "manual",
        };
      });

    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    const rows = presentes.map((r, i) => `
      <tr>
        <td>${i + 1}</td><td>${r.nombre}</td><td>${r.hora}</td><td>${r.puntualidad}</td>
        <td style="text-transform:uppercase">${r.metodo}</td>
        <td class="firma"></td>
      </tr>
    `).join("");
    w.document.write(`<!doctype html><html><head><title>Asistencia ${currentService.nombre}</title>
      <style>
        @page{size:A4;margin:16mm}
        body{font-family:system-ui,Segoe UI,sans-serif;color:#111}
        header{display:flex;justify-content:space-between;align-items:end;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:16px}
        h1{margin:0;font-size:20px}
        .meta{font-size:12px;color:#444}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:left}
        th{background:#f3f4f6;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
        td.firma{width:140px}
        footer{margin-top:20px;font-size:11px;color:#444;display:flex;justify-content:space-between}
      </style></head><body>
      <header>
        <div>
          <h1>Planilla de Asistencia</h1>
          <div class="meta">${currentService.nombre} · ${currentService.fecha || ""} ${currentService.hora || ""}</div>
        </div>
        <div class="meta" style="text-align:right">
          Total asistentes: <b>${presentes.length}</b><br/>
          % asistencia: <b>${attendanceRate}%</b>
        </div>
      </header>
      <table>
        <thead><tr>
          <th>#</th><th>Nombre</th><th>Hora</th><th>Puntualidad</th><th>Método</th><th>Firma</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="6" style="text-align:center;color:#888;padding:24px">Sin asistentes registrados</td></tr>`}</tbody>
      </table>
      <footer>
        <span>Generado ${new Date().toLocaleString("es-CO")}</span>
        <span>DOXA · CMG Admin</span>
      </footer>
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Asistencia" description="Control de asistencia por reunión">
        {effectiveService && currentService && (
          <>
            <GenerateQrDialog
              servicioId={effectiveService}
              servicioNombre={currentService.nombre}
              currentToken={(currentService as any).qr_token}
              qrActivo={(currentService as any).qr_activo}
              qrExpiresAt={(currentService as any).qr_expires_at}
              trigger={
                <Button variant="outline" size="sm" className="gap-1.5">
                  <QrIcon className="h-4 w-4" /> Generar QR de Asistencia
                </Button>
              }
            />
            <Button variant="outline" size="sm" onClick={imprimir} className="gap-1.5">
              <Printer className="h-4 w-4" /> Imprimir asistencia
            </Button>
            <ImportAsistenciaDialog servicioId={effectiveService} servicioNombre={currentService.nombre} />
            <ExportDropdown
              title={`Asistencia - ${currentService.nombre}`}
              filename={`asistencia-${currentService.nombre}`}
              columns={[
                { header: "Nombres", key: "nombres" },
                { header: "Apellidos", key: "apellidos" },
                { header: "Presente", key: "presente" },
                { header: "Hora", key: "hora" },
                { header: "Puntualidad", key: "puntualidad" },
                { header: "Método", key: "metodo" },
              ]}
              data={filteredPersonas.map((p: any) => {
                const a = asistMap.get(p.id);
                return {
                  nombres: p.nombres,
                  apellidos: p.apellidos,
                  presente: localAttendance[p.id] ? "Sí" : "No",
                  hora: a?.checkin_time ? new Date(a.checkin_time).toLocaleString("es-CO") : "",
                  puntualidad: a?.puntualidad || "",
                  metodo: a?.metodo_registro || "",
                };
              })}
            />
          </>
        )}
      </PageHeader>

      <div className="bg-card rounded-lg border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
            <Church className="h-5 w-5 text-info" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reunión</label>
            <Select value={effectiveService || ""} onValueChange={handleServiceChange}>
              <SelectTrigger className="mt-1 border-0 bg-muted/30 h-9">
                <SelectValue placeholder="Seleccionar reunión" />
              </SelectTrigger>
              <SelectContent>
                {serviciosList.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre} — {s.fecha}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Presentes" value={totalPresent} icon={Check} variant="success" />
        <MetricCard title="Ausentes" value={totalAbsent} icon={X} variant="default" />
        <MetricCard title="Tasa de Asistencia" value={`${attendanceRate}%`} icon={TrendingUp} variant="accent" />
      </div>

      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar persona..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-muted/30 border-0" />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
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
            {filteredPersonas.map((p: any) => {
              const isPresent = !!localAttendance[p.id];
              const a = asistMap.get(p.id);
              return (
                <div key={p.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer gap-3"
                  onClick={() => toggleAttendance(p.id)}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {p.nombres[0]}{p.apellidos[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.nombres} {p.apellidos}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-xs text-muted-foreground">{p.tipo_persona}</span>
                        {a?.checkin_time && (
                          <span className="text-[11px] text-muted-foreground">
                            · {new Date(a.checkin_time).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {a?.puntualidad && (
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", PUNT_COLOR[a.puntualidad])}>
                            {a.puntualidad}
                          </Badge>
                        )}
                        {a?.metodo_registro === "qr" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                            <QrIcon className="h-2.5 w-2.5" /> QR
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAttendance(p.id); }}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0",
                      isPresent
                        ? "bg-success text-success-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}>
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
