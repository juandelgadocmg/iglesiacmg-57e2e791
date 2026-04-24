import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, addDays, differenceInCalendarDays, parseISO } from "date-fns";

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
  | "Sin reporte";

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
  estado: EstadoTesoreria;
  dias_mora: number;
}

export interface ConsignacionSemanal {
  id: string;
  semana_inicio: string;
  semana_fin: string;
  valor_total_entregado: number;
  valor_consignado: number;
  fecha_consignacion: string | null;
  soporte_consignacion_url: string | null;
  observacion: string | null;
  consignacion_completada: boolean;
}

function calcularEstado(
  reportado: number,
  reportesCount: number,
  entregado: number,
  fechaEntrega: string | null,
  semanaFin: string,
  diasMora: number
): EstadoTesoreria {
  const hoy = format(new Date(), "yyyy-MM-dd");
  const semanaPasada = semanaFin < hoy;

  if (reportesCount === 0 && entregado === 0) {
    return semanaPasada ? "Sin reporte" : "Pendiente";
  }
  if (entregado === 0 && !fechaEntrega) {
    return diasMora > 0 ? "En mora" : "Pendiente";
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
      // Configuración (días de mora)
      const { data: cfg } = await supabase
        .from("configuracion_iglesia")
        .select("tesoreria_cdp_dias_mora")
        .limit(1)
        .single();
      const diasConfigurados = Number((cfg as any)?.tesoreria_cdp_dias_mora ?? 7);

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

      // 3. Registros tesorería de la semana (entrega física por CDP)
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

      // Calcular días de mora desde fin de semana + días configurados
      const hoy = new Date();
      const semanaFinDate = parseISO(semanaFin);
      const diasDesdeFin = differenceInCalendarDays(hoy, semanaFinDate);
      const diasMoraBase = Math.max(0, diasDesdeFin - diasConfigurados);

      const filas: FilaTesoreriaCDP[] = (grupos || []).map((g: any) => {
        const rep = reportesPorGrupo[g.id] || { total: 0, count: 0 };
        const reg = registrosPorGrupo[g.id];
        const valorEntregado = Number(reg?.valor_entregado || 0);
        const fechaEntrega = reg?.fecha_entrega || null;
        const lider = g.personas
          ? `${g.personas.nombres} ${g.personas.apellidos}`
          : null;

        // Mora: hay reporte pero entrega física pendiente o parcial
        const aplicaMora =
          (rep.total > 0 || valorEntregado > 0) &&
          valorEntregado < rep.total;
        const diasMora = aplicaMora ? diasMoraBase : 0;

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
          estado: calcularEstado(rep.total, rep.count, valorEntregado, fechaEntrega, semanaFin, diasMora),
          dias_mora: diasMora,
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
      const payload: any = {
        grupo_id: input.grupo_id,
        semana_inicio: input.semana_inicio,
        semana_fin: input.semana_fin,
        registrado_por: user?.id ?? null,
      };
      if (input.valor_entregado !== undefined) payload.valor_entregado = input.valor_entregado;
      if (input.fecha_entrega !== undefined) payload.fecha_entrega = input.fecha_entrega;
      if (input.observacion !== undefined) payload.observacion = input.observacion;

      const { error } = await supabase
        .from("tesoreria_ofrendas_cdp")
        .upsert(payload, { onConflict: "grupo_id,semana_inicio" });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_semana", vars.semana_inicio] });
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_consignacion_semanal", vars.semana_inicio] });
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_mora"] });
    },
  });
}

/**
 * Sube el archivo de soporte de consignación al bucket público.
 * Devuelve la URL pública.
 */
export function useUploadSoporteConsignacion() {
  return useMutation({
    mutationFn: async ({ file, semanaInicio }: { file: File; semanaInicio: string }) => {
      const ext = file.name.split(".").pop() || "bin";
      const path = `semanal/${semanaInicio}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("soportes-tesoreria")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("soportes-tesoreria").getPublicUrl(path);
      return data.publicUrl;
    },
  });
}

/* ============================================================
   CONSIGNACIÓN SEMANAL ÚNICA (suma de todas las CDP)
   ============================================================ */

export function useConsignacionSemanal(semanaInicio: string) {
  return useQuery({
    queryKey: ["tesoreria_cdp_consignacion_semanal", semanaInicio],
    enabled: !!semanaInicio,
    queryFn: async (): Promise<ConsignacionSemanal | null> => {
      const { data, error } = await supabase
        .from("tesoreria_consignacion_semanal")
        .select("*")
        .eq("semana_inicio", semanaInicio)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        semana_inicio: data.semana_inicio,
        semana_fin: data.semana_fin,
        valor_total_entregado: Number(data.valor_total_entregado || 0),
        valor_consignado: Number(data.valor_consignado || 0),
        fecha_consignacion: data.fecha_consignacion,
        soporte_consignacion_url: data.soporte_consignacion_url,
        observacion: data.observacion,
        consignacion_completada: !!data.consignacion_completada,
      };
    },
  });
}

export function useUpsertConsignacionSemanal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      semana_inicio: string;
      semana_fin: string;
      valor_total_entregado: number;
      valor_consignado: number;
      fecha_consignacion: string | null;
      soporte_consignacion_url: string | null;
      observacion: string | null;
      consignacion_completada: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("tesoreria_consignacion_semanal")
        .upsert(
          {
            ...input,
            registrado_por: user?.id ?? null,
          },
          { onConflict: "semana_inicio" }
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_consignacion_semanal", vars.semana_inicio] });
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_semana", vars.semana_inicio] });
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_mora"] });
    },
  });
}

/**
 * Reabre una consignación semanal previamente cerrada para permitir
 * conciliar entregas que llegan días o semanas después.
 * Registra el evento en el historial con el motivo.
 */
export function useReabrirConsignacionSemanal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      consignacion_id: string;
      semana_inicio: string;
      motivo: string;
      soporte_url: string | null;
      valor_consignado: number;
      fecha_consignacion: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Registrar el evento en el historial
      const { error: histErr } = await supabase
        .from("tesoreria_consignacion_historial")
        .insert({
          consignacion_semanal_id: input.consignacion_id,
          registro_id: input.consignacion_id,
          soporte_url: input.soporte_url,
          valor_consignado: input.valor_consignado,
          fecha_consignacion: input.fecha_consignacion,
          motivo_cambio: `[REAPERTURA] ${input.motivo}`,
          cambiado_por: user?.id ?? null,
        });
      if (histErr) throw histErr;

      // 2. Marcar como no completada (reabrir)
      const { error: updErr } = await supabase
        .from("tesoreria_consignacion_semanal")
        .update({ consignacion_completada: false })
        .eq("id", input.consignacion_id);
      if (updErr) throw updErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_consignacion_semanal", vars.semana_inicio] });
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_semana", vars.semana_inicio] });
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_mora"] });
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_historial_semanal", vars.consignacion_id] });
    },
  });
}

/**
 * Reemplaza el soporte de la consignación semanal ya cerrada,
 * registrando el cambio en el historial.
 */
export function useReemplazarSoporteSemanal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      consignacion_id: string;
      semana_inicio: string;
      file?: File | null;
      valor_consignado?: number;
      fecha_consignacion?: string | null;
      motivo: string;
      soporte_anterior_url: string | null;
      valor_anterior: number;
      fecha_anterior: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Guardar el registro anterior en el historial
      const { error: histErr } = await supabase
        .from("tesoreria_consignacion_historial")
        .insert({
          consignacion_semanal_id: input.consignacion_id,
          registro_id: input.consignacion_id, // legacy NOT NULL: reutilizamos el mismo id
          soporte_url: input.soporte_anterior_url,
          valor_consignado: input.valor_anterior,
          fecha_consignacion: input.fecha_anterior,
          motivo_cambio: input.motivo,
          cambiado_por: user?.id ?? null,
        });
      if (histErr) throw histErr;

      // 2. Subir nuevo soporte si viene
      let nuevaUrl = input.soporte_anterior_url;
      if (input.file) {
        const ext = input.file.name.split(".").pop() || "bin";
        const path = `semanal/${input.semana_inicio}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("soportes-tesoreria")
          .upload(path, input.file, { upsert: true, contentType: input.file.type });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("soportes-tesoreria").getPublicUrl(path);
        nuevaUrl = data.publicUrl;
      }

      // 3. Actualizar la consignación
      const updates: any = { soporte_consignacion_url: nuevaUrl };
      if (input.valor_consignado !== undefined) updates.valor_consignado = input.valor_consignado;
      if (input.fecha_consignacion !== undefined) updates.fecha_consignacion = input.fecha_consignacion;
      const { error: updErr } = await supabase
        .from("tesoreria_consignacion_semanal")
        .update(updates)
        .eq("id", input.consignacion_id);
      if (updErr) throw updErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_consignacion_semanal", vars.semana_inicio] });
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_historial_semanal", vars.consignacion_id] });
    },
  });
}

/**
 * Devuelve el historial de cambios del soporte de la consignación semanal.
 */
export function useHistorialSemanal(consignacionId: string | null) {
  return useQuery({
    queryKey: ["tesoreria_cdp_historial_semanal", consignacionId],
    enabled: !!consignacionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tesoreria_consignacion_historial")
        .select("*")
        .eq("consignacion_semanal_id", consignacionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

/**
 * Mora histórica: reportes con ofrenda > 0 cuya semana terminó hace más
 * que los días configurados y que NO tienen un registro de tesorería con
 * valor_entregado >= reportado.
 */
export function useTesoreriaMora() {
  return useQuery({
    queryKey: ["tesoreria_cdp_mora"],
    queryFn: async () => {
      // Días configurados
      const { data: cfg } = await supabase
        .from("configuracion_iglesia")
        .select("tesoreria_cdp_dias_mora")
        .limit(1)
        .single();
      const diasConfigurados = Number((cfg as any)?.tesoreria_cdp_dias_mora ?? 7);

      const hoy = new Date();
      const limiteFecha = format(addDays(hoy, -diasConfigurados), "yyyy-MM-dd");

      // Reportes con ofrenda > 0 hasta hace más de N días
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
        dias_mora: number;
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
          const diasDesdeFin = differenceInCalendarDays(hoy, parseISO(g.semana_fin));
          const diasMora = Math.max(0, diasDesdeFin - diasConfigurados);
          morosos.push({
            ...g,
            entregado,
            diferencia: g.reportado - entregado,
            dias_mora: diasMora,
          });
        }
      });

      return morosos.sort((a, b) => (a.semana_inicio < b.semana_inicio ? -1 : 1));
    },
  });
}
