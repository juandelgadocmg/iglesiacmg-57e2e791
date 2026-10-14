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

const CANONICAL_SEQUENCE = [
  "llamada de consolidación 1",
  "mensaje 1",
  "llamada de consolidación 2",
  "mensaje 2",
  "llamada de consolidación 3",
  "mensaje 3",
  "mensaje 4",
  "mensaje 5",
  "mensaje 6",
  "visita",
  "consejería",
  "fiesta de bienvenida",
  "nací para triunfar día 1",
  "semana de poder 1",
  "semana de poder 2",
  "semana de poder 3",
  "una nueva vida y un nuevo comienzo",
  "retiro de sanidad interior y liberación",
  "bautismo",
  "discipulado de nuevos creyentes",
  "escuela de evangelismo sobrenatural",
  "escuela de líderes de casa de paz",
  "retiro de líderes de casas de paz",
  "escuela de mentores",
  "retiro de mentores",
  "escuela del ministerio quíntuple",
];

function getCanonicalOrder(nombre: string, fallbackOrden: number): number {
  const normName = String(nombre || "").toLowerCase().trim();
  const idx = CANONICAL_SEQUENCE.findIndex((seq) => normName.includes(seq) || seq.includes(normName));
  if (idx !== -1) return (idx + 1) * 10;
  return fallbackOrden * 10;
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
      let list = data || [];

      // Auto inserción si faltan Semana de Poder 2 o 3
      const hasSdp1 = list.some((p) => p.nombre.toLowerCase().includes("semana de poder 1") || p.nombre.toLowerCase().includes("semana poder 1"));
      const hasSdp2 = list.some((p) => p.nombre.toLowerCase().includes("semana de poder 2") || p.nombre.toLowerCase().includes("semana poder 2"));
      const hasSdp3 = list.some((p) => p.nombre.toLowerCase().includes("semana de poder 3") || p.nombre.toLowerCase().includes("semana poder 3"));

      if (hasSdp1 && (!hasSdp2 || !hasSdp3)) {
        try {
          const sdp1Obj = list.find((p) => p.nombre.toLowerCase().includes("semana de poder 1"));
          const baseOrden = sdp1Obj ? sdp1Obj.orden : 15;

          const toInsert: any[] = [];
          if (!hasSdp2) toInsert.push({ nombre: "Semana de Poder 2", orden: baseOrden + 1 });
          if (!hasSdp3) toInsert.push({ nombre: "Semana de Poder 3", orden: baseOrden + 2 });

          if (toInsert.length > 0) {
            const { data: inserted } = await supabase
              .from("procesos_crecimiento")
              .insert(toInsert)
              .select("*");

            if (inserted && inserted.length > 0) {
              list = [...list, ...inserted];
            }
          }
        } catch (e) {
          console.warn("Auto-insert Semana de Poder 2/3 error:", e);
        }
      }

      // Si no están guardados en BD aún, inyectarlos sintéticamente
      const finalHasSdp2 = list.some((p) => p.nombre.toLowerCase().includes("semana de poder 2") || p.nombre.toLowerCase().includes("semana poder 2"));
      const finalHasSdp3 = list.some((p) => p.nombre.toLowerCase().includes("semana de poder 3") || p.nombre.toLowerCase().includes("semana poder 3"));

      if (!finalHasSdp2 || !finalHasSdp3) {
        const sdp1Idx = list.findIndex((p) => p.nombre.toLowerCase().includes("semana de poder 1"));
        if (sdp1Idx !== -1) {
          const sdp1Item = list[sdp1Idx];
          const newItems: any[] = [];
          if (!finalHasSdp2) newItems.push({ id: `synthetic_sdp2`, nombre: "Semana de Poder 2", orden: sdp1Item.orden + 0.1 });
          if (!finalHasSdp3) newItems.push({ id: `synthetic_sdp3`, nombre: "Semana de Poder 3", orden: sdp1Item.orden + 0.2 });

          list.splice(sdp1Idx + 1, 0, ...newItems);
        }
      }

      // Ordenar canónicamente: Semana de Poder 1 -> Semana de Poder 2 -> Semana de Poder 3 -> Una Nueva Vida...
      list.sort((a, b) => getCanonicalOrder(a.nombre, a.orden) - getCanonicalOrder(b.nombre, b.orden));

      return list;
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

