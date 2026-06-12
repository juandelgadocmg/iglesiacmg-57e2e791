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

// ─────────────────────────── PERIODOS ───────────────────────────
export function usePeriodos(programaId?: string) {
  return useQuery({
    queryKey: ["sem-periodos", programaId],
    queryFn: async () => {
      let q = sb.from("sem_periodos").select("*").order("fecha_inicio", { ascending: false });
      if (programaId) q = q.or(`programa_id.eq.${programaId},programa_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}
export function useUpsertPeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: any) => {
      const { data, error } = await sb.from("sem_periodos").upsert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-periodos"] }),
  });
}

// ─────────────────────────── OFERTAS (horarios) ───────────────────────────
export function useOfertas(periodoId?: string, programaId?: string) {
  return useQuery({
    queryKey: ["sem-ofertas", periodoId, programaId],
    queryFn: async () => {
      if (!periodoId) return [];
      const { data, error } = await sb.from("sem_ofertas")
        .select("*, sem_materias!inner(id,codigo,nombre,creditos,color,programa_id)")
        .eq("periodo_id", periodoId);
      if (error) throw error;
      return (data || []).filter((o: any) => !programaId || o.sem_materias?.programa_id === programaId);
    },
    enabled: !!periodoId,
  });
}
export function useUpsertOferta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: any) => {
      const { data, error } = await sb.from("sem_ofertas").upsert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-ofertas"] }),
  });
}
export function useDeleteOferta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("sem_ofertas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-ofertas"] }),
  });
}

// ─────────────────────────── INSCRIPCIONES (estudiantes) ───────────────────────────
export function useInscripciones(programaId?: string, periodoId?: string) {
  return useQuery({
    queryKey: ["sem-inscripciones", programaId, periodoId],
    queryFn: async () => {
      let q = sb.from("sem_inscripciones")
        .select("*, personas:persona_id(id,nombres,apellidos,documento,foto_url), sem_periodos:periodo_id(codigo,nombre)")
        .order("created_at", { ascending: false });
      if (programaId) q = q.eq("programa_id", programaId);
      if (periodoId) q = q.eq("periodo_id", periodoId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}
export function useUpsertInscripcion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: any) => {
      const { data, error } = await sb.from("sem_inscripciones").upsert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-inscripciones"] }),
  });
}
export function useDeleteInscripcion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("sem_inscripciones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-inscripciones"] }),
  });
}

// ─────────────────────────── INSCRIPCION MATERIAS ───────────────────────────
export function useInscripcionMaterias(inscripcionId?: string) {
  return useQuery({
    queryKey: ["sem-insc-materias", inscripcionId],
    queryFn: async () => {
      if (!inscripcionId) return [];
      const { data, error } = await sb.from("sem_inscripcion_materias")
        .select("*, sem_materias(id,codigo,nombre,creditos,color), sem_ofertas(id,docente_nombre,aula,horario)")
        .eq("inscripcion_id", inscripcionId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!inscripcionId,
  });
}
export function useEnrollMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ inscripcion_id, oferta_id, materia_id }: any) => {
      const { data, error } = await sb.from("sem_inscripcion_materias")
        .insert({ inscripcion_id, oferta_id, materia_id, estado: "cursando" })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["sem-insc-materias", v.inscripcion_id] });
    },
  });
}
export function useUpdateInscripcionMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: any) => {
      const { data, error } = await sb.from("sem_inscripcion_materias").update(rest).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-insc-materias"] }),
  });
}
export function useUnenrollMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("sem_inscripcion_materias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-insc-materias"] }),
  });
}

// ─────────────────────────── PERSONAS LITE ───────────────────────────
export function usePersonasLite() {
  return useQuery({
    queryKey: ["sem-personas-lite"],
    queryFn: async () => {
      const { data, error } = await sb.from("personas")
        .select("id,nombres,apellidos,documento,foto_url").order("nombres").limit(2000);
      if (error) throw error;
      return data || [];
    },
  });
}
