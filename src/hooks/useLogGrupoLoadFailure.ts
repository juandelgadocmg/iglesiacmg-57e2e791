import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GrupoLoadSection =
  | "detalle" | "miembros" | "estadisticas" | "reportes" | "mapa" | "planificaciones";

/**
 * Registra en `security_audit_log` (vía RPC `log_grupo_load_failure`) los
 * intentos fallidos de cargar el detalle de un grupo o alguna de sus
 * sub-secciones. Se desduplica por (grupoId, section, mensaje) mientras el
 * componente está montado para no inundar la bitácora.
 */
export function useLogGrupoLoadFailure(
  grupoId: string | null | undefined,
  section: GrupoLoadSection,
  isError: boolean,
  error?: unknown,
) {
  const lastKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isError || !grupoId) return;
    const msg = error instanceof Error ? error.message : typeof error === "string" ? error : "unknown";
    const key = `${grupoId}::${section}::${msg}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    // Fire-and-forget; nunca romper la UI por fallos de auditoría.
    (supabase as any).rpc("log_grupo_load_failure", {
      _grupo_id: grupoId,
      _section: section,
      _error: msg,
    }).then?.(() => {}, () => {});
  }, [isError, grupoId, section, error]);
}
