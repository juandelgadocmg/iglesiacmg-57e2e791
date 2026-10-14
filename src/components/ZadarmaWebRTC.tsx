import React, { useEffect } from 'react';
import { initZadarmaEngine } from '@/services/zadarmaService';

interface ZadarmaWebRTCProps {
  sipExtension?: string;
}

/**
 * Componente silencioso que pre-conecta el cliente WebRTC de Zadarma en segundo plano
 * sin inyectar widgets externos ni solicitar apps móviles.
 */
export const ZadarmaWebRTC: React.FC<ZadarmaWebRTCProps> = ({ sipExtension }) => {
  useEffect(() => {
    const targetSip = sipExtension && sipExtension.includes('-') ? sipExtension : '337021-100';
    initZadarmaEngine(targetSip).catch((err) => {
      console.warn("Pre-conexión WebRTC silenciosa:", err);
    });
  }, [sipExtension]);

  return null;
};
