import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useVisitas } from "../hooks/useVisitas";
import { Phone, PhoneCall, MessageCircle, CheckCircle2, Clock, PhoneMissed, Sparkles } from "lucide-react";

interface LlamarDiscipuloModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discipulo: any | null;
  liderId?: string;
  onSuccess?: () => void;
}

export function LlamarDiscipuloModal({
  open,
  onOpenChange,
  discipulo,
  liderId,
  onSuccess,
}: LlamarDiscipuloModalProps) {
  const { registrarLlamada, loading } = useVisitas();
  const [descripcion, setDescripcion] = useState("Llamada de seguimiento y oración");
  const [guardado, setGuardado] = useState(false);

  if (!discipulo) return null;

  const rawPhone = discipulo.telefono || "";
  const cleanPhone = rawPhone.replace(/\D/g, "");
  const waPhone = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;

  const handleLlamarNativo = () => {
    onOpenChange(false);
    window.dispatchEvent(
      new CustomEvent("doxa-call-number", {
        detail: { discipulo, phone: cleanPhone },
      })
    );
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(`Hola ${discipulo.full_name}, Dios te bendiga. Te escribo de la iglesia Centro Mundial de Gloria.`)}`, "_blank");
  };

  const handleGuardarRegistro = async (resultadoTexto?: string) => {
    if (!liderId) {
      toast.error("No se encontró el ID del líder para registrar la llamada");
      return;
    }

    const textoFinal = resultadoTexto || descripcion;
    const hoy = new Date().toISOString().split("T")[0];
    const ahora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const res = await registrarLlamada(
      discipulo.id,
      liderId,
      hoy,
      ahora,
      textoFinal
    );

    if (res) {
      setGuardado(true);
      toast.success(`Llamada registrada para ${discipulo.full_name} (+1 en Mi Cosecha)`);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onOpenChange(false);
        setGuardado(false);
      }, 1000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-11/12 sm:w-full rounded-2xl p-6">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-slate-800">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="leading-tight">{discipulo.full_name}</p>
              <p className="text-xs font-normal text-slate-500 mt-0.5">
                {rawPhone ? `Tel: ${rawPhone}` : "Sin número registrado"}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Botones de Acción de Llamada Directa */}
          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Elige cómo llamar
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Button
                type="button"
                onClick={handleLlamarNativo}
                disabled={!cleanPhone}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                <Phone className="w-4 h-4" />
                <span>Llamar al Teléfono</span>
              </Button>

              <Button
                type="button"
                onClick={handleWhatsApp}
                disabled={!cleanPhone}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </Button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Abre el marcador telefónico o WhatsApp de inmediato en tu dispositivo.
            </p>
          </div>

          {/* Sección de Registro en Mi Cosecha */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Registrar resultado en Mi Cosecha
              </Label>
              {guardado && (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Registrada
                </span>
              )}
            </div>

            {/* Opciones rápidas de un clic */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleGuardarRegistro("Contestó, conversamos y oramos por su vida")}
                disabled={loading || guardado}
                className="p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left text-xs font-medium text-slate-700 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">Contestó y oramos</span>
              </button>

              <button
                type="button"
                onClick={() => handleGuardarRegistro("Llamé pero no contestó o teléfono ocupado")}
                disabled={loading || guardado}
                className="p-2 rounded-lg bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-left text-xs font-medium text-slate-700 transition-all flex items-center gap-1.5"
              >
                <PhoneMissed className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">No contestó / Ocupado</span>
              </button>

              <button
                type="button"
                onClick={() => handleGuardarRegistro("Pendiente volver a llamar en otro horario")}
                disabled={loading || guardado}
                className="p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left text-xs font-medium text-slate-700 transition-all flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">Volver a llamar</span>
              </button>

              <button
                type="button"
                onClick={() => handleGuardarRegistro("Se dejó mensaje de bendición")}
                disabled={loading || guardado}
                className="p-2 rounded-lg bg-white border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 text-left text-xs font-medium text-slate-700 transition-all flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <span className="truncate">Mensaje enviado</span>
              </button>
            </div>

            <div className="pt-1">
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Notas adicionales de la llamada..."
                rows={2}
                className="text-xs bg-white"
              />
            </div>

            <Button
              type="button"
              onClick={() => handleGuardarRegistro()}
              disabled={loading || guardado}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold h-9 rounded-lg"
            >
              {loading ? "Guardando..." : "Guardar Registro Personalizado"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
