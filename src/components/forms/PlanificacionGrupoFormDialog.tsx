import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useCreatePlanificacion } from "@/hooks/usePlanificaciones";
import { useGrupos } from "@/hooks/useDatabase";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, ShieldCheck } from "lucide-react";
import { tuesdayDeadlineFor, formatDeadlineBogota, deadlineCountdown } from "@/lib/planificacionDeadline";

const REDES = ["ADONAI", "ELOHIM", "JIREH", "NISSI", "ROHI", "SHADAI"];

const EVAL_ITEMS = [
  "Invitación CDP asistentes",
  "Ayuno CDP",
  "Evangelización CDP",
  "Oración Inicial CDP",
  "Adoración y Alabanza CDP",
  "Dinámicas CDP",
  "Predicación CDP",
  "Toma de Testimonios CDP",
  "Ayudas Didácticas (Vídeos, Impresiones)",
  "Toma de Datos CDP",
  "Consolidación (Llamar a los nuevos)",
  "Seguimiento (crecimiento espiritual y conexión con la Iglesia)",
];

const MEDIOS_OPTIONS = [
  "Whatsapp",
  "Llamada Telefónica",
  "Personalmente",
  "Medios impresos (Volantes, Tarjetas, etc)",
  "Redes Sociales",
  "Llamada telefónica y Whatsapp",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function PlanificacionGrupoFormDialog({ open, onOpenChange }: Props) {
  const { data: grupos } = useGrupos();
  const create = useCreatePlanificacion();
  
  const [grupoId, setGrupoId] = useState("");
  const [red, setRed] = useState("");
  const [liderNombre, setLiderNombre] = useState("");
  const [evaluacion, setEvaluacion] = useState<Record<string, boolean>>({});
  const [responsableInvitacion, setResponsableInvitacion] = useState("");
  const [mediosInvitacion, setMediosInvitacion] = useState<string[]>([]);
  const [personasInvitadas, setPersonasInvitadas] = useState(0);
  const [responsableRecordar, setResponsableRecordar] = useState("");
  const [mediosRecordar, setMediosRecordar] = useState<string[]>([]);
  const [fechaAyuno, setFechaAyuno] = useState("");
  const [fechaEvangelizacion, setFechaEvangelizacion] = useState("");
  const [responsableOracion, setResponsableOracion] = useState("");
  const [responsableAdoracion, setResponsableAdoracion] = useState("");
  const [responsableDinamicas, setResponsableDinamicas] = useState("");
  const [responsablePredicacion, setResponsablePredicacion] = useState("");
  const [responsableTestimonios, setResponsableTestimonios] = useState("");
  const [responsableAyudas, setResponsableAyudas] = useState("");
  const [responsableDatos, setResponsableDatos] = useState("");
  const [responsableConsolidacion, setResponsableConsolidacion] = useState("");
  const [responsableSeguimiento, setResponsableSeguimiento] = useState("");

  const selectedGrupo = (grupos || []).find((g: any) => g.id === grupoId);

  const toggleMedio = (list: string[], setList: (v: string[]) => void, v: string) => {
    setList(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  };

  const planDeadline = tuesdayDeadlineFor(new Date());
  const planDeadlinePassed = planDeadline.getTime() < Date.now();

  const handleSubmit = async () => {
    if (planDeadlinePassed) {
      toast.error("Fecha límite vencida: las planeaciones se cierran el martes a las 11:59 PM (hora Bogotá).");
      return;
    }
    if (!grupoId || !liderNombre) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    try {
      await create.mutateAsync({
        grupo_id: grupoId,
        red,
        lider_nombre: liderNombre,
        casa_de_paz: selectedGrupo?.nombre || null,
        evaluacion_equipo: evaluacion,
        responsable_invitacion: responsableInvitacion,
        medios_invitacion: mediosInvitacion,
        personas_invitadas: personasInvitadas,
        responsable_recordar: responsableRecordar,
        medios_recordar: mediosRecordar,
        fecha_ayuno: fechaAyuno || null,
        fecha_evangelizacion: fechaEvangelizacion || null,
        responsable_oracion: responsableOracion,
        responsable_adoracion: responsableAdoracion,
        responsable_dinamicas: responsableDinamicas,
        responsable_predicacion: responsablePredicacion,
        responsable_testimonios: responsableTestimonios,
        responsable_ayudas: responsableAyudas,
        responsable_datos: responsableDatos,
        responsable_consolidacion: responsableConsolidacion,
        responsable_seguimiento: responsableSeguimiento,
      });
      toast.success("Planificación guardada", {
        description: "La planificación quedó registrada correctamente.",
      });
      onOpenChange(false);
    } catch (err: any) {
      const { formatSupabaseError } = await import("@/lib/supabaseError");
      toast.error("No se pudo guardar la planificación", {
        description: formatSupabaseError(err, "Revisa los datos e intenta de nuevo."),
        duration: 8000,
        action: { label: "Reintentar", onClick: () => handleSubmit() },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg">Hoja de Planeación — Casa de Paz</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Descripción detallada de la preparación: Antes, Durante y Después
          </p>
          {(() => {
            const deadline = tuesdayDeadlineFor(new Date());
            const overdue = deadline.getTime() < Date.now();
            return (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">Fecha límite semanal:</span>
                <span className="capitalize">{formatDeadlineBogota(deadline)}</span>
                <span className="text-muted-foreground">(hora Bogotá)</span>
                <Badge variant={overdue ? "destructive" : "secondary"} className="ml-auto">
                  {deadlineCountdown(deadline)}
                </Badge>
              </div>
            );
          })()}
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] px-6 pb-6">
          <div className="space-y-6">
            {/* Section 1: Datos del grupo */}
            <div className="rounded-lg border p-4 bg-primary/5 space-y-4">
              <p className="text-xs font-semibold uppercase text-primary tracking-wider">
                VISIÓN CMG: Id y haced discípulos a todas las naciones por medio de las casas de paz
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Red *</Label>
                  <Select value={red} onValueChange={setRed}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar red" /></SelectTrigger>
                    <SelectContent>{REDES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Líder Casa de Paz *</Label>
                  <Input value={liderNombre} onChange={e => setLiderNombre(e.target.value)} placeholder="Nombre del líder" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Casa de Paz (Grupo) *</Label>
                  <Select value={grupoId} onValueChange={setGrupoId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                    <SelectContent>
                      {(grupos || []).filter((g: any) => g.tipo === "Casas de paz" || g.tipo === "Grupos encuentro").map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 2: Evaluación equipo */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">EVALUACIÓN EQUIPO DE TRABAJO</h4>
              <p className="text-xs text-muted-foreground">
                Corresponde al trabajo en equipo de su anterior Casa de Paz. Marque SI para quienes cumplieron.
              </p>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left p-2 font-medium">Actividad</th>
                      <th className="text-center p-2 w-16 font-medium">SI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EVAL_ITEMS.map((item, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-2">{item}</td>
                        <td className="text-center p-2">
                          <Checkbox
                            checked={evaluacion[item] || false}
                            onCheckedChange={(v) => setEvaluacion(prev => ({ ...prev, [item]: !!v }))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* Section 3: Antes de la Casa de Paz */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">ANTES DE LA CASA DE PAZ</h4>
              <p className="text-xs text-muted-foreground">Etapas para la preparación de su Casa de Paz</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Persona Responsable de la Invitación *</Label>
                  <Input value={responsableInvitacion} onChange={e => setResponsableInvitacion(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Número de Personas Invitadas *</Label>
                  <Input type="number" value={personasInvitadas} onChange={e => setPersonasInvitadas(Number(e.target.value))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Medios Usados para la invitación *</Label>
                <div className="flex flex-wrap gap-2">
                  {MEDIOS_OPTIONS.map(m => (
                    <label key={m} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={mediosInvitacion.includes(m)} onCheckedChange={() => toggleMedio(mediosInvitacion, setMediosInvitacion, m)} />
                      {m}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Persona responsable de recordar la CDP *</Label>
                  <Input value={responsableRecordar} onChange={e => setResponsableRecordar(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Medios Usados para Recordar *</Label>
                  <div className="flex flex-wrap gap-2">
                    {MEDIOS_OPTIONS.map(m => (
                      <label key={m} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Checkbox checked={mediosRecordar.includes(m)} onCheckedChange={() => toggleMedio(mediosRecordar, setMediosRecordar, m)} />
                        {m}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">AYUNO POR LA CASA DE PAZ (fecha) *</Label>
                  <Input type="date" value={fechaAyuno} onChange={e => setFechaAyuno(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">EVANGELIZACIÓN (fecha) *</Label>
                  <Input type="date" value={fechaEvangelizacion} onChange={e => setFechaEvangelizacion(e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 4: Durante la Casa de Paz */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">DURANTE LA CASA DE PAZ</h4>
              <p className="text-xs text-muted-foreground">Actividades a realizar durante la Casa de Paz</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Oración Inicial *</Label>
                  <Input value={responsableOracion} onChange={e => setResponsableOracion(e.target.value)} placeholder="Persona comprometida" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Adoración y Alabanza *</Label>
                  <Input value={responsableAdoracion} onChange={e => setResponsableAdoracion(e.target.value)} placeholder="Persona comprometida" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Dinámicas *</Label>
                  <Input value={responsableDinamicas} onChange={e => setResponsableDinamicas(e.target.value)} placeholder="Persona comprometida" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Predicación *</Label>
                  <Input value={responsablePredicacion} onChange={e => setResponsablePredicacion(e.target.value)} placeholder="Persona comprometida" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Toma de Testimonios *</Label>
                  <Input value={responsableTestimonios} onChange={e => setResponsableTestimonios(e.target.value)} placeholder="Persona comprometida" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ayudas Didácticas *</Label>
                  <Input value={responsableAyudas} onChange={e => setResponsableAyudas(e.target.value)} placeholder="Videos, Impresiones, etc" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Toma de Datos *</Label>
                  <Input value={responsableDatos} onChange={e => setResponsableDatos(e.target.value)} placeholder="Persona comprometida" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 5: Después */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">DESPUÉS DE LA CASA DE PAZ</h4>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Consolidación *</Label>
                  <Input value={responsableConsolidacion} onChange={e => setResponsableConsolidacion(e.target.value)} placeholder="Llamar a los nuevos antes de 48h" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Seguimiento *</Label>
                  <Input value={responsableSeguimiento} onChange={e => setResponsableSeguimiento(e.target.value)} placeholder="Motivar al nuevo en su crecimiento" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                Recuerda amado Líder que en la excelencia está reflejado Dios, no improvises tu Casa de Paz, planifica y darás fruto.
              </p>
            </div>

            <Button onClick={handleSubmit} disabled={create.isPending || planDeadlinePassed} className="w-full">
              {planDeadlinePassed ? "Fecha límite vencida" : create.isPending ? "Guardando..." : "Guardar Planificación"}
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
