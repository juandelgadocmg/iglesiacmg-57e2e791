import React, { useState, useEffect } from "react";
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
import { 
  Phone, 
  PhoneCall, 
  PhoneForwarded,
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  PhoneMissed, 
  Sparkles,
  Smartphone,
  ShieldCheck,
  Loader2
} from "lucide-react";
import { triggerZadarmaCallback, startBrowserCall, ZADARMA_CONFIG } from "@/services/zadarmaService";

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
  const [callingState, setCallingState] = useState<"idle" | "calling_callback" | "calling_voip" | "connected">("idle");
  const [leaderPhone, setLeaderPhone] = useState("");
  const [showPhoneInput, setShowPhoneInput] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("doxa_leader_phone") || "";
    if (saved) {
      setLeaderPhone(saved);
    }
  }, []);

  if (!discipulo) return null;

  const rawPhone = discipulo.telefono || "";
  const cleanPhone = rawPhone.replace(/\D/g, "");
  const waPhone = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;

  // 1. Llamar por Centralita Zadarma (Callback a tu celular) - 100% infalible
  const handleCallbackZadarma = async (targetPhone = leaderPhone) => {
    const cleanLeader = targetPhone.replace(/\D/g, "");
    if (!cleanLeader || cleanLeader.length < 7) {
      setShowPhoneInput(true);
      toast.error("Por favor ingresa tu número celular para recibir la llamada");
      return;
    }

    localStorage.setItem("doxa_leader_phone", cleanLeader);
    setLeaderPhone(cleanLeader);
    setShowPhoneInput(false);
    setCallingState("calling_callback");

    toast.loading(`Conectando con la centralita de Zadarma...`, { id: "modal-call" });

    try {
      await triggerZadarmaCallback(cleanPhone, cleanLeader);
      setCallingState("connected");
      toast.success(
        `¡Zadarma está llamando a tu celular (${cleanLeader})! Al contestar, te conectará automáticamente con ${discipulo.full_name} por la línea oficial Bogotá +57 (601) 917-9246`,
        { id: "modal-call", duration: 10000 }
      );
    } catch (err: any) {
      setCallingState("idle");
      toast.error(`Error al iniciar llamada por centralita: ${err.message || "desconocido"}`, {
        id: "modal-call",
      });
    }
  };

  // 2. Llamar por VoIP Directo en Navegador
  const handleVoIPDirecto = async () => {
    setCallingState("calling_voip");
    toast.loading(`Iniciando audio VoIP con ${discipulo.full_name}...`, { id: "modal-call" });

    try {
      await startBrowserCall(cleanPhone, {
        onRinging: () => {
          toast.info(`Timbrando teléfono de ${discipulo.full_name}...`, { id: "modal-call" });
        },
        onConfirmed: () => {
          setCallingState("connected");
          toast.success(`Llamada conectada con ${discipulo.full_name}`, { id: "modal-call" });
        },
        onEnded: () => {
          setCallingState("idle");
          toast.info(`Llamada finalizada`, { id: "modal-call" });
        },
        onFailed: (cause) => {
          setCallingState("idle");
          toast.error(`VoIP no completado: ${cause || "finalizado"}. Te sugerimos usar 'Centralita a mi Celular'.`, { id: "modal-call", duration: 6000 });
        },
      });
    } catch (err: any) {
      setCallingState("idle");
      console.warn("Error WebRTC modal:", err);
      // Auto-fallback a Centralita Zadarma si tiene celular registrado
      if (leaderPhone && leaderPhone.length >= 7) {
        toast.info(
          "VoIP directo no disponible en este dispositivo. Conectando por la centralita de Zadarma a tu celular...",
          { id: "modal-call", duration: 5000 }
        );
        handleCallbackZadarma();
      } else {
        toast.error(
          `VoIP directo no disponible (${err.message || "error de red"}). Ingresa tu celular abajo para conectar por la centralita.`,
          { id: "modal-call", duration: 7000 }
        );
        setShowPhoneInput(true);
      }
    }
  };

  // 3. Abrir la app nativa de Teléfono del dispositivo
  const handleLlamarNativo = () => {
    window.location.href = `tel:${cleanPhone}`;
  };

  // 4. Abrir WhatsApp
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
        setCallingState("idle");
      }, 1000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-11/12 sm:w-full rounded-2xl p-6">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-slate-800">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="leading-tight truncate">{discipulo.full_name}</p>
              <p className="text-xs font-normal text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span>Tel: {rawPhone || "Sin número registrado"}</span>
                {cleanPhone && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                    Bogotá Line
                  </span>
                )}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Opciones de Llamada */}
          <div className="space-y-2.5">
            {/* Opción 1: Centralita Zadarma a tu Celular (Recomendada y 100% libre de fallas) */}
            <div className="p-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Llamar por Zadarma (Centralita CMG)
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                  Línea fija Bogotá
                </span>
              </div>
              <p className="text-[11px] text-blue-800/80 leading-relaxed">
                Zadarma timbrará en tu celular y, al contestar, te conectará automáticamente con {discipulo.full_name} saliendo por el PBX de la iglesia: <strong className="font-semibold text-blue-900">+57 (601) 917-9246</strong>.
              </p>

              {(!leaderPhone || showPhoneInput) ? (
                <div className="flex gap-1.5 pt-1">
                  <input
                    type="tel"
                    value={leaderPhone}
                    onChange={(e) => setLeaderPhone(e.target.value)}
                    placeholder="Tu número celular (ej. 3163848499)"
                    className="flex-1 bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Button
                    type="button"
                    onClick={() => handleCallbackZadarma()}
                    disabled={!cleanPhone || callingState === "calling_callback"}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-3 rounded-lg shrink-0"
                  >
                    {callingState === "calling_callback" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Conectar"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => handleCallbackZadarma()}
                    disabled={!cleanPhone || callingState === "calling_callback"}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 rounded-xl flex items-center justify-center gap-2 shadow-sm text-xs"
                  >
                    {callingState === "calling_callback" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Conectando tu celular...</span>
                      </>
                    ) : (
                      <>
                        <PhoneForwarded className="w-4 h-4" />
                        <span>Conectar a mi Celular ({leaderPhone})</span>
                      </>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowPhoneInput(true)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 underline px-1 shrink-0 font-medium"
                    title="Cambiar mi número celular"
                  >
                    Cambiar
                  </button>
                </div>
              )}
            </div>

            {/* Opciones Secundarias: VoIP Web, Teléfono Nativo y WhatsApp */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                onClick={handleVoIPDirecto}
                disabled={!cleanPhone || callingState === "calling_voip"}
                variant="outline"
                className="h-10 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-1.5 text-xs"
                title="Llamar directamente usando el micrófono de tu computador o navegador"
              >
                {callingState === "calling_voip" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>VoIP Web</span>
              </Button>

              <Button
                type="button"
                onClick={handleLlamarNativo}
                disabled={!cleanPhone}
                variant="outline"
                className="h-10 border-slate-200 hover:border-slate-400 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-1.5 text-xs"
                title="Marcar con la app de teléfono de tu celular personal"
              >
                <Smartphone className="w-3.5 h-3.5 text-slate-600" />
                <span>Mi Celular</span>
              </Button>

              <Button
                type="button"
                onClick={handleWhatsApp}
                disabled={!cleanPhone}
                className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-xs"
                title="Abrir chat en WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 text-white" />
                <span>WhatsApp</span>
              </Button>
            </div>
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
