import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
            {right:'10px', bottom:'5px'}
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

  return null; // The widget renders itself globally
};
