import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Los grupos infantiles se guardan en `grupos` con tipo "Niños" (valor válido
 * del enum `tipo_grupo`). La descripción de edades se guarda en `descripcion`.
 */
export const TIPO_GRUPO_INFANTIL = "Niños" as const;

/** Valor en personas.tipos_persona que identifica a un maestro infantil. */
export const TIPO_MAESTRO_INFANTIL = "Maestro Infantil";

export const getTiposPersona = (p: any): string[] =>
  Array.isArray(p?.tipos_persona) ? p.tipos_persona : [];
export const isMaestroInfantil = (p: any) => getTiposPersona(p).includes(TIPO_MAESTRO_INFANTIL);
export const isNino = (p: any) => getTiposPersona(p).includes("Niño");

export function useInfantilGrupos() {
  return useQuery({
    queryKey: ["infantil_grupos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grupos")
        .select("*, infantil_grupos_detalles(*)")
        .eq("tipo", TIPO_GRUPO_INFANTIL)
        .order("nombre", { ascending: true });
      if (error) throw error;
      return (data || []).map((g: any) => ({
        ...g,
        edades: g.descripcion,
        // 1:1 relation may come back as object or array depending on PostgREST
        infantil_grupos_detalles: Array.isArray(g.infantil_grupos_detalles)
          ? g.infantil_grupos_detalles
          : g.infantil_grupos_detalles
            ? [g.infantil_grupos_detalles]
            : [],
      }));
    },
  });
}

export function useCreateInfantilGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { nombre: string; edades: string; edad_minima?: number; edad_maxima?: number; salon?: string; capacidad?: number }) => {
      // 1. Create the base group
      const { data: grupo, error: err1 } = await supabase.from("grupos").insert({
        nombre: payload.nombre,
        descripcion: payload.edades || null,
        tipo: TIPO_GRUPO_INFANTIL,
        estado: "Activo"
      }).select().single();
      if (err1) throw err1;

      // 2. Create the details
      const { error: err2 } = await supabase.from("infantil_grupos_detalles").insert({
        grupo_id: grupo.id,
        edad_minima: payload.edad_minima,
        edad_maxima: payload.edad_maxima,
        salon: payload.salon,
        capacidad: payload.capacidad
      });
      if (err2) throw err2;

      return grupo;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infantil_grupos"] })
  });
}

export function useUpdateInfantilGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; nombre: string; edades: string; edad_minima?: number; edad_maxima?: number; salon?: string; capacidad?: number }) => {
      // 1. Update the base group
      const { error: err1 } = await supabase.from("grupos").update({
        nombre: payload.nombre,
        descripcion: payload.edades || null
      }).eq("id", payload.id);
      if (err1) throw err1;

      // 2. Upsert the details
      const { error: err2 } = await supabase.from("infantil_grupos_detalles").upsert({
        grupo_id: payload.id,
        edad_minima: payload.edad_minima,
        edad_maxima: payload.edad_maxima,
        salon: payload.salon,
        capacidad: payload.capacidad
      }, { onConflict: "grupo_id" });
      if (err2) throw err2;

      return payload;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infantil_grupos"] })
  });
}

export function useDeleteInfantilGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grupos").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infantil_grupos"] })
  });
}

export function useInfantilClases(grupoId?: string) {
  return useQuery({
    queryKey: ["infantil_clases", grupoId],
    queryFn: async () => {
      let query = supabase
        .from("infantil_clases")
        .select("*, maestro:maestro_id(id, nombres, apellidos), grupo:grupo_id(id, nombre)")
        .order("fecha", { ascending: false });
      if (grupoId) {
        query = query.eq("grupo_id", grupoId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInfantilClase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clase: any) => {
      const { data, error } = await supabase.from("infantil_clases").insert(clase).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["infantil_clases"] });
    },
  });
}

export function useUpdateInfantilClase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from("infantil_clases").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["infantil_clases"] });
    },
  });
}

export function useInfantilCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      nino_id: string;
      grupo_id: string;
      entregado_por_id?: string;
      observaciones?: string;
    }) => {
      const fechaHoy = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("infantil_asistencia_checkin").upsert({
        nino_id: payload.nino_id,
        grupo_id: payload.grupo_id,
        fecha: fechaHoy,
        estado: "Presente",
        hora_entrada: new Date().toISOString(),
        entregado_por_id: payload.entregado_por_id || null,
        observaciones: payload.observaciones || null
      }, { onConflict: "nino_id,fecha,grupo_id" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["infantil_asistencia"] });
      qc.invalidateQueries({ queryKey: ["infantil_asistencias_lista"] });
    },
  });
}

export function useInfantilCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      asistencia_id: string;
      recogido_por_id?: string;
    }) => {
      const { data, error } = await supabase.from("infantil_asistencia_checkin").update({
        hora_salida: new Date().toISOString(),
        recogido_por_id: payload.recogido_por_id || null,
      }).eq("id", payload.asistencia_id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["infantil_asistencia"] });
      qc.invalidateQueries({ queryKey: ["infantil_asistencias_lista"] });
    },
  });
}

export function useInfantilAsistencias(fecha: string) {
  return useQuery({
    queryKey: ["infantil_asistencia", fecha],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infantil_asistencia_checkin")
        .select("*, nino:nino_id(id, nombres, apellidos, documento), entregado:entregado_por_id(id, nombres, apellidos), recogido:recogido_por_id(id, nombres, apellidos), grupo:grupo_id(id, nombre)")
        .eq("fecha", fecha)
        .order("hora_entrada", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useInfantilAcudientes() {
  return useQuery({
    queryKey: ["infantil_acudientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infantil_acudientes")
        .select("*, nino:nino_id(id, nombres, apellidos, documento), acudiente:acudiente_id(id, nombres, apellidos, telefono, whatsapp, email, documento)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInfantilAcudiente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("infantil_acudientes").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infantil_acudientes"] }),
  });
}

export function useUpdateInfantilAcudiente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from("infantil_acudientes").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infantil_acudientes"] }),
  });
}

export function useDeleteInfantilAcudiente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("infantil_acudientes").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infantil_acudientes"] }),
  });
}

export function useInfantilAtenciones() {
  return useQuery({
    queryKey: ["infantil_atenciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infantil_atenciones")
        .select("*, nino:nino_id(id, nombres, apellidos), maestro:maestro_id(id, nombres, apellidos), responsable:responsable_id(id, nombres, apellidos)")
        .order("hora_creacion", { ascending: false });
      if (error) {
        if (error.code === "42P01") return []; // tabla no existe aún
        throw error;
      }
      return data || [];
    },
  });
}

export function useCreateInfantilAtencion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      nino_id: string;
      tipo_solicitud: string;
      prioridad?: string;
      observaciones?: string;
      sintomas?: string;
      temperatura?: number | null;
      necesita_acudiente?: boolean;
      maestro_id?: string | null;
    }) => {
      const { data, error } = await supabase.from("infantil_atenciones").insert({
        nino_id: payload.nino_id,
        tipo_solicitud: payload.tipo_solicitud as any,
        prioridad: payload.prioridad || "Normal",
        observaciones: payload.observaciones || null,
        sintomas: payload.sintomas || null,
        temperatura: payload.temperatura || null,
        necesita_acudiente: payload.necesita_acudiente ?? false,
        maestro_id: payload.maestro_id || null,
        estado: "Pendiente"
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infantil_atenciones"] }),
  });
}

export function useUpdateInfantilAtencion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("infantil_atenciones").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infantil_atenciones"] }),
  });
}

