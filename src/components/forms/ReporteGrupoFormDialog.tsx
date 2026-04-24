import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, getDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronRight, ChevronLeft, Users, UserPlus,
  CheckCircle2, XCircle, ClipboardList, DollarSign, Send,
  AlertTriangle, Ban, FileCheck, Search, X, UserCircle,
  Calendar as CalendarIcon, MapPin, Phone, Mail,
} from "lucide-react";
import { useGrupos } from "@/hooks/useDatabase";
import { useCreateReporteGrupo, useUpdateReporteGrupo, useGrupoMiembrosForReport, useReportesGrupos, useReporteAsistencia } from "@/hooks/useReportesGrupos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AttendanceRecord {
  persona_id: string;
  nombres: string;
  apellidos: string;
  foto_url: string | null;
  tipo_persona: string;
  presente: boolean;
  es_nuevo: boolean;
  motivo_ausencia: string;
  rol?: string;
}

interface NuevaPersona {
  tipo_documento: string;
  documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  sexo: string;
  telefono: string;
  fecha_ingreso: string;
  email: string;
  tipo: "menor" | "asistente";
  aceptaTerminos: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editReporteId?: string | null;
}

const MOTIVOS_AUSENCIA = [
  "Calamidad doméstica", "Causa desconocida", "Compromiso laboral",
  "Compromiso académico", "Compromiso familiar", "Condiciones climáticas",
  "Enfermedad", "Desánimo", "Incapacidad", "Problemas de movilidad",
  "Vacaciones", "Actividad en la iglesia", "Actividad ministerial",
  "No le dieron permiso", "Viaje", "No quiso", "Otro", "Grupo no realizado",
];

const TIPOS_DOCUMENTO = [
  "Cédula de Ciudadanía", "Tarjeta de Identidad", "Cédula de Extranjería",
  "Pasaporte", "Registro Civil", "NIT", "Otro",
];

const DAY_MAP: Record<string, number> = {
  "Domingo": 0, "Lunes": 1, "Martes": 2, "Miércoles": 3,
  "Jueves": 4, "Viernes": 5, "Sábado": 6,
};

function isDayAllowed(_diaReunion: string | null | undefined): boolean {
  return true; // Allow reports on any date
}

const emptyNewPerson = (): NuevaPersona => ({
  tipo_documento: "", documento: "", nombres: "", apellidos: "",
  fecha_nacimiento: "", sexo: "Masculino", telefono: "",
  fecha_ingreso: format(new Date(), "yyyy-MM-dd"), email: "",
  tipo: "asistente", aceptaTerminos: false,
});

export default function ReporteGrupoFormDialog({ open, onOpenChange, editReporteId }: Props) {
  const [step, setStep] = useState(0);
  const [grupoId, setGrupoId] = useState("");
  const [grupoSearch, setGrupoSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [mensaje, setMensaje] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [seRealizo, setSeRealizo] = useState(true);
  const [ofrendaCasaPaz, setOfrendaCasaPaz] = useState("");
  const [totalReportado, setTotalReportado] = useState("");
  const [invitados, setInvitados] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editLoaded, setEditLoaded] = useState(false);

  const [showNewPersonModal, setShowNewPersonModal] = useState(false);
  const [showNewPersonForm, setShowNewPersonForm] = useState(false);
  const [newPersonType, setNewPersonType] = useState<"menor" | "asistente">("asistente");
  const [newForm, setNewForm] = useState<NuevaPersona>(emptyNewPerson());
  const [nuevasPersonas, setNuevasPersonas] = useState<NuevaPersona[]>([]);
  const [newPersonaIds, setNewPersonaIds] = useState<string[]>([]);

  const { data: grupos } = useGrupos();
  const { data: miembros, isLoading: loadingMiembros } = useGrupoMiembrosForReport(grupoId || null);
  const { data: allReportes } = useReportesGrupos();
  const createReporte = useCreateReporteGrupo();
  const updateReporte = useUpdateReporteGrupo();
  const { data: editAsistencia } = useReporteAsistencia(editReporteId || null);

  const selectedGrupo = grupos?.find((g) => g.id === grupoId);
  const diaReunion = (selectedGrupo as any)?.dia_reunion;

  // Load edit data
  useEffect(() => {
    if (editReporteId && allReportes && !editLoaded) {
      const reporte = allReportes.find(r => r.id === editReporteId);
      if (reporte) {
        setGrupoId(reporte.grupo_id);
        setGrupoSearch(reporte.grupos?.nombre || "");
        setSelectedDate(parseISO(reporte.fecha));
        setMensaje(reporte.mensaje);
        setObservaciones(reporte.observaciones || "");
        setSeRealizo(!(reporte as any).no_realizado);
        setOfrendaCasaPaz(String(reporte.ofrenda_casa_paz || 0));
        setTotalReportado(String(reporte.total_reportado || 0));
        setIsEditMode(true);
        setEditLoaded(true);
      }
    }
  }, [editReporteId, allReportes, editLoaded]);

  // Track whether edit attendance has been applied
  const [editAttendanceApplied, setEditAttendanceApplied] = useState(false);

  const filteredGrupos = useMemo(() => {
    if (!grupos || !grupoSearch.trim()) return [];
    const q = grupoSearch.toLowerCase();
    return grupos.filter(g =>
      g.nombre.toLowerCase().includes(q) ||
      g.tipo?.toLowerCase().includes(q) ||
      g.id.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [grupos, grupoSearch]);

  const grupoReportes = useMemo(() => {
    if (!allReportes || !grupoId) return [];
    return allReportes.filter(r => r.grupo_id === grupoId);
  }, [allReportes, grupoId]);

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const duplicateReporte = useMemo(() => {
    if (!grupoId) return null;
    return grupoReportes.find(r => r.fecha === selectedDateKey && r.id !== editReporteId) || null;
  }, [grupoId, grupoReportes, selectedDateKey, editReporteId]);

  const liderInfo = useMemo(() => {
    if (!selectedGrupo) return null;
    return (selectedGrupo as any).personas || null;
  }, [selectedGrupo]);

  const encargados = useMemo(() => {
    return attendance.filter(a =>
      a.rol === "lider" || a.rol === "sublider" || a.rol === "anfitrion" ||
      a.tipo_persona === "Líder" || a.tipo_persona === "Líder Casa de Paz" || a.tipo_persona === "Líder de Red"
    );
  }, [attendance]);

  const asistentes = useMemo(() => {
    return attendance.filter(a => !encargados.some(e => e.persona_id === a.persona_id));
  }, [attendance, encargados]);

  // Load members when group selected, and merge edit attendance if applicable
  useEffect(() => {
    if (miembros && miembros.length > 0 && grupoId) {
      const loadRoles = async () => {
        const { data: memberData } = await supabase
          .from("grupo_miembros")
          .select("persona_id, rol")
          .eq("grupo_id", grupoId) as any;

        const roleMap: Record<string, string> = {};
        (memberData || []).forEach((m: any) => { roleMap[m.persona_id] = m.rol || "asistente"; });

        // Build edit attendance map if in edit mode
        const asistMap = new Map<string, any>();
        if (isEditMode && editAsistencia && editAsistencia.length > 0) {
          editAsistencia.forEach(a => asistMap.set(a.persona_id, a));
        }

        const records: AttendanceRecord[] = miembros.map((m) => {
          const editRecord = asistMap.get(m.id);
          return {
            persona_id: m.id,
            nombres: m.nombres,
            apellidos: m.apellidos,
            foto_url: m.foto_url,
            tipo_persona: m.tipo_persona,
            presente: editRecord ? editRecord.presente : false,
            es_nuevo: editRecord ? editRecord.es_nuevo : false,
            motivo_ausencia: editRecord ? (editRecord.motivo_ausencia || "") : "",
            rol: roleMap[m.id] || "asistente",
          };
        });

        if (liderInfo && liderInfo.id && !records.some(r => r.persona_id === liderInfo.id)) {
          const editRecord = asistMap.get(liderInfo.id);
          records.unshift({
            persona_id: liderInfo.id,
            nombres: liderInfo.nombres,
            apellidos: liderInfo.apellidos,
            foto_url: liderInfo.foto_url || null,
            tipo_persona: liderInfo.tipo_persona || "Líder",
            presente: editRecord ? editRecord.presente : false,
            es_nuevo: editRecord ? editRecord.es_nuevo : false,
            motivo_ausencia: editRecord ? (editRecord.motivo_ausencia || "") : "",
            rol: "lider",
          });
        }

        // Also add any persons from edit attendance that aren't in current members
        if (isEditMode && editAsistencia) {
          editAsistencia.forEach(a => {
            if (!records.some(r => r.persona_id === a.persona_id) && a.persona) {
              records.push({
                persona_id: a.persona_id,
                nombres: a.persona.nombres,
                apellidos: a.persona.apellidos,
                foto_url: a.persona.foto_url || null,
                tipo_persona: a.persona.tipo_persona,
                presente: a.presente,
                es_nuevo: a.es_nuevo,
                motivo_ausencia: a.motivo_ausencia || "",
                rol: "asistente",
              });
            }
          });
        }

        setAttendance(records);
        if (isEditMode) setEditAttendanceApplied(true);
      };
      loadRoles();
    }
  }, [miembros, grupoId, liderInfo, isEditMode, editAsistencia]);

  const togglePresente = (personaId: string) => {
    setAttendance((prev) =>
      prev.map((a) => (a.persona_id === personaId ? { ...a, presente: !a.presente, motivo_ausencia: a.presente ? a.motivo_ausencia : "" } : a))
    );
  };

  const setMotivo = (personaId: string, motivo: string) => {
    setAttendance((prev) =>
      prev.map((a) => (a.persona_id === personaId ? { ...a, motivo_ausencia: motivo } : a))
    );
  };

  const openNewPersonForm = (tipo: "menor" | "asistente") => {
    setNewPersonType(tipo);
    const np = emptyNewPerson();
    np.tipo = tipo;
    setNewForm(np);
    setShowNewPersonModal(false);
    setShowNewPersonForm(true);
  };

  const saveNewPerson = async () => {
    if (!newForm.nombres || !newForm.apellidos) {
      toast.error("Nombre y apellido son obligatorios.");
      return;
    }
    if (!newForm.aceptaTerminos) {
      toast.error("Debe aceptar los términos y condiciones.");
      return;
    }

    // Check duplicate by documento
    if (newForm.documento?.trim()) {
      const { data: existing } = await supabase
        .from("personas")
        .select("id, nombres, apellidos")
        .eq("documento", newForm.documento.trim())
        .limit(1);
      if (existing && existing.length > 0) {
        toast.error(`Ya existe una persona con documento ${newForm.documento}: ${existing[0].nombres} ${existing[0].apellidos}`);
        return;
      }
    }

    try {
      const { data: persona, error } = await supabase
        .from("personas")
        .insert({
          nombres: newForm.nombres,
          apellidos: newForm.apellidos,
          telefono: newForm.telefono || null,
          email: newForm.email || null,
          documento: newForm.documento || null,
          tipo_documento: newForm.tipo_documento || null,
          fecha_nacimiento: newForm.fecha_nacimiento || null,
          sexo: newForm.sexo || null,
          fecha_ingreso: newForm.fecha_ingreso || null,
          tipo_persona: (newForm.tipo === "menor" ? "Visitante" : "CDP") as any,
          grupo_id: grupoId,
        })
        .select("id, nombres, apellidos, foto_url, tipo_persona")
        .single();
      if (error) throw error;

      await supabase.from("grupo_miembros").insert({
        grupo_id: grupoId,
        persona_id: persona.id,
      } as any);

      setNewPersonaIds(prev => [...prev, persona.id]);
      setNuevasPersonas(prev => [...prev, { ...newForm }]);

      setAttendance(prev => [...prev, {
        persona_id: persona.id,
        nombres: newForm.nombres,
        apellidos: newForm.apellidos,
        foto_url: null,
        tipo_persona: newForm.tipo === "menor" ? "Visitante" : "CDP",
        presente: true,
        es_nuevo: true,
        motivo_ausencia: "",
        rol: "asistente",
      }]);

      setShowNewPersonForm(false);
      setNewForm(emptyNewPerson());
      toast.success(`${newForm.nombres} ${newForm.apellidos} agregado(a) exitosamente.`);
    } catch (err: any) {
      toast.error("Error al guardar persona: " + (err.message || ""));
    }
  };

  const presentesCount = attendance.filter((a) => a.presente).length;
  const ausentesCount = attendance.filter((a) => !a.presente).length;
  const nuevosCount = attendance.filter(a => a.es_nuevo).length;

  const attendanceValid = useMemo(() => {
    if (!seRealizo) return true;
    const absentWithoutMotivo = attendance.filter(a => !a.presente && !a.motivo_ausencia.trim());
    return absentWithoutMotivo.length === 0;
  }, [attendance, seRealizo]);

  const handleSubmit = async () => {
    if (!grupoId || !mensaje) {
      toast.error("Complete los datos obligatorios.");
      return;
    }
    if (duplicateReporte) {
      toast.error("Ya existe un reporte para este grupo en esta fecha.");
      return;
    }
    if (seRealizo && !attendanceValid) {
      toast.error("Debe indicar el motivo de ausencia para todos los ausentes.");
      return;
    }

    try {
      const allAttendance = !seRealizo ? [] : attendance
        .filter((a) => !!a.persona_id)
        .map((a) => ({
          persona_id: a.persona_id,
          presente: a.presente,
          es_nuevo: a.es_nuevo,
          motivo_ausencia: a.motivo_ausencia || undefined,
        }));

      if (isEditMode && editReporteId) {
        // Update report
        await updateReporte.mutateAsync({
          id: editReporteId,
          mensaje,
          observaciones: observaciones || null,
          ofrenda_casa_paz: parseFloat(ofrendaCasaPaz) || 0,
          total_reportado: parseFloat(totalReportado) || 0,
          no_realizado: !seRealizo,
        });

        // Delete old attendance and re-insert
        await supabase
          .from("reporte_asistencia" as any)
          .delete()
          .eq("reporte_id", editReporteId);

        if (allAttendance.length > 0) {
          const records = allAttendance.map(a => ({
            reporte_id: editReporteId,
            persona_id: a.persona_id,
            presente: a.presente,
            es_nuevo: a.es_nuevo,
            motivo_ausencia: a.motivo_ausencia || null,
          }));
          await supabase
            .from("reporte_asistencia" as any)
            .insert(records as any);
        }

        toast.success("Reporte actualizado exitosamente.");
        resetForm();
        onOpenChange(false);
      } else {
        await createReporte.mutateAsync({
          grupo_id: grupoId,
          fecha: selectedDateKey,
          mensaje,
          observaciones: observaciones || undefined,
          ofrenda_casa_paz: parseFloat(ofrendaCasaPaz) || 0,
          total_reportado: parseFloat(totalReportado) || 0,
          no_realizado: !seRealizo,
          asistencia: allAttendance,
        });

        setReceiptData({
          grupo: selectedGrupo?.nombre,
          tipo: selectedGrupo?.tipo,
          dia_reunion: diaReunion,
          fecha: selectedDateKey,
          mensaje,
          noRealizado: !seRealizo,
          presentes: presentesCount,
          ausentes: ausentesCount,
          nuevos: nuevosCount,
          invitados,
          ofrenda: parseFloat(ofrendaCasaPaz) || 0,
          total: parseFloat(totalReportado) || 0,
          encargados,
          asistentes: attendance,
        });
        setShowReceipt(true);
        toast.success("Reporte enviado exitosamente.");
      }
    } catch (err: any) {
      const message = err.message?.includes("Ya existe un reporte")
        ? "Ya existe un reporte para este grupo en esta fecha."
        : (err.message || "");
      toast.error("Error: " + message);
    }
  };

  const resetForm = () => {
    setStep(0);
    setGrupoId("");
    setGrupoSearch("");
    setSelectedDate(new Date());
    setMensaje("");
    setObservaciones("");
    setSeRealizo(true);
    setOfrendaCasaPaz("");
    setTotalReportado("");
    setInvitados(0);
    setAttendance([]);
    setNuevasPersonas([]);
    setNewPersonaIds([]);
    setShowReceipt(false);
    setReceiptData(null);
    setShowNewPersonModal(false);
    setShowNewPersonForm(false);
    setIsEditMode(false);
    setEditLoaded(false);
    setEditAttendanceApplied(false);
  };

  const canCreateReport = !!grupoId && !!mensaje && !duplicateReporte;

  // Day restriction - only for new reports, not edits
  const dayAllowed = isEditMode || isDayAllowed(diaReunion);

  // Show day restriction AFTER group is selected (since we need to know the day)
  // For the initial open without group selected, allow opening

  // New person modal
  const renderNewPersonModal = () => (
    <Dialog open={showNewPersonModal} onOpenChange={setShowNewPersonModal}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="bg-primary text-primary-foreground p-8 text-center space-y-3">
          <UserCircle className="h-16 w-16 mx-auto opacity-90" />
          <h2 className="text-2xl font-bold">¿Tienes personas nuevas?</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="font-semibold text-lg">¡Bendiciones!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Si tienes personas nuevas para este reporte recuerda crearlas antes de continuar.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button className="gap-2" onClick={() => openNewPersonForm("menor")}>
              Sí, Nuevo Menor
            </Button>
            <Button className="gap-2" onClick={() => openNewPersonForm("asistente")}>
              Sí, Nuevo Asistente
            </Button>
          </div>
          <div className="text-center">
            <Button variant="destructive" onClick={() => setShowNewPersonModal(false)}>
              No, continuar con el reporte
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // New person form
  const renderNewPersonFormDialog = () => (
    <Dialog open={showNewPersonForm} onOpenChange={setShowNewPersonForm}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden max-h-[90vh]">
        <div className="bg-primary text-primary-foreground p-6 text-center space-y-2">
          <UserCircle className="h-12 w-12 mx-auto opacity-90" />
          <h2 className="text-xl font-bold uppercase">
            {newPersonType === "menor" ? "Nuevo Menor Reporte Grupo" : "Nuevo Asistente Reporte Grupo"}
          </h2>
          <p className="text-sm opacity-80">* Campos obligatorios</p>
        </div>
        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">* Tipo de identificación</label>
                <Select value={newForm.tipo_documento} onValueChange={(v) => setNewForm({ ...newForm, tipo_documento: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">* Identificación</label>
                <Input value={newForm.documento} onChange={(e) => setNewForm({ ...newForm, documento: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">* Fecha de nacimiento</label>
                <Input type="date" value={newForm.fecha_nacimiento} onChange={(e) => setNewForm({ ...newForm, fecha_nacimiento: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">* Sexo</label>
                <Select value={newForm.sexo} onValueChange={(v) => setNewForm({ ...newForm, sexo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">* Primer nombre</label>
                <Input value={newForm.nombres.split(" ")[0] || ""} onChange={(e) => {
                  const parts = newForm.nombres.split(" ");
                  parts[0] = e.target.value;
                  setNewForm({ ...newForm, nombres: parts.join(" ").trim() });
                }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Segundo nombre</label>
                <Input value={newForm.nombres.split(" ").slice(1).join(" ")} onChange={(e) => {
                  const first = newForm.nombres.split(" ")[0] || "";
                  setNewForm({ ...newForm, nombres: `${first} ${e.target.value}`.trim() });
                }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">* Primer apellido</label>
                <Input value={newForm.apellidos.split(" ")[0] || ""} onChange={(e) => {
                  const parts = newForm.apellidos.split(" ");
                  parts[0] = e.target.value;
                  setNewForm({ ...newForm, apellidos: parts.join(" ").trim() });
                }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Segundo apellido</label>
                <Input value={newForm.apellidos.split(" ").slice(1).join(" ")} onChange={(e) => {
                  const first = newForm.apellidos.split(" ")[0] || "";
                  setNewForm({ ...newForm, apellidos: `${first} ${e.target.value}`.trim() });
                }} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Teléfono móvil</label>
                <Input value={newForm.telefono} onChange={(e) => setNewForm({ ...newForm, telefono: e.target.value })} placeholder="📱" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">* Fecha de ingreso</label>
                <Input type="date" value={newForm.fecha_ingreso} onChange={(e) => setNewForm({ ...newForm, fecha_ingreso: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">E-mail</label>
                <Input type="email" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} placeholder="@ E-mail" />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
              <Checkbox
                id="terminos-new"
                checked={newForm.aceptaTerminos}
                onCheckedChange={(v) => setNewForm({ ...newForm, aceptaTerminos: !!v })}
              />
              <label htmlFor="terminos-new" className="text-xs cursor-pointer leading-relaxed">
                <strong>Acepta los términos y condiciones.</strong> Autorizo el uso de la información suministrada en el presente formulario a la Iglesia. Los datos aquí recopilados serán tratados según lo señalado en las políticas de privacidad para el tratamiento de datos personales de la Iglesia.
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={saveNewPerson} className="gap-2">💾 Guardar</Button>
              <Button variant="destructive" onClick={() => setShowNewPersonForm(false)}>No, continuar</Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );

  // Receipt view
  if (open && showReceipt && receiptData) {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h2 className="text-xl font-bold">REPORTE: {receiptData.mensaje}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" /> Fecha: {receiptData.fecha}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{encargados.length} Encargado(s)</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {(receiptData.encargados || []).map((enc: AttendanceRecord) => (
                      <div key={enc.persona_id} className="text-center space-y-1">
                        <Avatar className="h-14 w-14 mx-auto">
                          <AvatarImage src={enc.foto_url || undefined} />
                          <AvatarFallback>{enc.nombres[0]}{enc.apellidos[0]}</AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium">{enc.nombres} {enc.apellidos}</p>
                        <p className="text-xs">¿Asistió? <span className={enc.presente ? "text-success font-medium" : "text-destructive font-medium"}>{enc.presente ? "Sí" : "No"}</span></p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">📊 Clasificación</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Invitados</span><span>{receiptData.invitados}</span></div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-medium"><span>Asistieron</span><span className="text-success">{receiptData.presentes}</span></div>
                    <div className="flex justify-between font-medium"><span>No asistieron</span><span className="text-destructive">{receiptData.ausentes}</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">💰 Resumen</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between font-bold"><span>TOTAL</span><span>💲 {receiptData.total.toFixed(0)}</span></div>
                  </CardContent>
                </Card>
              </div>
              <div className="md:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">ℹ️ Información</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>✅ Grupo: ({receiptData.grupo})</p>
                    <p>📅 Día: {receiptData.dia_reunion || "—"}</p>
                    <p>⭕ Tipo: {receiptData.tipo || "—"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-success">Personas que asistieron</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4">
                      {(receiptData.asistentes as AttendanceRecord[]).filter(a => a.presente && !encargados.some(e => e.persona_id === a.persona_id)).map(a => (
                        <div key={a.persona_id} className="text-center space-y-1">
                          <Avatar className="h-12 w-12 mx-auto">
                            <AvatarImage src={a.foto_url || undefined} />
                            <AvatarFallback className="text-xs">{a.nombres[0]}{a.apellidos[0]}</AvatarFallback>
                          </Avatar>
                          <p className="text-xs font-medium">{a.nombres}</p>
                          <p className="text-[10px] text-muted-foreground">{a.tipo_persona}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Personas que no asistieron</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {(receiptData.asistentes as AttendanceRecord[]).filter(a => !a.presente).map(a => (
                      <div key={a.persona_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={a.foto_url || undefined} />
                          <AvatarFallback className="text-xs">{a.nombres[0]}{a.apellidos[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{a.nombres} {a.apellidos}</p>
                        </div>
                        <p className="text-xs text-destructive font-medium">{a.motivo_ausencia || "—"}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => { resetForm(); onOpenChange(false); }}>Cerrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!open) return null;

  const reportDates = grupoReportes.map(r => parseISO(r.fecha));
  const reportDateModifiers = { reported: reportDates };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0" style={{ overflow: "hidden" }}>
          {/* Header */}
          <div className="p-4 border-b bg-background">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-wide">
                  {isEditMode ? "Editar Reporte" : "Reporte del Grupo"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {step === 0
                    ? "Diligencia la información general de tu reporte."
                    : "Registra las asistencias. Al terminar da CLIC en finalizar."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {step === 1 && (
                  <Button size="sm" variant="outline" onClick={() => setStep(0)} className="gap-1">
                    1 Datos Principales
                  </Button>
                )}
                {step === 0 && grupoId && (
                  <Button size="sm" variant="outline" onClick={() => { setStep(1); if (!isEditMode) setShowNewPersonModal(true); }} className="gap-1 text-destructive border-destructive">
                    2 Añadir Asistentes
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              {step === 0 ? (
                <Button
                  size="sm"
                  disabled={!canCreateReport || (!isEditMode && grupoId && !dayAllowed)}
                  onClick={() => { setStep(1); if (!isEditMode) setShowNewPersonModal(true); }}
                >
                  {isEditMode ? "Continuar edición" : "Crear reporte"}
                </Button>
              ) : (
                <Button size="sm" onClick={handleSubmit} disabled={createReporte.isPending || updateReporte.isPending || !!duplicateReporte}>
                  {(createReporte.isPending || updateReporte.isPending) ? "Guardando..." : isEditMode ? "Guardar Cambios" : "Finalizar Reporte"}
                </Button>
              )}
              <Button size="sm" variant="destructive" className="gap-1" onClick={() => { resetForm(); onOpenChange(false); }}>
                ↩ Cancelar
              </Button>
              {!isEditMode && grupoId && !dayAllowed && (
                <span className="ml-2 text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Solo disponible los {diaReunion || "días configurados"}
                </span>
              )}
              <span className="ml-auto text-sm text-destructive">* Campos obligatorios</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(90vh - 160px)", overscrollBehavior: "contain" }}>
            {/* Step 0 */}
            {step === 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="p-6 space-y-4 border-r">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Información del reporte</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Seleccione el grupo:</label>
                        <div className="relative">
                          <Input
                            placeholder="Buscar grupo por código, nombre..."
                            value={grupoSearch}
                            onChange={(e) => { setGrupoSearch(e.target.value); if (grupoId && !isEditMode) { setGrupoId(""); setAttendance([]); } }}
                            className="pr-10"
                            disabled={isEditMode}
                          />
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        {grupoSearch && !grupoId && filteredGrupos.length > 0 && (
                          <div className="border rounded-lg mt-1 max-h-48 overflow-auto bg-popover shadow-md">
                            {filteredGrupos.map(g => (
                              <button key={g.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2" onClick={() => { setGrupoId(g.id); setGrupoSearch(g.nombre); }}>
                                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-medium">{g.nombre}</span>
                                <Badge variant="outline" className="ml-auto text-[10px]">{g.tipo}</Badge>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {selectedGrupo && (
                        <div className="flex items-start gap-4 p-4 rounded-lg border bg-accent/5 relative">
                          <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="h-8 w-8 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Grupo</p>
                            <p className="font-bold text-lg">{selectedGrupo.nombre}</p>
                            {liderInfo && (
                              <p className="text-xs flex items-center gap-1 mt-1">
                                <UserCircle className="h-3 w-3" /> {liderInfo.nombres} {liderInfo.apellidos}
                              </p>
                            )}
                            {diaReunion && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                📅 Día de reunión: {diaReunion}
                              </p>
                            )}
                          </div>
                          {!isEditMode && (
                            <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-6 w-6 text-destructive" onClick={() => { setGrupoId(""); setGrupoSearch(""); setAttendance([]); }}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}

                      {grupoId && (
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium">¿Se realizó este grupo?</label>
                          <Switch checked={seRealizo} onCheckedChange={setSeRealizo} />
                          <span className={cn("text-sm font-semibold", seRealizo ? "text-success" : "text-destructive")}>
                            {seRealizo ? "Sí" : "No"}
                          </span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">* Mensaje o tema</label>
                        <Input value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Ej: El unico DIOS verdadero" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Observaciones</label>
                        <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={4} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-6">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">* Seleccione la fecha</CardTitle></CardHeader>
                    <CardContent>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => d && !isEditMode && setSelectedDate(d)}
                        locale={es}
                        className="w-full"
                        modifiers={reportDateModifiers}
                        modifiersClassNames={{ reported: "bg-destructive/20 text-destructive font-bold" }}
                        disabled={isEditMode ? true : reportDates}
                      />
                      {duplicateReporte && (
                        <div className="mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Ya existe un reporte para este grupo en esta fecha.
                        </div>
                      )}
                      {grupoReportes.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">Reportes existentes:</p>
                          {grupoReportes.slice(0, 5).map(r => (
                            <div key={r.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50">
                              <div className={cn("w-2 h-2 rounded-full", r.estado === "Aprobado" ? "bg-success" : r.estado === "No Aprobado" ? "bg-destructive" : "bg-amber-500")} />
                              <span>{r.fecha}</span>
                              <span className="truncate flex-1 text-muted-foreground">{r.mensaje}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <p><strong>📅 FECHA:</strong> {format(selectedDate, "yyyy-MM-dd")}</p>
                  <p><strong>📝 TEMA:</strong> {mensaje}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Invitados</span>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-success" onClick={() => setInvitados(v => v + 1)}>+</Button>
                  <Input type="number" value={invitados} onChange={(e) => setInvitados(parseInt(e.target.value) || 0)} className="w-16 h-7 text-center text-sm" />
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive" onClick={() => setInvitados(v => Math.max(0, v - 1))}>-</Button>
                  <Button size="sm" variant="outline" className="ml-4 gap-1" onClick={() => setShowNewPersonModal(true)}>
                    <UserPlus className="h-4 w-4" /> Agregar nueva persona
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-2">
                    <h3 className="text-sm font-bold uppercase text-muted-foreground">Asistentes</h3>
                    {loadingMiembros ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Cargando miembros...</p>
                    ) : asistentes.length === 0 && encargados.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No hay miembros registrados.</p>
                    ) : (
                      <div className="space-y-2">
                        {asistentes.map((a) => {
                          const initials = `${a.nombres[0] || ""}${a.apellidos[0] || ""}`.toUpperCase();
                          return (
                            <div key={a.persona_id} className={cn("flex items-center gap-3 p-3 rounded-lg border transition-colors", !a.presente && "bg-muted/30")}>
                              <div className="flex flex-col items-center gap-1 shrink-0">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={a.foto_url || undefined} />
                                  <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                                </Avatar>
                                <Badge variant="outline" className="text-[8px] h-3 px-1">{a.tipo_persona}</Badge>
                                <p className="text-xs font-medium text-center max-w-[100px] truncate">{a.nombres} {a.apellidos}</p>
                              </div>
                              <div className="flex-1 flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">¿Asistió?</span>
                                  <Switch checked={a.presente} onCheckedChange={() => togglePresente(a.persona_id)} />
                                  <span className={cn("text-xs font-semibold min-w-[20px]", a.presente ? "text-success" : "text-destructive")}>
                                    {a.presente ? "Sí" : "No"}
                                  </span>
                                </div>
                                {!a.presente && (
                                  <div className="flex-1">
                                    <label className="text-xs text-destructive font-medium">* ¿Por qué no asistió?</label>
                                    <Select value={a.motivo_ausencia} onValueChange={(v) => setMotivo(a.persona_id, v)}>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar motivo..." /></SelectTrigger>
                                      <SelectContent>
                                        {MOTIVOS_AUSENCIA.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">{encargados.length} Encargado(s)</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        {encargados.map((enc) => (
                          <div key={enc.persona_id} className="text-center space-y-2 p-3 rounded-lg border">
                            <Avatar className="h-14 w-14 mx-auto">
                              <AvatarImage src={enc.foto_url || undefined} />
                              <AvatarFallback>{enc.nombres[0]}{enc.apellidos[0]}</AvatarFallback>
                            </Avatar>
                            <p className="text-sm font-medium">{enc.nombres} {enc.apellidos}</p>
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xs">¿Asistió?</span>
                              <Switch checked={enc.presente} onCheckedChange={() => togglePresente(enc.persona_id)} />
                              <span className={cn("text-xs font-semibold", enc.presente ? "text-success" : "text-destructive")}>
                                {enc.presente ? "Sí" : "No"}
                              </span>
                            </div>
                            {!enc.presente && (
                              <Select value={enc.motivo_ausencia} onValueChange={(v) => setMotivo(enc.persona_id, v)}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Motivo..." /></SelectTrigger>
                                <SelectContent>{MOTIVOS_AUSENCIA.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                              </Select>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">💰 Resumen financiero</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Ofrenda Casa de Paz</label>
                            <Input type="number" step="0.01" min="0" value={ofrendaCasaPaz} onChange={(e) => setOfrendaCasaPaz(e.target.value)} placeholder="0" className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Total Reportado</label>
                            <Input type="number" step="0.01" min="0" value={totalReportado} onChange={(e) => setTotalReportado(e.target.value)} placeholder="0" className="h-8 text-sm" />
                          </div>
                          <Separator />
                          <div className="flex justify-between text-sm font-bold">
                            <span>TOTAL</span>
                            <span>💲 {(parseFloat(totalReportado) || 0).toFixed(0)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="flex justify-start pt-4">
                  <Button onClick={handleSubmit} disabled={createReporte.isPending || updateReporte.isPending || !!duplicateReporte || (!seRealizo ? false : !attendanceValid)} className="gap-2">
                    <Send className="h-4 w-4" />
                    {(createReporte.isPending || updateReporte.isPending) ? "Guardando..." : isEditMode ? "Guardar Cambios" : "Finalizar Reporte"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {renderNewPersonModal()}
      {renderNewPersonFormDialog()}
    </>
  );
}
