import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PhoneCall, CheckCircle2, AlertCircle, Calendar, UserCheck, Check } from "lucide-react";
import { toast } from "sonner";
import {
  CODIFICACIONES_LLAMADA,
  CodificacionLlamada,
  useConsolidacionLlamadas,
} from "@/hooks/useConsolidacionLlamadas";
import { supabase } from "@/integrations/supabase/client";
import { INITIAL_DISCIPULOS } from "@/data/discipulandoInitialData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona?: {
    id: string;
    nombres: string;
    apellidos: string;
    telefono?: string | null;
    grupos?: { red?: string } | null;
    seguimiento_por?: string | null;
    lider_responsable?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function RegistrarLlamadaConsolidacionDialog({
  open,
  onOpenChange,
  persona,
  onSuccess,
}: Props) {
  const { registrarLlamada, isSubmitting } = useConsolidacionLlamadas(persona?.id);

  // Form states
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(persona?.id || "");
  const [personaNombre, setPersonaNombre] = useState<string>(
    persona ? `${persona.nombres} ${persona.apellidos}` : ""
  );
  const [codificacion, setCodificacion] = useState<CodificacionLlamada | "">("");
  const [observacion, setObservacion] = useState("");
  const [completo45Dias, setCompleto45Dias] = useState(false);
  const [fechaLlamada, setFechaLlamada] = useState(new Date().toISOString().slice(0, 10));

  // Personas list for standalone picker
  const [personaOptions, setPersonaOptions] = useState<{ id: string; nombre: string; red?: string }[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);

  useEffect(() => {
    if (persona) {
      setSelectedPersonaId(persona.id);
      setPersonaNombre(`${persona.nombres} ${persona.apellidos}`);
    } else if (open) {
      setLoadingPersonas(true);

      async function fetchPeopleOptions() {
        const optionsMap = new Map<string, { id: string; nombre: string; red?: string }>();

        // 1. Initial Discipulos Backup
        INITIAL_DISCIPULOS.forEach((d) => {
          if (d.id && d.full_name) {
            optionsMap.set(d.id, { id: d.id, nombre: d.full_name });
          }
        });

        // 2. Fetch DB Personas
        try {
          const { data: pData, error: pError } = await supabase
            .from("personas")
            .select("id, nombres, apellidos")
            .order("nombres", { ascending: true })
            .limit(500);

          if (!pError && pData && pData.length > 0) {
            pData.forEach((p: any) => {
              const name = `${p.nombres || ""} ${p.apellidos || ""}`.trim();
              if (p.id && name) {
                optionsMap.set(p.id, { id: p.id, nombre: name });
              }
            });
          }
        } catch (e) {
          console.warn("Could not load personas table options:", e);
        }

        // 3. Fetch DB Discipulos
        try {
          const { data: dData, error: dError } = await supabase
            .from("discipulos" as any)
            .select("id, full_name")
            .order("full_name", { ascending: true })
            .limit(500);

          if (!dError && dData && dData.length > 0) {
            dData.forEach((d: any) => {
              if (d.id && d.full_name) {
                optionsMap.set(d.id, { id: d.id, nombre: d.full_name });
              }
            });
          }
        } catch (e) {
          console.warn("Could not load discipulos table options:", e);
        }

        const sortedOptions = Array.from(optionsMap.values()).sort((a, b) =>
          a.nombre.localeCompare(b.nombre)
        );
        setPersonaOptions(sortedOptions);
        setLoadingPersonas(false);
      }

      fetchPeopleOptions();
    }
  }, [persona, open]);

  const handleSelectPersona = (id: string) => {
    setSelectedPersonaId(id);
    const found = personaOptions.find((p) => p.id === id);
    if (found) {
      setPersonaNombre(found.nombre);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPersonaId) {
      toast.error("Por favor selecciona una persona para la llamada.");
      return;
    }

    if (!codificacion) {
      toast.error("La codificación de la llamada es obligatoria. Por favor selecciona una opción.");
      return;
    }

    if (codificacion === "Otro" && !observacion.trim()) {
      toast.error("Al seleccionar 'Otro', el campo de observación es obligatorio.");
      return;
    }

    try {
      await registrarLlamada({
        persona_id: selectedPersonaId,
        persona_nombre: personaNombre,
        codificacion: codificacion as CodificacionLlamada,
        observacion: observacion.trim() || null,
        fecha_llamada: new Date(fechaLlamada).toISOString(),
        completo_45_dias: completo45Dias,
        red: persona?.grupos?.red,
        lider_responsable: persona?.lider_responsable || persona?.seguimiento_por,
      });

      // Reset form
      setCodificacion("");
      setObservacion("");
      setCompleto45Dias(false);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <PhoneCall className="h-4 w-4" />
            </div>
            Registrar Llamada de Consolidación
          </div>
          <DialogDescription className="text-xs">
            Ingresa la codificación estandarizada y objetiva de la llamada realizada al discípulo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm mt-2">
          {/* Persona selector / read-only display */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Discípulo / Persona <span className="text-destructive">*</span></Label>
            {persona ? (
              <Input value={`${persona.nombres} ${persona.apellidos}`} disabled className="bg-muted font-medium" />
            ) : (
              <Select value={selectedPersonaId} onValueChange={handleSelectPersona}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingPersonas ? "Cargando personas..." : "Selecciona una persona"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {personaOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} {p.red ? `(${p.red})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Codificación de la llamada (MANDATORY SELECT) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1">
                Resultado / Codificación de Llamada <span className="text-destructive">*</span>
              </Label>
              <span className="text-[10px] text-destructive font-semibold">Obligatorio</span>
            </div>
            <Select value={codificacion} onValueChange={(v) => setCodificacion(v as CodificacionLlamada)}>
              <SelectTrigger className={!codificacion ? "border-amber-400 bg-amber-500/5" : ""}>
                <SelectValue placeholder="-- Selecciona resultado obligatorio --" />
              </SelectTrigger>
              <SelectContent>
                {CODIFICACIONES_LLAMADA.map((item) => (
                  <SelectItem key={item} value={item} className="font-medium">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10.5px] text-muted-foreground">
              Debe seleccionar objetivamente la codificación predeterminada correspondiente.
            </p>
          </div>

          {/* Observación field */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Observación {codificacion === "Otro" && <span className="text-destructive">* (Obligatorio)</span>}
              </Label>
            </div>
            <Textarea
              placeholder={
                codificacion === "Otro"
                  ? "Describe los detalles obligatorios de la llamada..."
                  : "Notas adicionales del seguimiento realizado..."
              }
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Fecha de llamada */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Fecha de Llamada
            </Label>
            <Input
              type="date"
              value={fechaLlamada}
              onChange={(e) => setFechaLlamada(e.target.value)}
            />
          </div>

          {/* Finalización de 45 días toggle */}
          <div className="p-3 rounded-xl border bg-gradient-to-r from-primary/5 to-card flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold flex items-center gap-1 text-primary">
                <UserCheck className="h-3.5 w-3.5" /> Culminó los 45 días de Consolidación
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Marcar si la persona ha completado satisfactoriamente el ciclo de 45 días.
              </p>
            </div>
            <Switch checked={completo45Dias} onCheckedChange={setCompleto45Dias} />
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2 font-bold">
              {isSubmitting ? (
                "Guardando..."
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Registrar Llamada
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
