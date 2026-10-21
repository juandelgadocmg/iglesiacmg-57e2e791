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

function normInfKey(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * El módulo DOXA Kabod y Kings Army (Ministerio Infantil y Adolescentes)
 * incluye Kabod, Kings Army e Infantil; no excluye ninguno de ellos.
 */
export function isExcluidoDeInfantil(_texto: string | null | undefined): boolean {
  return false;
}

export function isKabodNombre(nombre: string | null | undefined): boolean {
  const n = normInfKey(nombre);
  if (!n) return false;
  return n.includes("kabod");
}

export function isKingsArmyNombre(nombre: string | null | undefined): boolean {
  const n = normInfKey(nombre);
  if (!n) return false;
  return n.includes("kings army") || n.includes("king's army") || n.includes("kingsarmy");
}

export function isMinisterioInfantilNombre(nombre: string | null | undefined): boolean {
  const n = normInfKey(nombre);
  if (!n) return false;
  return (
    n === "infantil" ||
    n.includes("infantil") ||
    isKabodNombre(n) ||
    isKingsArmyNombre(n)
  );
}

const LOCAL_GRUPOS_DETALLES_KEY = "doxa_infantil_grupos_detalles_cache";

export function useInfantilGrupos() {
  return useQuery({
    queryKey: ["infantil_grupos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grupos")
        .select("*")
        .eq("tipo", TIPO_GRUPO_INFANTIL)
        .order("nombre", { ascending: true });
      if (error) throw error;

      const gruposValidos = (data || []).filter(
        (g: any) => !isExcluidoDeInfantil(g.nombre) && !isExcluidoDeInfantil(g.descripcion)
      );

      // Intentar cargar detalles opcionales sin romper la carga principal si la tabla auxiliar no existe
      const detallesMap = new Map<string, any>();
      try {
        const rawCache = localStorage.getItem(LOCAL_GRUPOS_DETALLES_KEY);
        if (rawCache) {
          const parsed = JSON.parse(rawCache);
          if (parsed && typeof parsed === "object") {
            Object.entries(parsed).forEach(([k, v]) => detallesMap.set(k, v));
          }
        }
      } catch {}

      if (gruposValidos.length > 0) {
        try {
          const ids = gruposValidos.map((g: any) => g.id);
          const { data: detallesData, error: detError } = await supabase
            .from("infantil_grupos_detalles")
            .select("*")
            .in("grupo_id", ids);
          if (!detError && Array.isArray(detallesData)) {
            detallesData.forEach((d: any) => {
              if (d?.grupo_id) detallesMap.set(d.grupo_id, d);
            });
          }
        } catch {}
      }

      return gruposValidos.map((g: any) => {
        const det = detallesMap.get(g.id) || null;
        return {
          ...g,
          edades: g.descripcion,
          detalles: det,
          infantil_grupos_detalles: det ? [det] : [],
        };
      });
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

      // 2. Create the details (con fallback si la tabla auxiliar no está disponible)
      const detObj = {
        grupo_id: grupo.id,
        edad_minima: payload.edad_minima ?? null,
        edad_maxima: payload.edad_maxima ?? null,
        salon: payload.salon ?? null,
        capacidad: payload.capacidad ?? null
      };
      try {
        const rawCache = JSON.parse(localStorage.getItem(LOCAL_GRUPOS_DETALLES_KEY) || "{}");
        rawCache[grupo.id] = detObj;
        localStorage.setItem(LOCAL_GRUPOS_DETALLES_KEY, JSON.stringify(rawCache));
      } catch {}

      try {
        await supabase.from("infantil_grupos_detalles").insert(detObj);
      } catch {}

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

      // 2. Upsert the details (con fallback seguro)
      const detObj = {
        grupo_id: payload.id,
        edad_minima: payload.edad_minima ?? null,
        edad_maxima: payload.edad_maxima ?? null,
        salon: payload.salon ?? null,
        capacidad: payload.capacidad ?? null
      };
      try {
        const rawCache = JSON.parse(localStorage.getItem(LOCAL_GRUPOS_DETALLES_KEY) || "{}");
        rawCache[payload.id] = detObj;
        localStorage.setItem(LOCAL_GRUPOS_DETALLES_KEY, JSON.stringify(rawCache));
      } catch {}

      try {
        await supabase.from("infantil_grupos_detalles").upsert(detObj, { onConflict: "grupo_id" });
      } catch {}

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
      // 1. Intentar con relación maestro_auxiliar
      let rawClases: any[] = [];
      let query = supabase
        .from("infantil_clases")
        .select("*, maestro:maestro_id(id, nombres, apellidos), maestro_auxiliar:maestro_auxiliar_id(id, nombres, apellidos), grupo:grupo_id(id, nombre)")
        .order("fecha", { ascending: false });
      if (grupoId) {
        query = query.eq("grupo_id", grupoId);
      }
      const { data, error } = await query;
      if (!error && data) {
        rawClases = data;
      } else {
        // 2. Fallback seguro si la FK aún no está en caché de PostgREST
        let fallbackQuery = supabase
          .from("infantil_clases")
          .select("*, maestro:maestro_id(id, nombres, apellidos), grupo:grupo_id(id, nombre)")
          .order("fecha", { ascending: false });
        if (grupoId) {
          fallbackQuery = fallbackQuery.eq("grupo_id", grupoId);
        }
        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        if (fallbackError) throw fallbackError;
        rawClases = fallbackData || [];
      }

      // Solo excluir visualmente si el nombre del grupo es explícitamente Kings Army o Kabod.
      // Jamás eliminar clases automáticamente ni ocultar por nombre de tema/versículo o maestro.
      return rawClases.filter((c: any) => !isExcluidoDeInfantil(c.grupo?.nombre));
    },
  });
}

export function useCreateInfantilClase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clase: any) => {
      const { data, error } = await supabase.from("infantil_clases").insert(clase).select().single();
      if (error) {
        // Si el error es por la columna maestro_auxiliar_id que aún no existe en Supabase
        if (error.message?.includes("maestro_auxiliar_id") || error.code === "PGRST204") {
          const { maestro_auxiliar_id, ...claseSinAux } = clase;
          const { data: retryData, error: retryError } = await supabase.from("infantil_clases").insert(claseSinAux).select().single();
          if (retryError) throw retryError;
          return retryData;
        }
        throw error;
      }
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
      if (error) {
        if (error.message?.includes("maestro_auxiliar_id") || error.code === "PGRST204") {
          const { maestro_auxiliar_id, ...updatesSinAux } = updates;
          const { data: retryData, error: retryError } = await supabase.from("infantil_clases").update(updatesSinAux).eq("id", id).select().single();
          if (retryError) throw retryError;
          return retryData;
        }
        throw error;
      }
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

// Helper para almacenamiento local de atenciones de contingencia
const LOCAL_ATENCIONES_KEY = "doxa_infantil_atenciones_cache";

export function useInfantilAtenciones() {
  return useQuery({
    queryKey: ["infantil_atenciones"],
    queryFn: async () => {
      let dbData: any[] = [];
      try {
        const { data, error } = await (supabase as any)
          .from("infantil_atenciones")
          .select("*, nino:nino_id(id, nombres, apellidos), maestro:maestro_id(id, nombres, apellidos), responsable:responsable_id(id, nombres, apellidos)")
          .order("hora_creacion", { ascending: false });
        if (!error && data) {
          dbData = data;
        }
      } catch (e) {
        console.warn("Tabla infantil_atenciones no disponible en BD aún:", e);
      }

      // Fusionar con registros locales de contingencia
      try {
        const rawLocal = localStorage.getItem(LOCAL_ATENCIONES_KEY);
        if (rawLocal) {
          const localItems = JSON.parse(rawLocal);
          if (Array.isArray(localItems)) {
            const existingIds = new Set(dbData.map(d => d.id));
            const uniqueLocals = localItems.filter(l => !existingIds.has(l.id));
            return [...uniqueLocals, ...dbData];
          }
        }
      } catch {}

      return dbData;
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
      nino_info?: { nombres: string; apellidos: string };
    }) => {
      const atencionItem = {
        id: "local_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        nino_id: payload.nino_id,
        tipo_solicitud: payload.tipo_solicitud as any,
        prioridad: payload.prioridad || "Normal",
        observaciones: payload.observaciones || null,
        sintomas: payload.sintomas || null,
        temperatura: payload.temperatura || null,
        necesita_acudiente: payload.necesita_acudiente ?? false,
        maestro_id: payload.maestro_id || null,
        estado: "Pendiente",
        hora_creacion: new Date().toISOString(),
        nino: payload.nino_info || null
      };

      try {
        const { data, error } = await (supabase as any).from("infantil_atenciones").insert({
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

        if (!error && data) {
          return data;
        }
      } catch (err: any) {
        console.warn("Guardando atención en caché local de contingencia:", err?.message);
      }

      // Guardar en localStorage como fallback
      try {
        const current = JSON.parse(localStorage.getItem(LOCAL_ATENCIONES_KEY) || "[]");
        current.unshift(atencionItem);
        localStorage.setItem(LOCAL_ATENCIONES_KEY, JSON.stringify(current.slice(0, 100)));
      } catch {}

      return atencionItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infantil_atenciones"] }),
  });
}

export function useUpdateInfantilAtencion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      try {
        const { data, error } = await (supabase as any).from("infantil_atenciones").update(updates).eq("id", id).select().single();
        if (!error && data) return data;
      } catch {}

      // Fallback local
      try {
        const current = JSON.parse(localStorage.getItem(LOCAL_ATENCIONES_KEY) || "[]");
        const idx = current.findIndex((c: any) => c.id === id);
        if (idx !== -1) {
          current[idx] = { ...current[idx], ...updates };
          localStorage.setItem(LOCAL_ATENCIONES_KEY, JSON.stringify(current));
          return current[idx];
        }
      } catch {}

      return { id, ...updates };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infantil_atenciones"] }),
  });
}

// ==========================================
// SEGUIMIENTO PASTORAL INFANTIL HOOKS
// ==========================================
const LOCAL_SEGUIMIENTOS_KEY = "doxa_infantil_seguimientos_cache";

export interface InfantilSeguimientoItem {
  id: string;
  nino_id: string;
  lider_id?: string | null;
  tipo: string;
  fecha: string;
  hora?: string | null;
  estado: "Pendiente" | "Completado" | "Cancelado";
  prioridad: "Normal" | "Alta" | "Urgente";
  notas: string;
  resultado?: string | null;
  created_at?: string;
  nino?: { id: string; nombres: string; apellidos: string; telefono?: string };
}

export function useInfantilSeguimientos(ninoId?: string) {
  return useQuery({
    queryKey: ["infantil_seguimientos", ninoId],
    queryFn: async (): Promise<InfantilSeguimientoItem[]> => {
      let dbData: any[] = [];
      try {
        let q = (supabase as any)
          .from("infantil_seguimientos")
          .select("*, nino:nino_id(id, nombres, apellidos, telefono)")
          .order("fecha", { ascending: false });
        if (ninoId) {
          q = q.eq("nino_id", ninoId);
        }
        const { data, error } = await q;
        if (!error && data) {
          dbData = data;
        }
      } catch {}

      // Combinar con almacenamiento local
      try {
        const raw = localStorage.getItem(LOCAL_SEGUIMIENTOS_KEY);
        if (raw) {
          const locals: InfantilSeguimientoItem[] = JSON.parse(raw);
          const existingIds = new Set(dbData.map(d => d.id));
          const filtered = locals.filter(l => !existingIds.has(l.id) && (!ninoId || l.nino_id === ninoId));
          return [...filtered, ...dbData];
        }
      } catch {}

      return dbData;
    },
  });
}

export function useCreateInfantilSeguimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      nino_id: string;
      lider_id?: string | null;
      tipo: string;
      fecha: string;
      hora?: string | null;
      prioridad?: "Normal" | "Alta" | "Urgente";
      notas: string;
      nino_info?: { id: string; nombres: string; apellidos: string };
    }) => {
      const item: InfantilSeguimientoItem = {
        id: "seg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        nino_id: payload.nino_id,
        lider_id: payload.lider_id || null,
        tipo: payload.tipo,
        fecha: payload.fecha,
        hora: payload.hora || null,
        estado: "Pendiente",
        prioridad: payload.prioridad || "Normal",
        notas: payload.notas,
        created_at: new Date().toISOString(),
        nino: payload.nino_info
      };

      try {
        const { data, error } = await (supabase as any).from("infantil_seguimientos").insert({
          nino_id: payload.nino_id,
          lider_id: payload.lider_id || null,
          tipo: payload.tipo,
          fecha: payload.fecha,
          hora: payload.hora || null,
          prioridad: payload.prioridad || "Normal",
          notas: payload.notas,
          estado: "Pendiente"
        }).select().single();

        if (!error && data) return data;
      } catch {}

      // Fallback local
      try {
        const current: InfantilSeguimientoItem[] = JSON.parse(localStorage.getItem(LOCAL_SEGUIMIENTOS_KEY) || "[]");
        current.unshift(item);
        localStorage.setItem(LOCAL_SEGUIMIENTOS_KEY, JSON.stringify(current.slice(0, 200)));
      } catch {}

      return item;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infantil_seguimientos"] }),
  });
}

export function useUpdateInfantilSeguimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      try {
        const { data, error } = await (supabase as any).from("infantil_seguimientos").update(updates).eq("id", id).select().single();
        if (!error && data) return data;
      } catch {}

      try {
        const current: InfantilSeguimientoItem[] = JSON.parse(localStorage.getItem(LOCAL_SEGUIMIENTOS_KEY) || "[]");
        const idx = current.findIndex(c => c.id === id);
        if (idx !== -1) {
          current[idx] = { ...current[idx], ...updates };
          localStorage.setItem(LOCAL_SEGUIMIENTOS_KEY, JSON.stringify(current));
          return current[idx];
        }
      } catch {}

      return { id, ...updates };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["infantil_seguimientos"] }),
  });
}

// ============================================================================
// INTEGRACIÓN Y MIGRACIÓN CON EL MÓDULO DE REUNIONES (prog_*)
// ============================================================================

export interface ServidorAsignadoReunion {
  id: string;
  persona_id: string;
  nombres: string;
  apellidos: string;
  telefono?: string | null;
  cargo_id?: string | null;
  cargo_nombre: string;
  ministerio_id: string;
  ministerio_nombre: string;
  estado: string;
  asistencia?: string | null;
}

export interface ServicioReunionInfantil {
  key: string;
  evento_id: string;
  evento_titulo: string;
  evento_tipo: string;
  fecha: string;
  hora: string | null;
  lugar: string | null;
  estado_evento: string;
  ministerio_id: string | null;
  ministerio_nombre: string;
  ministerio_color: string | null;
  grupo_sugerido_id: string | null;
  grupo_texto: string;
  maestro_id: string | null;
  maestro: { id: string; nombres: string; apellidos: string; cargo?: string } | null;
  maestro_auxiliar_id: string | null;
  maestro_auxiliar: { id: string; nombres: string; apellidos: string; cargo?: string } | null;
  tema: string;
  versiculo: string;
  objetivo: string;
  actividad: string;
  materiales: string;
  uniforme: string;
  observacion: string;
  estaciones_texto: Record<string, string>;
  equipo_infantil: ServidorAsignadoReunion[];
  todas_asignaciones_servicio: ServidorAsignadoReunion[];
  tiene_programacion_infantil: boolean;
}

export function useProgramacionReunionesInfantil() {
  return useQuery<ServicioReunionInfantil[]>({
    queryKey: ["prog_reuniones_infantil"],
    queryFn: async () => {
      const [
        { data: ministerios = [] },
        { data: eventos = [] },
        { data: cargos = [] },
        { data: asignaciones = [] },
        { data: textos = [] },
        { data: personas = [] },
        { data: rawGruposInf = [] },
        { data: isoTemplates = [] },
      ] = await Promise.all([
        supabase.from("prog_ministerios" as any).select("*").order("nombre", { ascending: true }),
        supabase.from("prog_eventos" as any).select("*").order("fecha", { ascending: false }),
        supabase.from("prog_cargos" as any).select("*").order("orden", { ascending: true }),
        supabase.from("prog_asignaciones" as any).select("*"),
        supabase.from("prog_evento_textos" as any).select("*"),
        supabase.from("personas").select("id, nombres, apellidos, telefono, whatsapp"),
        supabase.from("grupos").select("id, nombre, tipo, descripcion").eq("tipo", TIPO_GRUPO_INFANTIL),
        supabase.from("prog_iso_templates" as any).select("ministerio_id, fechas_incluidas"),
      ]);

      const gruposInf = (rawGruposInf || []).filter(
        (g: any) => !isExcluidoDeInfantil(g.nombre) && !isExcluidoDeInfantil(g.descripcion)
      );

      const personasMap = new Map<string, any>((personas || []).map((p: any) => [p.id, p]));
      const cargosMap = new Map<string, any>((cargos || []).map((c: any) => [c.id, c]));
      const minMap = new Map<string, any>((ministerios || []).map((m: any) => [m.id, m]));

      const ministeriosInfantil = ((ministerios || []) as any[]).filter((m: any) => isMinisterioInfantilNombre(m.nombre));
      if (ministeriosInfantil.length === 0) return [];
      const minInfantilIds = new Set<string>(ministeriosInfantil.map((m: any) => m.id));

      // Fechas incluidas por ministerio en su formato ISO
      const fechasIsoPorMin = new Map<string, Set<string>>();
      (isoTemplates || []).forEach((tpl: any) => {
        if (tpl?.ministerio_id && Array.isArray(tpl.fechas_incluidas)) {
          fechasIsoPorMin.set(
            tpl.ministerio_id,
            new Set(tpl.fechas_incluidas.filter(Boolean))
          );
        }
      });

      // Agrupar textos de ministerios infantiles y Kings Army
      const textosByEvMin = new Map<string, Record<string, string>>();
      (textos || []).forEach((t: any) => {
        if (!minInfantilIds.has(t.ministerio_id)) return;
        if (!t.valor || !String(t.valor).trim()) return;
        if (isExcluidoDeInfantil(t.valor)) return;
        const k = `${t.evento_id}::${t.ministerio_id}`;
        const cur = textosByEvMin.get(k) || {};
        cur[t.campo] = String(t.valor).trim();
        textosByEvMin.set(k, cur);
      });

      const result: ServicioReunionInfantil[] = [];

      for (const ev of (eventos || []) as any[]) {
        if (isExcluidoDeInfantil(ev.titulo)) continue;

        // Asignaciones de Ministerio Infantil y Kings Army
        const asigsServicio: ServidorAsignadoReunion[] = (asignaciones || [])
          .filter((a: any) => a.evento_id === ev.id && minInfantilIds.has(a.ministerio_id))
          .map((a: any) => {
            const p = personasMap.get(a.persona_id);
            const c = a.cargo_id ? cargosMap.get(a.cargo_id) : null;
            const m = minMap.get(a.ministerio_id);
            return {
              id: a.id,
              persona_id: a.persona_id,
              nombres: p?.nombres || "Servidor",
              apellidos: p?.apellidos || "",
              telefono: p?.whatsapp || p?.telefono || null,
              cargo_id: a.cargo_id,
              cargo_nombre: c?.nombre || "Servidor",
              ministerio_id: a.ministerio_id,
              ministerio_nombre: m?.nombre || "Infantil",
              estado: a.estado || "pendiente",
              asistencia: a.asistencia || null,
            };
          });

        // Determinar para qué ministerios (Infantil y/o Kings Army) hay datos en este evento
        const minsConDatos = ministeriosInfantil.filter((m: any) => {
          const tieneAsigs = asigsServicio.some((a) => a.ministerio_id === m.id);
          const tx = textosByEvMin.get(`${ev.id}::${m.id}`);
          const tieneTextos = tx && Object.keys(tx).length > 0;
          const tieneFechaIso = fechasIsoPorMin.get(m.id)?.has(ev.fecha) || false;
          return tieneAsigs || tieneTextos || tieneFechaIso;
        });

        const minsTarget = minsConDatos.length > 0 ? minsConDatos : ministeriosInfantil;

        for (const minInf of minsTarget) {
          if (!minInf) continue;
          const minId = minInf.id;
          const equipoInfantil = asigsServicio.filter((a) => a.ministerio_id === minId);

          const txMap: Record<string, string> = {};
          if (textosByEvMin.has(`${ev.id}::${minId}`)) {
            Object.assign(txMap, textosByEvMin.get(`${ev.id}::${minId}`));
          }

          const getTxt = (...keys: string[]): string => {
            for (const k of keys) {
              const nk = normInfKey(k);
              if (txMap[`estacion:${nk}`]) return txMap[`estacion:${nk}`];
              if (txMap[nk]) return txMap[nk];
              if (txMap[k]) return txMap[k];
            }
            for (const [fullKey, val] of Object.entries(txMap)) {
              if (!val) continue;
              const cleanK = normInfKey(fullKey.replace(/^estacion:/, ""));
              if (keys.some((wanted) => cleanK.includes(normInfKey(wanted)))) {
                return val;
              }
            }
            return "";
          };

          // Identificar Maestro/Docente Principal y Auxiliar/Apoyo según el cargo asignado en Infantil o Kings Army
          let maestroAsig = equipoInfantil.find((a) => {
            const cn = normInfKey(a.cargo_nombre);
            return (
              (cn.includes("maestro") || cn.includes("docente") || cn.includes("lider") || cn.includes("encargado")) &&
              !cn.includes("auxiliar") &&
              !cn.includes("apoyo")
            );
          });
          if (!maestroAsig && equipoInfantil.length > 0) {
            maestroAsig = equipoInfantil.find((a) => normInfKey(a.cargo_nombre) !== "grupo") || equipoInfantil[0];
          }

          let auxiliarAsig = equipoInfantil.find((a) => {
            if (maestroAsig && a.id === maestroAsig.id) return false;
            const cn = normInfKey(a.cargo_nombre);
            return cn.includes("auxiliar") || cn.includes("apoyo") || cn.includes("colaborador") || cn.includes("asistente");
          });
          if (!auxiliarAsig && equipoInfantil.length > 1) {
            auxiliarAsig = equipoInfantil.find(
              (a) => a.persona_id !== maestroAsig?.persona_id && normInfKey(a.cargo_nombre) !== "grupo"
            );
          }

          const esKings = isKingsArmyNombre(minInf.nombre);
          const esKabod = isKabodNombre(minInf.nombre);
          const grupoTextoRaw = getTxt("grupo", "salon", "edad");
          const grupoTexto =
            grupoTextoRaw || (esKings ? "Kings Army" : esKabod ? "Kabod (3-11 años)" : "");

          let grupoSugerido = gruposInf[0]?.id || null;
          if (gruposInf.length > 0) {
            const searchTerms = [
              grupoTextoRaw,
              esKings ? "kings army" : "",
              esKabod ? "kabod" : "",
              minInf.nombre,
            ].filter(Boolean);
            for (const term of searchTerms) {
              const normG = normInfKey(term);
              if (!normG) continue;
              const foundG = gruposInf.find(
                (g: any) =>
                  normInfKey(g.nombre).includes(normG) ||
                  normG.includes(normInfKey(g.nombre)) ||
                  (g.descripcion && normInfKey(g.descripcion).includes(normG))
              );
              if (foundG) {
                grupoSugerido = foundG.id;
                break;
              }
            }
          }

          const tema36 = getTxt("tema 3-6 anos", "tema 3-6");
          const tema711 = getTxt("tema 7-11 anos", "tema 7-11");
          const temaKabodCombinado = [
            tema36 ? `3-6 años: ${tema36}` : "",
            tema711 ? `7-11 años: ${tema711}` : "",
          ]
            .filter(Boolean)
            .join(" · ");

          const objetivoExtraido = getTxt("objetivo");
          const versiculoExtraido = getTxt("versiculo", "texto biblico", "cita biblica");
          const materialesExtraidos = getTxt("material", "materiales", "material didactico");
          const actividadExtraida = getTxt("actividad", "dinamica", "dinamicas");
          const temaExtraido =
            temaKabodCombinado ||
            getTxt("tema", "leccion") ||
            objetivoExtraido ||
            versiculoExtraido ||
            ev.titulo ||
            (esKings ? "Servicio Kings Army" : esKabod ? "Servicio Kabod" : "Servicio Infantil");
          const uniformeExtraido = txMap["uniforme"] || ev.uniforme || "";
          const observacionExtraida = txMap["observacion"] || ev.descripcion || "";

          const estacionesTextoLimpio: Record<string, string> = {};
          Object.entries(txMap).forEach(([k, v]) => {
            if (k.startsWith("estacion:") && v && !isExcluidoDeInfantil(v)) {
              estacionesTextoLimpio[k.replace(/^estacion:/, "")] = v;
            }
          });

          const tieneFechaIso = fechasIsoPorMin.get(minId)?.has(ev.fecha) || false;
          const tieneProg = equipoInfantil.length > 0 || Object.keys(txMap).length > 0 || tieneFechaIso;

          result.push({
            key: `${ev.id}_${minId}`,
            evento_id: ev.id,
            evento_titulo: ev.titulo || "Reunión",
            evento_tipo: ev.tipo || "Servicio",
            fecha: ev.fecha,
            hora: ev.hora || null,
            lugar: ev.lugar || null,
            estado_evento: ev.estado || "borrador",
            ministerio_id: minId,
            ministerio_nombre: minInf.nombre || (esKings ? "Kings Army" : "Infantil"),
            ministerio_color: minInf.color || (esKings ? "#7c3aed" : "#2563eb"),
            grupo_sugerido_id: grupoSugerido,
            grupo_texto: isExcluidoDeInfantil(grupoTexto) ? "" : grupoTexto,
            maestro_id: maestroAsig?.persona_id || null,
            maestro: maestroAsig
              ? {
                  id: maestroAsig.persona_id,
                  nombres: maestroAsig.nombres,
                  apellidos: maestroAsig.apellidos,
                  cargo: maestroAsig.cargo_nombre,
                }
              : null,
            maestro_auxiliar_id: auxiliarAsig?.persona_id || null,
            maestro_auxiliar: auxiliarAsig
              ? {
                  id: auxiliarAsig.persona_id,
                  nombres: auxiliarAsig.nombres,
                  apellidos: auxiliarAsig.apellidos,
                  cargo: auxiliarAsig.cargo_nombre,
                }
              : null,
            tema: temaExtraido,
            versiculo: versiculoExtraido,
            objetivo: objetivoExtraido,
            actividad: actividadExtraida,
            materiales: materialesExtraidos,
            uniforme: uniformeExtraido,
            observacion: observacionExtraida,
            estaciones_texto: estacionesTextoLimpio,
            equipo_infantil: equipoInfantil,
            todas_asignaciones_servicio: equipoInfantil,
            tiene_programacion_infantil: tieneProg,
          });
        }
      }

      return result;
    },
  });
}

export function useMigrarProgramacionReuniones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (servicios: ServicioReunionInfantil[]) => {
      const programados = servicios.filter(
        (s) =>
          s.tiene_programacion_infantil &&
          isMinisterioInfantilNombre(s.ministerio_nombre) &&
          !isExcluidoDeInfantil(s.ministerio_nombre) &&
          !isExcluidoDeInfantil(s.tema) &&
          !isExcluidoDeInfantil(s.grupo_texto)
      );
      if (programados.length === 0) return { creados: 0, actualizados: 0 };

      // 1. Obtener grupos válidos del módulo Infantil (incluyendo Kings Army si existe)
      const { data: rawGruposInf } = await supabase
        .from("grupos")
        .select("id, nombre, descripcion")
        .eq("tipo", TIPO_GRUPO_INFANTIL);
      const gruposInfValidos = (rawGruposInf || []).filter(
        (g: any) => !isExcluidoDeInfantil(g.nombre) && !isExcluidoDeInfantil(g.descripcion)
      );
      const defaultGrupoId = gruposInfValidos[0]?.id || null;

      if (!defaultGrupoId) {
        return { creados: 0, actualizados: 0 };
      }

      const validGrupoIds = new Set(gruposInfValidos.map((g: any) => g.id));

      // 2. Obtener clases actuales en infantil_clases
      const { data: clasesActuales = [] } = await supabase.from("infantil_clases").select("*");

      let creados = 0;
      let actualizados = 0;

      for (const srv of programados) {
        const targetGrupoId =
          srv.grupo_sugerido_id && validGrupoIds.has(srv.grupo_sugerido_id)
            ? srv.grupo_sugerido_id
            : defaultGrupoId;

        const existente = ((clasesActuales || []) as any[]).find(
          (c: any) =>
            c.fecha === srv.fecha &&
            (normInfKey(c.tema) === normInfKey(srv.tema) || c.grupo_id === targetGrupoId)
        );

        const existingGrupoValid =
          existente?.grupo_id && validGrupoIds.has(existente.grupo_id) ? existente.grupo_id : targetGrupoId;

        const payloadBase: any = {
          grupo_id: existingGrupoValid,
          fecha: srv.fecha,
          maestro_id: srv.maestro_id || existente?.maestro_id || null,
          maestro_auxiliar_id: srv.maestro_auxiliar_id || existente?.maestro_auxiliar_id || null,
          tema: srv.tema || existente?.tema || srv.evento_titulo,
          versiculo: srv.versiculo || existente?.versiculo || "",
          objetivo: srv.objetivo || existente?.objetivo || "",
          actividad: srv.actividad || existente?.actividad || "",
          materiales: srv.materiales || existente?.materiales || "",
          estado: existente?.estado || "Programada",
        };

        if (existente) {
          const { error } = await supabase.from("infantil_clases").update(payloadBase).eq("id", existente.id);
          if (error && (error.message?.includes("maestro_auxiliar_id") || error.code === "PGRST204")) {
            const { maestro_auxiliar_id, ...sinAux } = payloadBase;
            await supabase.from("infantil_clases").update(sinAux).eq("id", existente.id);
          }
          actualizados++;
        } else {
          const { error } = await supabase.from("infantil_clases").insert(payloadBase);
          if (error && (error.message?.includes("maestro_auxiliar_id") || error.code === "PGRST204")) {
            const { maestro_auxiliar_id, ...sinAux } = payloadBase;
            await supabase.from("infantil_clases").insert(sinAux);
          }
          creados++;
        }
      }

      return { creados, actualizados };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["infantil_clases"] });
      qc.invalidateQueries({ queryKey: ["prog_reuniones_infantil"] });
    },
  });
}

// ============================================================================
// NOTIFICACIONES A PADRES Y ESTADÍSTICAS HISTÓRICAS DE ASISTENCIA
// ============================================================================

const LOCAL_NOTIFICACIONES_KEY = "doxa_infantil_notificaciones_cache";

export interface InfantilNotificacionItem {
  id: string;
  nino_id?: string | null;
  acudiente_id?: string | null;
  grupo_id?: string | null;
  destinatario_nombre?: string | null;
  destinatario_telefono?: string | null;
  destinatario_email?: string | null;
  tipo: string;
  asunto?: string | null;
  mensaje: string;
  canal: string;
  estado: string;
  created_at: string;
  nino?: { id: string; nombres: string; apellidos: string } | null;
  acudiente?: { id: string; nombres: string; apellidos: string; telefono?: string | null; email?: string | null } | null;
}

export function useInfantilNotificaciones() {
  return useQuery<InfantilNotificacionItem[]>({
    queryKey: ["infantil_notificaciones"],
    queryFn: async () => {
      let dbItems: InfantilNotificacionItem[] = [];
      try {
        const { data, error } = await supabase
          .from("infantil_notificaciones" as any)
          .select("*, nino:nino_id(id, nombres, apellidos), acudiente:acudiente_id(id, nombres, apellidos, telefono, email)")
          .order("created_at", { ascending: false })
          .limit(100);
        if (!error && Array.isArray(data)) {
          dbItems = data as any[];
        }
      } catch {}

      try {
        const raw = localStorage.getItem(LOCAL_NOTIFICACIONES_KEY);
        if (raw) {
          const locals: InfantilNotificacionItem[] = JSON.parse(raw);
          if (Array.isArray(locals)) {
            const dbIds = new Set(dbItems.map((d) => d.id));
            const uniqueLocals = locals.filter((l) => !dbIds.has(l.id));
            return [...uniqueLocals, ...dbItems];
          }
        }
      } catch {}

      return dbItems;
    },
  });
}

export function useCreateInfantilNotificacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      destinatarios: Array<{
        nino_id: string;
        nino_nombre: string;
        acudiente_id?: string | null;
        acudiente_nombre?: string | null;
        telefono?: string | null;
        email?: string | null;
        grupo_id?: string | null;
      }>;
      tipo: string;
      asunto: string;
      mensaje: string;
      canal: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const createdItems: InfantilNotificacionItem[] = [];
      let emailsEncolados = 0;

      for (const dest of payload.destinatarios) {
        const localItem: InfantilNotificacionItem = {
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          nino_id: dest.nino_id,
          acudiente_id: dest.acudiente_id || null,
          grupo_id: dest.grupo_id || null,
          destinatario_nombre: dest.acudiente_nombre || dest.nino_nombre,
          destinatario_telefono: dest.telefono || null,
          destinatario_email: dest.email || null,
          tipo: payload.tipo,
          asunto: payload.asunto,
          mensaje: payload.mensaje,
          canal: payload.canal,
          estado: "Enviado",
          created_at: new Date().toISOString(),
          nino: { id: dest.nino_id, nombres: dest.nino_nombre, apellidos: "" },
          acudiente: dest.acudiente_nombre
            ? {
                id: dest.acudiente_id || "",
                nombres: dest.acudiente_nombre,
                apellidos: "",
                telefono: dest.telefono || null,
                email: dest.email || null,
              }
            : null,
        };

        // 1. Guardar en infantil_notificaciones
        try {
          const { data, error } = await supabase
            .from("infantil_notificaciones" as any)
            .insert({
              nino_id: dest.nino_id,
              acudiente_id: dest.acudiente_id || null,
              tipo: payload.asunto || payload.tipo,
              mensaje: payload.mensaje,
              canal: payload.canal,
              estado: "Enviado",
              enviado_por: user?.id || null,
            })
            .select()
            .single();
          if (!error && data) {
            localItem.id = (data as any).id;
          }
        } catch {}

        // 2. Guardar también en infantil_comunicaciones para trazabilidad bidireccional
        try {
          await supabase.from("infantil_comunicaciones" as any).insert({
            nino_id: dest.nino_id,
            acudiente_id: dest.acudiente_id || null,
            canal: payload.canal === "WhatsApp" ? "WhatsApp" : payload.canal === "Correo" ? "Correo" : "Interno",
            tipo_mensaje: payload.tipo === "urgente" ? "Solicitud Acudiente" : "Notificación",
            mensaje: `${payload.asunto ? `[${payload.asunto}] ` : ""}${payload.mensaje}`,
            estado_envio: "Enviado",
          });
        } catch {}

        // 3. Si el acudiente tiene email, encolar correo real mediante send_transactional_email
        if (dest.email && dest.email.includes("@")) {
          try {
            const html = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #1e3a8a; margin-top: 0;">Ministerio Infantil — ${payload.asunto || "Aviso Importante"}</h2>
                <p>Estimado(a) <strong>${dest.acudiente_nombre || "Acudiente"}</strong> (Acudiente de <strong>${dest.nino_nombre}</strong>):</p>
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 16px 0;">
                  ${payload.mensaje.replace(/\n/g, "<br/>")}
                </div>
                <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
                  Enviado desde el módulo de Iglesia Infantil — Centro Mundial de Gloria.
                </p>
              </div>
            `;
            const { error: mailErr } = await (supabase as any).rpc("send_transactional_email", {
              p_to: dest.email.trim(),
              p_subject: `[Iglesia Infantil] ${payload.asunto || "Notificación a Padres"}`,
              p_html: html,
              p_label: "infantil_notificacion",
            });
            if (!mailErr) emailsEncolados++;
          } catch {}
        }

        createdItems.push(localItem);
      }

      // 4. Registrar alerta en alertas_importantes si es urgente o aviso formal
      if (createdItems.length > 0) {
        try {
          const primer = payload.destinatarios[0];
          await supabase.from("alertas_importantes").insert({
            titulo: `Notificación Infantil: ${payload.asunto || "Aviso a Padres"}`,
            descripcion: `Enviada a ${payload.destinatarios.length} destinatario(s) (${primer?.nino_nombre || ""}): ${payload.mensaje}`,
            severidad: payload.tipo === "urgente" ? "alta" : "media",
            categoria: "infantil_notificacion",
            persona_id: primer?.acudiente_id || primer?.nino_id || null,
            grupo_id: primer?.grupo_id || null,
            metadata: {
              total_destinatarios: payload.destinatarios.length,
              emails_encolados: emailsEncolados,
              canal: payload.canal,
            },
          });
        } catch {}
      }

      // 5. Guardar en caché local para visualización inmediata
      try {
        const current: InfantilNotificacionItem[] = JSON.parse(
          localStorage.getItem(LOCAL_NOTIFICACIONES_KEY) || "[]"
        );
        const updated = [...createdItems, ...current].slice(0, 200);
        localStorage.setItem(LOCAL_NOTIFICACIONES_KEY, JSON.stringify(updated));
      } catch {}

      return { createdItems, emailsEncolados };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["infantil_notificaciones"] });
      qc.invalidateQueries({ queryKey: ["infantil_comunicaciones"] });
    },
  });
}

export function useInfantilAsistenciasHistoricas() {
  return useQuery({
    queryKey: ["infantil_asistencias_historicas"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("infantil_asistencia_checkin")
          .select("*, nino:nino_id(id, nombres, apellidos), grupo:grupo_id(id, nombre)")
          .order("fecha", { ascending: false })
          .limit(2000);
        if (!error && data) {
          return data.filter((a: any) => !isExcluidoDeInfantil(a.grupo?.nombre));
        }
      } catch {}
      return [];
    },
  });
}



