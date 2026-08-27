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
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, CheckCircle2, Clock, PhoneCall, UserCheck, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PersonaHitoEstado,
  RESULTADOS_LLAMADA_OPCIONES,
} from "@/hooks/useAfirmacionRuta";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personaNombre: string;
  personaId: string;
  hito: PersonaHitoEstado | null;
  onSave: (payload: {
    personaId: string;
    procesoId?: string;
    hitoNombre: string;
    estado: "Pendiente" | "En curso" | "Finalizado";
    fechaRealizada?: string | null;
    observacion?: string | null;
    codificacionLlamada?: string | null;
    consolidadorNombre?: string | null;
  }) => Promise<void>;
}

export function HitoEditDialog({
  open,
  onOpenChange,
  personaNombre,
  personaId,
  hito,
  onSave,
}: Props) {
  const [estado, setEstado] = useState<"Pendiente" | "En curso" | "Finalizado">("Pendiente");
  const [fechaRealizada, setFechaRealizada] = useState<Date | undefined>(undefined);
  const [resultadoLlamada, setResultadoLlamada] = useState<string>("");
  const [observacion, setObservacion] = useState("");
  const [responsable, setResponsable] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hito) {
      setEstado(hito.estado);
      setFechaRealizada(hito.fechaRealizada ? parseISO(hito.fechaRealizada) : new Date());
      setResultadoLlamada(hito.resultadoLlamada || (hito.hitoDef.tipo === "llamada" ? "Contestó y atendió" : ""));
      setObservacion(hito.observacion || "");
      setResponsable(hito.responsableNombre || "");
    }
  }, [hito, open]);

  if (!hito) return null;

  const isLlamada = hito.hitoDef.tipo === "llamada";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        personaId,
        procesoId: hito.procesoId,
        hitoNombre: hito.hitoDef.nombre,
        estado,
        fechaRealizada: fechaRealizada ? format(fechaRealizada, "yyyy-MM-dd") : null,
        observacion,
        codificacionLlamada: isLlamada ? resultadoLlamada : null,
        consolidadorNombre: responsable,
      });
      onOpenChange(false);
    } catch {
      /* handled in hook */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6 border-border/80 shadow-2xl bg-card">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 font-bold">
              Hito {hito.hitoDef.index} de 16
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">{personaNombre}</span>
          </div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {isLlamada ? <PhoneCall className="h-5 w-5 text-emerald-600" /> : <Sparkles className="h-5 w-5 text-primary" />}
            {hito.hitoDef.nombre}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Actualiza la fecha de realización, estado del hito y observaciones.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* Estado Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Estado del Hito</Label>
            <Select value={estado} onValueChange={(val: any) => setEstado(val)}>
              <SelectTrigger className="h-10 rounded-xl bg-background border-border">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendiente">
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> ⚪ Pendiente
                  </span>
                </SelectItem>
                <SelectItem value="En curso">
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> 🔵 En curso
                  </span>
                </SelectItem>
                <SelectItem value="Finalizado">
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 🟢 Finalizado
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resultado de la llamada (Solo si es llamada) */}
          {isLlamada && (
            <div className="space-y-1.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <Label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <PhoneCall className="h-3.5 w-3.5 text-emerald-600" /> Resultado de la Llamada
              </Label>
              <Select value={resultadoLlamada} onValueChange={setResultadoLlamada}>
                <SelectTrigger className="h-10 rounded-xl bg-background border-emerald-500/30 text-xs font-medium">
                  <SelectValue placeholder="Seleccionar resultado..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {RESULTADOS_LLAMADA_OPCIONES.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-xs">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Fecha Realizada */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5 text-primary" /> Fecha de Realización
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-10 rounded-xl">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {fechaRealizada ? (
                    format(fechaRealizada, "dd 'de' MMMM, yyyy", { locale: es })
                  ) : (
                    <span className="text-muted-foreground text-xs">Sin fecha asignada</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={fechaRealizada}
                  onSelect={setFechaRealizada}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Responsable */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Consolidador / Responsable</Label>
            <Input
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              placeholder="Nombre del consolidador"
              className="h-10 rounded-xl bg-background border-border text-xs"
            />
          </div>

          {/* Observación / Notas */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Observaciones y Notas</Label>
            <Textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Notas sobre el resultado del hito, compromisos o detalles..."
              className="rounded-xl bg-background border-border text-xs min-h-[80px]"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-xl bg-primary text-primary-foreground font-bold text-xs gap-1.5"
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar Hito"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
