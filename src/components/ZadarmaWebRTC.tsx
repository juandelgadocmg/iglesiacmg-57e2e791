import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, PhoneOff } from 'lucide-react';

interface ZadarmaWebRTCProps {
  sipExtension: string;
}

declare global {
  interface Window {
    ZadarmaWidget: any;
    zadarmaWidgetInstance: any;
  }
}

export const ZadarmaWebRTC: React.FC<ZadarmaWebRTCProps> = ({ sipExtension }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initWebRTC = async () => {
      try {
        setIsLoading(true);
        // 1. Fetch the secure temporary key from Supabase RPC
        const { data: key, error: rpcError } = await supabase.rpc('get_zadarma_webrtc_key', {
          p_sip_extension: sipExtension
        });

        if (rpcError) throw rpcError;
        if (!key) throw new Error("No se pudo obtener la llave de WebRTC");
        if (!mounted) return;

        // 2. Load Zadarma Scripts dynamically
        const loadScript = (src: string) => {
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

        await loadScript('https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1');
        await loadScript('https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1');

        if (!mounted) return;

        // 3. Initialize the Widget (v9 API from screenshot)
        if (window.zadarmaWidgetFn) {
          window.zadarmaWidgetFn(
            key,
            sipExtension,
            'rounded', /* shape */
            'es', /* language */
            true, /* click-to-call */
            {right:'20px', bottom:'20px'}
          );
        } else {
          throw new Error("El script de Zadarma no cargó correctamente (zadarmaWidgetFn no existe)");
        }
        
        setIsLoading(false);
      } catch (err: any) {
        console.error("Error inicializando Zadarma WebRTC:", err);
        setError(err.message || "Error al conectar con el servidor de llamadas");
        setIsLoading(false);
        if (mounted) {
          toast.error("No se pudo cargar el teléfono virtual. Verifica la extensión y los permisos de dominio en Zadarma.");
        }
      }
    };

    if (sipExtension) {
      initWebRTC();
    }

    return () => {
      mounted = false;
      // Note: We don't remove the widget globally on unmount because Zadarma's script 
      // modifies the DOM heavily. It's safer to leave it loaded or reload the page if needed.
    };
  }, [sipExtension]);

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg shadow-lg text-sm z-50 max-w-xs">
        <b>Error Telefónico:</b> {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed bottom-4 right-4 bg-white p-3 rounded-full shadow-lg z-50 flex items-center gap-2 border border-slate-200">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span className="text-sm font-medium pr-2 text-slate-700">Conectando teléfono...</span>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          /* Forzar visibilidad del botón de cancelar/colgar de Zadarma y evitar que se corte */
          #zdrm-webphone {
            z-index: 999999 !important;
          }
          .zdrm-webphone-cancel, .zdrm-webphone-hangup {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          /* En caso de que el usuario quiera simplemente cerrar el teclado antes de llamar */
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
          .zdrm-webphone-close-custom:active {
            transform: scale(0.95);
          }
        `}
      </style>
      {typeof document !== 'undefined' && createPortal(
        <button 
          className="zdrm-webphone-close-custom"
          onClick={() => {
          const w = window as any;
          if (w.zdrmWebPhone && typeof w.zdrmWebPhone.cancel === 'function') {
            w.zdrmWebPhone.cancel();
          }
          // Intento de forzar ocultamiento si Zadarma no responde
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
