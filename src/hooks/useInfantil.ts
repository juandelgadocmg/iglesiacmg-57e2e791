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
      // 1. Intentar con relación maestro_auxiliar
      let query = supabase
        .from("infantil_clases")
        .select("*, maestro:maestro_id(id, nombres, apellidos), maestro_auxiliar:maestro_auxiliar_id(id, nombres, apellidos), grupo:grupo_id(id, nombre)")
        .order("fecha", { ascending: false });
      if (grupoId) {
        query = query.eq("grupo_id", grupoId);
      }
      const { data, error } = await query;
      if (!error && data) return data;

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
      return fallbackData;
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
        const { data, error } = await supabase
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
        const { data, error } = await supabase.from("infantil_atenciones").update(updates).eq("id", id).select().single();
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
        let q = supabase
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
        const { data, error } = await supabase.from("infantil_seguimientos").insert({
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
        const { data, error } = await supabase.from("infantil_seguimientos").update(updates).eq("id", id).select().single();
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

