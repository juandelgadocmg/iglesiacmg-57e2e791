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

// Is current user staff (sees moderation tools)?
export function useIsSeminarioStaff() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sem-is-staff", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb.rpc("sem_is_staff", { _uid: user!.id });
      if (error) return false;
      return !!data;
    },
  });
}

// Mis ofertas
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
          sem_ofertas(id, docente_nombre, docente_persona_id, horario, aula, modalidad, zoom_link, estado, periodo_id,
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

// Detalle curso
export function useMiCurso(inscripcionMateriaId?: string, ofertaId?: string, materiaId?: string, personaId?: string, periodoId?: string) {
  return useQuery({
    queryKey: ["mi-curso", inscripcionMateriaId, ofertaId, periodoId],
    enabled: !!inscripcionMateriaId && !!ofertaId,
    queryFn: async () => {
      // Recursos: filtra por materia + (sin periodo o periodo del curso) + publicado
      let recQuery = sb.from("sem_recursos").select("*").eq("publicado", true).order("created_at", { ascending: false });
      if (materiaId) recQuery = recQuery.eq("materia_id", materiaId);
      if (periodoId) recQuery = recQuery.or(`periodo_id.is.null,periodo_id.eq.${periodoId}`);

      const [evRes, recRes, anRes, zoomRes] = await Promise.all([
        sb.from("sem_evaluaciones").select("*").eq("oferta_id", ofertaId).order("fecha"),
        materiaId ? recQuery : Promise.resolve({ data: [], error: null }),
        sb.from("sem_anuncios").select("*").eq("oferta_id", ofertaId).order("created_at", { ascending: false }),
        sb.from("sem_zoom_sesiones").select("*").eq("oferta_id", ofertaId).order("start_time", { ascending: false }),
      ]);
      if (evRes.error) throw evRes.error;
      const evals = evRes.data || [];
      const evIds = evals.map((e: any) => e.id);
      const anIds = (anRes.data || []).map((a: any) => a.id);

      const [calRes, entRes, lecRes] = await Promise.all([
        evIds.length
          ? sb.from("sem_calificaciones").select("*").in("evaluacion_id", evIds).eq("inscripcion_materia_id", inscripcionMateriaId)
          : Promise.resolve({ data: [], error: null }),
        sb.from("sem_entregas").select("*").eq("inscripcion_materia_id", inscripcionMateriaId).order("created_at", { ascending: false }),
        anIds.length && personaId
          ? sb.from("sem_anuncios_lecturas").select("*").in("anuncio_id", anIds).eq("persona_id", personaId)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const calMap: Record<string, any> = {};
      (calRes.data || []).forEach((c: any) => { calMap[c.evaluacion_id] = c; });

      // entregas agrupadas por evaluación con historial
      const entregasPorEval: Record<string, any[]> = {};
      (entRes.data || []).forEach((e: any) => {
        (entregasPorEval[e.evaluacion_id] ||= []).push(e);
      });

      const lecMap: Record<string, any> = {};
      (lecRes.data || []).forEach((l: any) => { lecMap[l.anuncio_id] = l; });

      return {
        evaluaciones: evals,
        calificaciones: calMap,
        entregasPorEval,
        recursos: recRes.data || [],
        anuncios: anRes.data || [],
        zoomSesiones: zoomRes.data || [],
        lecturas: lecMap,
      };
    },
  });
}

// Subir entrega -> crea NUEVA versión
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

      // calcular siguiente versión
      const { data: prev } = await sb.from("sem_entregas")
        .select("version").eq("evaluacion_id", evaluacion_id).eq("inscripcion_materia_id", inscripcion_materia_id)
        .order("version", { ascending: false }).limit(1).maybeSingle();
      const version = (prev?.version || 0) + 1;

      const ext = file.name.split(".").pop() || "bin";
      const path = `${uid}/${evaluacion_id}/v${version}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("sem-entregas").upload(path, file, { upsert: false, contentType: file.type });
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
        version,
      };
      const { data, error } = await sb.from("sem_entregas").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mi-curso"] }),
  });
}

// Marcar anuncio como leído
export function useMarcarAnuncioLeido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ anuncio_id, persona_id }: { anuncio_id: string; persona_id: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) throw new Error("Sesión requerida");
      const { data, error } = await sb.from("sem_anuncios_lecturas")
        .upsert({ anuncio_id, persona_id, user_id: uid }, { onConflict: "anuncio_id,persona_id" })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mi-curso"] }),
  });
}

// Signed URL helper (preview/descarga de recursos privados)
export function useSignedUrl() {
  return useMutation({
    mutationFn: async ({ bucket, path, expiresIn = 3600 }: { bucket: string; path: string; expiresIn?: number }) => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
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

export function useToggleForoCerrado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cerrado }: { id: string; cerrado: boolean }) => {
      const { error } = await sb.from("sem_foros").update({ cerrado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sem-foros"] }),
  });
}

// Mensajes paginados + búsqueda
export function useForoMensajes(foroId?: string, opts?: { page?: number; pageSize?: number; search?: string }) {
  const page = opts?.page ?? 0;
  const pageSize = opts?.pageSize ?? 20;
  const search = opts?.search?.trim() || "";
  return useQuery({
    queryKey: ["sem-foro-mensajes", foroId, page, pageSize, search],
    enabled: !!foroId,
    queryFn: async () => {
      let q = sb.from("sem_foro_mensajes")
        .select("*", { count: "exact" })
        .eq("foro_id", foroId)
        .order("created_at", { ascending: true });
      if (search) q = q.ilike("mensaje", `%${search}%`);
      q = q.range(page * pageSize, page * pageSize + pageSize - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { items: data || [], total: count || 0, page, pageSize };
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
