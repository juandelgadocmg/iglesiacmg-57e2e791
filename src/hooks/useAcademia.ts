import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============ ESCUELAS (cursos table used as top-level schools) ============
export function useEscuelas() {
  return useQuery({
    queryKey: ["escuelas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cursos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEscuela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (escuela: { nombre: string; descripcion?: string }) => {
      const { data, error } = await supabase.from("cursos").insert({
        nombre: escuela.nombre,
        descripcion: escuela.descripcion,
        estado: "Activo",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["escuelas"] }),
  });
}

export function useUpdateEscuela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("cursos").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["escuelas"] }),
  });
}

export function useDeleteEscuela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cursos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["escuelas"] }),
  });
}

// ============ PERIODOS ============
export function usePeriodos(escuelaId: string | null) {
  return useQuery({
    queryKey: ["periodos", escuelaId],
    enabled: !!escuelaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("periodos_academicos")
        .select("*")
        .eq("escuela_id", escuelaId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAllPeriodos() {
  return useQuery({
    queryKey: ["periodos-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("periodos_academicos")
        .select("*, cursos(nombre)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (periodo: {
      escuela_id: string;
      nombre: string;
      fecha_inicio?: string;
      fecha_fin?: string;
      fecha_matricula_inicio?: string;
      fecha_matricula_fin?: string;
      estado?: string;
    }) => {
      const { data, error } = await supabase
        .from("periodos_academicos")
        .insert(periodo)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["periodos"] });
      qc.invalidateQueries({ queryKey: ["periodos-all"] });
    },
  });
}

export function useUpdatePeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("periodos_academicos").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["periodos"] });
      qc.invalidateQueries({ queryKey: ["periodos-all"] });
    },
  });
}

export function useDeletePeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Verificar matrículas existentes
      const { count, error: countErr } = await supabase
        .from("matriculas")
        .select("id", { count: "exact", head: true })
        .eq("periodo_id", id);
      if (countErr) throw countErr;
      if ((count || 0) > 0) {
        throw new Error(`No se puede eliminar: el período tiene ${count} matrícula(s) asociada(s). Elimina primero las matrículas o cierra el período.`);
      }
      // Borrar dependencias del pensum (materias, cortes) — sin matrículas son seguras
      await supabase.from("items_calificables").delete().in(
        "materia_id",
        (await supabase.from("materias").select("id").eq("periodo_id", id)).data?.map((m: any) => m.id) || ["00000000-0000-0000-0000-000000000000"]
      );
      await supabase.from("materias").delete().eq("periodo_id", id);
      await supabase.from("cortes_academicos").delete().eq("periodo_id", id);
      const { error } = await supabase.from("periodos_academicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["periodos"] });
      qc.invalidateQueries({ queryKey: ["periodos-all"] });
      qc.invalidateQueries({ queryKey: ["materias"] });
      qc.invalidateQueries({ queryKey: ["cortes"] });
    },
  });
}

// Duplicar período: copia el período + materias + cortes (sin matrículas/calificaciones)
export function useDuplicatePeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sourceId, nombre }: { sourceId: string; nombre: string }) => {
      // 1. Obtener el período origen
      const { data: source, error: srcErr } = await supabase
        .from("periodos_academicos").select("*").eq("id", sourceId).single();
      if (srcErr) throw srcErr;
      // 2. Crear nuevo período (estado Abierto, mismas fechas/escuela)
      const { data: nuevo, error: insErr } = await supabase
        .from("periodos_academicos")
        .insert({
          escuela_id: source.escuela_id,
          nombre,
          estado: "Abierto",
          fecha_inicio: source.fecha_inicio,
          fecha_fin: source.fecha_fin,
          fecha_matricula_inicio: source.fecha_matricula_inicio,
          fecha_matricula_fin: source.fecha_matricula_fin,
        })
        .select().single();
      if (insErr) throw insErr;
      // 3. Clonar materias
      const { data: materias } = await supabase.from("materias").select("*").eq("periodo_id", sourceId);
      if (materias?.length) {
        const newMaterias = materias.map(({ id, created_at, periodo_id, ...rest }: any) => ({ ...rest, periodo_id: nuevo.id }));
        await supabase.from("materias").insert(newMaterias);
      }
      // 4. Clonar cortes
      const { data: cortes } = await supabase.from("cortes_academicos").select("*").eq("periodo_id", sourceId);
      if (cortes?.length) {
        const newCortes = cortes.map(({ id, created_at, periodo_id, ...rest }: any) => ({ ...rest, periodo_id: nuevo.id }));
        await supabase.from("cortes_academicos").insert(newCortes);
      }
      return nuevo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["periodos"] });
      qc.invalidateQueries({ queryKey: ["periodos-all"] });
      qc.invalidateQueries({ queryKey: ["materias"] });
      qc.invalidateQueries({ queryKey: ["cortes"] });
    },
  });
}

// ============ AULAS ============
export function useAulas() {
  return useQuery({
    queryKey: ["aulas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAula() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (aula: { nombre: string; direccion?: string; sede?: string }) => {
      const { data, error } = await supabase.from("aulas").insert(aula).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aulas"] }),
  });
}

export function useUpdateAula() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; activo?: boolean; nombre?: string; direccion?: string; sede?: string }) => {
      const { error } = await supabase.from("aulas").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aulas"] }),
  });
}

export function useDeleteAula() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("aulas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aulas"] }),
  });
}

// ============ MATERIAS ============
export function useMaterias(periodoId: string | null) {
  return useQuery({
    queryKey: ["materias", periodoId],
    enabled: !!periodoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materias")
        .select("*, personas(nombres, apellidos), aulas(nombre)")
        .eq("periodo_id", periodoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (materia: {
      periodo_id: string;
      nombre: string;
      descripcion?: string;
      horario?: string;
      maestro_nombre?: string;
      maestro_id?: string;
      aula?: string;
      aula_id?: string;
      codigo?: string;
      cupos?: number;
      hab_calificaciones?: boolean;
      hab_asistencia?: boolean;
      hab_auto_matricula?: boolean;
      asistencias_minimas?: number;
      alerta_inasistencias?: boolean;
      cantidad_inasistencias_alerta?: number;
      estado?: string;
    }) => {
      const { data, error } = await supabase.from("materias").insert(materia).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materias"] }),
  });
}

export function useUpdateMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("materias").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materias"] }),
  });
}

export function useDeleteMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materias"] }),
  });
}

// ============ CORTES ============
export function useCortes(periodoId: string | null) {
  return useQuery({
    queryKey: ["cortes", periodoId],
    enabled: !!periodoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cortes_academicos")
        .select("*")
        .eq("periodo_id", periodoId!)
        .order("numero");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCorte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (corte: {
      periodo_id: string;
      nombre: string;
      numero?: number;
      porcentaje?: number;
      fecha_inicio?: string;
      fecha_fin?: string;
    }) => {
      const { data, error } = await supabase.from("cortes_academicos").insert(corte).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cortes"] }),
  });
}

export function useDeleteCorte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cortes_academicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cortes"] }),
  });
}

// ============ ITEMS CALIFICABLES ============
export function useItemsCalificables(corteId: string | null, materiaId: string | null) {
  return useQuery({
    queryKey: ["items-calificables", corteId, materiaId],
    enabled: !!corteId && !!materiaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items_calificables")
        .select("*")
        .eq("corte_id", corteId!)
        .eq("materia_id", materiaId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useAllItemsByCorte(corteId: string | null) {
  return useQuery({
    queryKey: ["items-calificables-corte", corteId],
    enabled: !!corteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items_calificables")
        .select("*, materias(nombre)")
        .eq("corte_id", corteId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateItemCalificable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      corte_id: string;
      materia_id: string;
      nombre: string;
      tipo?: string;
      porcentaje?: number;
      fecha_inicio?: string;
      fecha_fin?: string;
      es_calificable?: boolean;
      visible_estudiante?: boolean;
    }) => {
      const { data, error } = await supabase.from("items_calificables").insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items-calificables"] });
      qc.invalidateQueries({ queryKey: ["items-calificables-corte"] });
    },
  });
}

export function useDeleteItemCalificable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("items_calificables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items-calificables"] });
      qc.invalidateQueries({ queryKey: ["items-calificables-corte"] });
    },
  });
}

// ============ CALIFICACIONES ============
export function useCalificaciones(itemId: string | null) {
  return useQuery({
    queryKey: ["calificaciones", itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calificaciones")
        .select("*, matriculas(persona_id, personas(nombres, apellidos))")
        .eq("item_id", itemId!);
      if (error) throw error;
      return data;
    },
  });
}

// Fetch all calificaciones for items within a corte+materia combo
export function useCalificacionesByMateriaCorte(corteId: string | null, materiaId: string | null) {
  return useQuery({
    queryKey: ["calificaciones-grid", corteId, materiaId],
    enabled: !!corteId && !!materiaId,
    queryFn: async () => {
      // First get items for this corte+materia
      const { data: items, error: itemsErr } = await supabase
        .from("items_calificables")
        .select("id")
        .eq("corte_id", corteId!)
        .eq("materia_id", materiaId!);
      if (itemsErr) throw itemsErr;
      if (!items?.length) return [];
      const itemIds = items.map(i => i.id);
      const { data, error } = await supabase
        .from("calificaciones")
        .select("*")
        .in("item_id", itemIds);
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertCalificacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cal: { item_id: string; matricula_id: string; nota?: number; observacion?: string }) => {
      const { data, error } = await supabase
        .from("calificaciones")
        .upsert(cal, { onConflict: "item_id,matricula_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calificaciones"] });
      qc.invalidateQueries({ queryKey: ["calificaciones-grid"] });
    },
  });
}

export function useBulkUpsertCalificaciones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (records: { item_id: string; matricula_id: string; nota?: number | null; observacion?: string }[]) => {
      const { error } = await supabase
        .from("calificaciones")
        .upsert(records, { onConflict: "item_id,matricula_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calificaciones"] });
      qc.invalidateQueries({ queryKey: ["calificaciones-grid"] });
    },
  });
}

// ============ MATRICULAS ============
export function useMatriculas(periodoId: string | null) {
  return useQuery({
    queryKey: ["matriculas", periodoId],
    enabled: !!periodoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matriculas")
        .select("*, personas(nombres, apellidos, foto_url), materias(nombre)")
        .eq("periodo_id", periodoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAllMatriculas() {
  return useQuery({
    queryKey: ["matriculas-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matriculas")
        .select("*, personas(nombres, apellidos, foto_url), cursos(nombre), materias(nombre)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMatricula() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (matricula: {
      curso_id: string;
      persona_id: string;
      periodo_id?: string;
      materia_id?: string;
    }) => {
      const { data, error } = await supabase.from("matriculas").insert(matricula).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matriculas"] });
      qc.invalidateQueries({ queryKey: ["matriculas-all"] });
    },
  });
}

export function useUpdateMatricula() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; estado?: string; nota_final?: number | null; materia_id?: string | null }) => {
      const { error } = await supabase.from("matriculas").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matriculas"] });
      qc.invalidateQueries({ queryKey: ["matriculas-all"] });
    },
  });
}

export function useDeleteMatricula() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Borrar calificaciones y pagos asociados primero
      await supabase.from("calificaciones").delete().eq("matricula_id", id);
      await supabase.from("pagos_matricula").delete().eq("matricula_id", id);
      await supabase.from("asistencia_materias").delete().eq("matricula_id", id);
      const { error } = await supabase.from("matriculas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matriculas"] });
      qc.invalidateQueries({ queryKey: ["matriculas-all"] });
      qc.invalidateQueries({ queryKey: ["calificaciones-grid"] });
      qc.invalidateQueries({ queryKey: ["calificaciones"] });
    },
  });
}

// ============ CERTIFICADOS ============
export function useCertificados() {
  return useQuery({
    queryKey: ["certificados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificados")
        .select("*, personas(nombres, apellidos), cursos(nombre)")
        .order("fecha_emision", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCertificado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cert: { matricula_id: string; persona_id: string; curso_id: string }) => {
      const { data, error } = await supabase.from("certificados").insert(cert).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["certificados"] }),
  });
}

// ============ ASISTENCIA MATERIAS ============
export function useAsistenciaMaterias(materiaId: string | null, fecha?: string) {
  return useQuery({
    queryKey: ["asistencia-materias", materiaId, fecha],
    enabled: !!materiaId,
    queryFn: async () => {
      let q = supabase
        .from("asistencia_materias")
        .select("*")
        .eq("materia_id", materiaId!);
      if (fecha) q = q.eq("fecha", fecha);
      const { data, error } = await q.order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertAsistenciaMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (records: { materia_id: string; matricula_id: string; fecha: string; presente: boolean }[]) => {
      // Delete existing for this materia+fecha, then insert
      if (records.length === 0) return;
      const { materia_id, fecha } = records[0];
      await supabase
        .from("asistencia_materias")
        .delete()
        .eq("materia_id", materia_id)
        .eq("fecha", fecha);
      const { error } = await supabase.from("asistencia_materias").insert(records);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["asistencia-materias"] }),
  });
}

// Legacy aliases
export const useCursos = useEscuelas;

// ============ SYNC ACADEMIA → CRECIMIENTO ============
// Reusable helper that recalculates final grades and syncs persona_procesos
// when a materia is finalized.
export type SyncResumen = {
  sincronizados: number;
  sinNota: number;
  reprobados: number;
  procesoNombre: string | null;
  materiaNombre: string;
};

export async function syncMateriaToCrecimiento(materiaId: string): Promise<SyncResumen> {
  // 1. Materia
  const { data: materia, error: matErr } = await supabase
    .from("materias")
    .select("id, nombre, periodo_id")
    .eq("id", materiaId)
    .single();
  if (matErr) throw matErr;

  const today = new Date().toISOString().slice(0, 10);
  const resumen: SyncResumen = {
    sincronizados: 0,
    sinNota: 0,
    reprobados: 0,
    procesoNombre: null,
    materiaNombre: materia.nombre,
  };

  // 2. Matrículas activas
  const { data: matriculas, error: matrErr } = await supabase
    .from("matriculas")
    .select("id, persona_id, nota_final, estado")
    .eq("materia_id", materiaId)
    .neq("estado", "Retirado");
  if (matrErr) throw matrErr;
  if (!matriculas?.length) return resumen;

  // 3. Cortes y items para recalcular notas faltantes
  const { data: cortes } = await supabase
    .from("cortes_academicos")
    .select("id, porcentaje")
    .eq("periodo_id", materia.periodo_id);
  const corteIds = (cortes || []).map((c: any) => c.id);

  const { data: items } = corteIds.length
    ? await supabase
        .from("items_calificables")
        .select("id, corte_id, porcentaje, es_calificable")
        .eq("materia_id", materiaId)
        .in("corte_id", corteIds)
    : { data: [] as any[] };

  const matriculaIds = matriculas.map((m: any) => m.id);
  const { data: califs } = matriculaIds.length && (items || []).length
    ? await supabase
        .from("calificaciones")
        .select("matricula_id, item_id, nota")
        .in("matricula_id", matriculaIds)
        .in("item_id", (items || []).map((i: any) => i.id))
    : { data: [] as any[] };

  // Index helpers
  const itemsById = new Map<string, any>((items || []).map((i: any) => [i.id, i]));
  const cortesById = new Map<string, any>((cortes || []).map((c: any) => [c.id, c]));

  // Calc nota_final consolidada por matrícula (peso item × peso corte / 10000)
  const computedNotas = new Map<string, number | null>();
  for (const m of matriculas) {
    if (m.nota_final != null) {
      computedNotas.set(m.id, Number(m.nota_final));
      continue;
    }
    const myCalifs = (califs || []).filter((c: any) => c.matricula_id === m.id && c.nota != null);
    if (!myCalifs.length) {
      computedNotas.set(m.id, null);
      continue;
    }
    let total = 0;
    let pesoAplicado = 0;
    for (const c of myCalifs) {
      const item = itemsById.get(c.item_id);
      if (!item || item.es_calificable === false) continue;
      const corte = cortesById.get(item.corte_id);
      const pItem = Number(item.porcentaje ?? 0);
      const pCorte = Number(corte?.porcentaje ?? 0);
      if (!pItem || !pCorte) continue;
      const peso = (pItem * pCorte) / 10000;
      total += Number(c.nota) * peso;
      pesoAplicado += peso;
    }
    const nota = pesoAplicado > 0 ? total / pesoAplicado : null;
    computedNotas.set(m.id, nota != null ? Number(nota.toFixed(2)) : null);
  }

  // Persistir nota_final + estado para matrículas que cambiaron
  for (const m of matriculas) {
    const nota = computedNotas.get(m.id);
    const wasNull = m.nota_final == null;
    if (wasNull && nota != null) {
      const nuevoEstado = nota >= 3 ? "Completado" : "Reprobado";
      await supabase
        .from("matriculas")
        .update({ nota_final: nota, estado: nuevoEstado })
        .eq("id", m.id);
    }
  }

  // 4. Buscar proceso_crecimiento que coincida con el nombre
  const { data: procesos } = await supabase
    .from("procesos_crecimiento")
    .select("id, nombre")
    .order("orden");

  const materiaName = materia.nombre.toLowerCase().trim();
  const matchedProceso = (procesos || []).find((p: any) => {
    const pn = p.nombre.toLowerCase().trim();
    return pn === materiaName || pn.includes(materiaName) || materiaName.includes(pn);
  });
  resumen.procesoNombre = matchedProceso?.nombre ?? null;

  // 5. Upsert hitos para aprobados
  const observacion = `Finalizado por cierre de materia: ${materia.nombre}`;
  for (const m of matriculas) {
    const nota = computedNotas.get(m.id);
    if (nota == null) {
      resumen.sinNota++;
      continue;
    }
    if (nota < 3) {
      resumen.reprobados++;
      continue;
    }
    if (!matchedProceso) continue;
    const { error: upErr } = await supabase
      .from("persona_procesos")
      .upsert(
        {
          persona_id: m.persona_id,
          proceso_id: matchedProceso.id,
          estado: "Realizado",
          fecha_completado: today,
          observacion,
        } as any,
        { onConflict: "persona_id,proceso_id" }
      );
    if (!upErr) resumen.sincronizados++;
  }

  return resumen;
}

export async function revertMateriaFromCrecimiento(materiaId: string): Promise<{ revertidos: number }> {
  const { data: materia, error } = await supabase
    .from("materias")
    .select("id, nombre")
    .eq("id", materiaId)
    .single();
  if (error) throw error;

  const { data: procesos } = await supabase
    .from("procesos_crecimiento")
    .select("id, nombre")
    .order("orden");

  const materiaName = materia.nombre.toLowerCase().trim();
  const matchedProceso = (procesos || []).find((p: any) => {
    const pn = p.nombre.toLowerCase().trim();
    return pn === materiaName || pn.includes(materiaName) || materiaName.includes(pn);
  });
  if (!matchedProceso) return { revertidos: 0 };

  // Borrar solo los hitos generados automáticamente por el cierre de esta materia
  const observacion = `Finalizado por cierre de materia: ${materia.nombre}`;
  const { data: deleted, error: delErr } = await supabase
    .from("persona_procesos")
    .delete()
    .eq("proceso_id", matchedProceso.id)
    .eq("observacion", observacion)
    .select("id");
  if (delErr) throw delErr;

  return { revertidos: (deleted || []).length };
}

// Hook que envuelve las funciones para invalidar queries y exponerlas como mutations
export function useSyncMateriaToCrecimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (materiaId: string) => syncMateriaToCrecimiento(materiaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["persona-procesos"] });
      qc.invalidateQueries({ queryKey: ["personas"] });
      qc.invalidateQueries({ queryKey: ["matriculas"] });
      qc.invalidateQueries({ queryKey: ["matriculas-all"] });
    },
  });
}

export function useRevertMateriaFromCrecimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (materiaId: string) => revertMateriaFromCrecimiento(materiaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["persona-procesos"] });
      qc.invalidateQueries({ queryKey: ["personas"] });
    },
  });
}

// Hook auxiliar: lista de procesos de crecimiento (para badge de UI)
export function useProcesosCrecimiento() {
  return useQuery({
    queryKey: ["procesos-crecimiento-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procesos_crecimiento")
        .select("id, nombre")
        .order("orden");
      if (error) throw error;
      return data || [];
    },
  });
}

