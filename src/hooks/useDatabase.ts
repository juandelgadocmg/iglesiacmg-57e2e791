import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

// ============ PERSONAS ============
export function usePersonas() {
  return useQuery({
    queryKey: ["personas"],
    queryFn: async () => {
      let all: any[] = [];
      let pageFrom = 0;
      const CHUNK_SIZE = 1000;
      let hasMorePages = true;

      while (hasMorePages) {
        try {
          const { data, error } = await supabase
            .from("personas")
            .select("*, grupos(id, nombre), persona_procesos(proceso_id, estado, fecha_completado, observacion)")
            .order("created_at", { ascending: false })
            .range(pageFrom, pageFrom + CHUNK_SIZE - 1);

          if (error) {
            console.warn("Retrying fallback range query for personas:", error.message);
            const { data: simpleData } = await supabase
              .from("personas")
              .select("*")
              .order("created_at", { ascending: false })
              .range(pageFrom, pageFrom + CHUNK_SIZE - 1);

            if (simpleData && simpleData.length > 0) {
              all = all.concat(simpleData);
            }
            if (!simpleData || simpleData.length < CHUNK_SIZE) {
              hasMorePages = false;
            }
          } else {
            if (data && data.length > 0) {
              all = all.concat(data);
            }
            if (!data || data.length < CHUNK_SIZE) {
              hasMorePages = false;
            }
          }
        } catch (err) {
          console.error("usePersonas query exception:", err);
          hasMorePages = false;
        }
        pageFrom += CHUNK_SIZE;
      }
      return all;
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
}

export function useCreatePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (persona: TablesInsert<"personas">) => {
      // 1. Try direct Supabase table insert first
      const { data: directData, error: directErr } = await supabase
        .from("personas")
        .insert(persona)
        .select()
        .single();

      if (!directErr && directData) {
        return directData;
      }

      console.warn("Direct insert into personas failed, attempting RPC fallback:", directErr?.message);

      // 2. Try RPC fallback if direct insert fails
      const { data, error } = await (supabase.rpc as any)("create_persona_with_permission", {
        _payload: persona,
      });

      if (error) {
        throw directErr || error;
      }
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personas"] });
      qc.invalidateQueries({ queryKey: ["peticiones_oracion"] });
      qc.invalidateQueries({ queryKey: ["certificados_iglesia"] });
      qc.invalidateQueries({ queryKey: ["grupo_miembros_detail"] });
      qc.invalidateQueries({ queryKey: ["grupo_miembros_perfil"] });
      qc.invalidateQueries({ queryKey: ["grupos"] });
      qc.invalidateQueries({ queryKey: ["afirmacion_personas_ruta"] });
    },
  });
}

export function useUpdatePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<"personas">>) => {
      const { error } = await supabase.from("personas").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personas"] });
      qc.invalidateQueries({ queryKey: ["peticiones_oracion"] });
      qc.invalidateQueries({ queryKey: ["certificados_iglesia"] });
      qc.invalidateQueries({ queryKey: ["persona-detalle"] });
      qc.invalidateQueries({ queryKey: ["grupo_miembros_detail"] });
      qc.invalidateQueries({ queryKey: ["grupo_miembros_perfil"] });
      qc.invalidateQueries({ queryKey: ["grupos"] });
    },
  });
}

export function useDeletePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personas"] }),
  });
}

// ============ PERSONAS PARA EXPORT (Informe de Consolidación) ============
export interface PersonaExportFiltros {
  from?: string; // inclusive ISO date (yyyy-mm-dd)
  to?: string;   // exclusive ISO date (yyyy-mm-dd)
  campo?: "created_at" | "fecha_ingreso" | "ingreso_proceso"; // campo de fecha a filtrar (default: created_at)
}

const CANONICAL_SEQUENCE = [
  "llamada de consolidación 1",
  "mensaje 1",
  "llamada de consolidación 2",
  "mensaje 2",
  "llamada de consolidación 3",
  "mensaje 3",
  "mensaje 4",
  "mensaje 5",
  "mensaje 6",
  "visita",
  "consejería",
  "fiesta de bienvenida",
  "nací para triunfar día 1",
  "semana de poder 1",
  "semana de poder 2",
  "semana de poder 3",
  "una nueva vida y un nuevo comienzo",
  "retiro de sanidad interior y liberación",
  "bautismo",
  "discipulado de nuevos creyentes",
  "escuela de evangelismo sobrenatural",
  "escuela de líderes de casa de paz",
  "retiro de líderes de casas de paz",
  "escuela de mentores",
  "retiro de mentores",
  "escuela del ministerio quíntuple",
];

function getCanonicalOrder(nombre: string, fallbackOrden: number): number {
  const normName = String(nombre || "").toLowerCase().trim();
  const idx = CANONICAL_SEQUENCE.findIndex((seq) => normName.includes(seq) || seq.includes(normName));
  if (idx !== -1) return (idx + 1) * 10;
  return fallbackOrden * 10;
}

export function useProcesosCrecimiento() {
  return useQuery({
    queryKey: ["procesos_crecimiento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procesos_crecimiento")
        .select("id, nombre, orden")
        .order("orden", { ascending: true });
      if (error) throw error;
      let list = data || [];

      // Verificar si faltan Semana de Poder 2 o Semana de Poder 3
      const hasSdp1 = list.some((p) => p.nombre.toLowerCase().includes("semana de poder 1") || p.nombre.toLowerCase().includes("semana poder 1"));
      const hasSdp2 = list.some((p) => p.nombre.toLowerCase().includes("semana de poder 2") || p.nombre.toLowerCase().includes("semana poder 2"));
      const hasSdp3 = list.some((p) => p.nombre.toLowerCase().includes("semana de poder 3") || p.nombre.toLowerCase().includes("semana poder 3"));

      if (hasSdp1 && (!hasSdp2 || !hasSdp3)) {
        try {
          const sdp1Obj = list.find((p) => p.nombre.toLowerCase().includes("semana de poder 1"));
          const baseOrden = sdp1Obj ? sdp1Obj.orden : 15;

          const toInsert: any[] = [];
          if (!hasSdp2) toInsert.push({ nombre: "Semana de Poder 2", orden: baseOrden + 1 });
          if (!hasSdp3) toInsert.push({ nombre: "Semana de Poder 3", orden: baseOrden + 2 });

          if (toInsert.length > 0) {
            const { data: inserted } = await supabase
              .from("procesos_crecimiento")
              .insert(toInsert)
              .select("id, nombre, orden");

            if (inserted && inserted.length > 0) {
              list = [...list, ...inserted];
            }
          }
        } catch (e) {
          console.warn("Auto-insert Semana de Poder 2/3 error:", e);
        }
      }

      // Si no están guardados en BD aún, inyectarlos sintéticamente para garantizar la vista completa
      const finalHasSdp2 = list.some((p) => p.nombre.toLowerCase().includes("semana de poder 2") || p.nombre.toLowerCase().includes("semana poder 2"));
      const finalHasSdp3 = list.some((p) => p.nombre.toLowerCase().includes("semana de poder 3") || p.nombre.toLowerCase().includes("semana poder 3"));

      if (!finalHasSdp2 || !finalHasSdp3) {
        const sdp1Idx = list.findIndex((p) => p.nombre.toLowerCase().includes("semana de poder 1"));
        if (sdp1Idx !== -1) {
          const sdp1Item = list[sdp1Idx];
          const newItems: any[] = [];
          if (!finalHasSdp2) newItems.push({ id: `synthetic_sdp2`, nombre: "Semana de Poder 2", orden: sdp1Item.orden + 0.1 });
          if (!finalHasSdp3) newItems.push({ id: `synthetic_sdp3`, nombre: "Semana de Poder 3", orden: sdp1Item.orden + 0.2 });

          list.splice(sdp1Idx + 1, 0, ...newItems);
        }
      }

      // Ordenar canónicamente para garantizar: Semana de Poder 1 -> Semana de Poder 2 -> Semana de Poder 3 -> Una Nueva Vida...
      list.sort((a, b) => getCanonicalOrder(a.nombre, a.orden) - getCanonicalOrder(b.nombre, b.orden));

      return list;
    },
  });
}

export function usePersonasParaExport(filtros: PersonaExportFiltros, enabled = true) {
  return useQuery({
    queryKey: ["personas_export", filtros],
    enabled,
    queryFn: async () => {
      const all: any[] = [];
      const PAGE_SIZE = 1000;
      const campo = filtros.campo || "created_at";

      // Filtro especial: por fecha del proceso "Ingreso a la Iglesia"
      let idsIngreso: Set<string> | null = null;
      if (campo === "ingreso_proceso" && (filtros.from || filtros.to)) {
        // Buscar id del proceso "Ingreso a la Iglesia"
        const { data: procs, error: procErr } = await supabase
          .from("procesos_crecimiento")
          .select("id, nombre")
          .ilike("nombre", "%ingreso%iglesia%");
        if (procErr) throw procErr;
        const procIds = (procs || []).map((p: any) => p.id);
        if (procIds.length === 0) return [];

        idsIngreso = new Set<string>();
        let pfrom = 0;
        let phasMore = true;
        while (phasMore) {
          let pq = supabase
            .from("persona_procesos")
            .select("persona_id, fecha_completado")
            .in("proceso_id", procIds)
            .not("fecha_completado", "is", null)
            .range(pfrom, pfrom + PAGE_SIZE - 1);
          if (filtros.from) pq = pq.gte("fecha_completado", filtros.from);
          if (filtros.to) pq = pq.lt("fecha_completado", filtros.to);
          const { data: pdata, error: perr } = await pq;
          if (perr) throw perr;
          (pdata || []).forEach((r: any) => idsIngreso!.add(r.persona_id));
          phasMore = (pdata?.length || 0) === PAGE_SIZE;
          pfrom += PAGE_SIZE;
        }
        if (idsIngreso.size === 0) return [];
      }

      let from = 0;
      let hasMore = true;
      const orderField = campo === "ingreso_proceso" ? "created_at" : campo;
      const idsArray = idsIngreso ? Array.from(idsIngreso) : null;

      while (hasMore) {
        let q = supabase
          .from("personas")
          .select(`
            id, nombres, apellidos, tipo_persona, estado_iglesia, vinculacion, ministerio,
            fecha_ingreso, invitado_por, seguimiento_por, created_at,
            grupos!fk_personas_grupo(nombre),
            persona_procesos(proceso_id, estado, fecha_completado, observacion)
          `)
          .order(orderField, { ascending: false, nullsFirst: false })
          .range(from, from + PAGE_SIZE - 1);

        if (idsArray) {
          q = q.in("id", idsArray);
        } else {
          if (filtros.from) q = q.gte(campo, filtros.from);
          if (filtros.to) q = q.lt(campo, filtros.to);
        }

        const { data, error } = await q;
        if (error) throw error;
        if (data && data.length > 0) {
          all.push(...data);
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }
      return all;
    },
  });
}

// ============ GRUPOS ============
export function useGrupos() {
  return useQuery({
    queryKey: ["grupos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grupos")
        .select("*, grupo_miembros(count), personas!grupos_lider_id_fkey(id, nombres, apellidos, foto_url, tipo_persona)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (grupo: TablesInsert<"grupos">) => {
      const { data, error } = await supabase.from("grupos").insert(grupo).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grupos"] }),
  });
}

export function useUpdateGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<"grupos">>) => {
      const { error } = await supabase.from("grupos").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grupos"] }),
  });
}

export function useDeleteGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grupos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grupos"] }),
  });
}

// ============ SERVICIOS ============
export function useServicios() {
  return useQuery({
    queryKey: ["servicios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicios")
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateServicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (servicio: TablesInsert<"servicios">) => {
      const { data, error } = await supabase.from("servicios").insert(servicio).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servicios"] }),
  });
}

export function useUpdateServicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<"servicios">>) => {
      const { error } = await supabase.from("servicios").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servicios"] }),
  });
}

export function useDeleteServicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("servicios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servicios"] }),
  });
}

// ============ FINANZAS ============
export function useFinanzas() {
  return useQuery({
    queryKey: ["finanzas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finanzas")
        .select("*, personas(nombres, apellidos)")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFinanza() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (finanza: TablesInsert<"finanzas">) => {
      const { data, error } = await supabase.from("finanzas").insert(finanza).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finanzas"] }),
  });
}

export function useUpdateFinanza() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<"finanzas">>) => {
      const { error } = await supabase.from("finanzas").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finanzas"] }),
  });
}

export function useDeleteFinanza() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finanzas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finanzas"] }),
  });
}

// ============ EVENTOS ============
export function useEventos() {
  return useQuery({
    queryKey: ["eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*, inscripciones(count)")
        .order("fecha_inicio", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (evento: TablesInsert<"eventos">) => {
      const { data, error } = await supabase.from("eventos").insert(evento).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eventos"] }),
  });
}

export function useUpdateEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<"eventos">>) => {
      const { error } = await supabase.from("eventos").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eventos"] }),
  });
}

export function useDeleteEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eventos"] }),
  });
}

// ============ DONACIONES ============
export function useDonaciones() {
  return useQuery({
    queryKey: ["donaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donaciones")
        .select("*, personas(nombres, apellidos)")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDonacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (donacion: TablesInsert<"donaciones">) => {
      const { data, error } = await supabase.from("donaciones").insert(donacion).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["donaciones"] }),
  });
}

// ============ INSCRIPCIONES ============
export function useInscripciones(eventoId: string | null) {
  return useQuery({
    queryKey: ["inscripciones", eventoId],
    enabled: !!eventoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscripciones")
        .select("*, personas(nombres, apellidos), eventos(nombre)")
        .eq("evento_id", eventoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInscripcion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inscripcion: TablesInsert<"inscripciones">) => {
      const { data, error } = await supabase.from("inscripciones").insert(inscripcion).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inscripciones"] });
      qc.invalidateQueries({ queryKey: ["eventos"] });
    },
  });
}

export function useUpdateInscripcion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; confirmado?: boolean; estado_pago?: string }) => {
      const { error } = await supabase.from("inscripciones").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inscripciones"] }),
  });
}

export function useDeleteInscripcion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inscripciones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inscripciones"] });
      qc.invalidateQueries({ queryKey: ["eventos"] });
    },
  });
}

// ============ ASISTENCIA ============
export function useAsistencia(servicioId: string | null) {
  return useQuery({
    queryKey: ["asistencia", servicioId],
    enabled: !!servicioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asistencia")
        .select("*")
        .eq("servicio_id", servicioId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertAsistencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (records: { servicio_id: string; persona_id: string; presente: boolean }[]) => {
      const { error } = await supabase
        .from("asistencia")
        .upsert(records, { onConflict: "servicio_id,persona_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asistencia"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

// ============ DASHBOARD STATS ============
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [personasRes, serviciosRes, finanzasRes, eventosRes] = await Promise.all([
        supabase.from("personas").select("id, tipo_persona, fecha_nacimiento, created_at", { count: "exact" }),
        supabase.from("servicios").select("*").order("fecha", { ascending: false }).limit(5),
        supabase.from("finanzas").select("*"),
        supabase.from("eventos").select("*, inscripciones(count)").order("fecha_inicio", { ascending: true }).limit(5),
      ]);

      const totalPersonas = personasRes.count || 0;
      const now = new Date();
      const thisMonth = personasRes.data?.filter(p => {
        const d = new Date(p.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length || 0;

      const finanzasMes = finanzasRes.data?.filter(f => {
        const d = new Date(f.fecha);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }) || [];

      const ingresosMes = finanzasMes.filter(f => f.tipo === "Ingreso").reduce((s, f) => s + Number(f.monto), 0);
      const gastosMes = finanzasMes.filter(f => f.tipo === "Gasto").reduce((s, f) => s + Number(f.monto), 0);

      return {
        totalPersonas,
        nuevosEsteMes: thisMonth,
        ingresosMes,
        gastosMes,
        servicios: serviciosRes.data || [],
        eventos: eventosRes.data || [],
      };
    },
  });
}
