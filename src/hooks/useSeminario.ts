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
        .select("*, sem_materias(id,codigo,nombre,creditos,color), sem_ofertas(id,docente_nombre,aula,horario,zoom_link,modalidad)")
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
      const pageSize = 1000;
      const rows: any[] = [];

      for (let from = 0; ; from += pageSize) {
        const { data, error } = await sb.from("personas")
          .select("id,nombres,apellidos,documento,foto_url")
          .order("nombres", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }

      return rows;
    },
  });
}

// ════════════════════════════════════════════════════════════════════
// ─────────────── FASE 2: Docentes, Evaluaciones, Calificaciones,
//                 Asistencia, Aula Virtual, Biblioteca, Reportes,
//                 Dashboard, Anuncios, Certificados Seminario
// ════════════════════════════════════════════════════════════════════

// ─────────────── DOCENTES ───────────────
export function useDocentes(periodoId?: string) {
  return useQuery({
    queryKey: ["sem-docentes", periodoId || "all"],
    queryFn: async () => {
      let q = sb.from("sem_ofertas").select(`
        id, docente_persona_id, docente_nombre, materia_id, periodo_id,
        sem_materias(id, nombre, codigo, creditos),
        personas:docente_persona_id(id, nombres, apellidos, documento, foto_url)
      `);
      if (periodoId) q = q.eq("periodo_id", periodoId);
      const { data, error } = await q;
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((o: any) => {
        const key = o.docente_persona_id || `nombre:${o.docente_nombre || "sin"}`;
        const nombre = o.personas
          ? `${o.personas.nombres || ""} ${o.personas.apellidos || ""}`.trim()
          : (o.docente_nombre || "Sin asignar");
        if (!map[key]) map[key] = {
          id: key,
          persona_id: o.docente_persona_id,
          nombre,
          documento: o.personas?.documento || null,
          foto_url: o.personas?.foto_url || null,
          ofertas: [],
          materias: 0,
        };
        map[key].ofertas.push(o);
        map[key].materias += 1;
      });
      return Object.values(map);
    },
  });
}

// ─────────────── EVALUACIONES ───────────────
export function useEvaluaciones(ofertaId?: string) {
  return useQuery({
    queryKey: ["sem-evaluaciones", ofertaId],
    queryFn: async () => {
      if (!ofertaId) return [];
      const { data, error } = await sb.from("sem_evaluaciones")
        .select("*").eq("oferta_id", ofertaId).order("fecha", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!ofertaId,
  });
}

export function useUpsertEvaluacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await sb.from("sem_evaluaciones").upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-evaluaciones"] }),
  });
}

export function useDeleteEvaluacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("sem_evaluaciones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-evaluaciones"] }),
  });
}

// ─────────────── OFERTAS POR DOCENTE / TODAS ───────────────
export function useOfertasActivas(periodoId?: string) {
  return useQuery({
    queryKey: ["sem-ofertas-activas", periodoId || "all"],
    queryFn: async () => {
      let q = sb.from("sem_ofertas").select(`
        id, materia_id, periodo_id, docente_nombre, docente_persona_id, horario, aula, modalidad, zoom_link, estado,
        sem_materias(id, nombre, codigo, creditos, color),
        sem_periodos(id, nombre, codigo)
      `).neq("estado", "cerrada");
      if (periodoId) q = q.eq("periodo_id", periodoId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

// ─────────────── CALIFICACIONES MATRIZ ───────────────
export function useCalificacionesMatriz(ofertaId?: string) {
  return useQuery({
    queryKey: ["sem-calif-matriz", ofertaId],
    queryFn: async () => {
      if (!ofertaId) return { estudiantes: [], evaluaciones: [], notas: {} };
      const [evRes, imRes] = await Promise.all([
        sb.from("sem_evaluaciones").select("*").eq("oferta_id", ofertaId).order("fecha"),
        sb.from("sem_inscripcion_materias").select(`
          id, oferta_id, materia_id, nota_final, estado,
          sem_inscripciones!inner(id, persona_id, programa_id, personas(id, nombres, apellidos, documento, foto_url))
        `).eq("oferta_id", ofertaId),
      ]);
      if (evRes.error) throw evRes.error;
      if (imRes.error) throw imRes.error;
      const evIds = (evRes.data || []).map((e: any) => e.id);
      let notas: any[] = [];
      if (evIds.length) {
        const { data: nd, error: ne } = await sb.from("sem_calificaciones")
          .select("*").in("evaluacion_id", evIds);
        if (ne) throw ne;
        notas = nd || [];
      }
      const notasMap: Record<string, any> = {};
      notas.forEach((n: any) => { notasMap[`${n.inscripcion_materia_id}_${n.evaluacion_id}`] = n; });
      return { estudiantes: imRes.data || [], evaluaciones: evRes.data || [], notas: notasMap };
    },
    enabled: !!ofertaId,
  });
}

export function useSaveCalificacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { inscripcion_materia_id: string; evaluacion_id: string; nota: number | null; id?: string }) => {
      if (payload.nota === null || payload.nota === undefined || (payload.nota as any) === "") {
        if (payload.id) {
          const { error } = await sb.from("sem_calificaciones").delete().eq("id", payload.id);
          if (error) throw error;
        }
        return null;
      }
      const { data, error } = await sb.from("sem_calificaciones")
        .upsert({
          id: payload.id,
          inscripcion_materia_id: payload.inscripcion_materia_id,
          evaluacion_id: payload.evaluacion_id,
          nota: payload.nota,
        }, { onConflict: "id" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-calif-matriz"] }),
  });
}

export function useRecalcularNotaFinal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ inscripcion_materia_id, persona_id, programa_id }: { inscripcion_materia_id: string; persona_id?: string; programa_id?: string }) => {
      // Cargar evaluaciones de la oferta + notas
      const { data: im } = await sb.from("sem_inscripcion_materias")
        .select("oferta_id, sem_inscripciones(persona_id, programa_id)").eq("id", inscripcion_materia_id).single();
      const ofertaId = im?.oferta_id;
      const pid = persona_id || im?.sem_inscripciones?.persona_id;
      const progId = programa_id || im?.sem_inscripciones?.programa_id;
      const { data: evs } = await sb.from("sem_evaluaciones").select("id, peso").eq("oferta_id", ofertaId);
      const evIds = (evs || []).map((e: any) => e.id);
      let nota_final: number | null = null;
      let estado = "en_curso";
      if (evIds.length) {
        const { data: notas } = await sb.from("sem_calificaciones")
          .select("evaluacion_id, nota").eq("inscripcion_materia_id", inscripcion_materia_id).in("evaluacion_id", evIds);
        const notasMap: Record<string, number> = {};
        (notas || []).forEach((n: any) => { notasMap[n.evaluacion_id] = Number(n.nota); });
        const totalPeso = (evs || []).reduce((a: number, e: any) => a + Number(e.peso || 0), 0);
        const todasConNota = (evs || []).every((e: any) => notasMap[e.id] !== undefined);
        if (todasConNota && totalPeso > 0) {
          const acc = (evs || []).reduce((a: number, e: any) => a + (notasMap[e.id] * Number(e.peso) / totalPeso), 0);
          nota_final = Math.round(acc * 100) / 100;
          estado = nota_final >= 3.0 ? "aprobada" : "reprobada";
        }
      }
      await sb.from("sem_inscripcion_materias").update({ nota_final, estado }).eq("id", inscripcion_materia_id);
      if (pid && progId) {
        await sb.rpc("sem_recalcular_inscripcion", { _persona_id: pid, _programa_id: progId });
      }
      return { nota_final, estado };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sem-calif-matriz"] });
      qc.invalidateQueries({ queryKey: ["sem-inscripciones"] });
      qc.invalidateQueries({ queryKey: ["sem-insc-materias"] });
    },
  });
}

// ─────────────── ASISTENCIAS ───────────────
export function useAsistenciaOferta(ofertaId?: string, fecha?: string) {
  return useQuery({
    queryKey: ["sem-asist", ofertaId, fecha],
    queryFn: async () => {
      if (!ofertaId) return { estudiantes: [], asistencias: {} };
      const { data: estudiantes, error: ee } = await sb.from("sem_inscripcion_materias")
        .select(`id, sem_inscripciones!inner(persona_id, personas(id, nombres, apellidos, documento, foto_url))`)
        .eq("oferta_id", ofertaId);
      if (ee) throw ee;
      const imIds = (estudiantes || []).map((e: any) => e.id);
      let asistencias: any[] = [];
      if (imIds.length && fecha) {
        const { data: ad, error: ae } = await sb.from("sem_asistencias")
          .select("*").in("inscripcion_materia_id", imIds).eq("fecha", fecha);
        if (ae) throw ae;
        asistencias = ad || [];
      }
      const map: Record<string, any> = {};
      asistencias.forEach((a: any) => { map[a.inscripcion_materia_id] = a; });
      return { estudiantes: estudiantes || [], asistencias: map };
    },
    enabled: !!ofertaId,
  });
}

export function useSaveAsistencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { id?: string; inscripcion_materia_id: string; fecha: string; estado: string; observacion?: string }[]) => {
      if (!rows.length) return;
      const { error } = await sb.from("sem_asistencias").upsert(rows, { onConflict: "inscripcion_materia_id,fecha" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-asist"] }),
  });
}

// ─────────────── BIBLIOTECA (sem_recursos) ───────────────
export function useRecursos(filters?: { programa_id?: string; materia_id?: string }) {
  return useQuery({
    queryKey: ["sem-recursos", filters],
    queryFn: async () => {
      let q = sb.from("sem_recursos").select("*, sem_materias(nombre, codigo)").order("created_at", { ascending: false });
      if (filters?.programa_id) q = q.eq("programa_id", filters.programa_id);
      if (filters?.materia_id) q = q.eq("materia_id", filters.materia_id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertRecurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await sb.from("sem_recursos").upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-recursos"] }),
  });
}

export function useDeleteRecurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("sem_recursos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-recursos"] }),
  });
}

// ─────────────── ANUNCIOS ───────────────
export function useAnuncios(ofertaId?: string) {
  return useQuery({
    queryKey: ["sem-anuncios", ofertaId],
    queryFn: async () => {
      if (!ofertaId) return [];
      const { data, error } = await sb.from("sem_anuncios")
        .select("*").eq("oferta_id", ofertaId).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!ofertaId,
  });
}

export function useUpsertAnuncio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await sb.from("sem_anuncios").upsert({ ...payload, autor_user_id: u?.user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-anuncios"] }),
  });
}

export function useDeleteAnuncio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("sem_anuncios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-anuncios"] }),
  });
}

// ─────────────── REPORTES / DASHBOARD ───────────────
export function useReportesAcademicos(programaId?: string, periodoId?: string) {
  return useQuery({
    queryKey: ["sem-reportes", programaId, periodoId],
    queryFn: async () => {
      let q = sb.from("sem_inscripcion_materias").select(`
        id, nota_final, estado, oferta_id, materia_id,
        sem_materias(id, nombre, codigo, creditos),
        sem_inscripciones!inner(programa_id, periodo_id, persona_id)
      `);
      if (programaId) q = q.eq("sem_inscripciones.programa_id", programaId);
      if (periodoId) q = q.eq("sem_inscripciones.periodo_id", periodoId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useDashboardKpis() {
  return useQuery({
    queryKey: ["sem-dashboard-kpis"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [insc, ofertas, evalsProx, mora, certs, ims, asist] = await Promise.all([
        sb.from("sem_inscripciones").select("id, estado, promedio_acumulado, total_creditos_aprobados, programa_id"),
        sb.from("sem_ofertas").select("id, estado, docente_nombre, materia_id, sem_materias(codigo,nombre)"),
        sb.from("sem_evaluaciones").select("id, nombre, tipo, fecha, publicada, oferta_id, sem_ofertas(sem_materias(codigo,nombre))").gte("fecha", today).order("fecha").limit(10),
        sb.from("sem_pagos_inscripcion").select("id, estado, fecha_vencimiento, monto").neq("estado", "pagado"),
        sb.from("certificados").select("id, fecha_emision, persona_id, tipo_certificado, personas(nombres,apellidos)").eq("tipo_certificado", "seminario_diploma").order("fecha_emision", { ascending: false }).limit(5),
        sb.from("sem_inscripcion_materias").select("id, nota_final, estado, oferta_id"),
        sb.from("sem_asistencias").select("estado"),
      ]);
      return {
        inscripciones: insc.data || [],
        ofertas: ofertas.data || [],
        proxEvaluaciones: evalsProx.data || [],
        moraPendientes: mora.data || [],
        ultimosCertificados: certs.data || [],
        inscripcionMaterias: ims.data || [],
        asistencias: asist.data || [],
      };
    },
  });
}

// ─────────────── CERTIFICADOS SEMINARIO ───────────────
export function useCertificadosSeminario() {
  return useQuery({
    queryKey: ["sem-certificados"],
    queryFn: async () => {
      const { data, error } = await sb.from("certificados")
        .select("*, personas(id, nombres, apellidos, documento)")
        .eq("tipo_certificado", "seminario_diploma")
        .order("fecha_emision", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useEmitirDiploma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ persona_id, programa_id, codigo }: { persona_id: string; programa_id: string; codigo?: string }) => {
      // Verifica completitud
      const r = await sb.rpc("sem_recalcular_inscripcion", { _persona_id: persona_id, _programa_id: programa_id });
      const res = r.data || {};
      if (!res.completo) throw new Error("El estudiante aún no aprueba todas las materias del pensum");
      const cod = codigo || `SEM-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await sb.from("certificados").insert({
        persona_id, codigo: cod, tipo_certificado: "seminario_diploma",
        fecha_emision: new Date().toISOString().slice(0, 10),
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-certificados"] }),
  });
}

