import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

// ─────────────────────────── PROGRAMAS ───────────────────────────
export function useProgramas() {
  return useQuery({
    queryKey: ["sem-programas"],
    queryFn: async () => {
      const { data, error } = await sb.from("sem_programas").select("*").order("nombre");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertPrograma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await sb.from("sem_programas").upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-programas"] }),
  });
}

export function useDeletePrograma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("sem_programas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-programas"] }),
  });
}

// ─────────────────────────── SEMESTRES ───────────────────────────
export function useSemestres(programaId?: string) {
  return useQuery({
    queryKey: ["sem-semestres", programaId],
    queryFn: async () => {
      if (!programaId) return [];
      const { data, error } = await sb.from("sem_pensum_semestres")
        .select("*").eq("programa_id", programaId).order("numero");
      if (error) throw error;
      return data || [];
    },
    enabled: !!programaId,
  });
}

export function useUpsertSemestre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await sb.from("sem_pensum_semestres").upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-semestres"] }),
  });
}

// ─────────────────────────── MATERIAS ───────────────────────────
export function useMateriasSem(programaId?: string) {
  return useQuery({
    queryKey: ["sem-materias", programaId],
    queryFn: async () => {
      if (!programaId) return [];
      const { data, error } = await sb.from("sem_materias")
        .select("*").eq("programa_id", programaId).order("codigo");
      if (error) throw error;
      return data || [];
    },
    enabled: !!programaId,
  });
}

export function useUpsertMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await sb.from("sem_materias").upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sem-materias"] });
      qc.invalidateQueries({ queryKey: ["sem-pensum-materias"] });
    },
  });
}

export function useDeleteMateriaSem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("sem_materias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sem-materias"] });
      qc.invalidateQueries({ queryKey: ["sem-pensum-materias"] });
    },
  });
}

// ─────────────────────────── PENSUM (materia→semestre) ───────────────────────────
export function usePensumMaterias(programaId?: string) {
  return useQuery({
    queryKey: ["sem-pensum-materias", programaId],
    queryFn: async () => {
      if (!programaId) return [];
      const { data, error } = await sb.from("sem_pensum_materias")
        .select("*, sem_pensum_semestres!inner(programa_id, numero), sem_materias(*)")
        .eq("sem_pensum_semestres.programa_id", programaId)
        .order("orden");
      if (error) throw error;
      return data || [];
    },
    enabled: !!programaId,
  });
}

export function useAssignMateriaToSemestre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ semestre_id, materia_id }: { semestre_id: string; materia_id: string }) => {
      const { data, error } = await sb.from("sem_pensum_materias")
        .upsert({ semestre_id, materia_id }, { onConflict: "semestre_id,materia_id" })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-pensum-materias"] }),
  });
}

export function useUnassignMateriaFromSemestre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("sem_pensum_materias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-pensum-materias"] }),
  });
}

// ─────────────────────────── PRERREQUISITOS ───────────────────────────
export function usePrerequisitos(programaId?: string) {
  return useQuery({
    queryKey: ["sem-prereq", programaId],
    queryFn: async () => {
      if (!programaId) return [];
      const { data: mats } = await sb.from("sem_materias").select("id").eq("programa_id", programaId);
      const ids = (mats || []).map((m: any) => m.id);
      if (!ids.length) return [];
      const { data, error } = await sb.from("sem_materia_prerequisitos")
        .select("*").in("materia_id", ids);
      if (error) throw error;
      return data || [];
    },
    enabled: !!programaId,
  });
}

export function useAddPrerequisito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ materia_id, prerequisito_id }: { materia_id: string; prerequisito_id: string }) => {
      const { data, error } = await sb.from("sem_materia_prerequisitos")
        .insert({ materia_id, prerequisito_id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-prereq"] }),
  });
}

export function useRemovePrerequisito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("sem_materia_prerequisitos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-prereq"] }),
  });
}
