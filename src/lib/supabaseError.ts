// Utilidad para transformar errores de Supabase/Postgres en mensajes claros
// y accionables para el usuario final (en español).

type MaybeError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
} | null | undefined;

export function formatSupabaseError(err: MaybeError, fallback = "Ocurrió un error inesperado."): string {
  if (!err) return fallback;
  const msg = (err.message || "").trim();
  const code = err.code || "";
  const details = (err.details || "").toString().trim();
  const hint = (err.hint || "").toString().trim();

  // RLS / permisos
  if (code === "42501" || /row-level security|violates row-level security policy|permission denied/i.test(msg)) {
    return "No tienes permisos para realizar esta acción. Verifica tu rol o contacta a un administrador.";
  }
  // Sesión expirada
  if (code === "PGRST301" || /jwt|expired|not authenticated/i.test(msg)) {
    return "Tu sesión expiró. Inicia sesión nuevamente para continuar.";
  }
  // Duplicados
  if (code === "23505" || /duplicate key|already exists|Ya existe/i.test(msg)) {
    if (/reporte para este grupo/i.test(msg)) return "Ya existe un reporte para este grupo en esta fecha.";
    return "Ya existe un registro con estos datos. Verifica antes de continuar.";
  }
  // FK
  if (code === "23503") {
    return "No se puede guardar: hay una referencia a un dato que no existe o fue eliminado.";
  }
  // NOT NULL
  if (code === "23502") {
    return "Falta información obligatoria. Revisa los campos requeridos.";
  }
  // Check constraint
  if (code === "23514") {
    return `El servidor rechazó los datos por una regla de validación${hint ? `: ${hint}` : "."}`;
  }
  // Red / offline
  if (/failed to fetch|network|offline/i.test(msg)) {
    return "Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.";
  }

  const parts = [msg || fallback, details, hint].filter(Boolean);
  return parts.join(" · ");
}
