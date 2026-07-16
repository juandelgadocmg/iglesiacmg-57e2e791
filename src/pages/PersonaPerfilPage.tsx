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

      {/* ============ TABS ============ */}
      <Tabs defaultValue="resumen" className="space-y-6">
        <div className="sticky top-0 z-20 -mx-2 px-2 bg-background/85 backdrop-blur-lg border-b border-border/60">
          <TabsList className="h-auto p-0 bg-transparent gap-1 overflow-x-auto flex-nowrap w-full justify-start rounded-none">
            {[
              { v: "resumen", label: "Resumen", icon: User },
              { v: "actividad", label: "Actividad", icon: Activity },
              { v: "discipulado", label: "Discipulado", icon: Route },
              { v: "grupos", label: "Grupos", icon: Users },
              { v: "finanzas", label: "Finanzas", icon: Wallet },
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
                  <p className="text-[15px] text-foreground/90 leading-relaxed whitespace-pre-wrap line-clamp-6">{persona.observaciones}</p>
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
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
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
                      <AvatarFallback className="text-[10px]">{(r.familiar?.nombres?.[0] || r.familiar_nombre?.[0] || "?")}</AvatarFallback>
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
                <div className="mt-3 flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" />Aportes ${totalAportesIngreso.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" />Don. ${totalDonaciones.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Recent activity preview */}
            <SectionCard
              icon={<Activity className="h-4 w-4" />}
              title="Actividad reciente"
              right={<Button variant="ghost" size="sm" className="gap-1" onClick={() => (document.querySelector('[role="tab"][value="actividad"]') as HTMLElement)?.click()}>Ver toda <ChevronRight className="h-3.5 w-3.5" /></Button>}
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
            onSetDate={(procesoId, date, estado, obs) =>
              updateProceso.mutate({ personaId: persona.id, procesoId, estado: estado === "No Realizado" ? "En Curso" : estado, fecha_completado: format(date, "yyyy-MM-dd"), observacion: obs || null })
            }
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
        <TabsContent value="qr" className="mt-0">
          <QrHero
            personaNombre={fullName}
            qrCode={(persona as any).qr_code || ""}
            servicios={servicios || []}
            qrCheckinServicio={qrCheckinServicio}
            setQrCheckinServicio={setQrCheckinServicio}
            onOpenManual={() => setQrCheckinOpen(true)}
          />
        </TabsContent>
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
