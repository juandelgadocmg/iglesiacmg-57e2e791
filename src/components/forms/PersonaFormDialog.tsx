import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useCreatePersona, useUpdatePersona, useGrupos, usePersonas } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  initialData?: any;
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  onCreated?: (persona: any) => void;
}

const TIPOS_PETICION = ["Financiera", "Familiar", "Sanidad", "Emocional", "Espiritual", "Otros"];

const TIPOS_DOCUMENTO = [
  "Registro Civil",
  "Tarjeta de identidad",
  "Cédula de ciudadanía",
  "Cédula extranjería",
  "Permiso temporal de permanencia",
  "NIT",
  "Pasaporte",
];

const TIPOS_PERSONA = [
  "Miembro",
  "Visitante",
  "CDP",
  "Discípulo",
  "Iglesia Virtual",
  "Estudiante Seminario",
  "Maestro Seminario",
  "Miembro No Activo",
  "Líder Casa de Paz",
  "Líder de Red",
  "Mentor",
  "Pastor Principal",
];

const REDES = ["Nissi", "Rohi", "Jireh", "Adonai", "Shaddai", "Elohim"];

const TIPOS_VINCULACION = [
  "Casas de Paz",
  "Evangelismo en las Calles",
  "Eventos",
  "Fundación",
  "Iglesia",
  "Redes Sociales",
];

const MINISTERIOS = [
  "En Proceso",
  "Protocolo",
  "Alabanza",
  "Danza",
  "Diaconado",
  "Intercesión",
  "Infantil",
  "Afirmación",
  "EscuelasFel",
  "Comunicaciones",
  "Adolescentes y Jóvenes",
];

export default function PersonaFormDialog({ initialData, onClose, open: openProp, onOpenChange, onCreated }: Props) {
  const isEdit = !!initialData;
  const [openInternal, setOpenInternal] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openInternal;
  const setOpen = (v: boolean) => {
    if (!isControlled) setOpenInternal(v);
    onOpenChange?.(v);
  };
  const createPersona = useCreatePersona();
  const updatePersona = useUpdatePersona();
  const { data: grupos } = useGrupos();
  const { data: personas } = usePersonas();

  const [tipoPeticion, setTipoPeticion] = useState("");
  const [descripcionPeticion, setDescripcionPeticion] = useState("");
  const [aceptaPolitica, setAceptaPolitica] = useState(false);

  // Multi-select tipos_persona
  const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      setOpen(true);
      // Use tipos_persona if it has meaningful data (more than one type, or a non-Miembro type)
      // Otherwise fall back to tipo_persona as single source of truth
      const tipoActual: string = initialData.tipo_persona || "Miembro";
      const tiposArr: string[] = initialData.tipos_persona || [];
      // Only trust tipos_persona if it contains the current tipo_persona
      // This avoids showing stale migration data
      const cleanTipos = tiposArr.includes(tipoActual)
        ? [...new Set(tiposArr)]
        : [tipoActual];
      setTiposSeleccionados(cleanTipos.length > 0 ? cleanTipos : [tipoActual]);
    } else {
      // New persona: start with empty selection so user must choose deliberately
      setTiposSeleccionados([]);
    }
  }, [initialData]);

  const handleClose = () => {
    setOpen(false);
    setTipoPeticion("");
    setDescripcionPeticion("");
    setAceptaPolitica(false);
    setTiposSeleccionados([]);
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nombres = (fd.get("nombres") as string)?.trim();
    const apellidos = (fd.get("apellidos") as string)?.trim();
    const documento = (fd.get("documento") as string)?.trim();
    const fechaNac = (fd.get("fecha_nacimiento") as string)?.trim();
    const telefono = (fd.get("telefono") as string)?.trim();
    const direccion = (fd.get("direccion") as string)?.trim();
    if (!nombres || !apellidos) { toast.error("Nombres y apellidos son obligatorios"); return; }
    if (!documento) { toast.error("El documento es obligatorio"); return; }
    if (!fechaNac) { toast.error("La fecha de nacimiento es obligatoria"); return; }
    if (!telefono) { toast.error("El teléfono es obligatorio"); return; }
    if (!direccion) { toast.error("La dirección es obligatoria"); return; }
    if (!isEdit && !aceptaPolitica) { toast.error("Debe aceptar la política de tratamiento de datos"); return; }
    if (tiposSeleccionados.length === 0) { toast.error("Debes seleccionar al menos un tipo de asistente"); return; }


    const clean = (key: string) => {
      const v = (fd.get(key) as string)?.trim();
      return v && v !== "none" ? v : null;
    };

    const payload: any = {
      nombres,
      apellidos,
      telefono: clean("telefono"),
      whatsapp: clean("whatsapp"),
      email: clean("email"),
      direccion: clean("direccion"),
      sexo: clean("sexo"),
      fecha_nacimiento: clean("fecha_nacimiento"),
      tipo_persona: (tiposSeleccionados[0] || "Miembro") as any,
      tipos_persona: tiposSeleccionados,
      estado_iglesia: clean("estado_iglesia") || "Activo",
      grupo_id: clean("grupo_id"),
      estado_civil: clean("estado_civil"),
      ocupacion: clean("ocupacion"),
      observaciones: clean("observaciones"),
      invitado_por: clean("invitado_por"),
      seguimiento_por: clean("seguimiento_por"),
      tipo_documento: clean("tipo_documento"),
      documento: clean("documento"),
      nacionalidad: clean("nacionalidad"),
      vinculacion: clean("vinculacion"),
      ministerio: clean("ministerio"),
    };

    // Handle red field - stored on grupo, not persona. Skip for now.

    try {
      let personaId: string | undefined;
      const previousGrupoId: string | null = isEdit ? (initialData?.grupo_id || null) : null;
      if (isEdit) {
        await updatePersona.mutateAsync({ id: initialData.id, ...payload });
        personaId = initialData.id;
        toast.success("Persona actualizada");
      } else {
        const result = await createPersona.mutateAsync(payload);
        personaId = (result as any)?.id;
        const tipoResumen = tiposSeleccionados[0] || "Miembro";
        toast.success(`Persona creada: ${nombres} ${apellidos}`, {
          description: `Tipo: ${tipoResumen}${clean("telefono") ? ` • Tel: ${clean("telefono")}` : ""}${clean("email") ? ` • ${clean("email")}` : ""}`,
          duration: 6000,
        });
        if (result) onCreated?.(result);
      }

      // La sincronización con grupo_miembros la maneja el trigger de BD
      // (sync_grupo_miembros_from_persona) automáticamente al insertar/actualizar grupo_id.

      // Save tipos_persona array separately for edits. New records are created through
      // the backend helper with tipos_persona already included, avoiding a second write.
      if (isEdit && personaId && tiposSeleccionados.length > 0) {
        const { error: tiposErr } = await supabase
          .from("personas")
          .update({ tipos_persona: tiposSeleccionados } as any)
          .eq("id", personaId);
        if (tiposErr && (tiposErr.message?.includes("tipos_persona") || tiposErr.message?.includes("schema cache"))) {
          toast.warning(
            "Los datos se guardaron. Para activar múltiples tipos ejecuta en Supabase → SQL Editor: ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS tipos_persona TEXT[] DEFAULT \'{}\';",
            { duration: 8000 }
          );
        }
      }

      if (tipoPeticion && personaId) {
        const { error } = await supabase.from("peticiones_oracion").insert({
          persona_id: personaId,
          titulo: `${tipoPeticion} - ${nombres} ${apellidos}`,
          descripcion: descripcionPeticion || null,
          tipo: tipoPeticion,
          estado: "Pendiente",
          prioridad: "Normal",
        } as any);
        if (error) console.error("Error creating petition:", error);
      }

      handleClose();
    } catch (err: any) {
      const message = String(err?.message || "");
      if (!isEdit && /row-level security|permission denied|violates row-level security|42501/i.test(message)) {
        toast.error("No tienes permiso para crear personas", {
          description: "El backend bloqueó el guardado porque falta el permiso personas:create para tu rol.",
        });
        return;
      }
      toast.error(isEdit ? "Error al actualizar" : "Error al crear persona", { description: message });
    }
  };

  const isPending = createPersona.isPending || updatePersona.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      {!isEdit && !isControlled && (
        <DialogTrigger asChild>
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Nueva Persona
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Persona" : "Registrar Nueva Persona"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* === DATOS PERSONALES === */}
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Datos personales</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombres">Nombres *</Label>
              <Input id="nombres" name="nombres" required maxLength={100} defaultValue={initialData?.nombres || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apellidos">Apellidos *</Label>
              <Input id="apellidos" name="apellidos" required maxLength={100} defaultValue={initialData?.apellidos || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo_documento">Tipo de documento</Label>
              <Select name="tipo_documento" defaultValue={initialData?.tipo_documento || "none"}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {TIPOS_DOCUMENTO.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="documento">Número de documento *</Label>
              <Input id="documento" name="documento" required maxLength={30} defaultValue={initialData?.documento || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nacionalidad">Nacionalidad</Label>
              <Input id="nacionalidad" name="nacionalidad" maxLength={60} placeholder="Ej: Colombiana" defaultValue={initialData?.nacionalidad || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sexo">Sexo</Label>
              <Select name="sexo" defaultValue={initialData?.sexo || "none"}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Femenino">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_nacimiento">Fecha de nacimiento *</Label>
              <Input id="fecha_nacimiento" name="fecha_nacimiento" type="date" required defaultValue={initialData?.fecha_nacimiento || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado_civil">Estado civil</Label>
              <Select name="estado_civil" defaultValue={initialData?.estado_civil || "none"}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  <SelectItem value="Soltero/a">Soltero/a</SelectItem>
                  <SelectItem value="Casado/a">Casado/a</SelectItem>
                  <SelectItem value="Unión libre">Unión libre</SelectItem>
                  <SelectItem value="Viudo/a">Viudo/a</SelectItem>
                  <SelectItem value="Divorciado/a">Divorciado/a</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input id="telefono" name="telefono" required maxLength={20} defaultValue={initialData?.telefono || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" name="whatsapp" maxLength={20} placeholder="Ej: +57 300 1234567" defaultValue={initialData?.whatsapp || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" maxLength={255} defaultValue={initialData?.email || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ocupacion">Ocupación</Label>
              <Input id="ocupacion" name="ocupacion" maxLength={100} defaultValue={initialData?.ocupacion || ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="direccion">Dirección *</Label>
              <Input id="direccion" name="direccion" required maxLength={255} defaultValue={initialData?.direccion || ""} />
            </div>
          </div>

          {/* === INFORMACIÓN CONGREGACIONAL === */}
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Información congregacional</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Tipo de asistente <span className="text-destructive">*</span> <span className="text-muted-foreground font-normal text-xs">(puedes seleccionar varios)</span></Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg border p-3 bg-muted/20">
                {TIPOS_PERSONA.map(tipo => (
                  <label key={tipo} className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors text-xs ${
                    tiposSeleccionados.includes(tipo) ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                  }`}>
                    <Checkbox
                      checked={tiposSeleccionados.includes(tipo)}
                      onCheckedChange={(checked) => {
                        setTiposSeleccionados(prev =>
                          checked ? [...prev, tipo] : prev.filter(t => t !== tipo)
                        );
                      }}
                      className="h-3.5 w-3.5"
                    />
                    <span>{tipo}</span>
                  </label>
                ))}
              </div>
              {tiposSeleccionados.length === 0 && (
                <p className="text-xs text-destructive">⚠️ Selecciona al menos un tipo</p>
              )}
              {tiposSeleccionados.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Seleccionados: <strong>{tiposSeleccionados.join(", ")}</strong>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado_iglesia">Estado</Label>
              <Select name="estado_iglesia" defaultValue={initialData?.estado_iglesia || "Activo"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Inactivo">Inactivo</SelectItem>
                  <SelectItem value="En proceso">En proceso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vinculacion">Tipo de vinculación</Label>
              <Select name="vinculacion" defaultValue={initialData?.vinculacion || "none"}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {TIPOS_VINCULACION.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ministerio">Ministerio</Label>
              <Select name="ministerio" defaultValue={initialData?.ministerio || "none"}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {MINISTERIOS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Red</Label>
              <Select name="red_persona" defaultValue="none">
                <SelectTrigger><SelectValue placeholder="Seleccionar red" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {REDES.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grupo_id">Grupo</Label>
              <Select name="grupo_id" defaultValue={initialData?.grupo_id || "none"}>
                <SelectTrigger><SelectValue placeholder="Sin grupo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin grupo</SelectItem>
                  {(grupos || []).map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* === SEGUIMIENTO PASTORAL === */}
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Seguimiento pastoral</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invitado_por">¿Quién lo invitó a la iglesia?</Label>
              <Input id="invitado_por" name="invitado_por" maxLength={200} placeholder="Nombre de quien lo invitó" defaultValue={initialData?.invitado_por || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seguimiento_por">Persona encargada del seguimiento</Label>
              <Input id="seguimiento_por" name="seguimiento_por" maxLength={200} placeholder="Nombre del encargado" defaultValue={initialData?.seguimiento_por || ""} />
            </div>
          </div>

          {/* === PETICIÓN DE ORACIÓN === */}
          {!isEdit && (
            <>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Petición de oración (opcional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de petición</Label>
                  <Select value={tipoPeticion} onValueChange={setTipoPeticion}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_PETICION.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Descripción de la petición</Label>
                  <Textarea value={descripcionPeticion} onChange={e => setDescripcionPeticion(e.target.value)} maxLength={500} rows={2} placeholder="Describa brevemente la petición..." />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" name="observaciones" maxLength={500} rows={3} defaultValue={initialData?.observaciones || ""} />
          </div>

          {/* === POLÍTICA DE DATOS === */}
          {!isEdit && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Este formulario contiene información privilegiada y confidencial de acuerdo a la Ley Estatutaria 1581 de 2012 de Protección de datos y con los Decretos 1377 de 2013 y 1759 de 2016, el titular presta su consentimiento para que sus datos, facilitados voluntariamente pasen a formar parte de una base de datos responsabilidad de la Iglesia Cristiana Centro Mundial de Gloria, cuya finalidad está relacionada única y exclusivamente con el objeto de la misma.
              </p>
              <p className="text-xs font-semibold text-muted-foreground">
                Este formulario es Propiedad de Centro Mundial de Gloria, Iglesia Cristiana.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="politica_datos"
                  checked={aceptaPolitica}
                  onCheckedChange={(v) => setAceptaPolitica(v === true)}
                />
                <Label htmlFor="politica_datos" className="text-sm cursor-pointer">
                  Acepto la política de tratamiento de datos personales *
                </Label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending || (!isEdit && !aceptaPolitica)}>
              {isPending ? "Guardando..." : isEdit ? "Actualizar" : "Guardar Persona"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
