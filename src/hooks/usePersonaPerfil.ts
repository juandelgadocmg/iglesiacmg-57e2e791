import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePersonaDetalle(id: string | undefined) {
  return useQuery({
    queryKey: ["persona-detalle", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personas")
        .select("*, grupos!fk_personas_grupo(id, nombre, tipo, red)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useProcesos() {
  return useQuery({
    queryKey: ["procesos-crecimiento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procesos_crecimiento")
        .select("*")
        .order("orden", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function usePersonaProcesos(personaId: string | undefined) {
  return useQuery({
    queryKey: ["persona-procesos", personaId],
    enabled: !!personaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("persona_procesos")
        .select("*")
        .eq("persona_id", personaId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProceso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ personaId, procesoId, estado, fecha_completado, observacion }: {
      personaId: string; procesoId: string; estado: string; fecha_completado?: string | null; observacion?: string | null;
    }) => {
      // Obtener registro existente para preservar datos no enviados
      const { data: existing } = await supabase
        .from("persona_procesos")
        .select("fecha_completado, observacion")
        .eq("persona_id", personaId)
        .eq("proceso_id", procesoId)
        .maybeSingle();

      const finalFecha = fecha_completado !== undefined ? fecha_completado : (existing?.fecha_completado ?? null);
      const finalObs = observacion !== undefined ? observacion : (existing?.observacion ?? null);

      const { error } = await supabase
        .from("persona_procesos")
        .upsert({
          persona_id: personaId,
          proceso_id: procesoId,
          estado,
          fecha_completado: finalFecha,
          observacion: finalObs,
        } as any, { onConflict: "persona_id,proceso_id" });

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["persona-procesos", vars.personaId] });
      qc.invalidateQueries({ queryKey: ["persona-detalle", vars.personaId] });
      qc.invalidateQueries({ queryKey: ["personas"] });
    },
  });
}

export function usePersonaAsistencia(personaId: string | undefined) {
  return useQuery({
    queryKey: ["persona-asistencia", personaId],
    enabled: !!personaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asistencia")
        .select("*, servicios(nombre, fecha, tipo)")
        .eq("persona_id", personaId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function usePersonaGrupoMiembros(personaId: string | undefined) {
  return useQuery({
    queryKey: ["persona-grupo-miembros", personaId],
    enabled: !!personaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grupo_miembros")
        .select("*, grupos(nombre, tipo)")
        .eq("persona_id", personaId!);
      if (error) throw error;
      return data;
    },
  });
}

// ============ RELACIONES FAMILIARES ============

export function useRelacionesFamiliares(personaId: string | undefined) {
  return useQuery({
    queryKey: ["relaciones-familiares", personaId],
    enabled: !!personaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relaciones_familiares" as any)
        .select("*, familiar:familiar_id(id, nombres, apellidos, foto_url, tipo_persona)")
        .eq("persona_id", personaId!);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateRelacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rel: { persona_id: string; familiar_id?: string | null; familiar_nombre?: string | null; parentesco: string }) => {
      const { data, error } = await supabase
        .from("relaciones_familiares" as any)
        .insert(rel as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["relaciones-familiares", vars.persona_id] }),
  });
}

export function useDeleteRelacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, personaId }: { id: string; personaId: string }) => {
      const { error } = await supabase.from("relaciones_familiares" as any).delete().eq("id", id);
      if (error) throw error;
      return personaId;
    },
    onSuccess: (personaId) => qc.invalidateQueries({ queryKey: ["relaciones-familiares", personaId] }),
  });
}

// ============ FINANZAS + DONACIONES por persona ============

export function usePersonaFinanzas(personaId: string | undefined) {
  return useQuery({
    queryKey: ["persona-finanzas", personaId],
    enabled: !!personaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finanzas")
        .select("*")
        .eq("persona_id", personaId!)
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function usePersonaDonaciones(personaId: string | undefined) {
  return useQuery({
    queryKey: ["persona-donaciones", personaId],
    enabled: !!personaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donaciones")
        .select("*")
        .eq("persona_id", personaId!)
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function usePersonaPeticiones(personaId: string | undefined) {
  return useQuery({
    queryKey: ["persona-peticiones", personaId],
    enabled: !!personaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peticiones_oracion")
        .select("*")
        .eq("persona_id", personaId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function usePersonaConsejerias(personaId: string | undefined) {
  return useQuery({
    queryKey: ["persona-consejerias", personaId],
    enabled: !!personaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("citas_consejeria")
        .select("id, fecha, hora_inicio, motivo_categoria, motivo_descripcion, estado, modalidad, consejero_nombre, notas_admin, created_at")
        .eq("solicitante_persona_id", personaId!)
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

