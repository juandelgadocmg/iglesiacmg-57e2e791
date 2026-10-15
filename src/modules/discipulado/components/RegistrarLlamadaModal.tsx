import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useVisitas } from "../hooks/useVisitas";
import { PhoneCall, Calendar, Clock, User, FileText, CheckCircle2 } from "lucide-react";

interface RegistrarLlamadaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discipulos: any[];
  liderId?: string;
  defaultDiscipuloId?: string;
  onSuccess: () => void;
}

export function RegistrarLlamadaModal({
  open,
  onOpenChange,
  discipulos,
  liderId,
  defaultDiscipuloId,
  onSuccess,
}: RegistrarLlamadaModalProps) {
  const { registrarLlamada, loading } = useVisitas();
  
  const [discipuloId, setDiscipuloId] = useState(defaultDiscipuloId || "");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [hora, setHora] = useState("");
  const [descripcion, setDescripcion] = useState("Contestó y oró");

  useEffect(() => {
    if (open) {
      setDiscipuloId(defaultDiscipuloId || "");
      setFecha(new Date().toISOString().split("T")[0]);
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, "0");
      const mm = now.getMinutes().toString().padStart(2, "0");
      setHora(`${hh}:${mm}`);
      if (!descripcion) {
        setDescripcion("Contestó y oró");
      }
    }
  }, [open, defaultDiscipuloId]);

  const selectedDiscipulo = discipulos.find((d) => d.id === discipuloId);

  const quickOptions = [
    "Contestó y oró",
    "Seguimiento y palabra",
    "Invitación a casa de paz",
    "No contestó / Dejó mensaje",
    "Línea ocupada"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discipuloId) {
      toast.error("Por favor selecciona un discípulo");
      return;
    }

    if (!liderId) {
      toast.error("No se identificó el líder para registrar la llamada");
      return;
    }

    if (!descripcion.trim()) {
      toast.error("Por favor escribe el motivo o resumen de la llamada");
      return;
    }

    const res = await registrarLlamada(discipuloId, liderId, fecha, hora, descripcion.trim());
    
    if (res) {
      const name = selectedDiscipulo?.full_name ? ` para ${selectedDiscipulo.full_name}` : "";
      toast.success(`Llamada registrada exitosamente${name} (+1 en Mi Cosecha)`);
      onSuccess();
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setDiscipuloId(defaultDiscipuloId || "");
    setFecha(new Date().toISOString().split("T")[0]);
    setHora("");
    setDescripcion("Contestó y oró");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-11/12 sm:w-full rounded-2xl p-6">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-slate-800">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="leading-tight">Registrar Llamada Realizada</p>
              <p className="text-xs font-normal text-slate-500 mt-0.5">
                Guarda el seguimiento telefónico en el historial y Mi Cosecha
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Selector de Discípulo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Discípulo *</span>
            </Label>
            <Select value={discipuloId} onValueChange={setDiscipuloId}>
              <SelectTrigger className="h-10 rounded-xl bg-slate-50/60 border-slate-200">
                <SelectValue placeholder="Selecciona un discípulo..." />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {discipulos.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 text-center">
                    No hay discípulos disponibles
                  </div>
                ) : (
                  discipulos.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="font-medium text-slate-800">{d.full_name}</span>
                      {d.telefono && (
                        <span className="text-[11px] text-slate-400 ml-2 font-mono">
                          ({d.telefono})
                        </span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedDiscipulo?.telefono && (
              <p className="text-[11px] text-slate-500 px-1">
                Teléfono: <span className="font-mono text-slate-700 font-semibold">{selectedDiscipulo.telefono}</span>
              </p>
            )}
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Fecha *</span>
              </Label>
              <Input 
                type="date" 
                value={fecha} 
                onChange={(e) => setFecha(e.target.value)} 
                required 
                className="h-10 rounded-xl bg-slate-50/60 border-slate-200 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Hora</span>
              </Label>
              <Input 
                type="time" 
                value={hora} 
                onChange={(e) => setHora(e.target.value)} 
                className="h-10 rounded-xl bg-slate-50/60 border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Resultado / Resumen con Botones Rápidos */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Resultado / Resumen de la Llamada *</span>
              </span>
            </Label>

            {/* Opciones rápidas */}
            <div className="flex flex-wrap gap-1.5">
              {quickOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDescripcion(opt)}
                  className={`px-2 py-1 text-[11px] rounded-lg font-medium transition-all ${
                    descripcion === opt
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <Textarea 
              value={descripcion} 
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Escribe un breve resumen de lo conversado u orado..."
              rows={3}
              required
              className="rounded-xl border-slate-200 text-xs bg-slate-50/60 resize-none"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              className="w-1/3 rounded-xl border-slate-200 text-slate-600 font-semibold text-xs h-11"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-11 shadow-md shadow-blue-900/20 flex items-center justify-center gap-2"
              disabled={loading}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? "Guardando..." : "Guardar Llamada"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
