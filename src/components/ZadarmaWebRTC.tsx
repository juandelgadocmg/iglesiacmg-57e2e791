import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [, setIsConnected] = useState(false);

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
      await loadScript('https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1');
      await loadScript('https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1');

      let attempts = 0;
      while (!window.zadarmaWidgetFn && attempts < 30) {
        await new Promise((res) => setTimeout(res, 150));
        attempts++;
      }

      if (!window.zadarmaWidgetFn) return;

      window.zadarmaWidgetFn(
        key,
        ext,
        'rounded',
        'es',
        true,
        { right: '20px', bottom: '20px' }
      );

      setIsConnected(true);
    } catch {
      // Silent: Never block users or show error popups
      setIsConnected(false);
    }
  };

  const initWebRTC = useCallback(async () => {
    if (!sipExtension) return;

    try {
      // 1. Check if global/saved key exists in localStorage
      const savedKey = localStorage.getItem('zadarma_webrtc_key');
      if (savedKey && savedKey.trim().length > 0) {
        await initWidgetWithKey(savedKey.trim(), sipExtension);
        return;
      }

      // 2. Otherwise try background RPC silently
      const { data: key, error: fnError } = await supabase.rpc('get_zadarma_webrtc_key', {
        p_sip: sipExtension
      });

      if (!fnError && key) {
        await initWidgetWithKey(key, sipExtension);
      }
    } catch {
      // Silent fail: direct calling is always available without prompting users
      setIsConnected(false);
    }
  }, [sipExtension]);

  useEffect(() => {
    initWebRTC();
  }, [initWebRTC]);

  return (
    <>
      <style>
        {`
          #zdrm-webphone, .zdrm-phone, .zdrm-webphone-media-box {
            z-index: 999999 !important;
          }
        `}
      </style>
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
