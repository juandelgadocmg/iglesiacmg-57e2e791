import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ModuloCMS {
  id: string;
  nombre: string;
  objetivo?: string;
  temas: string[];
  taller?: string;
}

export interface DiplomadoCMS {
  id: string;
  numero: string;
  titulo: string;
  subtitulo?: string;
  duracion: string;
  modalidad: string;
  nivel: string;
  objetivo_general: string;
  dirigido_a: string[];
  competencias: string[];
  proyecto_final: string[];
  facultad: string;
  modulos: ModuloCMS[];
}

export interface FacultadCMS {
  id: string;
  nombre: string;
  diplomados: string[];
}

export function useAcademyCMS() {
  return useQuery({
    queryKey: ["academy_cms_data"],
    queryFn: async () => {
      const { data: facultades, error: fError } = await supabase
        .from("academy_facultades")
        .select("*")
        .order("orden", { ascending: true });
      if (fError) throw fError;

      const { data: diplomados, error: dError } = await supabase
        .from("academy_diplomados")
        .select("*")
        .order("orden", { ascending: true });
      if (dError) throw dError;

      const { data: modulos, error: mError } = await supabase
        .from("academy_modulos")
        .select("*")
        .order("orden", { ascending: true });
      if (mError) throw mError;

      const formattedDiplomados: DiplomadoCMS[] = diplomados.map((d: any) => ({
        id: d.id,
        facultad_id: d.facultad_id,
        numero: d.numero,
        titulo: d.titulo,
        subtitulo: d.subtitulo,
        duracion: d.duracion,
        modalidad: d.modalidad,
        nivel: d.nivel,
        objetivo_general: d.objetivo_general,
        dirigido_a: d.dirigido_a || [],
        competencias: d.competencias || [],
        proyecto_final: d.proyecto_final || [],
        facultad: facultades.find((f: any) => f.id === d.facultad_id)?.nombre || "",
        modulos: modulos.filter((m: any) => m.diplomado_id === d.id).map((m: any) => ({
          id: m.id,
          nombre: m.nombre,
          objetivo: m.objetivo,
          temas: m.temas || [],
          taller: m.taller,
        }))
      }));

      const formattedFacultades: FacultadCMS[] = facultades.map((f: any) => ({
        id: f.id,
        nombre: f.nombre,
        diplomados: formattedDiplomados
          .filter(d => (d as any).facultad_id === f.id)
          .map(d => `Diplomado ${d.numero}: ${d.titulo}`)
      }));

      return {
        facultades: formattedFacultades,
        diplomados: formattedDiplomados
      };
    }
  });
}
