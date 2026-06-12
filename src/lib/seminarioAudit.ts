import { supabase } from "@/integrations/supabase/client";

export type SemAuditAction =
  | "certificado.generado"
  | "certificado.lote"
  | "kardex.descargado"
  | "zoom.regenerado"
  | "inscripcion.creada"
  | "inscripcion.eliminada"
  | "matricula.creada"
  | "matricula.eliminada"
  | "matricula.actualizada"
  | "evaluacion.creada"
  | "evaluacion.editada"
  | "evaluacion.eliminada"
  | "calificacion.guardada"
  | "asistencia.guardada";

interface AuditPayload {
  action: SemAuditAction;
  persona_id?: string | null;
  inscripcion_id?: string | null;
  oferta_id?: string | null;
  materia_id?: string | null;
  details?: Record<string, unknown>;
}

export async function logSemAudit(p: AuditPayload) {
  try {
    const { data: u } = await supabase.auth.getUser();
    const user = u?.user;
    if (!user) return;
    await (supabase as any).from("sem_audit_log").insert({
      action: p.action,
      actor_user_id: user.id,
      actor_email: user.email,
      persona_id: p.persona_id ?? null,
      inscripcion_id: p.inscripcion_id ?? null,
      oferta_id: p.oferta_id ?? null,
      materia_id: p.materia_id ?? null,
      details: p.details ?? {},
    });
  } catch (e) {
    // No interrumpir la UI por fallos de logging
    console.warn("[sem_audit_log] no se pudo registrar", e);
  }
}
