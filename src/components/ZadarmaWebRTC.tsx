import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, PhoneCall, Settings, CheckCircle2, X, RefreshCw, Key, Info } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
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

      // Load Zadarma v9 Scripts
      await loadScript('https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1');
      await loadScript('https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1');

      // Poll until zadarmaWidgetFn is defined (max 5 seconds)
      let attempts = 0;
      while (!window.zadarmaWidgetFn && attempts < 35) {
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
    } catch (err: any) {
      console.warn("Zadarma WebRTC no disponible:", err?.message);
      setIsConnected(false);
      setIsLoading(false);
    }
  };

  const initWebRTC = useCallback(async (forcedKey?: string) => {
    if (!sipExtension) return;

    try {
      // 1. If user provided a custom key, prioritize it
      const savedKey = forcedKey || customKey || localStorage.getItem('zadarma_webrtc_key');
      if (savedKey && savedKey.trim().length > 0) {
        await initWidgetWithKey(savedKey.trim(), sipExtension);
        return;
      }

      // 2. Otherwise, attempt to fetch from Supabase RPC silently
      const { data: key, error: fnError } = await supabase.rpc('get_zadarma_webrtc_key', {
        p_sip: sipExtension
      });

      if (!fnError && key) {
        await initWidgetWithKey(key, sipExtension);
      } else {
        // Silent graceful fallback: native dialer remains primary without disturbing user
        setIsConnected(false);
        setIsLoading(false);
      }
    } catch (err: any) {
      setIsConnected(false);
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
    toast.success("Clave guardada. Inicializando teléfono virtual...");
    initWebRTC(trimmed);
  };

  const handleClearCustomKey = () => {
    localStorage.removeItem('zadarma_webrtc_key');
    setCustomKey('');
    setInputKey('');
    toast.info("Clave personalizada eliminada.");
    setIsConnected(false);
    initWebRTC('');
  };

  return (
    <>
      <style>
        {`
          /* Forzar visibilidad y z-index del botón de Zadarma solo si está cargado */
          #zdrm-webphone, .zdrm-phone, .zdrm-webphone-media-box {
            z-index: 999999 !important;
          }
        `}
      </style>

      {/* Floating Status Indicator only when actively initializing */}
      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-white px-3 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-xs font-semibold text-slate-700">Conectando teléfono ({sipExtension})...</span>
        </div>
      )}

      {/* Settings Modal (Solo al hacer clic en Ajustes Teléfono) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ajustes de Teléfono</h3>
                  <p className="text-xs text-slate-500">Extensión asignada: <b>{sipExtension || 'Automática'}</b></p>
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
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Marcado Telefónico Directo Activo</p>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Puedes hacer llamadas directamente a todos tus discípulos pulsando sobre su número de teléfono o por WhatsApp sin necesidad de configuración adicional.
                  </p>
                </div>
              </div>

              {isConnected && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">Teléfono virtual WebRTC de Zadarma activo y listo.</span>
                </div>
              )}

              <div className="pt-1">
                <label className="font-bold text-slate-700 block mb-1">
                  Clave del Widget WebRTC Zadarma (Opcional)
                </label>
                <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                  Si tu iglesia cuenta con el servicio PBX de Zadarma para llamadas desde el navegador, puedes ingresar tu clave generada en <b>my.zadarma.com (Configuración &gt; Integraciones y API &gt; Widget WebRTC)</b>.
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
                <RefreshCw className="w-3.5 h-3.5" /> Comprobar
              </button>
              <button
                onClick={handleSaveCustomKey}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors"
              >
                Guardar y Conectar
              </button>
            </div>
          </div>
        </div>
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
