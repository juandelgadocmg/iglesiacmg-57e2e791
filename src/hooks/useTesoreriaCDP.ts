import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";

/**
 * Devuelve el lunes (semana_inicio) y domingo (semana_fin) en formato 'yyyy-MM-dd'
 * para una fecha dada.
 */
export function getSemanaRange(fecha: Date) {
  const inicio = startOfWeek(fecha, { weekStartsOn: 1 });
  const fin = endOfWeek(fecha, { weekStartsOn: 1 });
  return {
    inicio: format(inicio, "yyyy-MM-dd"),
    fin: format(fin, "yyyy-MM-dd"),
    inicioDate: inicio,
    finDate: fin,
  };
}

export type EstadoTesoreria =
  | "Conciliado"
  | "Parcial"
  | "Sobrante"
  | "En mora"
  | "Pendiente"
  | "Sin reporte"
  | "Cerrado";

export interface FilaTesoreriaCDP {
  grupo_id: string;
  grupo_nombre: string;
  red: string;
  lider_nombre: string | null;
  valor_reportado: number;
  reportes_count: number;
  registro_id: string | null;
  valor_entregado: number;
  fecha_entrega: string | null;
  observacion: string | null;
  valor_consignado: number;
  fecha_consignacion: string | null;
  soporte_consignacion_url: string | null;
  consignacion_completada: boolean;
  estado: EstadoTesoreria;
}

function calcularEstado(
  reportado: number,
  reportesCount: number,
  entregado: number,
  fechaEntrega: string | null,
  semanaFin: string,
  consignacionCompletada: boolean
): EstadoTesoreria {
  if (consignacionCompletada) return "Cerrado";
  const hoy = format(new Date(), "yyyy-MM-dd");
  const semanaPasada = semanaFin < hoy;

  if (reportesCount === 0 && entregado === 0) {
    return semanaPasada ? "Sin reporte" : "Pendiente";
  }
  if (entregado === 0 && !fechaEntrega) {
    return semanaPasada ? "En mora" : "Pendiente";
  }
  if (entregado >= reportado && reportado > 0) {
    return entregado > reportado ? "Sobrante" : "Conciliado";
  }
  if (entregado > 0 && entregado < reportado) {
    return "Parcial";
  }
  return entregado > 0 ? "Conciliado" : "Pendiente";
}

/**
 * Devuelve todas las Casas de Paz con su valor reportado (suma de reportes_grupos)
 * y el registro de tesorería para esa semana (si existe).
 */
export function useTesoreriaSemana(semanaInicio: string, semanaFin: string) {
  return useQuery({
    queryKey: ["tesoreria_cdp_semana", semanaInicio, semanaFin],
    queryFn: async (): Promise<FilaTesoreriaCDP[]> => {
      // 1. Casas de paz activas
      const { data: grupos, error: errGrupos } = await supabase
        .from("grupos")
        .select("id, nombre, red, personas:lider_id(nombres, apellidos)")
        .eq("tipo", "Casas de paz")
        .eq("estado", "Activo")
        .order("red", { ascending: true })
        .order("nombre", { ascending: true });
      if (errGrupos) throw errGrupos;

      // 2. Reportes de la semana
      const { data: reportes, error: errReportes } = await supabase
        .from("reportes_grupos")
        .select("grupo_id, ofrenda_casa_paz")
        .gte("fecha", semanaInicio)
        .lte("fecha", semanaFin);
      if (errReportes) throw errReportes;

      // 3. Registros tesorería de la semana
      const { data: registros, error: errReg } = await supabase
        .from("tesoreria_ofrendas_cdp")
        .select("*")
        .eq("semana_inicio", semanaInicio);
      if (errReg) throw errReg;

      // Index reportes por grupo
      const reportesPorGrupo: Record<string, { total: number; count: number }> = {};
      (reportes || []).forEach((r: any) => {
        if (!reportesPorGrupo[r.grupo_id]) reportesPorGrupo[r.grupo_id] = { total: 0, count: 0 };
        reportesPorGrupo[r.grupo_id].total += Number(r.ofrenda_casa_paz) || 0;
        reportesPorGrupo[r.grupo_id].count += 1;
      });

      const registrosPorGrupo: Record<string, any> = {};
      (registros || []).forEach((r: any) => {
        registrosPorGrupo[r.grupo_id] = r;
      });

      const filas: FilaTesoreriaCDP[] = (grupos || []).map((g: any) => {
        const rep = reportesPorGrupo[g.id] || { total: 0, count: 0 };
        const reg = registrosPorGrupo[g.id];
        const valorEntregado = Number(reg?.valor_entregado || 0);
        const fechaEntrega = reg?.fecha_entrega || null;
        const consignacionCompletada = !!reg?.consignacion_completada;
        const lider = g.personas
          ? `${g.personas.nombres} ${g.personas.apellidos}`
          : null;

        return {
          grupo_id: g.id,
          grupo_nombre: g.nombre,
          red: g.red || "Sin Red",
          lider_nombre: lider,
          valor_reportado: rep.total,
          reportes_count: rep.count,
          registro_id: reg?.id || null,
          valor_entregado: valorEntregado,
          fecha_entrega: fechaEntrega,
          observacion: reg?.observacion || null,
          valor_consignado: Number(reg?.valor_consignado || 0),
          fecha_consignacion: reg?.fecha_consignacion || null,
          soporte_consignacion_url: reg?.soporte_consignacion_url || null,
          consignacion_completada: consignacionCompletada,
          estado: calcularEstado(rep.total, rep.count, valorEntregado, fechaEntrega, semanaFin, consignacionCompletada),
        };
      });

      return filas;
    },
  });
}

export function useUpsertTesoreriaCDP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      grupo_id: string;
      semana_inicio: string;
      semana_fin: string;
      valor_entregado?: number;
      fecha_entrega?: string | null;
      observacion?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("tesoreria_ofrendas_cdp")
        .upsert(
          {
            grupo_id: input.grupo_id,
            semana_inicio: input.semana_inicio,
            semana_fin: input.semana_fin,
            valor_entregado: input.valor_entregado ?? 0,
            fecha_entrega: input.fecha_entrega ?? null,
            observacion: input.observacion ?? null,
            registrado_por: user?.id ?? null,
          },
          { onConflict: "grupo_id,semana_inicio" }
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_semana", vars.semana_inicio] });
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_mora"] });
    },
  });
}

/**
 * Mora histórica: reportes con ofrenda > 0 cuya semana terminó hace más de 7 días
 * y que NO tienen un registro de tesorería con valor_entregado >= reportado.
 */
export function useTesoreriaMora() {
  return useQuery({
    queryKey: ["tesoreria_cdp_mora"],
    queryFn: async () => {
      const hoy = new Date();
      const limiteFecha = format(addDays(hoy, -7), "yyyy-MM-dd");

      // Reportes con ofrenda > 0 hasta hace más de 7 días
      const { data: reportes, error: errR } = await supabase
        .from("reportes_grupos")
        .select("id, grupo_id, fecha, ofrenda_casa_paz, grupos(nombre, red)")
        .gt("ofrenda_casa_paz", 0)
        .lte("fecha", limiteFecha);
      if (errR) throw errR;

      // Todos los registros de tesorería
      const { data: registros, error: errReg } = await supabase
        .from("tesoreria_ofrendas_cdp")
        .select("grupo_id, semana_inicio, semana_fin, valor_entregado");
      if (errReg) throw errReg;

      // Agrupar reportes por grupo + semana (lunes)
      const morosos: Array<{
        grupo_id: string;
        grupo_nombre: string;
        red: string;
        semana_inicio: string;
        semana_fin: string;
        reportado: number;
        entregado: number;
        diferencia: number;
      }> = [];

      const agrupados: Record<string, { grupo_id: string; grupo_nombre: string; red: string; semana_inicio: string; semana_fin: string; reportado: number }> = {};
      (reportes || []).forEach((r: any) => {
        const semana = getSemanaRange(new Date(r.fecha + "T00:00:00"));
        const key = `${r.grupo_id}__${semana.inicio}`;
        if (!agrupados[key]) {
          agrupados[key] = {
            grupo_id: r.grupo_id,
            grupo_nombre: r.grupos?.nombre || "—",
            red: r.grupos?.red || "Sin Red",
            semana_inicio: semana.inicio,
            semana_fin: semana.fin,
            reportado: 0,
          };
        }
        agrupados[key].reportado += Number(r.ofrenda_casa_paz) || 0;
      });

      Object.values(agrupados).forEach((g) => {
        const reg = (registros || []).find(
          (x: any) => x.grupo_id === g.grupo_id && x.semana_inicio === g.semana_inicio
        );
        const entregado = Number(reg?.valor_entregado || 0);
        if (entregado < g.reportado) {
          morosos.push({
            ...g,
            entregado,
            diferencia: g.reportado - entregado,
          });
        }
      });

      return morosos.sort((a, b) => (a.semana_inicio < b.semana_inicio ? -1 : 1));
    },
  });
}
