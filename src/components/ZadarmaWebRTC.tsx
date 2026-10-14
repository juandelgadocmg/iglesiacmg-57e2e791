import React, { useEffect, useState } from 'react';
import { initZadarmaWebPhone } from '@/services/zadarmaService';

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

  useEffect(() => {
    let active = true;
    const init = async () => {
      // Priorizar extensión PBX 337021-100 de CMG o la asignada
      const targetSip = sipExtension && sipExtension.includes('-') ? sipExtension : '337021-100';
      const success = await initZadarmaWebPhone(targetSip);
      if (active) {
        setIsConnected(success);
      }
    };

    init();

    return () => {
      active = false;
    };
  }, [sipExtension]);

  return (
    <style>
      {`
        #zdrm-webphone, .zdrm-phone, .zdrm-webphone-media-box {
          z-index: 9999999 !important;
        }
      `}
    </style>
  );
};
