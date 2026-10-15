import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  MessageCircle,
  Delete,
  X,
  ChevronDown,
  CheckCircle2,
  User,
  Volume2,
  Mic,
  MicOff,
  Sparkles,
  Copy,
  Check,
  Settings,
  PhoneForwarded,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  initZadarmaEngine,
  startBrowserCall,
  hangupBrowserCall,
  toggleMuteBrowserCall,
  triggerZadarmaCallback,
  subscribeToCallState,
  formatZadarmaNumber,
  WebPhoneCallState,
  ZADARMA_CONFIG,
} from "@/services/zadarmaService";

interface DoxaWebPhoneProps {
  sipExtension?: string;
  discipulos?: any[];
  liderId?: string;
  onCallLogged?: () => void;
}

// Frecuencias estándar DTMF para el teclado telefónico
const DTMF_FREQS: Record<string, [number, number]> = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
};

export const DoxaWebPhone: React.FC<DoxaWebPhoneProps> = ({
  sipExtension,
  discipulos = [],
  liderId,
  onCallLogged,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [matchedDiscipulo, setMatchedDiscipulo] = useState<any | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [selectedDiscipuloId, setSelectedDiscipuloId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callState, setCallState] = useState<WebPhoneCallState>("idle");
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [leaderPhone, setLeaderPhone] = useState<string>(() => {
    return localStorage.getItem("doxa_leader_phone") || "";
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-cargar teléfono del líder si está registrado en la base de datos
  useEffect(() => {
    if (!liderId) return;
    const fetchLeaderPhone = async () => {
      try {
        const { data } = await supabase
          .from("leaders")
          .select("telefono")
          .eq("id", liderId)
          .maybeSingle();
        if (data && (data as any).telefono) {
          const t = (data as any).telefono.replace(/\D/g, "");
          if (t.length >= 7 && !localStorage.getItem("doxa_leader_phone")) {
            setLeaderPhone(t);
            localStorage.setItem("doxa_leader_phone", t);
          }
        }
      } catch {}
    };
    fetchLeaderPhone();
  }, [liderId]);

  // Suscribirse al estado del motor WebRTC nativo
  useEffect(() => {
    const unsubscribe = subscribeToCallState((state) => {
      setCallState(state);
    });
    return () => unsubscribe();
  }, []);

  // Pre-conectar el cliente WebRTC de Zadarma en segundo plano
  useEffect(() => {
    initZadarmaEngine(sipExtension || ZADARMA_CONFIG.DEFAULT_SIP).catch(() => {});
  }, [sipExtension]);

  // Reproducir tono DTMF al pulsar las teclas
  const playDTMF = (digit: string) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const freqs = DTMF_FREQS[digit];
      if (!freqs) return;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.gain.value = 0.08;
      gain.connect(ctx.destination);

      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];

      osc1.connect(gain);
      osc2.connect(gain);

      osc1.start();
      osc2.start();

      setTimeout(() => {
        osc1.stop();
        osc2.stop();
        ctx.close();
      }, 100);
    } catch {}
  };

  const handleKeyPress = (digit: string) => {
    playDTMF(digit);
    setPhoneNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  // Emparejar número marcado con discípulos de la lista
  useEffect(() => {
    const cleanCurrent = phoneNumber.replace(/\D/g, "");
    if (cleanCurrent.length >= 7) {
      const found = discipulos.find((d) => {
        const cleanD = (d.telefono || "").replace(/\D/g, "");
        return cleanD.endsWith(cleanCurrent) || cleanCurrent.endsWith(cleanD);
      });
      setMatchedDiscipulo(found || null);
    } else {
      setMatchedDiscipulo(null);
    }
  }, [phoneNumber, discipulos]);

  // Escuchar eventos globales de llamada desde la lista de discípulos
  useEffect(() => {
    const handleGlobalCall = (e: any) => {
      const { discipulo, phone } = e.detail || {};
      const targetPhone = phone || discipulo?.telefono || "";
      setPhoneNumber(targetPhone.replace(/\D/g, ""));
      if (discipulo) {
        setMatchedDiscipulo(discipulo);
        setSelectedDiscipuloId(discipulo.id);
      }
      setIsOpen(true);
    };

    window.addEventListener("doxa-call-number" as any, handleGlobalCall);
    return () => {
      window.removeEventListener("doxa-call-number" as any, handleGlobalCall);
    };
  }, []);

  // Cronómetro durante la llamada activa
  const isInCall = callState === "in-call" || callState === "ringing" || callState === "calling";

  useEffect(() => {
    if (callState === "in-call") {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (callState !== "in-call") {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopy = () => {
    const clean = phoneNumber.replace(/\D/g, "");
    if (!clean) return;
    navigator.clipboard.writeText(clean);
    setCopied(true);
    toast.success(`Número ${clean} copiado`);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Llamada 100% directa desde el navegador (VoIP WebRTC nativo de Zadarma)
   */
  const handleStartCall = async () => {
    const clean = phoneNumber.replace(/\D/g, "");
    if (!clean || clean.length < 7) {
      toast.error("Ingresa un número telefónico válido (mínimo 7 dígitos)");
      return;
    }

    const destFormatted = formatZadarmaNumber(clean);
    const destName = matchedDiscipulo?.full_name || clean;

    toast.loading(`Llamando a ${destName} por Zadarma VoIP...`, { id: "doxa-call" });

    try {
      await startBrowserCall(clean, {
        onRinging: () => {
          toast.info(`Timbrando teléfono de ${destName}...`, { id: "doxa-call" });
        },
        onConfirmed: () => {
          toast.success(`Llamada conectada con ${destName}`, { id: "doxa-call" });
        },
        onEnded: () => {
          toast.info(`Llamada con ${destName} finalizada`, { id: "doxa-call" });
        },
        onFailed: (cause) => {
          console.warn("WebRTC finalizó:", cause);
          toast.error(`Llamada no completada: ${cause || "finalizada"}`, { id: "doxa-call" });
        },
      });
    } catch (err: any) {
      console.warn("Error WebRTC:", err);
      const myPhone = leaderPhone || localStorage.getItem("doxa_leader_phone") || "";
      if (myPhone && myPhone.replace(/\D/g, "").length >= 7) {
        toast.info(
          "El navegador no pudo conectar VoIP directo. Enlazando llamada por la centralita de Zadarma a tu celular...",
          { id: "doxa-call", duration: 5000 }
        );
        setTimeout(() => {
          handleTriggerCallback();
        }, 1000);
      } else {
        toast.error(
          `VoIP directo no disponible (${err.message || "desconocido"}). Configura tu celular abajo para conectar por la centralita de la iglesia.`,
          { id: "doxa-call", duration: 7000 }
        );
        setShowCallbackModal(true);
      }
    }
  };

  const handleEndCall = () => {
    hangupBrowserCall();
  };

  const handleToggleMute = () => {
    const muted = toggleMuteBrowserCall();
    setIsMuted(muted);
    toast.info(muted ? "Micrófono silenciado" : "Micrófono activado");
  };

  /**
   * Llamada por Callback de Zadarma (Zadarma llama al celular del líder y luego al discípulo)
   */
  const handleTriggerCallback = async () => {
    const cleanDisciple = phoneNumber.replace(/\D/g, "");
    if (!cleanDisciple || cleanDisciple.length < 7) {
      toast.error("Ingresa el número del discípulo");
      return;
    }

    if (!leaderPhone || leaderPhone.replace(/\D/g, "").length < 7) {
      setShowCallbackModal(true);
      return;
    }

    toast.loading("Iniciando centralita Zadarma...", { id: "doxa-callback" });
    try {
      await triggerZadarmaCallback(cleanDisciple, leaderPhone);
      toast.success(
        `Zadarma está llamando a tu celular (${leaderPhone}). Al contestar, te conectará con ${
          matchedDiscipulo?.full_name || cleanDisciple
        } por la línea Bogotá +57 (601) 917-9246`,
        { id: "doxa-callback", duration: 8000 }
      );
      setShowCallbackModal(false);
    } catch (err: any) {
      toast.error("Error al iniciar callback: " + (err.message || "desconocido"), {
        id: "doxa-callback",
      });
    }
  };

  const handleNativeCall = () => {
    const clean = phoneNumber.replace(/\D/g, "");
    if (!clean || clean.length < 7) {
      toast.error("Ingresa un número telefónico válido");
      return;
    }
    toast.info(`Abriendo marcador del teléfono para ${clean}...`);
    const link = document.createElement("a");
    link.href = `tel:${clean}`;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsApp = () => {
    const clean = phoneNumber.replace(/\D/g, "");
    if (!clean) {
      toast.error("Ingresa un número para enviar WhatsApp");
      return;
    }
    const wa = clean.length === 10 ? `57${clean}` : clean;
    const name = matchedDiscipulo ? ` ${matchedDiscipulo.full_name}` : "";
    window.open(
      `https://wa.me/${wa}?text=${encodeURIComponent(
        `Hola${name}, Dios te bendiga. Te escribo de la iglesia Centro Mundial de Gloria.`
      )}`,
      "_blank"
    );
  };

  const handleRegistrarLlamada = async (resultado: string) => {
    const targetId = matchedDiscipulo?.id || selectedDiscipuloId;
    if (!targetId || !liderId) {
      toast.error("Selecciona un discípulo para registrar la llamada en Mi Cosecha");
      return;
    }

    try {
      const hoy = new Date().toISOString().split("T")[0];
      const ahora = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const { error } = await supabase.from("discipulo_actividades").insert({
        discipulo_id: targetId,
        lider_id: liderId,
        tipo_actividad: "Llamada",
        fecha: hoy,
        hora: ahora,
        descripcion: `Llamada telefónica: ${resultado} (Duración aprox: ${
          callDuration > 0 ? formatSeconds(callDuration) : "inmediata"
        })`,
      });

      if (error) throw error;

      toast.success(
        `Llamada registrada para ${matchedDiscipulo?.full_name || "discípulo"} (+1 en Mi Cosecha)`
      );
      if (onCallLogged) onCallLogged();
      handleEndCall();
    } catch (err: any) {
      toast.error("Error al registrar llamada: " + (err.message || "desconocido"));
    }
  };

  const keys = [
    { key: "1", sub: "" },
    { key: "2", sub: "ABC" },
    { key: "3", sub: "DEF" },
    { key: "4", sub: "GHI" },
    { key: "5", sub: "JKL" },
    { key: "6", sub: "MNO" },
    { key: "7", sub: "PQRS" },
    { key: "8", sub: "TUV" },
    { key: "9", sub: "WXYZ" },
    { key: "*", sub: "" },
    { key: "0", sub: "+" },
    { key: "#", sub: "" },
  ];

  const phoneModal = (
    <div className="fixed inset-0 pointer-events-none z-[9999999]">
      {/* Botón Flotante Permanente */}
      <div
        style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 9999999 }}
        className="pointer-events-auto"
      >
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`group flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 active:scale-90 border-2 border-white ${
            isOpen
              ? "w-14 h-14 bg-slate-800 text-white rotate-90"
              : isInCall
              ? "w-16 h-16 bg-red-600 text-white animate-pulse"
              : "w-14 h-14 bg-gradient-to-tr from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white shadow-emerald-500/30"
          }`}
          title="Teléfono Virtual DOXA (Llamadas a Discípulos)"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform" />
          ) : isInCall ? (
            <PhoneOff className="w-7 h-7" />
          ) : (
            <div className="relative flex items-center justify-center">
              <PhoneCall className="w-6 h-6 animate-bounce" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-300 rounded-full border-2 border-slate-900" />
            </div>
          )}
        </button>
      </div>

      {/* Ventana del Teléfono Virtual DOXA */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "84px",
            right: "20px",
            zIndex: 9999999,
            maxHeight: "calc(100vh - 104px)",
          }}
          className="pointer-events-auto w-[330px] sm:w-[360px] bg-slate-950 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Barra Superior */}
          <div className="bg-slate-900/95 px-4 py-3 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  callState === "registered" || isInCall
                    ? "bg-emerald-500 animate-pulse"
                    : callState === "connecting"
                    ? "bg-amber-400 animate-ping"
                    : "bg-slate-500"
                }`}
              />
              <span className="text-xs font-bold tracking-wide text-slate-100">Teléfono DOXA</span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-800/40">
                Bogotá {ZADARMA_CONFIG.DID_NUMBER}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={async () => {
                  toast.info("Actualizando conexión telefónica y limpiando caché...");
                  if ("caches" in window) {
                    try {
                      const keys = await caches.keys();
                      await Promise.all(keys.map((k) => caches.delete(k)));
                    } catch {}
                  }
                  if ("serviceWorker" in navigator) {
                    try {
                      const regs = await navigator.serviceWorker.getRegistrations();
                      await Promise.all(regs.map((r) => r.unregister()));
                    } catch {}
                  }
                  for (let key in localStorage) {
                    if (key.startsWith("zadarma_webrtc_cache_")) {
                      localStorage.removeItem(key);
                    }
                  }
                  window.location.reload();
                }}
                className="text-slate-400 hover:text-emerald-400 p-1 rounded-lg transition-colors"
                title="Actualizar teléfono a la última versión"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowCallbackModal(true)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                title="Configurar teléfono para Callback"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal / Panel de Configuración Callback */}
          {showCallbackModal && (
            <div className="p-3 bg-slate-900 border-b border-slate-800 text-xs space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">Llamada a tu Celular (Callback)</span>
                <button
                  type="button"
                  onClick={() => setShowCallbackModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Zadarma llamará primero a tu celular y, al contestar, te conectará automáticamente con el discípulo usando la línea fija de la iglesia (+57 601 917-9246).
              </p>
              <div className="flex gap-1.5 pt-1">
                <input
                  type="tel"
                  value={leaderPhone}
                  onChange={(e) => setLeaderPhone(e.target.value)}
                  placeholder="Tu número celular (ej. 316...)"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("doxa_leader_phone", leaderPhone.trim());
                    toast.success("Número guardado para callback");
                    handleTriggerCallback();
                  }}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs"
                >
                  Conectar
                </button>
              </div>
            </div>
          )}

          {/* Selector de Discípulo */}
          {discipulos.length > 0 && !isInCall && (
            <div className="px-4 pt-2.5 bg-slate-900/40">
              <select
                value={selectedDiscipuloId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedDiscipuloId(id);
                  const found = discipulos.find((d) => d.id === id);
                  if (found) {
                    setMatchedDiscipulo(found);
                    setPhoneNumber((found.telefono || "").replace(/\D/g, ""));
                  }
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Seleccionar discípulo...</option>
                {discipulos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.telefono || "sin tel"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Pantalla del Teléfono */}
          <div className="p-4 text-center">
            {matchedDiscipulo && (
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1 truncate">
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{matchedDiscipulo.full_name}</span>
              </div>
            )}

            <div className="relative flex items-center justify-center min-h-[44px]">
              <input
                type="text"
                readOnly
                value={
                  phoneNumber ||
                  (callState === "calling"
                    ? "Conectando llamada..."
                    : callState === "ringing"
                    ? "Timbrando..."
                    : callState === "in-call"
                    ? "En llamada"
                    : "Marca un número...")
                }
                className={`w-full bg-transparent text-center font-mono font-bold tracking-wider focus:outline-none ${
                  phoneNumber ? "text-2xl text-white" : "text-sm text-slate-500"
                }`}
              />
              {phoneNumber && !isInCall && (
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="absolute right-0 text-slate-400 hover:text-red-400 p-1.5 transition-colors"
                  title="Borrar dígito"
                >
                  <Delete className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Botón de Copiar */}
            {phoneNumber && !isInCall && (
              <div className="mt-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-emerald-400 transition-colors px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800"
                  title="Copiar número"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "¡Copiado!" : "Copiar"}</span>
                </button>
              </div>
            )}

            {/* Estado de Llamada Activa */}
            {isInCall && (
              <div className="text-xs font-mono text-emerald-400 mt-2 flex items-center justify-center gap-2">
                <Volume2 className="w-4 h-4 animate-pulse text-emerald-400" />
                <span className="font-bold">
                  {callState === "ringing"
                    ? "Timbrando teléfono..."
                    : callState === "in-call"
                    ? `En llamada: ${formatSeconds(callDuration)}`
                    : "Conectando..."}
                </span>
              </div>
            )}
          </div>

          {/* Teclado Telefónico DTMF */}
          {!isInCall && (
            <div className="px-5 pb-3">
              <div className="grid grid-cols-3 gap-2.5">
                {keys.map((k) => (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => handleKeyPress(k.key)}
                    className="h-12 bg-slate-900 hover:bg-slate-800 active:bg-emerald-950 active:border-emerald-500 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-xs"
                  >
                    <span className="text-lg font-bold leading-none text-white">{k.key}</span>
                    {k.sub && (
                      <span className="text-[9px] font-semibold text-slate-500 tracking-widest mt-0.5">
                        {k.sub}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Barra de Acciones */}
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-2.5 mt-auto">
            {!isInCall ? (
              <div className="space-y-2">
                {/* Botón Principal: Llamar Directo por la Web */}
                <button
                  type="button"
                  onClick={handleStartCall}
                  disabled={!phoneNumber}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
                  title="Llamar directamente desde el navegador con micrófono y audio"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span className="text-sm">Llamar por Zadarma (VoIP Directo)</span>
                </button>

                {/* Botones Secundarios: Callback, WhatsApp y Móvil */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTriggerCallback}
                    disabled={!phoneNumber}
                    className="flex-1 h-10 px-2.5 bg-blue-900/40 hover:bg-blue-800/60 disabled:opacity-40 text-blue-300 border border-blue-700/40 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 text-xs font-semibold"
                    title="Zadarma llama a tu celular y te conecta con el discípulo"
                  >
                    <PhoneForwarded className="w-4 h-4 text-blue-400" />
                    <span>Conectar mi Celular</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    disabled={!phoneNumber}
                    className="flex-1 h-10 px-2.5 bg-emerald-900/50 hover:bg-emerald-800/60 disabled:opacity-40 text-emerald-300 border border-emerald-700/40 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 text-xs font-semibold"
                    title="Abrir chat y llamada por WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNativeCall}
                    disabled={!phoneNumber}
                    className="h-10 w-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-700 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0"
                    title="Marcar con la app de teléfono de tu dispositivo"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Controles de Llamada Activa */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`h-12 px-4 rounded-2xl flex items-center justify-center gap-1.5 font-bold text-xs transition-all active:scale-95 ${
                    isMuted
                      ? "bg-amber-600 hover:bg-amber-500 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                  }`}
                  title={isMuted ? "Activar micrófono" : "Silenciar micrófono"}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isMuted ? "Silenciado" : "Silenciar"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleEndCall}
                  className="flex-1 h-12 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition-all active:scale-95"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span className="text-sm">Colgar / Finalizar</span>
                </button>
              </div>
            )}

            {/* Registro Rápido en Mi Cosecha */}
            {(matchedDiscipulo || selectedDiscipuloId) && (
              <div className="pt-2 border-t border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Registrar en Mi Cosecha:
                  </span>
                  <span className="text-[9px] text-slate-400 lowercase font-normal truncate max-w-[130px]">
                    {matchedDiscipulo?.full_name}
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRegistrarLlamada("Contestó y oramos")}
                    className="p-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/50 text-[11px] rounded-xl text-emerald-300 font-semibold transition-all text-center truncate active:scale-95"
                  >
                    ✓ Contestó y oró
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegistrarLlamada("No contestó / Ocupado")}
                    className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-[11px] rounded-xl text-amber-300 font-semibold transition-all text-center truncate active:scale-95"
                  >
                    ✗ No contestó
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(phoneModal, document.body);
  }

  return phoneModal;
};
