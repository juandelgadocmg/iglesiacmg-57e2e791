import { useEffect } from "react";
import type { CasaDePazData } from "./CasaDePazCard";

interface CasasDePazMapaProps {
  casas: CasaDePazData[];
}

const RED_COLORS: Record<string, string> = {
  Hombres: "#059669",
  Mujeres: "#db2777",
  Jóvenes: "#7c3aed",
  Matrimonios: "#f59e0b",
  Niños: "#0891b2",
};

export default function CasasDePazMapa({ casas }: CasasDePazMapaProps) {
  const mapId = "casas-de-paz-leaflet-container";

  const casasConCoords = casas.filter((c) => c.latitud != null && c.longitud != null);

  useEffect(() => {
    let map: any = null;
    let L: any = null;

    const initMap = async () => {
      L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const container = document.getElementById(mapId);
      if (!container) return;

      if ((container as any)._leaflet_id) {
        (container as any)._leaflet_id = null;
        container.innerHTML = "";
      }

      const center: [number, number] = casasConCoords.length > 0
        ? [
            casasConCoords.reduce((s, c) => s + c.latitud!, 0) / casasConCoords.length,
            casasConCoords.reduce((s, c) => s + c.longitud!, 0) / casasConCoords.length,
          ]
        : [4.711, -74.0721];

      map = L.map(mapId).setView(center, 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      casasConCoords.forEach((c) => {
        const color = (c.red && RED_COLORS[c.red]) || "#6366f1";
        const icon = L.divIcon({
          className: "custom-cdp-map-marker",
          html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                  </svg>
                </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        });

        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${c.latitud},${c.longitud}`;

        const marker = L.marker([c.latitud!, c.longitud!], { icon }).addTo(map);
        marker.bindPopup(`
          <div style="min-width:220px; font-family: sans-serif; padding: 4px;">
            <h3 style="font-weight:700;font-size:15px;margin:0 0 4px 0;color:#1e293b">${c.nombre}</h3>
            ${c.red ? `<span style="background:${color}20;color:${color};font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;display:inline-block;margin-bottom:8px">Red ${c.red}</span>` : ""}
            ${c.ubicacion ? `<p style="font-size:12px;color:#475569;margin:4px 0"><b>📍 Dirección:</b> ${c.ubicacion}</p>` : ""}
            ${c.lider_nombre ? `<p style="font-size:12px;color:#475569;margin:4px 0"><b>👤 Líder:</b> ${c.lider_nombre}</p>` : ""}
            ${c.dia_reunion ? `<p style="font-size:12px;color:#475569;margin:4px 0"><b>📅 Reunión:</b> ${c.dia_reunion}${c.hora_reunion ? ` - ${c.hora_reunion}` : ""}</p>` : ""}
            <div style="margin-top:10px;padding-top:8px;border-top:1px solid #e2e8f0">
              <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;background:#4f46e5;color:white;font-size:12px;font-weight:600;padding:6px 12px;border-radius:6px;text-decoration:none">
                Abrir en Google Maps
              </a>
            </div>
          </div>
        `);
      });

      if (casasConCoords.length > 0) {
        const bounds = L.latLngBounds(casasConCoords.map((c) => [c.latitud!, c.longitud!] as [number, number]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }

      setTimeout(() => map?.invalidateSize(), 200);
    };

    initMap();

    return () => {
      if (map) {
        map.remove();
        map = null;
      }
    };
  }, [casasConCoords]);

  if (casasConCoords.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center gap-2">
        <p className="font-semibold text-foreground">No hay Casas de Paz con coordenadas de mapa registradas.</p>
        <p className="text-xs max-w-md">
          Puedes consultar las Casas de Paz en la vista de tarjetas o agregar las coordenadas geográficas a los grupos.
        </p>
      </div>
    );
  }

  return <div id={mapId} className="h-full w-full rounded-xl overflow-hidden shadow-inner" />;
}
