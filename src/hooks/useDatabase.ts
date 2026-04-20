import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

// ============ PERSONAS ============
export function usePersonas() {
  return useQuery({
    queryKey: ["personas"],
    queryFn: async () => {
      // Fetch ALL personas without the default 1000-row limit
      const allData: any[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("personas")
          .select("*, grupos!fk_personas_grupo(nombre)")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          allData.push(...data);
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      return allData;
    },
  });
}

export function useCreatePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (persona: TablesInsert<"personas">) => {
      const { data, error } = await supabase.from("personas").insert(persona).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personas"] });
      qc.invalidateQueries({ queryKey: ["peticiones_oracion"] });
      qc.invalidateQueries({ queryKey: ["certificados_iglesia"] });
      qc.invalidateQueries({ queryKey: ["grupo_miembros_detail"] });
      qc.invalidateQueries({ queryKey: ["grupo_miembros_perfil"] });
      qc.invalidateQueries({ queryKey: ["grupos"] });
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
