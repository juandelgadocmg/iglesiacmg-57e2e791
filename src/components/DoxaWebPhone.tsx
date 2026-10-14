import React, { useState, useEffect, useRef } from "react";
import { Phone, PhoneCall, PhoneOff, MessageCircle, Delete, X, ChevronDown, CheckCircle2, User, Volume2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DoxaWebPhoneProps {
  sipExtension?: string;
  discipulos?: any[];
  liderId?: string;
  onCallLogged?: () => void;
}

// DTMF standard audio frequencies for telephone keypad
const DTMF_FREQS: Record<string, [number, number]> = {
  "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
  "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
  "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
  "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
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
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [selectedDiscipuloId, setSelectedDiscipuloId] = useState<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reproduce DTMF sound
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
      }, 110);
    } catch {}
  };

  const handleKeyPress = (digit: string) => {
    playDTMF(digit);
    setPhoneNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPhoneNumber("");
    setMatchedDiscipulo(null);
    setSelectedDiscipuloId("");
  };

  // Match phone number with existing discipulos
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

  // Listen to global call requests from disciple list
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

  // Timer when call is in progress
  useEffect(() => {
    if (isCalling) {
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
  }, [isCalling]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleStartCall = () => {
    const clean = phoneNumber.replace(/\D/g, "");
    if (!clean || clean.length < 7) {
      toast.error("Ingresa un número telefónico válido (mínimo 7 dígitos)");
      return;
    }

    setIsCalling(true);

    // 1. Intentar con Zadarma WebRTC si está cargado
    const w = window as any;
    if (w.zdrmWebPhone && typeof w.zdrmWebPhone.call === "function") {
      try {
        w.zdrmWebPhone.call(clean);
        toast.success(`Llamando a ${matchedDiscipulo?.full_name || clean} por WebRTC...`);
        return;
      } catch {}
    }

    // 2. Marcado directo al celular / app telefónica
    toast.info(`Iniciando llamada a ${matchedDiscipulo?.full_name || clean}...`);
    window.location.href = `tel:${clean}`;
  };

  const handleEndCall = () => {
    setIsCalling(false);
    const w = window as any;
    if (w.zdrmWebPhone && typeof w.zdrmWebPhone.cancel === "function") {
      w.zdrmWebPhone.cancel();
    }
  };

  const handleWhatsApp = () => {
    const clean = phoneNumber.replace(/\D/g, "");
    if (!clean) {
      toast.error("Ingresa un número para enviar WhatsApp");
      return;
    }
    const wa = clean.length === 10 ? `57${clean}` : clean;
    const name = matchedDiscipulo ? ` ${matchedDiscipulo.full_name}` : "";
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(`Hola${name}, Dios te bendiga. Te escribo de la iglesia Centro Mundial de Gloria.`)}`, "_blank");
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
        descripcion: `Llamada telefónica: ${resultado} (Duración aprox: ${callDuration > 0 ? formatSeconds(callDuration) : 'inmediata'})`,
      });

      if (error) throw error;

      toast.success(`Llamada registrada para ${matchedDiscipulo?.full_name || 'discípulo'} (+1 en Mi Cosecha)`);
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

  return (
    <>
      {/* Floating Button (Siempre visible en la esquina inferior derecha) */}
      <div className="fixed bottom-5 right-5 z-[99999]">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`group flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 active:scale-90 border-2 border-white ${
            isOpen
              ? "w-14 h-14 bg-slate-800 text-white rotate-90"
              : isCalling
              ? "w-16 h-16 bg-red-600 text-white animate-pulse"
              : "w-14 h-14 bg-gradient-to-tr from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white shadow-emerald-500/30"
          }`}
          title="Teléfono Virtual DOXA (Llamadas a Discípulos)"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform" />
          ) : isCalling ? (
            <PhoneOff className="w-7 h-7" />
          ) : (
            <div className="relative flex items-center justify-center">
              <PhoneCall className="w-6 h-6 animate-bounce" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-300 rounded-full border-2 border-slate-900" />
            </div>
          )}
        </button>
      </div>

      {/* Virtual Phone Window */}
      {isOpen && (
        <div className="fixed bottom-22 right-5 z-[99999] w-[320px] sm:w-[340px] bg-slate-950 text-white rounded-3xl shadow-2xl border border-slate-800/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Top Bar */}
          <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold tracking-wide text-slate-200">Teléfono DOXA</span>
              <span className="text-[10px] text-slate-500 font-mono">doxastack.com</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Disciple Picker */}
          {discipulos.length > 0 && (
            <div className="px-4 pt-2.5 bg-slate-900/50">
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
                <option value="">Seleccionar de mis discípulos...</option>
                {discipulos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.telefono || "sin tel"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Phone Display */}
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
                value={phoneNumber || (isCalling ? "Marcando..." : "Marca un número...")}
                className={`w-full bg-transparent text-center font-mono font-bold tracking-wider focus:outline-none ${
                  phoneNumber ? "text-2xl text-white" : "text-sm text-slate-500"
                }`}
              />
              {phoneNumber && !isCalling && (
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

            {isCalling && (
              <div className="text-xs font-mono text-emerald-400 mt-1 flex items-center justify-center gap-1">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                <span>Llamada en curso: {formatSeconds(callDuration)}</span>
              </div>
            )}
          </div>

          {/* Dial Pad Grid */}
          {!isCalling && (
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

          {/* Action Buttons */}
          <div className="p-4 bg-slate-900/80 border-t border-slate-800/80 space-y-2.5">
            {!isCalling ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartCall}
                  disabled={!phoneNumber}
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span className="text-sm">Llamar</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsApp}
                  disabled={!phoneNumber}
                  className="h-12 px-4 bg-emerald-900/60 hover:bg-emerald-800/60 disabled:opacity-40 text-emerald-400 border border-emerald-700/40 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                  title="Escribir por WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleEndCall}
                className="w-full h-12 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition-all active:scale-95"
              >
                <PhoneOff className="w-5 h-5" />
                <span className="text-sm">Colgar / Finalizar</span>
              </button>
            )}

            {/* Quick Register Result into Mi Cosecha */}
            {matchedDiscipulo && (
              <div className="pt-1.5 border-t border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Registrar en Mi Cosecha:
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRegistrarLlamada("Contestó y oramos")}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded-lg text-emerald-300 font-medium transition-colors text-center truncate"
                  >
                    ✓ Contestó y oró
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegistrarLlamada("No contestó / Ocupado")}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded-lg text-amber-300 font-medium transition-colors text-center truncate"
                  >
                    ✗ No contestó
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
