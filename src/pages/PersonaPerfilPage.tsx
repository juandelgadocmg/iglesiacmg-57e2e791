import { useParams, useNavigate } from "react-router-dom";
import {
  usePersonaDetalle, useProcesos, usePersonaProcesos, useUpdateProceso,
  usePersonaAsistencia, usePersonaGrupoMiembros, useRelacionesFamiliares,
  useCreateRelacion, useDeleteRelacion,
  usePersonaFinanzas, usePersonaDonaciones, usePersonaPeticiones, usePersonaConsejerias,
} from "@/hooks/usePersonaPerfil";
import { usePersonas, useUpdatePersona, useServicios, useUpsertAsistencia } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PersonaExportPreviewDialog from "@/components/persona/PersonaExportPreviewDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import StatusBadge from "@/components/shared/StatusBadge";
import PersonaFormDialog from "@/components/forms/PersonaFormDialog";
import PersonaActivityTimeline, { type TimelineEvent } from "@/components/persona/PersonaActivityTimeline";
// export helpers are used via PersonaExportPreviewDialog
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Church, Users, Briefcase,
  Heart, BookOpen, CheckCircle2, XCircle, Clock, User, FileText,
  GraduationCap, Shield, Pencil, UserPlus, Trash2, Baby, HeartHandshake, Camera, Plus, QrCode,
  MoreHorizontal, Download, Award, DollarSign, Activity, ClipboardCheck, MessageSquare,
} from "lucide-react";
import { format, parseISO, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";

const tipoColor: Record<string, string> = {
  Miembro: "bg-primary text-primary-foreground",
  Visitante: "bg-info text-info-foreground",
  Líder: "bg-accent text-accent-foreground",
  Servidor: "bg-success text-success-foreground",
};

// Group processes by category prefix
function groupProcesses(procesos: any[]) {
  const groups: Record<string, any[]> = {};
  procesos.forEach((p) => {
    // Try to extract category from name pattern like "1. Consolidación" -> just group sequentially
    const match = p.nombre.match(/^(\d+)\.\s*/);
    const category = match ? `Paso ${match[1]}` : "General";
    if (!groups[category]) groups[category] = [];
    groups[category].push(p);
  });
  // If all in one group, return flat
  if (Object.keys(groups).length <= 1) return null;
  return groups;
}

export default function PersonaPerfilPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: persona, isLoading } = usePersonaDetalle(id);
  const { data: procesos } = useProcesos();
  const { data: personaProcesos } = usePersonaProcesos(id);
  const { data: asistencias } = usePersonaAsistencia(id);
  const { data: grupoMiembros } = usePersonaGrupoMiembros(id);
  const { data: relaciones } = useRelacionesFamiliares(id);
  const { data: finanzasP } = usePersonaFinanzas(id);
  const { data: donacionesP } = usePersonaDonaciones(id);
  const { data: peticionesP } = usePersonaPeticiones(id);
  const { data: consejeriasP } = usePersonaConsejerias(id);
  const { data: todasPersonas } = usePersonas();
  const createRelacion = useCreateRelacion();
  const deleteRelacion = useDeleteRelacion();
  const updateProceso = useUpdateProceso();
  const updatePersona = useUpdatePersona();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showAddFamiliar, setShowAddFamiliar] = useState(false);
  const [familiarSearch, setFamiliarSearch] = useState("");
  const [selectedParentesco, setSelectedParentesco] = useState("Cónyuge");
  const [manualName, setManualName] = useState("");
  // Proceso detail dialog
  const [procesoDialog, setProcesoDialog] = useState<{ procesoId: string; nombre: string } | null>(null);
  const [procesoObservacion, setProcesoObservacion] = useState("");
  const [procesoFecha, setProcesoFecha] = useState<Date | undefined>(undefined);
  const [procesoEstado, setProcesoEstado] = useState("No Realizado");
  // Confirm asistencia
  const [confirmAsist, setConfirmAsist] = useState<null | { servicioId: string; nombreServicio: string }>(null);
  const [servicioParaAsistir, setServicioParaAsistir] = useState<string>("");
  const [askServicio, setAskServicio] = useState(false);
  // Export previews
  const [exportPreview, setExportPreview] = useState<null | "pdf" | "csv">(null);
  // QR check-in
  const [qrCheckinOpen, setQrCheckinOpen] = useState(false);
  const [qrCheckinServicio, setQrCheckinServicio] = useState<string>("");
  const { data: servicios } = useServicios();
  const upsertAsistencia = useUpsertAsistencia();

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !persona) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("La imagen no debe superar 5MB"); return; }

    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `personas/${persona.id}.${ext}`;

      // Delete old file if exists
      await supabase.storage.from("avatars").remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const foto_url = `${urlData.publicUrl}?t=${Date.now()}`;

      await updatePersona.mutateAsync({ id: persona.id, foto_url });
      queryClient.invalidateQueries({ queryKey: ["persona-detalle", persona.id] });
      queryClient.invalidateQueries({ queryKey: ["personas"] });
      toast.success("Foto actualizada");
    } catch (err: any) {
      toast.error("Error al subir la foto", { description: err.message });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const procesosMap = useMemo(() =>
    new Map((personaProcesos || []).map((pp) => [pp.proceso_id, pp])),
    [personaProcesos]
  );

  const completedCount = personaProcesos?.filter((pp) => pp.estado === "Realizado").length || 0;
  const totalProcesos = procesos?.length || 0;
  const progressPercent = totalProcesos > 0 ? Math.round((completedCount / totalProcesos) * 100) : 0;

  const asistenciasPresente = asistencias?.filter((a) => a.presente).length || 0;
  const totalAsistencias = asistencias?.length || 0;
  const asistenciaPercent = totalAsistencias > 0 ? Math.round((asistenciasPresente / totalAsistencias) * 100) : 0;

  // Finanzas totales por persona
  const totalDonaciones = (donacionesP || []).reduce((s, d: any) => s + Number(d.monto || 0), 0);
  const totalAportesIngreso = (finanzasP || []).filter((f: any) => f.tipo === "Ingreso").reduce((s, f: any) => s + Number(f.monto || 0), 0);

  // Timeline unificado
  const timeline: TimelineEvent[] = useMemo(() => {
    const evs: TimelineEvent[] = [];
    (asistencias || []).forEach((a: any) => {
      evs.push({
        id: a.id,
        type: "asistencia",
        date: a.servicios?.fecha || a.created_at,
        title: a.presente ? `Asistió a ${a.servicios?.nombre || "servicio"}` : `Ausente en ${a.servicios?.nombre || "servicio"}`,
        meta: a.servicios?.tipo || undefined,
        positive: a.presente,
      });
    });
    (finanzasP || []).forEach((f: any) => {
      evs.push({
        id: f.id, type: "finanza", date: f.fecha || f.created_at,
        title: `${f.tipo === "Ingreso" ? "Aporte" : "Gasto"} · $${Number(f.monto).toLocaleString()}`,
        description: f.descripcion || undefined,
        meta: [f.categoria_nombre, f.metodo_pago].filter(Boolean).join(" · "),
      });
    });
    (donacionesP || []).forEach((d: any) => {
      evs.push({
        id: d.id, type: "donacion", date: d.fecha || (d as any).created_at,
        title: `Donación · $${Number(d.monto).toLocaleString()}`,
        description: d.descripcion || undefined,
        meta: [d.tipo, d.metodo_pago, d.estado].filter(Boolean).join(" · "),
      });
    });
    (peticionesP || []).forEach((p: any) => {
      evs.push({
        id: p.id, type: "peticion", date: p.created_at,
        title: p.titulo || "Petición de oración",
        description: p.descripcion || undefined,
        meta: [p.estado, p.prioridad].filter(Boolean).join(" · "),
      });
    });
    (consejeriasP || []).forEach((c: any) => {
      evs.push({
        id: c.id, type: "consejeria", date: c.fecha || c.created_at,
        title: `Consejería · ${c.motivo_categoria || "sesión"}`,
        description: c.motivo_descripcion || c.notas_admin || undefined,
        meta: [c.consejero_nombre, c.modalidad, c.estado].filter(Boolean).join(" · "),
      });
    });
    (personaProcesos || []).forEach((pp: any) => {
      const nombreP = procesos?.find((x: any) => x.id === pp.proceso_id)?.nombre || "Proceso";
      if (pp.fecha_completado || pp.created_at) {
        evs.push({
          id: pp.id || pp.proceso_id, type: "proceso",
          date: pp.fecha_completado || pp.created_at,
          title: `${nombreP} · ${pp.estado}`,
          description: (pp as any).observacion || undefined,
        });
      }
    });
    if ((persona as any)?.observaciones) {
      evs.push({
        id: "obs-persona", type: "observacion",
        date: (persona as any).updated_at || (persona as any).created_at,
        title: "Nota pastoral",
        description: (persona as any).observaciones,
      });
    }
    return evs;
  }, [asistencias, finanzasP, donacionesP, peticionesP, consejeriasP, personaProcesos, procesos, persona]);

  // Helpers
  const logPersonaAction = async (action: string, details: Record<string, any> = {}) => {
    try {
      await (supabase as any).rpc("log_persona_action", {
        _persona_id: id,
        _action: action,
        _details: details,
      });
    } catch (err) {
      // Non-blocking — audit failures should not stop the UX
      console.warn("log_persona_action failed", err);
    }
  };

  // Registrar asistencia rápida: ask servicio → confirm → save
  const openRegistrarAsistencia = () => {
    if (!servicios || servicios.length === 0) {
      toast.error("No hay servicios disponibles para registrar asistencia");
      return;
    }
    // Preselect nearest upcoming/most recent service
    setServicioParaAsistir(servicios[0].id);
    setAskServicio(true);
  };
  const confirmarServicioAsistencia = () => {
    const svc = (servicios || []).find((s: any) => s.id === servicioParaAsistir);
    if (!svc) return;
    setAskServicio(false);
    setConfirmAsist({ servicioId: svc.id, nombreServicio: `${svc.nombre || "Servicio"}${svc.fecha ? " · " + svc.fecha : ""}` });
  };
  const ejecutarRegistroAsistencia = async () => {
    if (!confirmAsist || !persona) return;
    try {
      await upsertAsistencia.mutateAsync([
        { servicio_id: confirmAsist.servicioId, persona_id: persona.id, presente: true },
      ]);
      await logPersonaAction("ATTENDANCE_MARK", {
        servicio_id: confirmAsist.servicioId,
        servicio: confirmAsist.nombreServicio,
        source: "profile_quick_action",
      });
      toast.success("Asistencia registrada", { description: confirmAsist.nombreServicio });
      setConfirmAsist(null);
    } catch (e: any) {
      toast.error("Error al registrar asistencia", { description: e?.message });
    }
  };

  const generarCertificado = () => {
    void logPersonaAction("CERTIFICATE_ISSUED", { source: "profile_quick_action" });
    navigate("/certificados", { state: { personaId: id } });
  };
  const handleExportPDF = () => {
    if (!persona) return;
    setExportPreview("pdf");
    void logPersonaAction("EXPORT_FICHA", { format: "pdf", timeline_events: timeline.length });
  };
  const handleExportCSV = () => {
    if (!persona) return;
    setExportPreview("csv");
    void logPersonaAction("EXPORT_HISTORIAL", { format: "csv", timeline_events: timeline.length });
  };

  // QR check-in flow
  const ejecutarCheckInQR = async () => {
    if (!persona || !qrCheckinServicio) return;
    try {
      await upsertAsistencia.mutateAsync([
        { servicio_id: qrCheckinServicio, persona_id: persona.id, presente: true },
      ]);
      const svc = (servicios || []).find((s: any) => s.id === qrCheckinServicio);
      await logPersonaAction("CHECKIN", {
        servicio_id: qrCheckinServicio,
        servicio: svc?.nombre,
        method: "qr",
      });
      toast.success("✓ Check-in registrado", { description: svc?.nombre || "Servicio" });
      setQrCheckinOpen(false);
    } catch (e: any) {
      toast.error("Error en check-in", { description: e?.message });
    }
  };


  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-4">
        <Skeleton className="h-52 w-full rounded-xl" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Persona no encontrada</p>
        <Button variant="ghost" onClick={() => navigate("/personas")} className="mt-4">← Volver</Button>
      </div>
    );
  }

  const age = persona.fecha_nacimiento
    ? differenceInYears(new Date(), parseISO(persona.fecha_nacimiento))
    : null;

  const openProcesoDialog = (procesoId: string, nombre: string) => {
    const pp = procesosMap.get(procesoId);
    setProcesoEstado(pp?.estado || "No Realizado");
    setProcesoFecha(pp?.fecha_completado ? parseISO(pp.fecha_completado) : undefined);
    setProcesoObservacion((pp as any)?.observacion || "");
    setProcesoDialog({ procesoId, nombre });
  };

  const handleSaveProceso = () => {
    if (!procesoDialog || !persona) return;
    updateProceso.mutate(
      {
        personaId: persona.id,
        procesoId: procesoDialog.procesoId,
        estado: procesoEstado,
        fecha_completado: procesoFecha ? format(procesoFecha, "yyyy-MM-dd") : null,
        observacion: procesoObservacion || null,
      },
      {
        onSuccess: () => { toast.success("Proceso actualizado"); setProcesoDialog(null); },
        onError: () => toast.error("Error al actualizar"),
      }
    );
  };

  const handleToggleEstado = (procesoId: string, currentEstado: string) => {
    const next = currentEstado === "No Realizado" ? "En Curso"
      : currentEstado === "En Curso" ? "Realizado" : "No Realizado";
    updateProceso.mutate(
      { personaId: persona.id, procesoId, estado: next, fecha_completado: next === "Realizado" ? format(new Date(), "yyyy-MM-dd") : null },
      { onError: () => toast.error("Error al actualizar") }
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      {editing && <PersonaFormDialog initialData={persona} onClose={() => setEditing(false)} />}

      {/* Banner */}
      <div className="relative rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/85 to-primary/60" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="relative p-6 md:p-8">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => navigate("/personas")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 ml-10 md:ml-8">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-primary-foreground/30 shadow-xl ring-4 ring-primary-foreground/10">
                <AvatarImage src={persona.foto_url || undefined} />
                <AvatarFallback className="text-2xl font-bold bg-primary-foreground/20 text-primary-foreground">
                  {persona.nombres?.[0]}{persona.apellidos?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-6 w-6 text-white" />
              </div>
              {uploadingPhoto && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>

            <div className="flex-1 text-primary-foreground">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {persona.nombres} {persona.apellidos}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {(() => {
                  const tipoP: string = persona.tipo_persona || "Miembro";
                  const arr: string[] = (persona as any).tipos_persona?.length ? (persona as any).tipos_persona : [tipoP];
                  const tipos = arr.includes(tipoP) ? [...new Set(arr)] : [tipoP];
                  return tipos.map((tipo: string) => (
                    <Badge key={tipo} className={cn("shadow-sm", tipoColor[tipo] || "bg-muted")}>
                      <Church className="h-3 w-3 mr-1" /> {tipo}
                    </Badge>
                  ));
                })()}
                <StatusBadge status={persona.estado_iglesia} />
                {age !== null && (
                  <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground/90 bg-primary-foreground/10">
                    {age} años
                  </Badge>
                )}
                {persona.sexo && (
                  <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground/90 bg-primary-foreground/10">
                    {persona.sexo}
                  </Badge>
                )}
              </div>

              {/* Quick stats */}
              <div className="flex items-center gap-4 mt-4">
                <div className="text-center px-3 py-1.5 rounded-lg bg-primary-foreground/10">
                  <p className="text-lg font-bold">{progressPercent}%</p>
                  <p className="text-[10px] text-primary-foreground/70 uppercase tracking-wider">Crecimiento</p>
                </div>
                <div className="text-center px-3 py-1.5 rounded-lg bg-primary-foreground/10">
                  <p className="text-lg font-bold">{asistenciaPercent}%</p>
                  <p className="text-[10px] text-primary-foreground/70 uppercase tracking-wider">Asistencia</p>
                </div>
                <div className="text-center px-3 py-1.5 rounded-lg bg-primary-foreground/10">
                  <p className="text-lg font-bold">{grupoMiembros?.length || 0}</p>
                  <p className="text-[10px] text-primary-foreground/70 uppercase tracking-wider">Grupos</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button variant="secondary" size="sm" className="gap-1.5" onClick={openRegistrarAsistencia}>
                  <ClipboardCheck className="h-3.5 w-3.5" /> Asistencia
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Acciones rápidas</DropdownMenuLabel>
                    <DropdownMenuItem onClick={generarCertificado}>
                      <Award className="h-4 w-4 mr-2" /> Generar certificado
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={openRegistrarAsistencia}>
                      <ClipboardCheck className="h-4 w-4 mr-2" /> Registrar asistencia
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Exportar</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <FileText className="h-4 w-4 mr-2" /> Ficha completa (PDF)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCSV}>
                      <Download className="h-4 w-4 mr-2" /> Historial (CSV)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumen" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="resumen" className="gap-1.5"><User className="h-3.5 w-3.5" /> Resumen</TabsTrigger>
          <TabsTrigger value="grupos" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Grupos</TabsTrigger>
          <TabsTrigger value="asistencia" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Asistencia</TabsTrigger>
          <TabsTrigger value="finanzas" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Finanzas</TabsTrigger>
          <TabsTrigger value="actividad" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Actividad</TabsTrigger>
          <TabsTrigger value="familia" className="gap-1.5"><HeartHandshake className="h-3.5 w-3.5" /> Familia</TabsTrigger>
          <TabsTrigger value="procesos" className="gap-1.5"><Heart className="h-3.5 w-3.5" /> Crecimiento</TabsTrigger>
          <TabsTrigger value="qr" className="gap-1.5"><QrCode className="h-3.5 w-3.5" /> QR</TabsTrigger>
        </TabsList>

        {/* Resumen (formerly info) */}
        <TabsContent value="resumen">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Personal */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <User className="h-4 w-4" /> Datos Personales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <InfoRow label="Fecha nacimiento" value={persona.fecha_nacimiento ? format(parseISO(persona.fecha_nacimiento), "dd MMM yyyy", { locale: es }) : "—"} />
                <InfoRow label="Edad" value={age !== null ? `${age} años` : "—"} />
                <InfoRow label="Sexo" value={persona.sexo || "—"} />
                <InfoRow label="Estado civil" value={persona.estado_civil || "—"} />
                <InfoRow label="Documento" value={persona.documento || "—"} />
                <InfoRow label="Ocupación" value={persona.ocupacion || "—"} />
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <Phone className="h-4 w-4" /> Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <InfoRow label="Teléfono" value={persona.telefono || "—"} icon={<Phone className="h-3.5 w-3.5" />} />
                <InfoRow label="Email" value={persona.email || "—"} icon={<Mail className="h-3.5 w-3.5" />} />
                <InfoRow label="Dirección" value={persona.direccion || "—"} icon={<MapPin className="h-3.5 w-3.5" />} />
              </CardContent>
            </Card>

            {/* Ministry */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <Church className="h-4 w-4" /> Ministerial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <InfoRow label="Grupo" value={(persona as any).grupos?.nombre || "Sin grupo"} />
                <InfoRow label="Red" value={(persona as any).grupos?.red || "—"} />
                <InfoRow label="Vinculación" value={persona.vinculacion || "—"} />
                <InfoRow label="Ministerio" value={persona.ministerio || "—"} />
                <InfoRow label="Líder" value={persona.lider_responsable || "—"} />
                <InfoRow label="Invitado por" value={persona.invitado_por || "—"} />
                <InfoRow label="Encargado seguimiento" value={persona.seguimiento_por || "—"} />
                <InfoRow label="Ingreso" value={persona.fecha_ingreso ? format(parseISO(persona.fecha_ingreso), "dd MMM yyyy", { locale: es }) : "—"} />
                <InfoRow label="Conversión" value={persona.fecha_conversion ? format(parseISO(persona.fecha_conversion), "dd MMM yyyy", { locale: es }) : "—"} />
                <InfoRow label="Bautismo" value={persona.fecha_bautismo ? format(parseISO(persona.fecha_bautismo), "dd MMM yyyy", { locale: es }) : "—"} />
              </CardContent>
            </Card>

            {/* Groups */}
            <Card className="md:col-span-2 lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <Users className="h-4 w-4" /> Grupos ({grupoMiembros?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {grupoMiembros && grupoMiembros.length > 0 ? (
                  <div className="space-y-2">
                    {grupoMiembros.map((gm: any) => (
                      <div key={gm.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium">{gm.grupos?.nombre}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">{gm.grupos?.tipo}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No pertenece a ningún grupo</p>
                )}
              </CardContent>
            </Card>

            {/* Observations */}
            {persona.observaciones && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                    <FileText className="h-4 w-4" /> Observaciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{persona.observaciones}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Familia tab */}
        <TabsContent value="familia">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 text-primary" /> Relaciones Familiares
                </CardTitle>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAddFamiliar(!showAddFamiliar)}>
                  <UserPlus className="h-3.5 w-3.5" /> Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add form */}
              {showAddFamiliar && (
                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                  <p className="text-sm font-medium">Nuevo familiar</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Parentesco</label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={selectedParentesco}
                        onChange={(e) => setSelectedParentesco(e.target.value)}
                      >
                        {["Cónyuge", "Hijo/a", "Padre", "Madre", "Hermano/a", "Abuelo/a", "Tío/a", "Sobrino/a", "Primo/a", "Otro"].map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Buscar persona registrada</label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        placeholder="Escriba nombre..."
                        value={familiarSearch}
                        onChange={(e) => setFamiliarSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Search results */}
                  {familiarSearch.length >= 2 && (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {(todasPersonas || [])
                        .filter((p) =>
                          p.id !== id &&
                          `${p.nombres} ${p.apellidos}`.toLowerCase().includes(familiarSearch.toLowerCase())
                        )
                        .slice(0, 5)
                        .map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                            onClick={() => {
                              createRelacion.mutate(
                                { persona_id: persona.id, familiar_id: p.id, parentesco: selectedParentesco },
                                {
                                  onSuccess: () => {
                                    setFamiliarSearch("");
                                    setShowAddFamiliar(false);
                                  },
                                }
                              );
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs">{p.nombres?.[0]}{p.apellidos?.[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{p.nombres} {p.apellidos}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">{p.tipo_persona}</Badge>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Or add manually */}
                  <div className="border-t pt-3">
                    <label className="text-xs text-muted-foreground">O escribir nombre manual</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        placeholder="Nombre completo"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                      />
                      <Button
                        size="sm"
                        disabled={!manualName.trim() || createRelacion.isPending}
                        onClick={() => {
                          createRelacion.mutate(
                            { persona_id: persona.id, familiar_nombre: manualName.trim(), parentesco: selectedParentesco },
                            {
                              onSuccess: () => {
                                setManualName("");
                                setShowAddFamiliar(false);
                              },
                            }
                          );
                        }}
                      >
                        Agregar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Family list */}
              {relaciones && relaciones.length > 0 ? (
                <div className="space-y-2">
                  {relaciones.map((rel: any) => {
                    const fam = rel.familiar;
                    const nombre = fam ? `${fam.nombres} ${fam.apellidos}` : rel.familiar_nombre || "—";
                    const parentescoIcon = rel.parentesco === "Cónyuge"
                      ? <Heart className="h-4 w-4 text-destructive" />
                      : rel.parentesco?.includes("Hijo")
                      ? <Baby className="h-4 w-4 text-primary" />
                      : <User className="h-4 w-4 text-muted-foreground" />;

                    return (
                      <div key={rel.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {fam?.foto_url ? (
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={fam.foto_url} />
                                <AvatarFallback>{nombre[0]}</AvatarFallback>
                              </Avatar>
                            ) : (
                              parentescoIcon
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{nombre}</p>
                            <p className="text-xs text-muted-foreground">{rel.parentesco}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {fam && (
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/personas/${fam.id}`)}>
                              Ver perfil
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive/70 hover:text-destructive"
                            onClick={() => deleteRelacion.mutate({ id: rel.id, personaId: persona.id })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : !showAddFamiliar ? (
                <div className="text-center py-8 text-muted-foreground">
                  <HeartHandshake className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin relaciones familiares registradas</p>
                  <Button variant="link" size="sm" onClick={() => setShowAddFamiliar(true)}>
                    Agregar familiar
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="procesos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" /> Procesos de Crecimiento
                </CardTitle>
                <Badge variant="outline" className="gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {completedCount}/{totalProcesos}
                </Badge>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Progreso general</span>
                  <span className="font-semibold text-foreground">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2.5" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {(procesos || []).map((p: any) => {
                  const pp = procesosMap.get(p.id);
                  const estado = pp?.estado || "No Realizado";
                  const estadoNorm = estado.toLowerCase().trim();
                  const displayEstado = (estadoNorm === "realizado" || estadoNorm === "finalizado") ? "Finalizado" 
                    : estadoNorm === "en curso" ? "En Curso" 
                    : "No Finalizado";
                  const badgeClass = (estadoNorm === "realizado" || estadoNorm === "finalizado")
                    ? "bg-success text-success-foreground"
                    : estadoNorm === "en curso"
                    ? "bg-primary text-primary-foreground"
                    : "bg-destructive text-destructive-foreground";
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <p className="flex-1 text-sm font-semibold">{p.nombre}</p>
                      <Badge
                        className={cn("cursor-pointer select-none min-w-[100px] justify-center", badgeClass)}
                        onClick={() => handleToggleEstado(p.id, estado)}
                      >
                        {displayEstado}
                      </Badge>
                      <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => openProcesoDialog(p.id, p.nombre)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
                            <Calendar className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <CalendarComponent
                            mode="single"
                            selected={pp?.fecha_completado ? parseISO(pp.fecha_completado) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                updateProceso.mutate({
                                  personaId: persona.id,
                                  procesoId: p.id,
                                  estado: estado === "No Realizado" ? "En Curso" : estado,
                                  fecha_completado: format(date, "yyyy-MM-dd"),
                                  observacion: (pp as any)?.observacion || null,
                                });
                              }
                            }}
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <span className="text-xs text-muted-foreground w-[85px] text-right">
                        {pp?.fecha_completado ? format(parseISO(pp.fecha_completado), "dd/MM/yyyy") : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Detalle del proceso dialog */}
          <Dialog open={!!procesoDialog} onOpenChange={(o) => !o && setProcesoDialog(null)}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Detalle del Proceso
                </DialogTitle>
                <p className="text-sm text-muted-foreground">{procesoDialog?.nombre}</p>
              </DialogHeader>
              <Textarea
                placeholder="Ingresa la información adicional sobre el proceso de crecimiento"
                value={procesoObservacion}
                onChange={(e) => setProcesoObservacion(e.target.value)}
                rows={6}
              />
              <DialogFooter className="gap-2">
                <Button onClick={handleSaveProceso}>Guardar</Button>
                <Button variant="destructive" onClick={() => setProcesoDialog(null)}>Cancelar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Attendance tab */}
        <TabsContent value="asistencia">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Historial de Asistencia
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="gap-1 border-success/30 text-success">
                    <CheckCircle2 className="h-3 w-3" /> {asistenciasPresente}
                  </Badge>
                  <Badge variant="outline" className="gap-1 border-destructive/30 text-destructive">
                    <XCircle className="h-3 w-3" /> {totalAsistencias - asistenciasPresente}
                  </Badge>
                </div>
              </div>
              {totalAsistencias > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Porcentaje de asistencia</span>
                    <span className="font-semibold text-foreground">{asistenciaPercent}%</span>
                  </div>
                  <Progress value={asistenciaPercent} className="h-2" />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {totalAsistencias > 0 ? (
                <div className="space-y-1.5">
                  {(asistencias || []).slice(0, 15).map((a: any) => (
                    <div key={a.id} className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      a.presente ? "bg-success/5 border-success/10" : "bg-destructive/5 border-destructive/10"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          a.presente ? "bg-success/20" : "bg-destructive/20"
                        )}>
                          {a.presente ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{a.servicios?.nombre || "Servicio"}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.servicios?.fecha ? format(parseISO(a.servicios.fecha), "dd MMM yyyy", { locale: es }) : ""}
                            {a.servicios?.tipo ? ` · ${a.servicios.tipo}` : ""}
                          </p>
                        </div>
                      </div>
                      <Badge variant={a.presente ? "default" : "destructive"} className={cn("text-xs", a.presente && "bg-success text-success-foreground")}>
                        {a.presente ? "Presente" : "Ausente"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin registros de asistencia</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR Tab */}
        <TabsContent value="qr">
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-sm flex items-center justify-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <QrCode className="h-4 w-4" /> Código QR de Asistencia
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                {(persona as any).qr_code ? (
                  <>
                    <div className="p-4 bg-white rounded-xl border-2 border-border">
                      <QRCodeSVG value={(persona as any).qr_code} size={200} level="M" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Escanea este código en el módulo de Reuniones o usa "Check-in rápido" para registrar la asistencia.
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono break-all">{(persona as any).qr_code}</p>
                    <Button
                      variant="outline" size="sm" className="gap-1.5"
                      onClick={() => {
                        navigator.clipboard.writeText((persona as any).qr_code);
                        toast.success("Código QR copiado al portapapeles");
                      }}
                    >
                      Copiar código
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Este miembro no tiene un código QR asignado aún.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <ClipboardCheck className="h-4 w-4" /> Check-in rápido con QR
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Selecciona el servicio y registra la asistencia de <span className="font-semibold text-foreground">{persona.nombres}</span> usando su identificador QR. Queda registrado en auditoría.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Servicio</label>
                  <Select value={qrCheckinServicio} onValueChange={setQrCheckinServicio}>
                    <SelectTrigger><SelectValue placeholder="Elige un servicio" /></SelectTrigger>
                    <SelectContent>
                      {(servicios || []).slice(0, 30).map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre}{s.fecha ? " · " + s.fecha : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full gap-2"
                  disabled={!qrCheckinServicio || !(persona as any).qr_code}
                  onClick={() => setQrCheckinOpen(true)}
                >
                  <QrCode className="h-4 w-4" /> Realizar check-in
                </Button>
                {!(persona as any).qr_code && (
                  <p className="text-[11px] text-destructive">Esta persona aún no tiene código QR generado.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        {/* Grupos tab */}
        <TabsContent value="grupos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Grupos ({grupoMiembros?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {grupoMiembros && grupoMiembros.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {grupoMiembros.map((gm: any) => (
                    <div key={gm.id} className="surface-card card-hover p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{gm.grupos?.nombre}</p>
                        <p className="text-xs text-muted-foreground">{gm.grupos?.tipo || "—"} · rol: {gm.rol || "asistente"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin grupos asignados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finanzas tab */}
        <TabsContent value="finanzas">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="surface-card p-4">
                <p className="kpi-label">Aportes registrados</p>
                <p className="kpi-value mt-2">${totalAportesIngreso.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{(finanzasP || []).length} movimientos</p>
              </div>
              <div className="surface-card p-4">
                <p className="kpi-label">Donaciones</p>
                <p className="kpi-value mt-2">${totalDonaciones.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{(donacionesP || []).length} donaciones</p>
              </div>
              <div className="surface-card p-4">
                <p className="kpi-label">Total contribuido</p>
                <p className="kpi-value mt-2">${(totalAportesIngreso + totalDonaciones).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Ingresos + donaciones</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Movimientos y donaciones</CardTitle>
              </CardHeader>
              <CardContent>
                {(finanzasP && finanzasP.length > 0) || (donacionesP && donacionesP.length > 0) ? (
                  <div className="divide-y">
                    {[
                      ...(finanzasP || []).map((f: any) => ({ ...f, _kind: "finanza" })),
                      ...(donacionesP || []).map((d: any) => ({ ...d, _kind: "donacion" })),
                    ]
                      .sort((a: any, b: any) => (b.fecha || "").localeCompare(a.fecha || ""))
                      .map((row: any) => (
                        <div key={`${row._kind}-${row.id}`} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                              row._kind === "donacion" ? "bg-accent/10 text-accent" :
                              row.tipo === "Ingreso" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                              {row._kind === "donacion" ? <Heart className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {row._kind === "donacion" ? `Donación${row.tipo ? " · " + row.tipo : ""}` : (row.categoria_nombre || row.descripcion || row.tipo || "Movimiento")}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {row.fecha ? format(parseISO(row.fecha), "dd MMM yyyy", { locale: es }) : "—"}
                                {row.metodo_pago ? ` · ${row.metodo_pago}` : ""}
                                {row.estado ? ` · ${row.estado}` : ""}
                              </p>
                            </div>
                          </div>
                          <span className={cn("text-sm font-bold whitespace-nowrap",
                            row._kind === "donacion" || row.tipo === "Ingreso" ? "text-success" : "text-destructive")}>
                            {row._kind === "donacion" || row.tipo === "Ingreso" ? "+" : "-"}${Number(row.monto).toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sin movimientos financieros registrados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Actividad tab — timeline unificada */}
        <TabsContent value="actividad">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Línea de tiempo · {timeline.length} eventos
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPDF}>
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PersonaActivityTimeline events={timeline} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground flex items-center gap-1.5 shrink-0 text-xs uppercase tracking-wider">
        {icon}{label}
      </span>
      <span className="text-foreground text-right font-medium text-sm truncate">{value}</span>
    </div>
  );
}
