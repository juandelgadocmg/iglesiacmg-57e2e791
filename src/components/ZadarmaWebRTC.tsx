import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, PhoneOff, PhoneCall, Settings, AlertCircle, CheckCircle2, X, RefreshCw, Key } from 'lucide-react';

interface ZadarmaWebRTCProps {
  sipExtension: string;
}

declare global {
  interface Window {
    ZadarmaWidget: any;
    zadarmaWidgetInstance: any;
    zadarmaWidgetFn: any;
    zdrmWebPhone: any;
    zdrmWPhI: any;
  }
}

export const ZadarmaWebRTC: React.FC<ZadarmaWebRTCProps> = ({ sipExtension }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customKey, setCustomKey] = useState<string>(() => {
    return localStorage.getItem('zadarma_webrtc_key') || '';
  });
  const [inputKey, setInputKey] = useState<string>('');

  const loadScript = (src: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script ${src}`));
      document.head.appendChild(script);
    });
  };

  const initWidgetWithKey = async (key: string, ext: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Load Zadarma v9 Scripts
      await loadScript('https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1');
      await loadScript('https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1');

      // Poll until zadarmaWidgetFn is defined (max 6 seconds)
      let attempts = 0;
      while (!window.zadarmaWidgetFn && attempts < 40) {
        await new Promise((res) => setTimeout(res, 150));
        attempts++;
      }

      if (!window.zadarmaWidgetFn) {
        throw new Error("No se pudo cargar la librería telefónica de Zadarma.");
      }

      // Initialize Zadarma Widget v9
      window.zadarmaWidgetFn(
        key,
        ext,
        'rounded',
        'es',
        true,
        { right: '20px', bottom: '20px' }
      );

      setIsConnected(true);
      setIsLoading(false);
      setError(null);
    } catch (err: any) {
      console.error("Error al inicializar Zadarma Widget:", err);
      setError(err.message || "Error al inicializar el teléfono.");
      setIsLoading(false);
    }
  };

  const initWebRTC = useCallback(async (forcedKey?: string) => {
    if (!sipExtension) return;

    try {
      setIsLoading(true);
      setError(null);

      // 1. If user provided a custom key or forced key, prioritize it
      const savedKey = forcedKey || customKey || localStorage.getItem('zadarma_webrtc_key');
      if (savedKey && savedKey.trim().length > 0) {
        await initWidgetWithKey(savedKey.trim(), sipExtension);
        return;
      }

      // 2. Otherwise, fetch from Supabase RPC
      const { data: key, error: fnError } = await supabase.rpc('get_zadarma_webrtc_key', {
        p_sip: sipExtension
      });

      if (fnError) {
        console.warn("RPC get_zadarma_webrtc_key error:", fnError);
        throw new Error(fnError.message || "Error de autorización con API Zadarma");
      }

      if (!key) {
        throw new Error("No se recibió llave de WebRTC desde el servidor");
      }

      // 3. Initialize widget with obtained key
      await initWidgetWithKey(key, sipExtension);
    } catch (err: any) {
      console.error("Error inicializando Zadarma WebRTC:", err);
      const msg = err.message || "No autorizado o sin conexión con Zadarma";
      setError(msg);
      setIsLoading(false);
    }
  }, [sipExtension, customKey]);

  useEffect(() => {
    initWebRTC();

    const handleOpenSettings = () => {
      setInputKey(localStorage.getItem('zadarma_webrtc_key') || '');
      setIsSettingsOpen(true);
    };

    window.addEventListener('open-zadarma-settings', handleOpenSettings);
    return () => {
      window.removeEventListener('open-zadarma-settings', handleOpenSettings);
    };
  }, [initWebRTC]);

  const handleSaveCustomKey = () => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      toast.error("Por favor ingresa una clave válida de Zadarma");
      return;
    }
    localStorage.setItem('zadarma_webrtc_key', trimmed);
    setCustomKey(trimmed);
    setIsSettingsOpen(false);
    toast.success("Clave guardada. Inicializando teléfono...");
    initWebRTC(trimmed);
  };

  const handleClearCustomKey = () => {
    localStorage.removeItem('zadarma_webrtc_key');
    setCustomKey('');
    setInputKey('');
    toast.info("Clave personalizada eliminada. Reintentando automático...");
    initWebRTC('');
  };

  return (
    <>
      <style>
        {`
          /* Forzar visibilidad y z-index del botón de Zadarma */
          #zdrm-webphone, .zdrm-phone, .zdrm-webphone-media-box {
            z-index: 999999 !important;
          }
          .zdrm-webphone-cancel, .zdrm-webphone-hangup {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          .zdrm-webphone-close-custom {
            position: fixed;
            bottom: 20px;
            right: 350px;
            background: #ef4444;
            color: white;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 9999px;
            cursor: pointer;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
            border: 2px solid white;
            transition: all 0.2s;
          }
          .zdrm-webphone-close-custom:hover {
            background: #dc2626;
            transform: scale(1.05);
          }
        `}
      </style>

      {/* Floating Status Indicator */}
      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-white px-3 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-xs font-semibold text-slate-700">Conectando Zadarma ({sipExtension})...</span>
        </div>
      )}

      {/* Discretely show config pill if error occurred */}
      {error && !isLoading && !isConnected && (
        <div className="fixed bottom-4 right-4 bg-white border border-amber-300 text-slate-800 p-2.5 rounded-2xl shadow-xl z-50 flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">Teléfono Zadarma</span>
            <span className="text-[11px] text-slate-500">Requiere clave WebRTC</span>
          </div>
          <button
            onClick={() => {
              setInputKey(customKey);
              setIsSettingsOpen(true);
            }}
            className="ml-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition-colors shadow-sm"
          >
            Configurar
          </button>
        </div>
      )}

      {/* Custom Close / Hangup Button when call is active */}
      {typeof document !== 'undefined' && createPortal(
        <button 
          className="zdrm-webphone-close-custom"
          onClick={() => {
            const w = window as any;
            if (w.zdrmWebPhone && typeof w.zdrmWebPhone.cancel === 'function') {
              w.zdrmWebPhone.cancel();
            }
            const widget = document.querySelector('.zdrm-webphone-media-box') as HTMLElement;
            if (widget) widget.style.display = 'none';
            const container = document.getElementById('zdrm-webphone') as HTMLElement;
            if (container) container.style.display = 'none';
          }}
          title="Cerrar Teléfono / Colgar"
        >
          <PhoneOff size={22} strokeWidth={2.5} />
        </button>,
        document.body
      )}

      {/* Settings Modal */}
      {isSettingsOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ajustes de Teléfono Zadarma</h3>
                  <p className="text-xs text-slate-500">Extensión asignada: <b>{sipExtension || 'Ninguna'}</b></p>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {error ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Estado actual: Sin autorizar</p>
                    <p className="mt-0.5 text-[11px] text-amber-700">
                      {error}
                    </p>
                  </div>
                </div>
              ) : isConnected ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="font-medium">Teléfono virtual conectado y listo para llamar.</span>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                  <span>Conectando con el servidor telefónico...</span>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Clave del Widget WebRTC (my.zadarma.com)
                </label>
                <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                  Si la API automática responde 'Not authorized', puedes copiar tu clave generada en el panel de Zadarma (<b>Configuración &gt; Integraciones y API &gt; Widget WebRTC</b>) y pegarla aquí.
                </p>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input 
                    type="text"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Pega tu clave WebRTC aquí..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {customKey && (
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-600">Tienes una clave manual activa.</span>
                  <button
                    onClick={handleClearCustomKey}
                    className="text-[11px] text-red-600 hover:text-red-700 font-semibold underline"
                  >
                    Restablecer
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setIsSettingsOpen(false);
                  initWebRTC();
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reintentar
              </button>
              <button
                onClick={handleSaveCustomKey}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors"
              >
                Guardar y Conectar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Hidden dummy caller for click-to-call detection */}
      <a 
        id="zadarma-hidden-caller" 
        href="tel:" 
        style={{ display: 'none' }} 
        className="zd-click-to-call"
      >
        hidden caller
      </a>
    </>
  );
};
