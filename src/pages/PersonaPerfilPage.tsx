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
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";

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

  const completedCount = personaProcesos?.filter((pp) => pp.estado === "Realizado").length || 0;
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
      { personaId: persona.id, procesoId: procesoDialog.procesoId, estado: procesoEstado,
        fecha_completado: procesoFecha ? format(procesoFecha, "yyyy-MM-dd") : null, observacion: procesoObservacion || null },
      { onSuccess: () => { toast.success("Proceso actualizado"); setProcesoDialog(null); }, onError: () => toast.error("Error al actualizar") }
    );
  };
  const handleToggleEstado = (procesoId: string, currentEstado: string) => {
    const next = currentEstado === "No Realizado" ? "En Curso" : currentEstado === "En Curso" ? "Realizado" : "No Realizado";
    updateProceso.mutate(
      { personaId: persona.id, procesoId, estado: next, fecha_completado: next === "Realizado" ? format(new Date(), "yyyy-MM-dd") : null },
      { onError: () => toast.error("Error al actualizar") }
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
              className="h-9 w-9 bg-background/20 backdrop-blur-md text-primary-foreground hover:bg-background/30 border border-white/20"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              title="Cambiar portada"
            >
              <Camera className="h-4 w-4" />
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
              <Button size="sm" className="gap-1.5 rounded-full shadow-sm" onClick={openRegistrarAsistencia}>
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

      {/* ============ TABS + SIDEBAR ============ */}
      <Tabs defaultValue="resumen" className="space-y-6">
        <div className="sticky top-0 z-10 -mx-2 px-2 bg-background/80 backdrop-blur border-b border-border/60">
          <TabsList className="h-auto p-0 bg-transparent gap-1 overflow-x-auto flex-nowrap w-full justify-start rounded-none">
            {[
              { v: "resumen", label: "Resumen", icon: User },
              { v: "actividad", label: "Actividad", icon: Activity },
              { v: "discipulado", label: "Discipulado", icon: Heart },
              { v: "grupos", label: "Grupos", icon: Users },
              { v: "finanzas", label: "Finanzas", icon: DollarSign },
              { v: "familia", label: "Familia", icon: HeartHandshake },
              { v: "certificados", label: "Certificados", icon: Award },
              { v: "qr", label: "QR", icon: QrCode },
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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ================= MAIN COLUMN ================= */}
          <div className="lg:col-span-2 space-y-6">

            {/* ---- RESUMEN ---- */}
            <TabsContent value="resumen" className="space-y-6 mt-0">
              <SectionCard icon={<User className="h-4 w-4" />} title="Acerca de">
                {persona.observaciones ? (
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{persona.observaciones}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sin biografía registrada. Añade una nota pastoral desde "Editar perfil".</p>
                )}
                {persona.ocupacion && (
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Ocupación:</span>
                    <span className="font-medium text-foreground">{persona.ocupacion}</span>
                  </div>
                )}
              </SectionCard>

              <SectionCard
                icon={<Activity className="h-4 w-4" />}
                title="Actividad reciente"
                right={<Button variant="link" size="sm" onClick={() => document.querySelector<HTMLElement>('[data-state="inactive"][value="actividad"]')?.click()}>Ver toda →</Button>}
              >
                <PersonaActivityTimeline events={timeline.slice(0, 8)} />
              </SectionCard>

              <SectionCard icon={<Users className="h-4 w-4" />} title={`Grupos (${grupoMiembros?.length || 0})`}>
                {grupoMiembros && grupoMiembros.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {grupoMiembros.map((gm: any) => (
                      <div key={gm.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{gm.grupos?.nombre}</p>
                          <p className="text-xs text-muted-foreground truncate">{gm.grupos?.tipo || "—"} · {gm.rol || "asistente"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState icon={<Users className="h-8 w-8" />} text="Sin grupos asignados" />}
              </SectionCard>
            </TabsContent>

            {/* ---- ACTIVIDAD ---- */}
            <TabsContent value="actividad" className="space-y-6 mt-0">
              <SectionCard
                icon={<Activity className="h-4 w-4" />}
                title={`Línea de tiempo · ${timeline.length} eventos`}
                right={
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="h-3.5 w-3.5 mr-1.5" /> CSV</Button>
                    <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="h-3.5 w-3.5 mr-1.5" /> PDF</Button>
                  </div>
                }
              >
                <PersonaActivityTimeline events={timeline} />
              </SectionCard>

              {canSeeAudit && (
                <SectionCard
                  icon={<Shield className="h-4 w-4" />}
                  title="Auditoría de acciones"
                  right={<Badge variant="outline" className="text-xs">{auditoriaPersona?.length || 0} eventos</Badge>}
                >
                  {auditoriaLoading ? (
                    <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
                  ) : (auditoriaPersona && auditoriaPersona.length > 0) ? (
                    <div className="divide-y divide-border/50">
                      {auditoriaPersona.map((row: any) => {
                        const op = String(row.operation || "").toUpperCase();
                        const badgeClass =
                          op === "CHECKIN" ? "bg-success/10 text-success border-success/30" :
                          op === "ATTENDANCE_MARK" ? "bg-primary/10 text-primary border-primary/30" :
                          op.startsWith("EXPORT") ? "bg-info/10 text-info border-info/30" :
                          op === "CERTIFICATE_ISSUED" ? "bg-accent/10 text-accent border-accent/30" :
                          "bg-muted text-muted-foreground";
                        const label = op === "CHECKIN" ? "Check-in QR" : op === "ATTENDANCE_MARK" ? "Asistencia" : op === "EXPORT_FICHA" ? "Exportó ficha" : op === "EXPORT_HISTORIAL" ? "Exportó historial" : op === "CERTIFICATE_ISSUED" ? "Certificado" : op;
                        const detalle = row.changed ? Object.entries(row.changed as any).filter(([k]) => k !== "persona_id").map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ") : "";
                        return (
                          <div key={row.id} className="flex items-start justify-between gap-3 py-2.5">
                            <div className="flex items-start gap-3 min-w-0">
                              <Badge variant="outline" className={cn("shrink-0 text-[10px] uppercase", badgeClass)}>{label}</Badge>
                              <div className="min-w-0">
                                <p className="text-xs text-foreground truncate">{row.actor_email || "Sistema"}</p>
                                {detalle && <p className="text-[11px] text-muted-foreground truncate">{detalle}</p>}
                              </div>
                            </div>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                              {row.created_at ? format(parseISO(row.created_at), "d MMM · HH:mm", { locale: es }) : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : <EmptyState icon={<Shield className="h-8 w-8" />} text="Sin acciones auditadas" />}
                </SectionCard>
              )}
            </TabsContent>

            {/* ---- DISCIPULADO ---- */}
            <TabsContent value="discipulado" className="space-y-6 mt-0">
              <SectionCard
                icon={<Heart className="h-4 w-4" />}
                title="Procesos de crecimiento espiritual"
                right={<Badge variant="outline" className="gap-1"><GraduationCap className="h-3 w-3" /> {completedCount}/{totalProcesos}</Badge>}
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Progreso general de discipulado</span>
                    <span className="font-semibold text-foreground">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
                <div className="divide-y divide-border/50 -mx-2">
                  {(procesos || []).map((p: any) => {
                    const pp = procesosMap.get(p.id);
                    const estado = pp?.estado || "No Realizado";
                    const estadoNorm = estado.toLowerCase().trim();
                    const displayEstado = (estadoNorm === "realizado" || estadoNorm === "finalizado") ? "Finalizado" : estadoNorm === "en curso" ? "En Curso" : "Pendiente";
                    const badgeClass = (estadoNorm === "realizado" || estadoNorm === "finalizado") ? "bg-success/15 text-success border-success/30"
                      : estadoNorm === "en curso" ? "bg-primary/15 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border";
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-2 py-2.5">
                        <p className="flex-1 text-sm font-medium">{p.nombre}</p>
                        <Badge variant="outline" className={cn("cursor-pointer select-none min-w-[100px] justify-center", badgeClass)} onClick={() => handleToggleEstado(p.id, estado)}>
                          {displayEstado}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openProcesoDialog(p.id, p.nombre)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><Calendar className="h-4 w-4" /></Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <CalendarComponent mode="single" selected={pp?.fecha_completado ? parseISO(pp.fecha_completado) : undefined}
                              onSelect={(date) => { if (date) updateProceso.mutate({ personaId: persona.id, procesoId: p.id, estado: estado === "No Realizado" ? "En Curso" : estado, fecha_completado: format(date, "yyyy-MM-dd"), observacion: (pp as any)?.observacion || null }); }}
                              locale={es} />
                          </PopoverContent>
                        </Popover>
                        <span className="text-xs text-muted-foreground w-[80px] text-right">
                          {pp?.fecha_completado ? format(parseISO(pp.fecha_completado), "dd/MM/yy") : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard icon={<Clock className="h-4 w-4" />} title={`Historial de asistencia (${totalAsistencias})`}>
                {totalAsistencias > 0 ? (
                  <div className="space-y-1.5">
                    {(asistencias || []).slice(0, 15).map((a: any) => (
                      <div key={a.id} className={cn("flex items-center justify-between p-3 rounded-lg border", a.presente ? "bg-success/5 border-success/15" : "bg-destructive/5 border-destructive/15")}>
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", a.presente ? "bg-success/20" : "bg-destructive/20")}>
                            {a.presente ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{a.servicios?.nombre || "Servicio"}</p>
                            <p className="text-xs text-muted-foreground">
                              {a.servicios?.fecha ? format(parseISO(a.servicios.fecha), "dd MMM yyyy", { locale: es }) : ""}
                              {a.servicios?.tipo ? ` · ${a.servicios.tipo}` : ""}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn(a.presente ? "border-success/30 text-success" : "border-destructive/30 text-destructive")}>
                          {a.presente ? "Presente" : "Ausente"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState icon={<Clock className="h-8 w-8" />} text="Sin registros de asistencia" />}
              </SectionCard>
            </TabsContent>

            {/* ---- GRUPOS ---- */}
            <TabsContent value="grupos" className="space-y-6 mt-0">
              <SectionCard icon={<Users className="h-4 w-4" />} title={`Grupos (${grupoMiembros?.length || 0})`}>
                {grupoMiembros && grupoMiembros.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {grupoMiembros.map((gm: any) => (
                      <div key={gm.id} className="p-4 rounded-xl border border-border/60 bg-gradient-to-br from-muted/30 to-transparent hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{gm.grupos?.nombre}</p>
                            <p className="text-xs text-muted-foreground truncate">{gm.grupos?.tipo || "—"}</p>
                          </div>
                          <Badge variant="outline" className="text-xs capitalize">{gm.rol || "asistente"}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState icon={<Users className="h-8 w-8" />} text="Sin grupos asignados" />}
              </SectionCard>
            </TabsContent>

            {/* ---- FINANZAS ---- */}
            <TabsContent value="finanzas" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MiniKpi label="Aportes" value={`$${totalAportesIngreso.toLocaleString()}`} sub={`${(finanzasP || []).length} movimientos`} tone="primary" />
                <MiniKpi label="Donaciones" value={`$${totalDonaciones.toLocaleString()}`} sub={`${(donacionesP || []).length} donaciones`} tone="accent" />
                <MiniKpi label="Total contribuido" value={`$${totalContribuido.toLocaleString()}`} sub="Ingresos + donaciones" tone="success" />
              </div>
              <SectionCard icon={<DollarSign className="h-4 w-4" />} title="Movimientos y donaciones">
                {(finanzasP && finanzasP.length > 0) || (donacionesP && donacionesP.length > 0) ? (
                  <div className="divide-y divide-border/50">
                    {[...(finanzasP || []).map((f: any) => ({ ...f, _kind: "finanza" })), ...(donacionesP || []).map((d: any) => ({ ...d, _kind: "donacion" }))]
                      .sort((a: any, b: any) => (b.fecha || "").localeCompare(a.fecha || ""))
                      .map((row: any) => (
                        <div key={`${row._kind}-${row.id}`} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                              row._kind === "donacion" ? "bg-accent/10 text-accent" : row.tipo === "Ingreso" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                              {row._kind === "donacion" ? <Heart className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
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
                          <span className={cn("text-sm font-bold whitespace-nowrap", row._kind === "donacion" || row.tipo === "Ingreso" ? "text-success" : "text-destructive")}>
                            {row._kind === "donacion" || row.tipo === "Ingreso" ? "+" : "-"}${Number(row.monto).toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : <EmptyState icon={<DollarSign className="h-8 w-8" />} text="Sin movimientos financieros" />}
              </SectionCard>
            </TabsContent>

            {/* ---- FAMILIA ---- */}
            <TabsContent value="familia" className="space-y-6 mt-0">
              <SectionCard
                icon={<HeartHandshake className="h-4 w-4" />}
                title="Relaciones familiares"
                right={<Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAddFamiliar(!showAddFamiliar)}><UserPlus className="h-3.5 w-3.5" /> Agregar</Button>}
              >
                {showAddFamiliar && (
                  <div className="border rounded-xl p-4 bg-muted/30 space-y-3 mb-4">
                    <p className="text-sm font-medium">Nuevo familiar</p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Parentesco</label>
                        <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={selectedParentesco} onChange={(e) => setSelectedParentesco(e.target.value)}>
                          {["Cónyuge", "Hijo/a", "Padre", "Madre", "Hermano/a", "Abuelo/a", "Tío/a", "Sobrino/a", "Primo/a", "Otro"].map((p) => (<option key={p} value={p}>{p}</option>))}
                        </select>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs text-muted-foreground">Buscar persona registrada</label>
                        <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" placeholder="Escriba nombre..." value={familiarSearch} onChange={(e) => setFamiliarSearch(e.target.value)} />
                      </div>
                    </div>
                    {familiarSearch.length >= 2 && (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {(todasPersonas || []).filter((p) => p.id !== id && `${p.nombres} ${p.apellidos}`.toLowerCase().includes(familiarSearch.toLowerCase())).slice(0, 5).map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                            onClick={() => { createRelacion.mutate({ persona_id: persona.id, familiar_id: p.id, parentesco: selectedParentesco }, { onSuccess: () => { setFamiliarSearch(""); setShowAddFamiliar(false); } }); }}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{p.nombres?.[0]}{p.apellidos?.[0]}</AvatarFallback></Avatar>
                              <span className="text-sm">{p.nombres} {p.apellidos}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">{p.tipo_persona}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border-t pt-3">
                      <label className="text-xs text-muted-foreground">O escribir nombre manual</label>
                      <div className="flex gap-2 mt-1">
                        <input className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" placeholder="Nombre completo" value={manualName} onChange={(e) => setManualName(e.target.value)} />
                        <Button size="sm" disabled={!manualName.trim() || createRelacion.isPending}
                          onClick={() => { createRelacion.mutate({ persona_id: persona.id, familiar_nombre: manualName.trim(), parentesco: selectedParentesco }, { onSuccess: () => { setManualName(""); setShowAddFamiliar(false); } }); }}>
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {relaciones && relaciones.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {relaciones.map((rel: any) => {
                      const fam = rel.familiar;
                      const nombre = fam ? `${fam.nombres} ${fam.apellidos}` : rel.familiar_nombre || "—";
                      const parentescoIcon = rel.parentesco === "Cónyuge" ? <Heart className="h-4 w-4 text-destructive" />
                        : rel.parentesco?.includes("Hijo") ? <Baby className="h-4 w-4 text-primary" />
                        : <User className="h-4 w-4 text-muted-foreground" />;
                      return (
                        <div key={rel.id} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                              {fam?.foto_url ? <Avatar className="h-10 w-10"><AvatarImage src={fam.foto_url} /><AvatarFallback>{nombre[0]}</AvatarFallback></Avatar> : parentescoIcon}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{nombre}</p>
                              <p className="text-xs text-muted-foreground">{rel.parentesco}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {fam && <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate(`/personas/${fam.id}`)}>Ver</Button>}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => deleteRelacion.mutate({ id: rel.id, personaId: persona.id })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : !showAddFamiliar ? (
                  <EmptyState icon={<HeartHandshake className="h-8 w-8" />} text="Sin relaciones familiares" action={<Button variant="link" size="sm" onClick={() => setShowAddFamiliar(true)}>Agregar familiar</Button>} />
                ) : null}
              </SectionCard>
            </TabsContent>

            {/* ---- CERTIFICADOS ---- */}
            <TabsContent value="certificados" className="space-y-6 mt-0">
              <SectionCard icon={<Award className="h-4 w-4" />} title="Certificados">
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                    <Award className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold">Genera un certificado</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                    Emite constancias de membresía, bautismo, matrimonio o servicio para {persona.nombres}. La emisión queda registrada en auditoría.
                  </p>
                  <Button className="mt-4 gap-1.5" onClick={generarCertificado}>
                    <Award className="h-4 w-4" /> Ir al módulo de certificados
                  </Button>
                </div>
              </SectionCard>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border bg-card">
                  <div className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Exportar ficha completa</p></div>
                  <p className="text-xs text-muted-foreground mb-3">PDF con datos, progreso y línea de tiempo.</p>
                  <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={handleExportPDF}><Download className="h-3.5 w-3.5" /> Descargar PDF</Button>
                </div>
                <div className="p-4 rounded-xl border bg-card">
                  <div className="flex items-center gap-2 mb-2"><Download className="h-4 w-4 text-accent" /><p className="text-sm font-semibold">Exportar historial</p></div>
                  <p className="text-xs text-muted-foreground mb-3">CSV con todos los eventos registrados.</p>
                  <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={handleExportCSV}><Download className="h-3.5 w-3.5" /> Descargar CSV</Button>
                </div>
              </div>
            </TabsContent>

            {/* ---- QR ---- */}
            <TabsContent value="qr" className="space-y-6 mt-0">
              <div className="grid md:grid-cols-2 gap-4">
                <SectionCard icon={<QrCode className="h-4 w-4" />} title="Código QR personal">
                  <div className="flex flex-col items-center gap-4 py-2">
                    {(persona as any).qr_code ? (
                      <>
                        <div className="p-4 bg-white rounded-2xl border-2 border-border shadow-sm">
                          <QRCodeSVG value={(persona as any).qr_code} size={200} level="M" />
                        </div>
                        <p className="text-xs text-muted-foreground text-center max-w-xs">
                          Escanea este código en Reuniones o desde "Check-in rápido" para registrar la asistencia.
                        </p>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { navigator.clipboard.writeText((persona as any).qr_code); toast.success("Código copiado"); }}>
                          <Copy className="h-3.5 w-3.5" /> Copiar código
                        </Button>
                      </>
                    ) : <EmptyState icon={<QrCode className="h-8 w-8" />} text="Sin código QR asignado" />}
                  </div>
                </SectionCard>

                <SectionCard icon={<ClipboardCheck className="h-4 w-4" />} title="Check-in rápido con QR">
                  <p className="text-xs text-muted-foreground mb-3">
                    Selecciona el servicio y registra la asistencia usando el QR. Queda registrado en auditoría.
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Servicio</label>
                      <Select value={qrCheckinServicio} onValueChange={setQrCheckinServicio}>
                        <SelectTrigger><SelectValue placeholder="Elige un servicio" /></SelectTrigger>
                        <SelectContent>
                          {(servicios || []).slice(0, 30).map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.nombre}{s.fecha ? " · " + s.fecha : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full gap-2" disabled={!qrCheckinServicio || !(persona as any).qr_code} onClick={() => setQrCheckinOpen(true)}>
                      <QrCode className="h-4 w-4" /> Check-in manual
                    </Button>
                    <PersonaQrCameraCheckin
                      expectedCode={(persona as any).qr_code || ""}
                      personaNombre={fullName}
                      onMatch={() => { if (!qrCheckinServicio) { toast.error("Selecciona primero un servicio"); return; } setQrCheckinOpen(true); }}
                    />
                    {!(persona as any).qr_code && <p className="text-[11px] text-destructive">Esta persona no tiene QR generado aún.</p>}
                    {!qrCheckinServicio && (persona as any).qr_code && <p className="text-[11px] text-muted-foreground">Selecciona un servicio para habilitar el check-in.</p>}
                  </div>
                </SectionCard>
              </div>
            </TabsContent>

          </div>

          {/* ================= SIDEBAR (fixed) ================= */}
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

            <SidebarCard icon={<Church className="h-4 w-4" />} title="Información ministerial">
              <SideRow label="Grupo" value={(persona as any).grupos?.nombre || "Sin grupo"} />
              <SideRow label="Red" value={(persona as any).grupos?.red || "—"} />
              <SideRow label="Vinculación" value={persona.vinculacion || "—"} />
              <SideRow label="Ministerio" value={persona.ministerio || "—"} />
              <SideRow label="Líder" value={persona.lider_responsable || "—"} />
              <SideRow label="Invitado por" value={persona.invitado_por || "—"} />
              <SideRow label="Seguimiento" value={persona.seguimiento_por || "—"} />
              <SideRow label="Ingreso" value={persona.fecha_ingreso ? format(parseISO(persona.fecha_ingreso), "dd MMM yyyy", { locale: es }) : "—"} />
              <SideRow label="Conversión" value={persona.fecha_conversion ? format(parseISO(persona.fecha_conversion), "dd MMM yyyy", { locale: es }) : "—"} />
              <SideRow label="Bautismo" value={persona.fecha_bautismo ? format(parseISO(persona.fecha_bautismo), "dd MMM yyyy", { locale: es }) : "—"} />
            </SidebarCard>

            <SidebarCard icon={<Sparkles className="h-4 w-4" />} title="Acciones rápidas">
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={openRegistrarAsistencia}><ClipboardCheck className="h-3.5 w-3.5" /> Registrar asistencia</Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={generarCertificado}><Award className="h-3.5 w-3.5" /> Generar certificado</Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleExportPDF}><FileText className="h-3.5 w-3.5" /> Exportar ficha PDF</Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleExportCSV}><Download className="h-3.5 w-3.5" /> Exportar CSV</Button>
              </div>
            </SidebarCard>
          </aside>
        </div>
      </Tabs>

      {/* ============ DIALOGS ============ */}
      <Dialog open={!!procesoDialog} onOpenChange={(o) => !o && setProcesoDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Detalle del Proceso</DialogTitle>
            <p className="text-sm text-muted-foreground">{procesoDialog?.nombre}</p>
          </DialogHeader>
          <Textarea placeholder="Información adicional del proceso" value={procesoObservacion} onChange={(e) => setProcesoObservacion(e.target.value)} rows={6} />
          <DialogFooter className="gap-2">
            <Button onClick={handleSaveProceso}>Guardar</Button>
            <Button variant="destructive" onClick={() => setProcesoDialog(null)}>Cancelar</Button>
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
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
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
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
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
