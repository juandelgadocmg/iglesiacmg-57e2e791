import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const sb = supabase as any;

// Resolve current persona via email match against auth user
export function useMiPersona() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mi-persona", user?.id, user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const email = user!.email!;
      const { data, error } = await sb
        .from("personas")
        .select("id,nombres,apellidos,documento,foto_url,email,telefono")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// Mis ofertas (materias matriculadas en periodos activos)
export function useMisOfertas(personaId?: string) {
  return useQuery({
    queryKey: ["mis-ofertas", personaId],
    enabled: !!personaId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("sem_inscripcion_materias")
        .select(`
          id, oferta_id, materia_id, nota_final, estado, inscripcion_id,
          sem_materias(id, codigo, nombre, creditos, color),
          sem_ofertas(id, docente_nombre, docente_persona_id, horario, aula, modalidad, zoom_link, estado,
            sem_periodos(id, codigo, nombre, fecha_inicio, fecha_fin, activo)),
          sem_inscripciones!inner(id, persona_id, programa_id,
            sem_programas(id, nombre, codigo))
        `)
        .eq("sem_inscripciones.persona_id", personaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

// Detalle de mi curso (oferta + evaluaciones + calificaciones del estudiante + recursos + anuncios + zoom + foros + entregas)
export function useMiCurso(inscripcionMateriaId?: string, ofertaId?: string, materiaId?: string) {
  return useQuery({
    queryKey: ["mi-curso", inscripcionMateriaId, ofertaId],
    enabled: !!inscripcionMateriaId && !!ofertaId,
    queryFn: async () => {
      const [evRes, recRes, anRes, zoomRes] = await Promise.all([
        sb.from("sem_evaluaciones").select("*").eq("oferta_id", ofertaId).order("fecha"),
        materiaId
          ? sb.from("sem_recursos").select("*").eq("materia_id", materiaId).order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        sb.from("sem_anuncios").select("*").eq("oferta_id", ofertaId).order("created_at", { ascending: false }),
        sb.from("sem_zoom_sesiones").select("*").eq("oferta_id", ofertaId).order("start_time", { ascending: false }),
      ]);
      if (evRes.error) throw evRes.error;
      const evals = evRes.data || [];
      const evIds = evals.map((e: any) => e.id);
      const [calRes, entRes] = await Promise.all([
        evIds.length
          ? sb.from("sem_calificaciones").select("*").in("evaluacion_id", evIds).eq("inscripcion_materia_id", inscripcionMateriaId)
          : Promise.resolve({ data: [], error: null }),
        sb.from("sem_entregas").select("*").eq("inscripcion_materia_id", inscripcionMateriaId),
      ]);
      const calMap: Record<string, any> = {};
      (calRes.data || []).forEach((c: any) => { calMap[c.evaluacion_id] = c; });
      const entMap: Record<string, any> = {};
      (entRes.data || []).forEach((e: any) => { entMap[e.evaluacion_id] = e; });
      return {
        evaluaciones: evals,
        calificaciones: calMap,
        entregas: entMap,
        recursos: recRes.data || [],
        anuncios: anRes.data || [],
        zoomSesiones: zoomRes.data || [],
      };
    },
  });
}

// Upload + create/update entrega
export function useSubirEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file, evaluacion_id, inscripcion_materia_id, persona_id, comentario,
    }: {
      file: File; evaluacion_id: string; inscripcion_materia_id: string; persona_id: string; comentario?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) throw new Error("Debes iniciar sesión");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${uid}/${evaluacion_id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("sem-entregas").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const { data: signed } = await supabase.storage.from("sem-entregas").createSignedUrl(path, 60 * 60 * 24 * 7);
      const payload: any = {
        evaluacion_id, inscripcion_materia_id, persona_id, user_id: uid,
        archivo_path: path,
        archivo_url: signed?.signedUrl || null,
        archivo_nombre: file.name,
        archivo_tipo: file.type,
        archivo_tamano: file.size,
        comentario: comentario || null,
        estado: "enviada",
      };
      const { data, error } = await sb
        .from("sem_entregas")
        .upsert(payload, { onConflict: "evaluacion_id,inscripcion_materia_id" })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mi-curso"] }),
  });
}

export function useRefreshEntregaUrl() {
  return useMutation({
    mutationFn: async (path: string) => {
      const { data, error } = await supabase.storage.from("sem-entregas").createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data?.signedUrl;
    },
  });
}

// FOROS
export function useForos(ofertaId?: string) {
  return useQuery({
    queryKey: ["sem-foros", ofertaId],
    enabled: !!ofertaId,
    queryFn: async () => {
      const { data, error } = await sb.from("sem_foros")
        .select("*").eq("oferta_id", ofertaId)
        .order("fijado", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (data || []).map((f: any) => f.id);
      let counts: Record<string, number> = {};
      if (ids.length) {
        const { data: msgs } = await sb.from("sem_foro_mensajes").select("foro_id").in("foro_id", ids);
        (msgs || []).forEach((m: any) => { counts[m.foro_id] = (counts[m.foro_id] || 0) + 1; });
      }
      return (data || []).map((f: any) => ({ ...f, mensajes_count: counts[f.id] || 0 }));
    },
  });
}

export function useCrearForo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { oferta_id: string; titulo: string; descripcion?: string; autor_nombre?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await sb.from("sem_foros")
        .insert({ ...payload, autor_user_id: u?.user?.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-foros"] }),
  });
}

export function useForoMensajes(foroId?: string) {
  return useQuery({
    queryKey: ["sem-foro-mensajes", foroId],
    enabled: !!foroId,
    queryFn: async () => {
      const { data, error } = await sb.from("sem_foro_mensajes")
        .select("*").eq("foro_id", foroId).order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useEnviarMensajeForo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { foro_id: string; mensaje: string; parent_id?: string; autor_nombre?: string; autor_avatar?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await sb.from("sem_foro_mensajes")
        .insert({ ...payload, autor_user_id: u?.user?.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["sem-foro-mensajes", v.foro_id] }),
  });
}

export function useEliminarMensajeForo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("sem_foro_mensajes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-foro-mensajes"] }),
  });
}
