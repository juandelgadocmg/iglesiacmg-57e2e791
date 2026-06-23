import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEYS = {
  ministerios: ["prog_ministerios"],
  cargos: ["prog_cargos"],
  servidores: ["prog_servidores"],
  eventos: ["prog_eventos"],
  asignaciones: ["prog_asignaciones"],
  disponibilidad: ["prog_disponibilidad"],
  audit: ["prog_audit_log"],
  reemplazos: ["prog_reemplazos"],
};

export type ProgAuditEntry = { id: string; evento_id: string | null; asignacion_id: string | null; actor_user_id: string | null; actor_nombre: string | null; action: string; details: any; created_at: string };
export type ProgReemplazo = { id: string; asignacion_id: string; evento_id: string; ministerio_id: string | null; cargo_id: string | null; persona_solicita_id: string; persona_reemplazo_id: string | null; motivo: string | null; estado: string; aprobado_por: string | null; aprobado_at: string | null; notas_aprobacion: string | null; created_at: string };

export type ProgMinisterio = { id: string; nombre: string; descripcion: string | null; color: string | null; icono: string | null; lider_persona_id: string | null; activo: boolean };
export type ProgCargo = { id: string; ministerio_id: string; nombre: string; orden: number; cupo: number; activo: boolean };
export type ProgServidor = { id: string; ministerio_id: string; persona_id: string; cargo_id: string | null; es_lider: boolean; activo: boolean; notas: string | null };
export type ProgEvento = { id: string; titulo: string; tipo: string; fecha: string; hora: string | null; lugar: string | null; descripcion: string | null; servicio_id: string | null; estado: string; publicado_at: string | null; bloqueo_at: string | null; reminder_24h_sent_at?: string | null; reminder_2h_sent_at?: string | null };
export type ProgAsignacion = { id: string; evento_id: string; ministerio_id: string; cargo_id: string | null; persona_id: string; estado: string; asistencia: string | null; notas: string | null; confirmado_at: string | null; asistencia_at: string | null };
export type ProgDisponibilidad = { id: string; persona_id: string; fecha_inicio: string; fecha_fin: string; motivo: string; notas: string | null };

function useList<T>(table: string, key: string[], orderBy = "created_at", asc = false) {
  return useQuery<T[]>({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from(table as any).select("*").order(orderBy, { ascending: asc });
      if (error) throw error;
      return (data || []) as T[];
    },
  });
}

export const useProgMinisterios = () => useList<ProgMinisterio>("prog_ministerios", KEYS.ministerios, "nombre", true);
export const useProgCargos = () => useList<ProgCargo>("prog_cargos", KEYS.cargos, "orden", true);
export const useProgServidores = () => useList<ProgServidor>("prog_servidores", KEYS.servidores);
export const useProgEventos = () => useList<ProgEvento>("prog_eventos", KEYS.eventos, "fecha", false);
export const useProgAsignaciones = () => useList<ProgAsignacion>("prog_asignaciones", KEYS.asignaciones);
export const useProgDisponibilidad = () => useList<ProgDisponibilidad>("prog_disponibilidad", KEYS.disponibilidad);

function useUpsert<T>(table: string, invalidate: string[][]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await supabase.from(table as any).update(row).eq("id", row.id).select().single()
        : await supabase.from(table as any).insert(row).select().single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  });
}
function useDelete(table: string, invalidate: string[][]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  });
}

export const useUpsertMinisterio = () => useUpsert("prog_ministerios", [KEYS.ministerios]);
export const useDeleteMinisterio = () => useDelete("prog_ministerios", [KEYS.ministerios, KEYS.cargos, KEYS.servidores]);
export const useUpsertCargo = () => useUpsert("prog_cargos", [KEYS.cargos]);
export const useDeleteCargo = () => useDelete("prog_cargos", [KEYS.cargos]);
export const useUpsertServidor = () => useUpsert("prog_servidores", [KEYS.servidores]);
export const useDeleteServidor = () => useDelete("prog_servidores", [KEYS.servidores]);
export const useUpsertEvento = () => useUpsert("prog_eventos", [KEYS.eventos]);
export const useDeleteEvento = () => useDelete("prog_eventos", [KEYS.eventos, KEYS.asignaciones]);
export const useUpsertAsignacion = () => useUpsert("prog_asignaciones", [KEYS.asignaciones]);
export const useDeleteAsignacion = () => useDelete("prog_asignaciones", [KEYS.asignaciones]);
export const useUpsertDisponibilidad = () => useUpsert("prog_disponibilidad", [KEYS.disponibilidad]);
export const useDeleteDisponibilidad = () => useDelete("prog_disponibilidad", [KEYS.disponibilidad]);

// ============ Audit log ============
export function useProgAuditByEvento(eventoId: string | null) {
  return useQuery<ProgAuditEntry[]>({
    queryKey: [...KEYS.audit, eventoId],
    enabled: !!eventoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("prog_audit_log" as any).select("*").eq("evento_id", eventoId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any;
    },
  });
}

export async function logProgAction(params: { evento_id?: string | null; asignacion_id?: string | null; action: string; details?: any }) {
  const { data: { user } } = await supabase.auth.getUser();
  let actor_nombre: string | null = null;
  if (user) {
    const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
    actor_nombre = prof?.display_name || user.email || null;
  }
  await supabase.from("prog_audit_log" as any).insert({
    evento_id: params.evento_id || null,
    asignacion_id: params.asignacion_id || null,
    actor_user_id: user?.id || null,
    actor_nombre,
    action: params.action,
    details: params.details || {},
  });
}

// ============ Reemplazos ============
export const useProgReemplazos = () => useList<ProgReemplazo>("prog_reemplazos", KEYS.reemplazos);
export const useUpsertReemplazo = () => useUpsert<ProgReemplazo>("prog_reemplazos", [KEYS.reemplazos, KEYS.asignaciones]);
export const useDeleteReemplazo = () => useDelete("prog_reemplazos", [KEYS.reemplazos]);

/** Bloqueo: si bloqueo_at definido y ya pasó, true. Si no hay bloqueo_at, default a 1h después de la hora del evento. */
export function isEventoBloqueado(ev: ProgEvento | null | undefined): boolean {
  if (!ev) return false;
  let limit: Date | null = null;
  if (ev.bloqueo_at) limit = new Date(ev.bloqueo_at);
  else {
    const horaClean = (ev.hora || "").replace(/[^0-9:]/g, "");
    const t = horaClean || "09:00";
    const d = new Date(`${ev.fecha}T${t.length === 5 ? t : "09:00"}:00`);
    d.setHours(d.getHours() + 2);
    limit = d;
  }
  return new Date() > limit;
}

/** Asignaciones por persona en rango — usado para sugerir rotación. */
export function useAsignacionesPorPersona() {
  const { data: asignaciones } = useProgAsignaciones();
  const { data: eventos } = useProgEventos();
  const eventosMap = new Map((eventos || []).map((e) => [e.id, e]));
  const byPersona = new Map<string, { total: number; lastFecha: string | null }>();
  (asignaciones || []).forEach((a) => {
    const ev = eventosMap.get(a.evento_id);
    if (!ev) return;
    const cur = byPersona.get(a.persona_id) || { total: 0, lastFecha: null };
    cur.total += 1;
    if (!cur.lastFecha || ev.fecha > cur.lastFecha) cur.lastFecha = ev.fecha;
    byPersona.set(a.persona_id, cur);
  });
  return byPersona;
}
