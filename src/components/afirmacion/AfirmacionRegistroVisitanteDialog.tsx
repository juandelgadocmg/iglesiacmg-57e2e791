import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useCreatePersona, useGrupos } from "@/hooks/useDatabase";
import { TIPOS_DOCUMENTO } from "@/components/forms/PersonaFormDialog";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function calcularEdad(fechaNacimiento: string): number | null {
  if (!fechaNacimiento) return null;
  const nac = new Date(fechaNacimiento);
  if (isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad >= 0 ? edad : null;
}

const emptyForm = {
  nombres: "",
  apellidos: "",
  sexo: "" as "" | "Masculino" | "Femenino",
  fechaNacimiento: "",
  tipoDocumento: "none",
  documento: "",
  direccion: "",
  barrio: "",
  celular: "",
  correo: "",
  invitadoPor: "",
  cdpGrupoId: "none",
  consolidador: "",
  motivoOracion: "",
  aceptaPolitica: false,
};

export function AfirmacionRegistroVisitanteDialog({ open, onOpenChange }: Props) {
  const createPersona = useCreatePersona();
  const { data: grupos } = useGrupos();
  const [form, setForm] = useState(emptyForm);
  const [registradosSesion, setRegistradosSesion] = useState(0);
  const [saving, setSaving] = useState(false);

  const edad = useMemo(() => calcularEdad(form.fechaNacimiento), [form.fechaNacimiento]);

  const set = (key: keyof typeof form, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () => setForm(emptyForm);

  const validar = (): string | null => {
    if (!form.nombres.trim()) return "El nombre es obligatorio";
    if (!form.apellidos.trim()) return "El apellido es obligatorio";
    if (!form.celular.trim()) return "El celular es obligatorio para poder hacer seguimiento";
    if (!form.aceptaPolitica) return "Debes aceptar la política de tratamiento de datos";
    return null;
  };

  const guardar = async (cerrarDespues: boolean) => {
    const errorMsg = validar();
    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        sexo: form.sexo || null,
        fecha_nacimiento: form.fechaNacimiento || null,
        tipo_documento: form.tipoDocumento !== "none" ? form.tipoDocumento : null,
        documento: form.documento.trim() || null,
        telefono: form.celular.trim(),
        whatsapp: form.celular.trim(),
        email: form.correo.trim() || null,
        direccion: form.direccion.trim() || null,
        barrio: form.barrio.trim() || null,
        invitado_por: form.invitadoPor.trim() || null,
        seguimiento_por: form.consolidador.trim() || null,
        grupo_id: form.cdpGrupoId !== "none" ? form.cdpGrupoId : null,
        // Importante: SIEMPRE "Visitante" / "Afirmación", nunca "CDP", para que esta
        // persona sí aparezca en el módulo de Afirmación (que excluye a Casas de Paz).
        tipo_persona: "Visitante",
        tipos_persona: ["Visitante"],
        ministerio: "Afirmación",
        estado_iglesia: "Activo",
        fecha_ingreso: new Date().toISOString().slice(0, 10),
      };

      const result = await createPersona.mutateAsync(payload);
      const personaId = (result as any)?.id;

      if (form.motivoOracion.trim() && personaId) {
        const { error: peticionErr } = await supabase.from("peticiones_oracion").insert({
          persona_id: personaId,
          titulo: `Petición de oración - ${form.nombres} ${form.apellidos}`,
          descripcion: form.motivoOracion.trim(),
          tipo: "Otros",
          estado: "Pendiente",
          prioridad: "Normal",
        } as any);
        if (peticionErr) console.error("Error creando petición de oración:", peticionErr);
      }

      toast.success(`${form.nombres} ${form.apellidos} registrado en Afirmación`, {
        description: "Ya aparece en la ruta de 16 hitos.",
      });

      setRegistradosSesion((n) => n + 1);
      resetForm();

      if (cerrarDespues) {
        onOpenChange(false);
      }
    } catch (err: any) {
      const message = String(err?.message || "");
      if (/row-level security|permission denied|42501/i.test(message)) {
        toast.error("No tienes permiso para registrar personas", {
          description: "Falta el permiso personas:create para tu rol.",
        });
      } else {
        toast.error("Error al registrar visitante", { description: message });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setRegistradosSesion(0);
      resetForm();
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 sticky top-0 bg-card z-10 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-primary" /> Registrar Visitante
          </DialogTitle>
          <DialogDescription>
            Ficha de membresía digital para el ministerio de Afirmación. Diseñada para digitar
            desde el celular en el momento del contacto.
          </DialogDescription>
          {registradosSesion > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 w-fit mt-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> {registradosSesion} registrado(s) en esta sesión
            </div>
          )}
        </DialogHeader>

        <div className="px-5 py-4 space-y-5">
          {/* Datos personales */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Datos personales</p>

            <div className="space-y-1.5">
              <Label htmlFor="af-nombres">Nombres *</Label>
              <Input
                id="af-nombres"
                value={form.nombres}
                onChange={(e) => set("nombres", e.target.value)}
                className="h-12 text-base"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="af-apellidos">Apellidos *</Label>
              <Input
                id="af-apellidos"
                value={form.apellidos}
                onChange={(e) => set("apellidos", e.target.value)}
                className="h-12 text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sexo</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => set("sexo", "Masculino")}
                    className={`h-12 rounded-lg border text-sm font-semibold transition-colors ${
                      form.sexo === "Masculino"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    M
                  </button>
                  <button
                    type="button"
                    onClick={() => set("sexo", "Femenino")}
                    className={`h-12 rounded-lg border text-sm font-semibold transition-colors ${
                      form.sexo === "Femenino"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    F
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="af-fecnac">Fecha Nac.</Label>
                <Input
                  id="af-fecnac"
                  type="date"
                  value={form.fechaNacimiento}
                  onChange={(e) => set("fechaNacimiento", e.target.value)}
                  className="h-12 text-base"
                />
                {edad !== null && (
                  <p className="text-[11px] text-muted-foreground pl-0.5">Edad: <strong>{edad} años</strong></p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo Doc.</Label>
                <Select value={form.tipoDocumento} onValueChange={(v) => set("tipoDocumento", v)}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    {TIPOS_DOCUMENTO.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="af-doc">Documento</Label>
                <Input
                  id="af-doc"
                  value={form.documento}
                  onChange={(e) => set("documento", e.target.value)}
                  className="h-12 text-base"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          {/* Contacto y ubicación */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Contacto y ubicación</p>

            <div className="space-y-1.5">
              <Label htmlFor="af-cel">Celular *</Label>
              <Input
                id="af-cel"
                value={form.celular}
                onChange={(e) => set("celular", e.target.value)}
                className="h-12 text-base"
                inputMode="tel"
                placeholder="300 000 0000"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="af-correo">Correo</Label>
              <Input
                id="af-correo"
                type="email"
                value={form.correo}
                onChange={(e) => set("correo", e.target.value)}
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="af-dir">Dirección</Label>
              <Input
                id="af-dir"
                value={form.direccion}
                onChange={(e) => set("direccion", e.target.value)}
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="af-barrio">Barrio</Label>
              <Input
                id="af-barrio"
                value={form.barrio}
                onChange={(e) => set("barrio", e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </div>

          {/* Seguimiento pastoral */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Seguimiento pastoral</p>

            <div className="space-y-1.5">
              <Label htmlFor="af-invitado">Invitado Por</Label>
              <Input
                id="af-invitado"
                value={form.invitadoPor}
                onChange={(e) => set("invitadoPor", e.target.value)}
                className="h-12 text-base"
                placeholder="Nombre de quien lo invitó"
              />
            </div>

            <div className="space-y-1.5">
              <Label>CDP (Casa de Paz de referencia)</Label>
              <Select value={form.cdpGrupoId} onValueChange={(v) => set("cdpGrupoId", v)}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {(grupos as any[] || []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nombre} {g.red ? `(Red ${g.red})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground pl-0.5">
                Solo como referencia de a qué Casa de Paz remitirlo — esta persona seguirá
                apareciendo en Afirmación.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="af-consolidador">Consolidador</Label>
              <Input
                id="af-consolidador"
                value={form.consolidador}
                onChange={(e) => set("consolidador", e.target.value)}
                className="h-12 text-base"
                placeholder="Nombre del encargado de seguimiento"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="af-oracion">Motivo de oración (opcional)</Label>
              <Textarea
                id="af-oracion"
                value={form.motivoOracion}
                onChange={(e) => set("motivoOracion", e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Describe brevemente la petición..."
              />
            </div>
          </div>

          {/* Política de datos */}
          <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2.5">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Esta ficha contiene información privileged y confidencial de acuerdo a la Ley
              Estatutaria 1581 de 2012 de Protección de Datos y los Decretos 1377 de 2013 y 1759
              de 2016. El titular presta su consentimiento para que sus datos pasen a formar
              parte de una base de datos responsabilidad de la Iglesia Cristiana Centro Mundial
              de Gloria.
            </p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="af-politica"
                checked={form.aceptaPolitica}
                onCheckedChange={(v) => set("aceptaPolitica", v === true)}
              />
              <Label htmlFor="af-politica" className="text-sm cursor-pointer">
                Acepto la política de tratamiento de datos *
              </Label>
            </div>
          </div>
        </div>

        {/* Sticky action bar (mobile-friendly) */}
        <div className="sticky bottom-0 bg-card border-t border-border/60 px-5 py-3 flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => guardar(false)}
            disabled={saving}
            className="h-12 text-base font-bold gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Guardar y registrar otro
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => guardar(true)}
            disabled={saving}
            className="h-10 text-sm"
          >
            Guardar y cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AfirmacionRegistroVisitanteDialog;
