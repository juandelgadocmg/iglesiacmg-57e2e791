import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GrupoMapItem {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  latitud: number | null;
  longitud: number | null;
  ubicacion: string | null;
  dia_reunion: string | null;
  hora_reunion: string | null;
  lider_nombre: string | null;
  miembros_count: number;
}

export function useGruposMap() {
  return useQuery({
    queryKey: ["grupos_map"],
    queryFn: async () => {
      let grupos: any[] = [];
      try {
        const { data, error } = await supabase
          .from("grupos")
          .select("id, nombre, tipo, estado, latitud, longitud, ubicacion, dia_reunion, hora_reunion, lider_id, personas!grupos_lider_id_fkey(nombres, apellidos)")
          .eq("estado", "Activo") as any;
        if (!error && data) {
          grupos = data;
        } else {
          throw error;
        }
      } catch (e) {
        console.warn("Fallo join en useGruposMap, usando fallback:", e);
        const { data: gData, error: gError } = await supabase
          .from("grupos")
          .select("id, nombre, tipo, estado, latitud, longitud, ubicacion, dia_reunion, hora_reunion, lider_id")
          .eq("estado", "Activo");
        if (gError) throw gError;

        const liderIds = Array.from(new Set((gData || []).map((g: any) => g.lider_id).filter(Boolean)));
        const pMap = new Map();
        if (liderIds.length > 0) {
          const { data: pData } = await supabase
            .from("personas")
            .select("id, nombres, apellidos")
            .in("id", liderIds);
          (pData || []).forEach((p: any) => pMap.set(p.id, p));
        }

        grupos = (gData || []).map((g: any) => ({
          ...g,
          personas: g.lider_id ? pMap.get(g.lider_id) || null : null,
        }));
      }

      // Get member counts
      const { data: miembros, error: mError } = await supabase
        .from("grupo_miembros")
        .select("grupo_id");
      if (mError) throw mError;

      const countMap: Record<string, number> = {};
      (miembros || []).forEach((m: any) => {
        countMap[m.grupo_id] = (countMap[m.grupo_id] || 0) + 1;
      });

      return (grupos || []).map((g: any): GrupoMapItem => ({
        id: g.id,
        nombre: g.nombre,
        tipo: g.tipo,
        estado: g.estado,
        latitud: g.latitud,
        longitud: g.longitud,
        ubicacion: g.ubicacion,
        dia_reunion: g.dia_reunion,
        hora_reunion: g.hora_reunion,
        lider_nombre: g.personas ? `${g.personas.nombres} ${g.personas.apellidos}` : null,
        miembros_count: countMap[g.id] || 0,
      }));
    },
  });
}
