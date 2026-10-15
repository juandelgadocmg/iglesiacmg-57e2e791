import React, { useState, useEffect, useRef } from "react";
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
  PhoneOff,
  Mic,
  MicOff,
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  PhoneMissed, 
  Sparkles,
  Smartphone,
  Loader2
} from "lucide-react";
import { 
  startBrowserCall, 
  hangupBrowserCall, 
  toggleMuteBrowserCall 
} from "@/services/zadarmaService";

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
  const [callingState, setCallingState] = useState<"idle" | "ringing" | "in-call">("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (callingState === "in-call") {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callingState]);

  if (!discipulo) return null;

  const rawPhone = discipulo.telefono || "";
  const cleanPhone = rawPhone.replace(/\D/g, "");
  const waPhone = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // 1. Llamar por Internet (VoIP Web Directo con micrófono y audio del navegador)
  const handleVoIPDirecto = async () => {
    setCallingState("ringing");
    toast.loading(`Iniciando llamada VoIP con ${discipulo.full_name}...`, { id: "modal-call" });

    try {
      await startBrowserCall(cleanPhone, {
        onRinging: () => {
          setCallingState("ringing");
          toast.info(`Timbrando teléfono de ${discipulo.full_name}...`, { id: "modal-call" });
        },
        onConfirmed: () => {
          setCallingState("in-call");
          toast.success(`Llamada conectada con ${discipulo.full_name}`, { id: "modal-call" });
        },
        onEnded: () => {
          setCallingState("idle");
          toast.info(`Llamada finalizada`, { id: "modal-call" });
        },
        onFailed: (cause) => {
          setCallingState("idle");
          toast.error(`Llamada finalizada: ${cause || "no completada"}`, { id: "modal-call" });
        },
      });
    } catch (err: any) {
      setCallingState("idle");
      console.warn("Error WebRTC modal:", err);
      toast.error(`Error al conectar VoIP directo: ${err.message || "error de conexión"}`, {
        id: "modal-call",
        duration: 7000,
      });
    }
  };

  const handleHangup = () => {
    hangupBrowserCall();
    setCallingState("idle");
    toast.info("Llamada finalizada");
  };

  const handleToggleMute = () => {
    const muted = toggleMuteBrowserCall();
    setIsMuted(muted);
    toast.info(muted ? "Micrófono silenciado" : "Micrófono activado");
  };

  // 2. Abrir la app nativa de Teléfono del dispositivo móvil
  const handleLlamarNativo = () => {
    window.location.href = `tel:${cleanPhone}`;
  };

  // 3. Abrir WhatsApp
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

  const isInActiveCall = callingState === "ringing" || callingState === "in-call";

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val && isInActiveCall) {
        handleHangup();
      }
      onOpenChange(val);
    }}>
      <DialogContent className="max-w-md w-11/12 sm:w-full rounded-2xl p-6">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-slate-800">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
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
          {/* Opciones de Llamada Directa por Internet */}
          <div className="space-y-2.5">
            {!isInActiveCall ? (
              <>
                {/* Botón Principal: VoIP Directo por Internet */}
                <Button
                  type="button"
                  onClick={handleVoIPDirecto}
                  disabled={!cleanPhone}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20 text-sm active:scale-98 transition-all"
                  title="Llamar directamente usando el micrófono y audio de este dispositivo"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span>Llamar por Internet (VoIP Web Directo)</span>
                </Button>
                <p className="text-[11px] text-slate-400 text-center leading-tight">
                  Habla directamente desde tu navegador con el micrófono y altavoces de tu equipo.
                </p>

                {/* Opciones Secundarias: WhatsApp y Teléfono Nativo */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={handleWhatsApp}
                    disabled={!cleanPhone}
                    className="h-10 bg-emerald-700/90 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-xs"
                    title="Abrir chat en WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-200" />
                    <span>WhatsApp</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleLlamarNativo}
                    disabled={!cleanPhone}
                    variant="outline"
                    className="h-10 border-slate-200 hover:border-slate-400 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-1.5 text-xs"
                    title="Marcar con la app de teléfono de tu celular personal"
                  >
                    <Smartphone className="w-4 h-4 text-slate-600" />
                    <span>Mi Celular</span>
                  </Button>
                </div>
              </>
            ) : (
              /* Panel de Control de Llamada Activa */
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      {callingState === "in-call" ? "Llamada Conectada" : "Timbrando..."}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {formatSeconds(callDuration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleToggleMute}
                    variant="outline"
                    className={`flex-1 h-10 text-xs font-bold rounded-xl border-slate-700 ${
                      isMuted ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-600" : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                    }`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4 mr-1.5" /> : <Mic className="w-4 h-4 mr-1.5" />}
                    <span>{isMuted ? "Silenciado" : "Silenciar"}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleHangup}
                    className="flex-1 h-10 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-md shadow-red-900/30"
                  >
                    <PhoneOff className="w-4 h-4 mr-1.5" />
                    <span>Colgar</span>
                  </Button>
                </div>
              </div>
            )}
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
