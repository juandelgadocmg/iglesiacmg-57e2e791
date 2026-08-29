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
import PersonaQrCameraCheckin from "@/components/persona/PersonaQrCameraCheckin";
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
import { SeguimientoTab, MinisteriosTab, ProximasReunionesTab, NotasTab, ArchivosTab } from "@/components/persona/PersonaExtraTabs";
import PersonaHistorialTab from "@/components/persona/PersonaHistorialTab";
import { RegistrarLlamadaConsolidacionDialog } from "@/components/persona/RegistrarLlamadaConsolidacionDialog";
import { History, PhoneCall } from "lucide-react";
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Church, Users, Briefcase,
  Heart, BookOpen, CheckCircle2, XCircle, Clock, User, FileText,
  GraduationCap, Shield, Pencil, UserPlus, Trash2, Baby, HeartHandshake, Camera, Plus, QrCode,
  MoreHorizontal, Download, Award, DollarSign, Activity, ClipboardCheck, MessageSquare,
  TrendingUp, TrendingDown, Cake, Sparkles, Copy, ExternalLink, Share2, BadgeCheck,
  ArrowUpRight, ArrowDownRight, Wallet, PiggyBank, Target, Flag, MapPinned, Route,
  Filter, Search, ChevronRight, Circle, Zap, Gift, Bookmark, Layers,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { format, parseISO, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUrlParam } from "@/hooks/useUrlParam";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { TallerNeumatologiaAulaTab } from "@/components/seminario/TallerNeumatologiaAulaTab";
import { useMisOfertas } from "@/hooks/useSeminarioStudent";
import { VoiceDictationButton } from "@/components/shared/VoiceDictationButton";

const tipoColor: Record<string, string> = {
  Miembro: "bg-primary/15 text-primary border-primary/30",
  Visitante: "bg-info/15 text-info border-info/30",
  Líder: "bg-accent/15 text-accent border-accent/30",
  Servidor: "bg-success/15 text-success border-success/30",
};

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
  const { data: misOfertas = [] } = useMisOfertas(id);

  // Check if this persona is enrolled in Seminario and taking Neumatología (NEU-101)
  const estaViendoNeumatologia = useMemo(() => {
    if (!persona) return false;

    // 1. Check if persona has an active enrollment in Neumatología in sem_inscripcion_materias
    const tieneMateriaNeumatologia = misOfertas.some((o: any) => {
      const matNombre = String(o.sem_materias?.nombre || "").toLowerCase();
      const matCodigo = String(o.sem_materias?.codigo || "").toLowerCase();
      return matNombre.includes("neumatolog") || matCodigo.includes("neu-101") || matCodigo.includes("neu");
    });

    if (tieneMateriaNeumatologia) return true;

    // 2. Check if persona processes or roles explicitly mention Neumatología
    const tipos = [persona.tipo_persona, ...(Array.isArray(persona.tipos_persona) ? persona.tipos_persona : [])].filter(Boolean);
    const esEstudianteSeminario = tipos.some(t => String(t).toLowerCase().includes("estudiante seminario") || String(t).toLowerCase().includes("seminario"));

    const tieneProcesoNeumatologia = Array.isArray(personaProcesos) && personaProcesos.some((pp: any) => {
      const procName = String(pp.procesos_crecimiento?.nombre || pp.proceso_nombre || (pp as any).nombre || "").toLowerCase();
      return procName.includes("neumatolog");
    });

    if (esEstudianteSeminario && tieneProcesoNeumatologia) return true;

    return false;
  }, [persona, misOfertas, personaProcesos]);
  const createRelacion = useCreateRelacion();
  const deleteRelacion = useDeleteRelacion();
  const updateProceso = useUpdateProceso();
  const updatePersona = useUpdatePersona();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showAddFamiliar, setShowAddFamiliar] = useState(false);
  const [familiarSearch, setFamiliarSearch] = useState("");
  const [selectedParentesco, setSelectedParentesco] = useState("Cónyuge");
  const [manualName, setManualName] = useState("");
  const [procesoDialog, setProcesoDialog] = useState<{ procesoId: string; nombre: string } | null>(null);
  const [procesoObservacion, setProcesoObservacion] = useState("");
  const [procesoFecha, setProcesoFecha] = useState<Date | undefined>(undefined);
  const [procesoEstado, setProcesoEstado] = useState("No Realizado");
  const [confirmAsist, setConfirmAsist] = useState<null | { servicioId: string; nombreServicio: string }>(null);
  const [servicioParaAsistir, setServicioParaAsistir] = useState<string>("");
  const [askServicio, setAskServicio] = useState(false);
  const [exportPreview, setExportPreview] = useState<null | "pdf" | "csv">(null);
  const [qrCheckinOpen, setQrCheckinOpen] = useState(false);
  const [qrCheckinServicio, setQrCheckinServicio] = useState<string>("");
  const [openLlamadaModal, setOpenLlamadaModal] = useState(false);
  const [activeTab, setActiveTab] = useUrlParam("tab", "resumen");
  const { data: servicios } = useServicios();
  const upsertAsistencia = useUpsertAsistencia();

  const { data: auditoriaPersona, isLoading: auditoriaLoading, error: auditoriaError } = useQuery({
    queryKey: ["persona-audit", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_audit_log")
        .select("id, operation, actor_email, changed, created_at, table_name")
        .eq("table_name", "personas")
        .eq("row_id", id!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    retry: false,
  });
  const canSeeAudit = !auditoriaError;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !persona) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("La imagen no debe superar 5MB"); return; }

    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `personas/${persona.id}.${ext}`;
      await supabase.storage.from("avatars").remove([filePath]);
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
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

  const completedCount = (personaProcesos || []).filter((pp) => {
    const st = pp.estado?.toLowerCase()?.trim();
    return st === "realizado" || st === "finalizado" || st === "completado";
  }).length;
  const totalProcesos = procesos?.length || 0;
  const progressPercent = totalProcesos > 0 ? Math.round((completedCount / totalProcesos) * 100) : 0;

  const asistenciasPresente = asistencias?.filter((a) => a.presente).length || 0;
  const totalAsistencias = asistencias?.length || 0;
  const asistenciaPercent = totalAsistencias > 0 ? Math.round((asistenciasPresente / totalAsistencias) * 100) : 0;

  const totalDonaciones = (donacionesP || []).reduce((s, d: any) => s + Number(d.monto || 0), 0);
  const totalAportesIngreso = (finanzasP || []).filter((f: any) => f.tipo === "Ingreso").reduce((s, f: any) => s + Number(f.monto || 0), 0);
  const totalContribuido = totalAportesIngreso + totalDonaciones;

  const timeline: TimelineEvent[] = useMemo(() => {
    const evs: TimelineEvent[] = [];
    (asistencias || []).forEach((a: any) => {
      evs.push({
        id: a.id, type: "asistencia",
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

  const logPersonaAction = async (action: string, details: Record<string, any> = {}) => {
    try {
      await (supabase as any).rpc("log_persona_action", { _persona_id: id, _action: action, _details: details });
    } catch (err) { console.warn("log_persona_action failed", err); }
  };

  const openRegistrarAsistencia = () => {
    if (!servicios || servicios.length === 0) { toast.error("No hay servicios disponibles"); return; }
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
      await upsertAsistencia.mutateAsync([{ servicio_id: confirmAsist.servicioId, persona_id: persona.id, presente: true }]);
      await logPersonaAction("ATTENDANCE_MARK", { servicio_id: confirmAsist.servicioId, servicio: confirmAsist.nombreServicio, source: "profile_quick_action" });
      toast.success("Asistencia registrada", { description: confirmAsist.nombreServicio });
      setConfirmAsist(null);
    } catch (e: any) { toast.error("Error al registrar asistencia", { description: e?.message }); }
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
  const ejecutarCheckInQR = async () => {
    if (!persona || !qrCheckinServicio) return;
    try {
      await upsertAsistencia.mutateAsync([{ servicio_id: qrCheckinServicio, persona_id: persona.id, presente: true }]);
      const svc = (servicios || []).find((s: any) => s.id === qrCheckinServicio);
      await logPersonaAction("CHECKIN", { servicio_id: qrCheckinServicio, servicio: svc?.nombre, method: "qr" });
      toast.success("✓ Check-in registrado", { description: svc?.nombre || "Servicio" });
      setQrCheckinOpen(false);
    } catch (e: any) { toast.error("Error en check-in", { description: e?.message }); }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96" />
          <Skeleton className="h-96" />
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

  const age = persona.fecha_nacimiento ? differenceInYears(new Date(), parseISO(persona.fecha_nacimiento)) : null;
  const tipoP: string = persona.tipo_persona || "Miembro";
  const tiposArr: string[] = (persona as any).tipos_persona?.length ? (persona as any).tipos_persona : [tipoP];
  const tipos = [...new Set(tiposArr.includes(tipoP) ? tiposArr : [tipoP])];
  const fullName = `${persona.nombres} ${persona.apellidos}`;
  const headline = [persona.ministerio, (persona as any).grupos?.nombre].filter(Boolean).join(" · ") || "Miembro de la comunidad";
  const ubicacion = persona.direccion?.split(",").slice(-2).join(",").trim() || null;
  const antiguedad = persona.fecha_ingreso ? differenceInYears(new Date(), parseISO(persona.fecha_ingreso)) : null;

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
        observacion: procesoObservacion,
      },
      {
        onSuccess: () => {
          toast.success("Información del hito guardada");
          setProcesoDialog(null);
        },
        onError: (err: any) => toast.error("Error al actualizar hito", { description: err?.message }),
      }
    );
  };

  const handleToggleEstado = (procesoId: string, currentEstado: string) => {
    const pp = procesosMap.get(procesoId);
    const norm = (currentEstado || "").toLowerCase().trim();
    let next = "En Curso";
    if (norm === "en curso") {
      next = "Realizado";
    } else if (norm === "realizado" || norm === "finalizado" || norm === "completado") {
      next = "No Realizado";
    } else {
      next = "En Curso";
    }

    updateProceso.mutate(
      {
        personaId: persona.id,
        procesoId,
        estado: next,
        fecha_completado: next === "Realizado" ? (pp?.fecha_completado || format(new Date(), "yyyy-MM-dd")) : (pp?.fecha_completado ?? null),
        observacion: pp?.observacion ?? undefined,
      },
      { onError: (err: any) => toast.error("Error al actualizar estado", { description: err?.message }) }
    );
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-6 pb-10">
      {editing && <PersonaFormDialog initialData={persona} onClose={() => setEditing(false)} />}

      {/* ============ HEADER: cover + avatar + identity ============ */}
      <section className="relative rounded-2xl overflow-hidden bg-card border border-border/60 shadow-sm">
        {/* Cover */}
        <div className="relative h-48 md:h-60 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.55),transparent_55%),radial-gradient(circle_at_80%_60%,hsl(var(--accent)/0.45),transparent_55%),linear-gradient(120deg,hsl(var(--primary)),hsl(var(--primary)/0.7)_45%,hsl(var(--accent)/0.8))]" />
          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.5'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-card/40 via-transparent to-transparent" />

          {/* Back */}
          <Button
            variant="ghost" size="sm"
            className="absolute top-4 left-4 h-9 gap-1.5 bg-background/20 backdrop-blur-md text-primary-foreground hover:bg-background/30 border border-white/20"
            onClick={() => navigate("/personas")}
          >
            <ArrowLeft className="h-4 w-4" /> Personas
          </Button>

          {/* Cover actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              variant="ghost" size="icon"
              className="h-11 w-11 bg-background/20 backdrop-blur-md text-primary-foreground hover:bg-background/30 border border-white/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              title="Cambiar portada"
              aria-label="Cambiar portada"
            >
              <Camera className="h-5 w-5" />
            </Button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" />
          </div>
        </div>

        {/* Identity block */}
        <div className="relative px-6 md:px-8 pb-6">
          {/* Avatar */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 -mt-16 md:-mt-20">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-card shadow-xl ring-1 ring-border/50">
                  <AvatarImage src={persona.foto_url || undefined} className="object-cover" />
                  <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                    {persona.nombres?.[0]}{persona.apellidos?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-7 w-7 text-white" />
                </div>
                {uploadingPhoto && (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                    <div className="h-7 w-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                {/* verified check for miembro */}
                {tipoP === "Miembro" && (
                  <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground rounded-full p-1 border-2 border-card shadow">
                    <BadgeCheck className="h-4 w-4" />
                  </div>
                )}
              </div>

              {/* Name + headline */}
              <div className="pb-1 md:pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{fullName}</h1>
                  <StatusBadge status={persona.estado_iglesia} />
                </div>
                <p className="text-sm md:text-base text-muted-foreground mt-1 font-medium">{headline}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  {ubicacion && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {ubicacion}</span>}
                  {age !== null && <span className="flex items-center gap-1"><Cake className="h-3.5 w-3.5" /> {age} años</span>}
                  {antiguedad !== null && <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> {antiguedad} {antiguedad === 1 ? "año" : "años"} en la iglesia</span>}
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {relaciones?.length || 0} familiares</span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  {tipos.map((tipo: string) => (
                    <Badge key={tipo} variant="outline" className={cn("gap-1 font-medium", tipoColor[tipo] || "")}>
                      <Church className="h-3 w-3" /> {tipo}
                    </Badge>
                  ))}
                  {persona.sexo && <Badge variant="outline" className="font-medium">{persona.sexo}</Badge>}
                  {persona.estado_civil && <Badge variant="outline" className="font-medium">{persona.estado_civil}</Badge>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 md:pb-3">
              <Button size="sm" className="gap-1.5 rounded-full shadow-sm" onClick={() => setOpenLlamadaModal(true)}>
                <PhoneCall className="h-4 w-4" /> Registrar llamada
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 rounded-full shadow-sm" onClick={openRegistrarAsistencia}>
                <ClipboardCheck className="h-4 w-4" /> Registrar asistencia
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Editar perfil
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-full">
                    Más <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Acciones rápidas</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setOpenLlamadaModal(true)}><PhoneCall className="h-4 w-4 mr-2" /> Registrar llamada consolidación</DropdownMenuItem>
                  <DropdownMenuItem onClick={generarCertificado}><Award className="h-4 w-4 mr-2" /> Generar certificado</DropdownMenuItem>
                  <DropdownMenuItem onClick={openRegistrarAsistencia}><ClipboardCheck className="h-4 w-4 mr-2" /> Registrar asistencia</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Exportar</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleExportPDF}><FileText className="h-4 w-4 mr-2" /> Ficha (PDF)</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV}><Download className="h-4 w-4 mr-2" /> Historial (CSV)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Quick contact chips */}
          <div className="mt-5 pt-5 border-t border-border/60 flex flex-wrap gap-2">
            {persona.telefono && (
              <a href={`tel:${persona.telefono}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-foreground transition-colors">
                <Phone className="h-3.5 w-3.5 text-primary" /> {persona.telefono}
              </a>
            )}
            {persona.email && (
              <a href={`mailto:${persona.email}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-foreground transition-colors">
                <Mail className="h-3.5 w-3.5 text-primary" /> {persona.email}
              </a>
            )}
            {persona.telefono && (
              <a href={`https://wa.me/${persona.telefono.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-success/10 hover:bg-success/20 text-success transition-colors">
                <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ============ KPI ROW ============ */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiTile icon={<TrendingUp className="h-4 w-4" />} label="Crecimiento" value={`${progressPercent}%`} sub={`${completedCount}/${totalProcesos} procesos`} tone="primary" progress={progressPercent} />
        <KpiTile icon={<CheckCircle2 className="h-4 w-4" />} label="Asistencia" value={`${asistenciaPercent}%`} sub={`${asistenciasPresente}/${totalAsistencias} servicios`} tone="success" progress={asistenciaPercent} />
        <KpiTile icon={<Users className="h-4 w-4" />} label="Grupos activos" value={String(grupoMiembros?.length || 0)} sub={grupoMiembros?.[0]?.grupos?.nombre || "Sin asignar"} tone="info" />
        <KpiTile icon={<DollarSign className="h-4 w-4" />} label="Contribución total" value={`$${totalContribuido.toLocaleString()}`} sub={`${(finanzasP?.length || 0) + (donacionesP?.length || 0)} movimientos`} tone="accent" />
      </section>

      {/* ============ TABS ============ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="sticky top-0 z-20 -mx-2 px-2 bg-background/85 backdrop-blur-lg border-b border-border/60">
          <TabsList className="h-auto p-0 bg-transparent gap-1 overflow-x-auto flex-nowrap w-full justify-start rounded-none">
            {[
              { v: "resumen", label: "Indicadores", icon: User },
              ...(estaViendoNeumatologia ? [{ v: "seminario", label: "Seminario & Talleres", icon: GraduationCap }] : []),
              { v: "actividad", label: "Timeline", icon: Activity },
              { v: "seguimiento", label: "Seguimiento", icon: Target },
              { v: "discipulado", label: "Discipulado", icon: Route },
              { v: "grupos", label: "Grupos", icon: Users },
              { v: "ministerios", label: "Ministerios", icon: Church },
              { v: "familia", label: "Familia", icon: HeartHandshake },
              { v: "proximas", label: "Próximas reuniones", icon: Calendar },
              { v: "notas", label: "Notas", icon: FileText },
              { v: "archivos", label: "Archivos", icon: Layers },
              { v: "finanzas", label: "Finanzas", icon: Wallet },
              { v: "certificados", label: "Certificados", icon: Award },
              { v: "qr", label: "QR", icon: QrCode },
              { v: "historial", label: "Historial", icon: History },
            ].map(t => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-muted-foreground gap-1.5"
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* TAB · SEMINARIO Y TALLERES (Solo visible para estudiantes de Neumatología) */}
        {estaViendoNeumatologia && (
          <TabsContent value="seminario" className="mt-0 space-y-4">
            <TallerNeumatologiaAulaTab materiaNombre="Neumatología" materiaCodigo="NEU-101" embeddedInCourse={false} />
          </TabsContent>
        )}

        {/* ======================================================
             TAB · RESUMEN — Dashboard ejecutivo (bento + sidebar)
        ====================================================== */}
        <TabsContent value="resumen" className="mt-0 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Bento hero: About + Next steps */}
            <div className="grid md:grid-cols-5 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="md:col-span-3 rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                  <User className="h-3.5 w-3.5" /> Acerca de
                </div>
                {persona.observaciones ? (
                  <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap line-clamp-6">{persona.observaciones}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sin biografía. Añade una nota pastoral desde "Editar perfil".</p>
                )}
                {persona.ocupacion && (
                  <div className="mt-4 pt-4 border-t border-border/50 inline-flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">{persona.ocupacion}</span>
                  </div>
                )}
              </motion.div>

              {/* Next milestone */}
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="md:col-span-2 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 p-5 shadow-sm flex flex-col"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  <Flag className="h-3.5 w-3.5" /> Siguiente hito
                </div>
                {(() => {
                  const pendientes = (procesos || []).filter((p: any) => {
                    const est = procesosMap.get(p.id)?.estado?.toLowerCase();
                    return est !== "realizado" && est !== "finalizado";
                  });
                  const next = pendientes[0];
                  return next ? (
                    <>
                      <p className="text-base font-bold text-foreground mt-1 leading-tight">{next.nombre}</p>
                      <p className="text-xs text-muted-foreground mt-1">Próximo paso del discipulado</p>
                      <div className="mt-auto pt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progreso general</span><span className="font-bold text-primary">{progressPercent}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-1.5" />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                      <CheckCircle2 className="h-8 w-8 text-success mb-2" />
                      <p className="text-sm font-semibold">Discipulado completo</p>
                    </div>
                  );
                })()}
              </motion.div>
            </div>

            {/* Row 2: attendance streak + pastoral card + family snapshot */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-success mb-3">
                  <Zap className="h-3.5 w-3.5" /> Racha
                </div>
                <p className="text-3xl font-bold text-foreground">{asistenciasPresente}</p>
                <p className="text-xs text-muted-foreground mt-1">servicios asistidos</p>
                <div className="mt-3 flex gap-1">
                  {(asistencias || []).slice(0, 12).reverse().map((a: any, i: number) => (
                    <div key={i} className={cn("h-6 flex-1 rounded-sm", a.presente ? "bg-success/70" : "bg-muted")} title={a.servicios?.nombre} />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent mb-3">
                  <HeartHandshake className="h-3.5 w-3.5" /> Familia
                </div>
                <p className="text-3xl font-bold text-foreground">{relaciones?.length || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">relaciones registradas</p>
                <div className="mt-3 flex -space-x-2">
                  {(relaciones || []).slice(0, 5).map((r: any) => (
                    <Avatar key={r.id} className="h-8 w-8 border-2 border-card">
                      <AvatarImage src={r.familiar?.foto_url} />
                      <AvatarFallback className="text-xs">{(r.familiar?.nombres?.[0] || r.familiar_nombre?.[0] || "?")}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                  <PiggyBank className="h-3.5 w-3.5" /> Contribución
                </div>
                <p className="text-3xl font-bold text-foreground">${totalContribuido.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">total histórico</p>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" />Aportes ${totalAportesIngreso.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" />Don. ${totalDonaciones.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Recent activity preview */}
            <SectionCard
              icon={<Activity className="h-4 w-4" />}
              title="Actividad reciente"
              right={<Button variant="ghost" size="sm" className="gap-1" onClick={() => setActiveTab("actividad")}>Ver toda <ChevronRight className="h-3.5 w-3.5" /></Button>}
            >
              <PersonaActivityTimeline events={timeline.slice(0, 6)} />
            </SectionCard>
          </div>

          {/* Sidebar with fixed info */}
          <aside className="space-y-4 lg:sticky lg:top-20 self-start h-fit">
            <SidebarCard icon={<Phone className="h-4 w-4" />} title="Contacto">
              <SideRow icon={<Phone className="h-3.5 w-3.5" />} label="Teléfono" value={persona.telefono || "—"} />
              <SideRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={persona.email || "—"} />
              <SideRow icon={<MapPin className="h-3.5 w-3.5" />} label="Dirección" value={persona.direccion || "—"} />
            </SidebarCard>
            <SidebarCard icon={<User className="h-4 w-4" />} title="Datos personales">
              <SideRow icon={<Cake className="h-3.5 w-3.5" />} label="Nacimiento" value={persona.fecha_nacimiento ? format(parseISO(persona.fecha_nacimiento), "dd MMM yyyy", { locale: es }) : "—"} />
              <SideRow label="Edad" value={age !== null ? `${age} años` : "—"} />
              <SideRow label="Sexo" value={persona.sexo || "—"} />
              <SideRow label="Estado civil" value={persona.estado_civil || "—"} />
              <SideRow label="Documento" value={persona.documento || "—"} />
              <SideRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Ocupación" value={persona.ocupacion || "—"} />
            </SidebarCard>
            <SidebarCard icon={<Church className="h-4 w-4" />} title="Ministerial">
              <SideRow label="Grupo" value={(persona as any).grupos?.nombre || "Sin grupo"} />
              <SideRow label="Red" value={(persona as any).grupos?.red || "—"} />
              <SideRow label="Vinculación" value={persona.vinculacion || "—"} />
              <SideRow label="Ministerio" value={persona.ministerio || "—"} />
              <SideRow label="Líder" value={persona.lider_responsable || "—"} />
              <SideRow label="Consolidador" value={persona.seguimiento_por || "—"} />
              <SideRow label="Invitado por" value={persona.invitado_por || "—"} />
              <SideRow label="Ingreso" value={persona.fecha_ingreso ? format(parseISO(persona.fecha_ingreso), "dd MMM yyyy", { locale: es }) : "—"} />
              <SideRow label="Conversión" value={persona.fecha_conversion ? format(parseISO(persona.fecha_conversion), "dd MMM yyyy", { locale: es }) : "—"} />
              <SideRow label="Bautismo" value={persona.fecha_bautismo ? format(parseISO(persona.fecha_bautismo), "dd MMM yyyy", { locale: es }) : "—"} />
            </SidebarCard>
          </aside>
        </TabsContent>

        {/* ======================================================
             TAB · ACTIVIDAD — Feed vertical estilo LinkedIn
        ====================================================== */}
        <TabsContent value="actividad" className="mt-0">
          <ActivityFeedTab
            timeline={timeline}
            auditoria={auditoriaPersona || []}
            canSeeAudit={canSeeAudit}
            auditoriaLoading={auditoriaLoading}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
          />
        </TabsContent>

        {/* ======================================================
             TAB · DISCIPULADO — Roadmap vertical
        ====================================================== */}
        <TabsContent value="discipulado" className="mt-0">
          <DiscipuladoRoadmap
            procesos={procesos || []}
            procesosMap={procesosMap}
            progressPercent={progressPercent}
            completedCount={completedCount}
            totalProcesos={totalProcesos}
            onToggle={handleToggleEstado}
            onOpenDetail={openProcesoDialog}
            onSetDate={(procesoId, date, estado, obs) => {
              const pp = procesosMap.get(procesoId);
              const norm = (estado || "").toLowerCase().trim();
              const nextEstado = norm === "no realizado" ? "En Curso" : estado;
              updateProceso.mutate({
                personaId: persona.id,
                procesoId,
                estado: nextEstado,
                fecha_completado: format(date, "yyyy-MM-dd"),
                observacion: obs !== null && obs !== undefined ? obs : (pp?.observacion ?? undefined),
              });
            }}
          />
        </TabsContent>

        {/* ======================================================
             TAB · GRUPOS — Tarjetas visuales con portada
        ====================================================== */}
        <TabsContent value="grupos" className="mt-0">
          <GruposGallery grupos={grupoMiembros || []} />
        </TabsContent>

        {/* ======================================================
             TAB · FINANZAS — Panel bancario con gráficas
        ====================================================== */}
        <TabsContent value="finanzas" className="mt-0">
          <FinanzasBankPanel
            finanzas={finanzasP || []}
            donaciones={donacionesP || []}
            totalAportes={totalAportesIngreso}
            totalDonaciones={totalDonaciones}
            totalContribuido={totalContribuido}
          />
        </TabsContent>

        {/* ======================================================
             TAB · FAMILIA — Tarjetas de relaciones agrupadas
        ====================================================== */}
        <TabsContent value="familia" className="mt-0">
          <FamiliaCards
            relaciones={relaciones || []}
            personaNombre={fullName}
            showAdd={showAddFamiliar}
            setShowAdd={setShowAddFamiliar}
            selectedParentesco={selectedParentesco}
            setSelectedParentesco={setSelectedParentesco}
            familiarSearch={familiarSearch}
            setFamiliarSearch={setFamiliarSearch}
            manualName={manualName}
            setManualName={setManualName}
            todasPersonas={todasPersonas || []}
            currentId={id!}
            onLinkExisting={(familiar_id) => createRelacion.mutate({ persona_id: persona.id, familiar_id, parentesco: selectedParentesco }, { onSuccess: () => { setFamiliarSearch(""); setShowAddFamiliar(false); } })}
            onAddManual={() => createRelacion.mutate({ persona_id: persona.id, familiar_nombre: manualName.trim(), parentesco: selectedParentesco }, { onSuccess: () => { setManualName(""); setShowAddFamiliar(false); } })}
            onDelete={(relId) => deleteRelacion.mutate({ id: relId, personaId: persona.id })}
            navigate={navigate}
            createPending={createRelacion.isPending}
          />
        </TabsContent>

        {/* ======================================================
             TAB · CERTIFICADOS
        ====================================================== */}
        <TabsContent value="certificados" className="mt-0">
          <CertificadosPanel
            personaNombre={persona.nombres}
            onGenerar={generarCertificado}
            onExportPDF={handleExportPDF}
            onExportCSV={handleExportCSV}
          />
        </TabsContent>

        {/* ======================================================
             TAB · QR — Hero destacado
        ====================================================== */}
        <TabsContent value="qr" className="mt-0 space-y-6">
          <QrHero
            personaNombre={fullName}
            qrCode={(persona as any).qr_code || ""}
            servicios={servicios || []}
            qrCheckinServicio={qrCheckinServicio}
            setQrCheckinServicio={setQrCheckinServicio}
            onOpenManual={() => setQrCheckinOpen(true)}
          />

          {/* Historial de asistencias registradas por QR */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" /> Historial de check-ins por QR
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const qrRows = (asistencias || []).filter((a: any) => a.metodo_registro === "qr");
                if (!qrRows.length) {
                  return (
                    <p className="text-sm text-muted-foreground">
                      Aún no hay asistencias registradas por QR.
                    </p>
                  );
                }
                return (
                  <div className="divide-y">
                    {qrRows.map((a: any) => (
                      <div key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {a.servicios?.nombre || "Reunión"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {a.checkin_time
                              ? new Date(a.checkin_time).toLocaleString("es-CO")
                              : (a.servicios?.fecha
                                  ? new Date(a.servicios.fecha).toLocaleDateString("es-CO")
                                  : "—")}
                          </p>
                        </div>
                        {a.puntualidad && (
                          <Badge
                            variant="outline"
                            className={
                              a.puntualidad === "Excelente" || a.puntualidad === "Puntual"
                                ? "bg-success/10 text-success border-success/20"
                                : a.puntualidad === "Tarde leve"
                                ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                                : a.puntualidad === "Tarde"
                                ? "bg-orange-500/10 text-orange-700 border-orange-500/20"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            }
                          >
                            {a.puntualidad}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======== TAB · SEGUIMIENTO ======== */}
        <TabsContent value="seguimiento" className="mt-0">
          <SeguimientoTab persona={persona} peticiones={peticionesP} consejerias={consejeriasP} progresoPct={progressPercent} asistenciaPct={asistenciaPercent} />
        </TabsContent>

        {/* ======== TAB · MINISTERIOS ======== */}
        <TabsContent value="ministerios" className="mt-0">
          <MinisteriosTab persona={persona} tipos={tipos} grupoMiembros={grupoMiembros || []} />
        </TabsContent>

        {/* ======== TAB · PRÓXIMAS REUNIONES ======== */}
        <TabsContent value="proximas" className="mt-0">
          <ProximasReunionesTab servicios={servicios || []} grupoMiembros={grupoMiembros || []} onRegistrar={openRegistrarAsistencia} />
        </TabsContent>

        {/* ======== TAB · NOTAS ======== */}
        <TabsContent value="notas" className="mt-0">
          <NotasTab persona={persona} />
        </TabsContent>

        {/* ======== TAB · ARCHIVOS ======== */}
        <TabsContent value="archivos" className="mt-0">
          <ArchivosTab persona={persona} />
        </TabsContent>

        {/* ======== TAB · HISTORIAL (auditoría) ======== */}
        <TabsContent value="historial" className="mt-0">
          <PersonaHistorialTab personaId={persona.id} personaEmail={persona.email} />
        </TabsContent>
      </Tabs>


      {/* ============ DIALOGS ============ */}
      {/* ============ DIALOG · DETALLE Y EDICIÓN DE HITO / PASO ============ */}
      <Dialog open={!!procesoDialog} onOpenChange={(o) => !o && setProcesoDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <FileText className="h-5 w-5" /> Detalle del Hito de Crecimiento
            </DialogTitle>
            <p className="text-base font-semibold text-foreground">{procesoDialog?.nombre}</p>
            <p className="text-xs text-muted-foreground">
              Guarda información, notas y el estado de este paso. Toda la información se conservará sin perderse entre etapas.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Estado Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-primary" /> Estado del hito
              </label>
              <Select value={procesoEstado} onValueChange={setProcesoEstado}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No Realizado">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-muted border border-border" />
                      Inicial / Pendiente
                    </span>
                  </SelectItem>
                  <SelectItem value="En Curso">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                      En curso
                    </span>
                  </SelectItem>
                  <SelectItem value="Realizado">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-success" />
                      Finalizado
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fecha Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Fecha del paso / completado
              </label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      {procesoFecha ? format(procesoFecha, "dd 'de' MMMM, yyyy", { locale: es }) : <span className="text-muted-foreground">Sin fecha registrada</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={procesoFecha}
                      onSelect={setProcesoFecha}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
                {procesoFecha && (
                  <Button variant="ghost" size="sm" onClick={() => setProcesoFecha(undefined)} title="Quitar fecha">
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            {/* Observaciones / Información */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-primary" /> Información y notas ingresadas
                </label>
                <VoiceDictationButton
                  onTranscript={(text) =>
                    setProcesoObservacion((prev) => (prev ? prev + " " + text : text))
                  }
                />
              </div>
              <Textarea
                placeholder="Escribe aquí la información o pulsa 'Dictar por voz' para grabar con tu micrófono..."
                value={procesoObservacion}
                onChange={(e) => setProcesoObservacion(e.target.value)}
                rows={5}
                className="resize-none rounded-xl"
              />
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span>🎙️ <strong>Dictado por voz disponible:</strong> Haz clic en el botón superior para grabar tus notas.</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setProcesoDialog(null)}>Cancelar</Button>
            <Button onClick={handleSaveProceso} disabled={updateProceso.isPending}>
              {updateProceso.isPending ? "Guardando..." : "Guardar información"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={askServicio} onOpenChange={setAskServicio}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Registrar asistencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Selecciona el servicio para registrar la asistencia de {fullName}.</p>
            <Select value={servicioParaAsistir} onValueChange={setServicioParaAsistir}>
              <SelectTrigger><SelectValue placeholder="Elige un servicio" /></SelectTrigger>
              <SelectContent>
                {(servicios || []).slice(0, 30).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre}{s.fecha ? " · " + s.fecha : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAskServicio(false)}>Cancelar</Button>
            <Button disabled={!servicioParaAsistir} onClick={confirmarServicioAsistencia}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAsist} onOpenChange={(o) => !o && setConfirmAsist(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Registrar asistencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcará como <span className="font-semibold">presente</span> a <span className="font-semibold">{fullName}</span> en <span className="font-semibold">{confirmAsist?.nombreServicio}</span>. Esta acción queda en auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={ejecutarRegistroAsistencia} disabled={upsertAsistencia.isPending}>
              {upsertAsistencia.isPending ? "Registrando…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={qrCheckinOpen} onOpenChange={setQrCheckinOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><QrCode className="h-4 w-4" /> Confirmar check-in QR</AlertDialogTitle>
            <AlertDialogDescription>
              Se registrará el check-in QR de <span className="font-semibold">{fullName}</span> en el servicio seleccionado. Queda constancia en auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={ejecutarCheckInQR} disabled={upsertAsistencia.isPending}>
              {upsertAsistencia.isPending ? "Procesando…" : "Confirmar check-in"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PersonaExportPreviewDialog
        open={exportPreview !== null}
        onOpenChange={(o) => !o && setExportPreview(null)}
        kind={exportPreview ?? "pdf"}
        persona={persona}
        timeline={timeline}
      />

      <RegistrarLlamadaConsolidacionDialog
        open={openLlamadaModal}
        onOpenChange={setOpenLlamadaModal}
        persona={persona}
      />
    </div>
  );
}

/* ============ Sub-components ============ */

function KpiTile({ icon, label, value, sub, tone = "primary", progress }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  tone?: "primary" | "success" | "info" | "accent"; progress?: number;
}) {
  const toneMap = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    info: "text-info bg-info/10",
    accent: "text-accent bg-accent/10",
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", toneMap[tone])}>{icon}</div>
      </div>
      <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground truncate mt-0.5">{sub}</p>}
      {typeof progress === "number" && <Progress value={progress} className="h-1 mt-3" />}
    </div>
  );
}

function MiniKpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "primary" | "success" | "accent" }) {
  const border = tone === "primary" ? "border-l-primary" : tone === "success" ? "border-l-success" : "border-l-accent";
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card p-4 border-l-4", border)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionCard({ icon, title, right, children }: { icon: React.ReactNode; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <span className="text-primary">{icon}</span> {title}
          </CardTitle>
          {right}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SidebarCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  );
}

function SideRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0 pt-0.5">
        {icon}{label}
      </span>
      <span className="text-xs text-foreground text-right font-medium break-words min-w-0">{value}</span>
    </div>
  );
}

function EmptyState({ icon, text, action }: { icon: React.ReactNode; text: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <div className="opacity-30 flex justify-center mb-2">{icon}</div>
      <p className="text-sm">{text}</p>
      {action}
    </div>
  );
}

/* ==========================================================
   TAB · ACTIVIDAD — LinkedIn-style feed
========================================================== */
function ActivityFeedTab({ timeline, auditoria, canSeeAudit, auditoriaLoading, onExportCSV, onExportPDF }: {
  timeline: TimelineEvent[]; auditoria: any[]; canSeeAudit: boolean; auditoriaLoading: boolean;
  onExportCSV: () => void; onExportPDF: () => void;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [showAudit, setShowAudit] = useState(false);

  const filtered = useMemo(() => filter === "all" ? timeline : timeline.filter(e => e.type === filter), [filter, timeline]);
  const grouped = useMemo(() => {
    const g: Record<string, TimelineEvent[]> = {};
    filtered.forEach(e => {
      const d = e.date ? new Date(e.date) : new Date();
      const key = format(d, "LLLL yyyy", { locale: es });
      (g[key] = g[key] || []).push(e);
    });
    return g;
  }, [filtered]);

  const chips: { id: string; label: string; icon: any; count: number }[] = [
    { id: "all", label: "Todo", icon: Layers, count: timeline.length },
    { id: "asistencia", label: "Asistencia", icon: CheckCircle2, count: timeline.filter(e => e.type === "asistencia").length },
    { id: "finanza", label: "Aportes", icon: DollarSign, count: timeline.filter(e => e.type === "finanza").length },
    { id: "donacion", label: "Donaciones", icon: Gift, count: timeline.filter(e => e.type === "donacion").length },
    { id: "proceso", label: "Discipulado", icon: Route, count: timeline.filter(e => e.type === "proceso").length },
    { id: "peticion", label: "Peticiones", icon: Heart, count: timeline.filter(e => e.type === "peticion").length },
    { id: "consejeria", label: "Consejerías", icon: MessageSquare, count: timeline.filter(e => e.type === "consejeria").length },
  ];

  const iconFor = (t: string) =>
    t === "asistencia" ? CheckCircle2 : t === "finanza" ? DollarSign : t === "donacion" ? Gift :
    t === "proceso" ? Route : t === "peticion" ? Heart : t === "consejeria" ? MessageSquare : Bookmark;
  const toneFor = (t: string) =>
    t === "asistencia" ? "text-success bg-success/10" : t === "finanza" ? "text-primary bg-primary/10" :
    t === "donacion" ? "text-accent bg-accent/10" : t === "proceso" ? "text-info bg-info/10" :
    t === "peticion" ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted";

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="min-w-0">
        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap mb-4 sticky top-14 z-10 bg-background/85 backdrop-blur -mx-2 px-2 py-2">
          {chips.map(c => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                filter === c.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              )}
            >
              <c.icon className="h-3.5 w-3.5" /> {c.label}
              <span className={cn("text-xs px-1.5 rounded-full", filter === c.id ? "bg-primary-foreground/20" : "bg-muted")}>{c.count}</span>
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={onExportCSV}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
            <Button variant="outline" size="sm" onClick={onExportPDF}><FileText className="h-3.5 w-3.5 mr-1" /> PDF</Button>
          </div>
        </div>

        {/* Feed */}
        {Object.keys(grouped).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center">
            <Activity className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Sin eventos con este filtro</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([month, evs]) => (
              <div key={month}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{month}</p>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-3">
                  {evs.map((e, i) => {
                    const Icon = iconFor(e.type);
                    return (
                      <motion.article
                        key={e.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                        className="group rounded-2xl border border-border/60 bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all"
                      >
                        <div className="flex gap-3">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", toneFor(e.type))}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-foreground leading-snug">{e.title}</p>
                              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                {e.date ? format(new Date(e.date), "d MMM", { locale: es }) : ""}
                              </span>
                            </div>
                            {e.description && <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-3">{e.description}</p>}
                            {e.meta && (
                              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                {e.meta.split(" · ").filter(Boolean).map((m, j) => (
                                  <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{m}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right rail: stats + auditoría */}
      <aside className="space-y-4 lg:sticky lg:top-20 h-fit">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Resumen</p>
          <div className="space-y-3">
            {chips.slice(1).map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground"><c.icon className="h-3.5 w-3.5" /> {c.label}</span>
                <span className="font-bold">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {canSeeAudit && (
          <div className="rounded-2xl border border-border/60 bg-card">
            <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => setShowAudit(v => !v)}>
              <span className="flex items-center gap-2 text-sm font-semibold"><Shield className="h-4 w-4 text-primary" /> Auditoría</span>
              <Badge variant="outline" className="text-xs">{auditoria.length}</Badge>
            </button>
            {showAudit && (
              <div className="border-t border-border/50 p-4 max-h-96 overflow-y-auto">
                {auditoriaLoading ? <Skeleton className="h-20" /> : auditoria.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Sin registros</p>
                ) : (
                  <div className="space-y-2">
                    {auditoria.map((row: any) => (
                      <div key={row.id} className="text-xs border-l-2 border-primary/40 pl-2">
                        <p className="font-semibold text-foreground">{row.operation}</p>
                        <p className="text-muted-foreground">{row.actor_email || "Sistema"}</p>
                        <p className="text-xs text-muted-foreground">{row.created_at ? format(parseISO(row.created_at), "d MMM · HH:mm", { locale: es }) : ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

/* ==========================================================
   TAB · DISCIPULADO — Roadmap vertical con nodos conectados
========================================================== */
function DiscipuladoRoadmap({ procesos, procesosMap, progressPercent, completedCount, totalProcesos, onToggle, onOpenDetail, onSetDate }: {
  procesos: any[]; procesosMap: Map<string, any>; progressPercent: number; completedCount: number; totalProcesos: number;
  onToggle: (id: string, estado: string) => void;
  onOpenDetail: (id: string, nombre: string) => void;
  onSetDate: (procesoId: string, date: Date, estado: string, obs: string | null) => void;
}) {
  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
      {/* Left: overall progress + legend */}
      <aside className="space-y-4 lg:sticky lg:top-20 h-fit">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 p-6 text-center">
          <div className="relative w-32 h-32 mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(progressPercent / 100) * 264} 264`} className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-foreground">{progressPercent}%</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Completado</p>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold">{completedCount} de {totalProcesos} hitos</p>
          <p className="text-xs text-muted-foreground mt-1">Ruta de crecimiento espiritual</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Leyenda</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-success" /> Finalizado</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary" /> En curso</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-muted border border-border" /> Pendiente</div>
          </div>
        </div>
      </aside>

      {/* Right: vertical roadmap */}
      <div className="relative">
        <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary/40 to-muted rounded-full" />
        <div className="space-y-3">
          {procesos.map((p: any, idx: number) => {
            const pp = procesosMap.get(p.id);
            const estado = pp?.estado || "No Realizado";
            const norm = estado.toLowerCase().trim();
            const done = norm === "realizado" || norm === "finalizado";
            const doing = norm === "en curso";
            const nodeColor = done ? "bg-success text-success-foreground ring-success/30" : doing ? "bg-primary text-primary-foreground ring-primary/30 animate-pulse" : "bg-card text-muted-foreground ring-border";
            return (
              <motion.div key={p.id}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                className="relative pl-16"
              >
                <div className={cn("absolute left-3 top-3 w-6 h-6 rounded-full flex items-center justify-center border-2 border-card ring-4 z-10", nodeColor)}>
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                </div>
                <div className={cn(
                  "rounded-2xl border p-4 transition-all",
                  done ? "border-success/30 bg-success/5" :
                  doing ? "border-primary/40 bg-primary/5 shadow-md" :
                  "border-border/60 bg-card hover:border-primary/30"
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{p.nombre}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        {pp?.fecha_completado ? (
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(parseISO(pp.fecha_completado), "dd MMM yyyy", { locale: es })}</span>
                        ) : <span>Sin fecha registrada</span>}
                        {(pp as any)?.observacion && <span className="text-primary font-medium">· Con notas</span>}
                      </div>
                      {(pp as any)?.observacion && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-muted/60 border border-border/50 text-xs text-foreground/90 whitespace-pre-wrap">
                          <span className="font-semibold text-primary block mb-0.5">Información / Notas:</span>
                          {(pp as any).observacion}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant={done ? "outline" : doing ? "default" : "secondary"} className="h-7 text-xs" onClick={() => onToggle(p.id, estado)}>
                        {done ? "Finalizado" : doing ? "En curso" : "Iniciar"}
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild><Button size="icon" variant="ghost" className="h-11 w-11" aria-label="Elegir fecha"><Calendar className="h-5 w-5" /></Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <CalendarComponent mode="single" selected={pp?.fecha_completado ? parseISO(pp.fecha_completado) : undefined}
                            onSelect={(d) => d && onSetDate(p.id, d, estado, (pp as any)?.observacion || null)} locale={es} />
                        </PopoverContent>
                      </Popover>
                      <Button size="icon" variant="ghost" className="h-11 w-11" aria-label={`Editar ${p.nombre}`} onClick={() => onOpenDetail(p.id, p.nombre)}><Pencil className="h-5 w-5" /></Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================
   TAB · GRUPOS — Tarjetas visuales con portada
========================================================== */
function GruposGallery({ grupos }: { grupos: any[] }) {
  if (!grupos.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center">
        <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Sin grupos asignados</p>
      </div>
    );
  }
  const gradients = [
    "from-primary/40 via-primary/20 to-accent/30",
    "from-accent/40 via-accent/20 to-primary/30",
    "from-info/40 via-info/20 to-primary/30",
    "from-success/40 via-success/20 to-info/30",
    "from-primary/30 via-accent/20 to-success/20",
  ];
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {grupos.map((gm: any, i: number) => (
        <motion.div key={gm.id}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <div className={cn("relative h-24 bg-gradient-to-br", gradients[i % gradients.length])}>
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <Badge variant="outline" className="absolute top-3 right-3 bg-background/80 backdrop-blur text-xs capitalize">
              {gm.rol || "asistente"}
            </Badge>
          </div>
          <div className="px-5 pb-5 -mt-8 relative">
            <div className="w-14 h-14 rounded-2xl bg-card border-4 border-card shadow-md flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <p className="text-base font-bold text-foreground mt-3 truncate">{gm.grupos?.nombre || "—"}</p>
            <p className="text-xs text-muted-foreground truncate">{gm.grupos?.tipo || "—"}{gm.grupos?.red ? ` · ${gm.grupos.red}` : ""}</p>
            <div className="mt-3 flex items-center gap-2 pt-3 border-t border-border/50 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Church className="h-3 w-3" /> Grupo activo</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ==========================================================
   TAB · FINANZAS — Panel bancario
========================================================== */
function FinanzasBankPanel({ finanzas, donaciones, totalAportes, totalDonaciones, totalContribuido }: {
  finanzas: any[]; donaciones: any[]; totalAportes: number; totalDonaciones: number; totalContribuido: number;
}) {
  const monthly = useMemo(() => {
    const map: Record<string, { mes: string; aportes: number; donaciones: number }> = {};
    const add = (fecha: string, monto: number, key: "aportes" | "donaciones") => {
      if (!fecha) return;
      const d = new Date(fecha);
      const k = format(d, "MMM yy", { locale: es });
      if (!map[k]) map[k] = { mes: k, aportes: 0, donaciones: 0 };
      map[k][key] += Number(monto || 0);
    };
    finanzas.filter(f => f.tipo === "Ingreso").forEach(f => add(f.fecha, f.monto, "aportes"));
    donaciones.forEach(d => add(d.fecha, d.monto, "donaciones"));
    return Object.values(map).slice(-12);
  }, [finanzas, donaciones]);

  const methodBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    [...finanzas.filter(f => f.tipo === "Ingreso"), ...donaciones].forEach((r: any) => {
      const k = r.metodo_pago || "Otro";
      map[k] = (map[k] || 0) + Number(r.monto || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [finanzas, donaciones]);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--muted-foreground))"];

  const combined = useMemo(() => [
    ...finanzas.map((f: any) => ({ ...f, _kind: "finanza" })),
    ...donaciones.map((d: any) => ({ ...d, _kind: "donacion" })),
  ].sort((a: any, b: any) => (b.fecha || "").localeCompare(a.fecha || "")), [finanzas, donaciones]);

  return (
    <div className="space-y-6">
      {/* Balance hero */}
      <div className="rounded-3xl overflow-hidden border border-border/60 bg-gradient-to-br from-primary via-primary/90 to-accent text-primary-foreground p-6 md:p-8 shadow-lg relative">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 2px, transparent 2px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)", backgroundSize: "48px 48px, 32px 32px" }} />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Contribución total</p>
            <p className="text-4xl md:text-5xl font-bold mt-2 tracking-tight">${totalContribuido.toLocaleString()}</p>
            <p className="text-sm opacity-80 mt-1">{finanzas.length + donaciones.length} movimientos registrados</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-primary-foreground/10 backdrop-blur px-4 py-3 border border-primary-foreground/20">
              <p className="text-xs uppercase tracking-wider opacity-80 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" /> Aportes</p>
              <p className="text-xl font-bold mt-1">${totalAportes.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/10 backdrop-blur px-4 py-3 border border-primary-foreground/20">
              <p className="text-xs uppercase tracking-wider opacity-80 flex items-center gap-1"><Gift className="h-3 w-3" /> Donaciones</p>
              <p className="text-xl font-bold mt-1">${totalDonaciones.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold">Evolución mensual</p>
              <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
            </div>
          </div>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0) + "k" : v}`} />
                <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                <Bar dataKey="aportes" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="donaciones" stackId="a" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">Sin datos suficientes</div>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <p className="text-sm font-semibold mb-1">Método de pago</p>
          <p className="text-xs text-muted-foreground mb-3">Distribución total</p>
          {methodBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={methodBreakdown} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {methodBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RTooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {methodBreakdown.map((m, i) => (
                  <div key={m.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 truncate"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{m.name}</span>
                    <span className="font-semibold">${m.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
          )}
        </div>
      </div>

      {/* Bank-style transactions */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Movimientos</p></div>
          <Badge variant="outline" className="text-xs">{combined.length} total</Badge>
        </div>
        {combined.length > 0 ? (
          <div className="divide-y divide-border/50">
            {combined.slice(0, 30).map((row: any) => {
              const positive = row._kind === "donacion" || row.tipo === "Ingreso";
              return (
                <div key={`${row._kind}-${row.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      row._kind === "donacion" ? "bg-accent/10 text-accent" : positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                      {row._kind === "donacion" ? <Gift className="h-4 w-4" /> : positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {row._kind === "donacion" ? `Donación${row.tipo ? " · " + row.tipo : ""}` : (row.categoria_nombre || row.descripcion || row.tipo || "Movimiento")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {row.fecha ? format(parseISO(row.fecha), "dd MMM yyyy", { locale: es }) : "—"}
                        {row.metodo_pago ? ` · ${row.metodo_pago}` : ""}
                        {row.estado ? ` · ${row.estado}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={cn("text-sm font-bold tabular-nums whitespace-nowrap", positive ? "text-success" : "text-destructive")}>
                    {positive ? "+" : "-"}${Number(row.monto).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <DollarSign className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Sin movimientos financieros</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==========================================================
   TAB · FAMILIA — Tarjetas de relaciones agrupadas
========================================================== */
function FamiliaCards({
  relaciones, personaNombre, showAdd, setShowAdd, selectedParentesco, setSelectedParentesco,
  familiarSearch, setFamiliarSearch, manualName, setManualName, todasPersonas, currentId,
  onLinkExisting, onAddManual, onDelete, navigate, createPending,
}: any) {
  const groups = useMemo(() => {
    const g: Record<string, any[]> = { Cónyuge: [], Hijos: [], Padres: [], Hermanos: [], Otros: [] };
    (relaciones as any[]).forEach(r => {
      const p = r.parentesco || "Otro";
      if (p === "Cónyuge") g["Cónyuge"].push(r);
      else if (p.startsWith("Hijo")) g["Hijos"].push(r);
      else if (p === "Padre" || p === "Madre") g["Padres"].push(r);
      else if (p.startsWith("Hermano")) g["Hermanos"].push(r);
      else g["Otros"].push(r);
    });
    return g;
  }, [relaciones]);

  const groupIcon: Record<string, any> = { Cónyuge: Heart, Hijos: Baby, Padres: User, Hermanos: Users, Otros: HeartHandshake };

  const RelCard = ({ rel, featured = false }: { rel: any; featured?: boolean }) => {
    const fam = rel.familiar;
    const nombre = fam ? `${fam.nombres} ${fam.apellidos}` : rel.familiar_nombre || "—";
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "group relative rounded-2xl border p-4 hover:shadow-md transition-all bg-card",
          featured ? "border-destructive/30 bg-gradient-to-br from-destructive/5 to-transparent" : "border-border/60"
        )}
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar className={cn("border-4 border-card shadow", featured ? "h-20 w-20" : "h-16 w-16")}>
              <AvatarImage src={fam?.foto_url} />
              <AvatarFallback className={cn("bg-primary/10 text-primary font-bold", featured ? "text-lg" : "text-sm")}>
                {nombre.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>
            {featured && <div className="absolute -bottom-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1"><Heart className="h-3 w-3" /></div>}
          </div>
          <p className={cn("font-semibold text-foreground mt-3 truncate max-w-full", featured ? "text-base" : "text-sm")}>{nombre}</p>
          <Badge variant="outline" className="mt-1 text-xs">{rel.parentesco}</Badge>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {fam && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(`/personas/${fam.id}`)}>Ver perfil</Button>}
          <Button size="icon" variant="ghost" className="h-11 w-11 text-destructive/70 hover:text-destructive focus-visible:ring-2 focus-visible:ring-destructive" onClick={() => onDelete(rel.id)} aria-label="Eliminar relación">
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header + Add */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-destructive/20 to-primary/20 flex items-center justify-center">
            <HeartHandshake className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-base font-bold">Círculo familiar</p>
            <p className="text-xs text-muted-foreground">{relaciones.length} relaciones registradas para {personaNombre}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1.5"><UserPlus className="h-3.5 w-3.5" /> Agregar familiar</Button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
          <p className="text-sm font-semibold">Nuevo familiar</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Parentesco</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={selectedParentesco} onChange={(e: any) => setSelectedParentesco(e.target.value)}>
                {["Cónyuge", "Hijo/a", "Padre", "Madre", "Hermano/a", "Abuelo/a", "Tío/a", "Sobrino/a", "Primo/a", "Otro"].map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Buscar persona registrada</label>
              <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" placeholder="Escriba nombre..." value={familiarSearch} onChange={(e: any) => setFamiliarSearch(e.target.value)} />
            </div>
          </div>
          {familiarSearch.length >= 2 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {todasPersonas.filter((p: any) => p.id !== currentId && `${p.nombres} ${p.apellidos}`.toLowerCase().includes(familiarSearch.toLowerCase())).slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer" onClick={() => onLinkExisting(p.id)}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{p.nombres?.[0]}{p.apellidos?.[0]}</AvatarFallback></Avatar>
                    <span className="text-sm">{p.nombres} {p.apellidos}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{p.tipo_persona}</Badge>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-border/50 pt-3">
            <label className="text-xs text-muted-foreground">O escribir nombre manual</label>
            <div className="flex gap-2 mt-1">
              <input className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" placeholder="Nombre completo" value={manualName} onChange={(e: any) => setManualName(e.target.value)} />
              <Button size="sm" disabled={!manualName.trim() || createPending} onClick={onAddManual}>Agregar</Button>
            </div>
          </div>
        </div>
      )}

      {relaciones.length === 0 && !showAdd ? (
        <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center">
          <HeartHandshake className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Sin relaciones familiares registradas</p>
          <Button variant="link" size="sm" onClick={() => setShowAdd(true)}>Agregar familiar</Button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([groupName, items]) => {
            const arr = items as any[];
            if (arr.length === 0) return null;
            const Icon = groupIcon[groupName];
            const featured = groupName === "Cónyuge";
            return (
              <div key={groupName}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{groupName}</p>
                  <span className="text-xs text-muted-foreground">· {arr.length}</span>
                  <div className="flex-1 h-px bg-border ml-2" />
                </div>
                <div className={cn("grid gap-3", featured ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5")}>
                  {arr.map(rel => <RelCard key={rel.id} rel={rel} featured={featured} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ==========================================================
   TAB · CERTIFICADOS
========================================================== */
function CertificadosPanel({ personaNombre, onGenerar, onExportPDF, onExportCSV }: {
  personaNombre: string; onGenerar: () => void; onExportPDF: () => void; onExportCSV: () => void;
}) {
  const tipos = [
    { icon: BadgeCheck, label: "Membresía", desc: "Constancia oficial de membresía activa", tone: "text-primary bg-primary/10" },
    { icon: Church, label: "Bautismo", desc: "Certifica la fecha y ministro del bautismo", tone: "text-info bg-info/10" },
    { icon: Heart, label: "Matrimonio", desc: "Constancia de ceremonia religiosa", tone: "text-destructive bg-destructive/10" },
    { icon: GraduationCap, label: "Discipulado", desc: "Reconocimiento por proceso completado", tone: "text-success bg-success/10" },
  ];
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0 L40 20 L20 40 L0 20 Z' fill='none' stroke='%23000' stroke-width='0.5'/%3E%3C/svg%3E\")" }} />
        <div className="relative">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Award className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold mt-4">Emite certificados para {personaNombre}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Genera constancias oficiales listas para imprimir. Cada emisión queda firmada en la bitácora de auditoría.
          </p>
          <Button className="mt-5 gap-1.5 rounded-full" size="lg" onClick={onGenerar}>
            <Award className="h-4 w-4" /> Ir al módulo de certificados
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {tipos.map(t => (
          <button key={t.label} onClick={onGenerar} className="text-left rounded-2xl border border-border/60 bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", t.tone)}><t.icon className="h-5 w-5" /></div>
            <p className="text-sm font-bold mt-3">{t.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
            <div className="mt-3 text-xs text-primary flex items-center gap-1">Generar <ChevronRight className="h-3 w-3" /></div>
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Exportar ficha completa</p></div>
          <p className="text-xs text-muted-foreground mb-3">PDF con datos, progreso y línea de tiempo.</p>
          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={onExportPDF}><Download className="h-3.5 w-3.5" /> Descargar PDF</Button>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 mb-2"><Download className="h-4 w-4 text-accent" /><p className="text-sm font-semibold">Exportar historial</p></div>
          <p className="text-xs text-muted-foreground mb-3">CSV con todos los eventos registrados.</p>
          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={onExportCSV}><Download className="h-3.5 w-3.5" /> Descargar CSV</Button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================
   TAB · QR — Hero destacado + acciones
========================================================== */
function QrHero({ personaNombre, qrCode, servicios, qrCheckinServicio, setQrCheckinServicio, onOpenManual }: {
  personaNombre: string; qrCode: string; servicios: any[]; qrCheckinServicio: string;
  setQrCheckinServicio: (v: string) => void; onOpenManual: () => void;
}) {
  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* QR display */}
      <div className="lg:col-span-2">
        <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-8 flex flex-col items-center text-center shadow-sm">
          {qrCode ? (
            <>
              <div className="p-6 bg-white rounded-3xl shadow-lg ring-1 ring-border">
                <QRCodeSVG value={qrCode} size={220} level="M" />
              </div>
              <p className="text-lg font-bold mt-5">{personaNombre}</p>
              <p className="text-xs text-muted-foreground mt-1">Identificador único de asistencia</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { navigator.clipboard.writeText(qrCode); toast.success("Código copiado"); }}>
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                  const svg = document.querySelector<HTMLElement>(".persona-qr-print"); // placeholder
                  window.print();
                }}>
                  <FileText className="h-3.5 w-3.5" /> Imprimir
                </Button>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-4 break-all max-w-full">{qrCode}</p>
            </>
          ) : (
            <div className="py-12">
              <QrCode className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mt-2">Sin código QR asignado</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="lg:col-span-3 space-y-4">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-2">
            <Zap className="h-3.5 w-3.5" /> Check-in rápido
          </div>
          <h3 className="text-lg font-bold">Registra la asistencia en segundos</h3>
          <p className="text-sm text-muted-foreground mt-1">Selecciona un servicio y valida con el código QR o la cámara.</p>

          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Servicio</label>
              <Select value={qrCheckinServicio} onValueChange={setQrCheckinServicio}>
                <SelectTrigger className="h-11 bg-background"><SelectValue placeholder="Elige un servicio" /></SelectTrigger>
                <SelectContent>
                  {servicios.slice(0, 30).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}{s.fecha ? " · " + s.fecha : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <Button size="lg" className="h-14 gap-2 justify-start" disabled={!qrCheckinServicio || !qrCode} onClick={onOpenManual}>
                <div className="w-9 h-9 rounded-lg bg-primary-foreground/20 flex items-center justify-center"><QrCode className="h-4 w-4" /></div>
                <div className="text-left">
                  <p className="text-sm font-bold">Check-in manual</p>
                  <p className="text-xs opacity-80 font-normal">Confirmar sin escanear</p>
                </div>
              </Button>
              <PersonaQrCameraCheckin
                expectedCode={qrCode}
                personaNombre={personaNombre}
                onMatch={() => { if (!qrCheckinServicio) { toast.error("Selecciona primero un servicio"); return; } onOpenManual(); }}
              />
            </div>

            {!qrCode && <p className="text-xs text-destructive">Esta persona no tiene QR generado aún.</p>}
            {!qrCheckinServicio && qrCode && <p className="text-xs text-muted-foreground">Selecciona un servicio para habilitar el check-in.</p>}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { icon: Shield, label: "Auditado", desc: "Cada check-in queda firmado" },
            { icon: Zap, label: "Instantáneo", desc: "Registro en menos de 2 segundos" },
            { icon: Share2, label: "Compartible", desc: "Copia o imprime el código" },
          ].map(f => (
            <div key={f.label} className="rounded-2xl border border-border/60 bg-card p-4">
              <f.icon className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold mt-2">{f.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
