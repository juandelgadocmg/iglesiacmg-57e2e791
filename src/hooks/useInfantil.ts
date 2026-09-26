import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useInfantilGrupos() {
  return useQuery({
    queryKey: ["infantil_grupos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grupos")
        .select("*")
        .ilike("tipo", "%Infantil%")
        .order("nombre", { ascending: true });
      if (error) throw error;
      return data;
    },
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
      const { data, error } = await supabase.from("infantil_asistencia_checkin").insert({
        nino_id: payload.nino_id,
        grupo_id: payload.grupo_id,
        fecha: new Date().toISOString().split("T")[0],
        estado: "Presente",
        hora_entrada: new Date().toISOString(),
        entregado_por_id: payload.entregado_por_id,
        observaciones: payload.observaciones
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infantil_asistencia"] }),
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
        recogido_por_id: payload.recogido_por_id,
      }).eq("id", payload.asistencia_id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infantil_asistencia"] }),
  });
}

export function useInfantilAsistencias(fecha: string) {
  return useQuery({
    queryKey: ["infantil_asistencia", fecha],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infantil_asistencia_checkin")
        .select("*, nino:nino_id(id, nombres, apellidos), entregado:entregado_por_id(id, nombres, apellidos), recogido:recogido_por_id(id, nombres, apellidos), grupo:grupo_id(id, nombre)")
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
        .select("*, nino:nino_id(id, nombres, apellidos, documento_identidad), acudiente:acudiente_id(id, nombres, apellidos, telefono, email, documento_identidad)")
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
