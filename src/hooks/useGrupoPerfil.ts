import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GrupoDetalle {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string | null;
  estado: string;
  red: string | null;
  dia_reunion: string | null;
  hora_reunion: string | null;
  ubicacion: string | null;
  latitud: number | null;
  longitud: number | null;
  lider_id: string | null;
  created_at: string;
  lider?: { id: string; nombres: string; apellidos: string; foto_url: string | null; telefono: string | null } | null;
}

export interface MiembroDetalle {
  id: string;
  persona_id: string;
  rol: string;
  created_at: string;
  persona: {
    id: string;
    nombres: string;
    apellidos: string;
    foto_url: string | null;
    tipo_persona: string;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    estado_iglesia: string;
    whatsapp: string | null;
  };
}

export interface ReporteResumen {
  id: string;
  fecha: string;
  created_at: string;
  estado: string;
  ofrenda_casa_paz: number | null;
  total_reportado: number | null;
  no_realizado: boolean | null;
  mensaje: string;
  presentes: number;
  ausentes: number;
  nuevos: number;
}

export function useGrupoDetalle(grupoId: string | null) {
  return useQuery({
    queryKey: ["grupo_detalle", grupoId],
    enabled: !!grupoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grupos")
        .select("*, personas!grupos_lider_id_fkey(id, nombres, apellidos, foto_url, telefono)")
        .eq("id", grupoId!)
        .single();
      if (error) throw error;
      return {
        ...data,
        lider: (data as any).personas || null,
      } as unknown as GrupoDetalle;
    },
  });
}

export function useGrupoMiembrosDetalle(grupoId: string | null) {
  return useQuery({
    queryKey: ["grupo_miembros_perfil", grupoId],
    enabled: !!grupoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grupo_miembros")
        .select("*, personas:persona_id(id, nombres, apellidos, foto_url, tipo_persona, telefono, email, direccion, estado_iglesia, whatsapp, sexo, estado_civil, fecha_nacimiento, ocupacion, ministerio, observaciones, vinculacion)")
        .eq("grupo_id", grupoId!) as any;
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        persona: d.personas,
      })) as MiembroDetalle[];
    },
  });
}

export function useGrupoReportes(grupoId: string | null) {
  return useQuery({
    queryKey: ["grupo_reportes_perfil", grupoId],
    enabled: !!grupoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reportes_grupos" as any)
        .select("id, fecha, estado, ofrenda_casa_paz, total_reportado, no_realizado, mensaje")
        .eq("grupo_id", grupoId!)
        .order("fecha", { ascending: false })
        .limit(20) as any;
      if (error) throw error;

      const reporteIds = (data || []).map((r: any) => r.id);
      let countMap: Record<string, { presentes: number; ausentes: number; nuevos: number }> = {};

      if (reporteIds.length > 0) {
        const { data: asist } = await supabase
          .from("reporte_asistencia" as any)
          .select("reporte_id, presente, es_nuevo")
          .in("reporte_id", reporteIds) as any;

        (asist || []).forEach((a: any) => {
          if (!countMap[a.reporte_id]) countMap[a.reporte_id] = { presentes: 0, ausentes: 0, nuevos: 0 };
          if (a.presente) countMap[a.reporte_id].presentes++;
          else countMap[a.reporte_id].ausentes++;
          if (a.es_nuevo) countMap[a.reporte_id].nuevos++;
        });
      }

      return (data || []).map((r: any): ReporteResumen => ({
        ...r,
        presentes: countMap[r.id]?.presentes || 0,
        ausentes: countMap[r.id]?.ausentes || 0,
        nuevos: countMap[r.id]?.nuevos || 0,
      }));
    },
  });
}

export function useGrupoAsistenciaStats(grupoId: string | null) {
  return useQuery({
    queryKey: ["grupo_asistencia_stats", grupoId],
    enabled: !!grupoId,
    queryFn: async () => {
      // Get all reports for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const since = sixMonthsAgo.toISOString().split("T")[0];

      const { data: reportes } = await supabase
        .from("reportes_grupos" as any)
        .select("id, fecha")
        .eq("grupo_id", grupoId!)
        .gte("fecha", since)
        .order("fecha", { ascending: true }) as any;

      if (!reportes || reportes.length === 0) return [];

      const ids = reportes.map((r: any) => r.id);
      const { data: asist } = await supabase
        .from("reporte_asistencia" as any)
        .select("reporte_id, presente, es_nuevo")
        .in("reporte_id", ids) as any;

      const map: Record<string, { fecha: string; presentes: number; ausentes: number; nuevos: number }> = {};
      reportes.forEach((r: any) => {
        map[r.id] = { fecha: r.fecha, presentes: 0, ausentes: 0, nuevos: 0 };
      });
      (asist || []).forEach((a: any) => {
        if (map[a.reporte_id]) {
          if (a.presente) map[a.reporte_id].presentes++;
          else map[a.reporte_id].ausentes++;
          if (a.es_nuevo) map[a.reporte_id].nuevos++;
        }
      });

      return Object.values(map);
    },
  });
}
