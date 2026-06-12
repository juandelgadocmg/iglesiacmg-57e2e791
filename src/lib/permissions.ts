import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * Route-level permissions map.
 * Empty array = accessible to all authenticated users.
 * Roles listed = at least one required.
 *
 * Document mapping:
 *  1. admin / super_admin  → full access
 *  2. pastor                → nearly full access
 *  3. maestro               → academia + certificados
 *  4. secretaria            → personas, servicios, eventos, peticiones
 *  5. tesoreria             → finanzas, donaciones, reportes
 *  6. lider                 → personas, grupos, servicios, eventos
 *  7. consolidador_lider    → personas (no delete), peticiones
 *  8. consolidador          → personas (edit growth only)
 *  9. lider_intercesion     → peticiones (view/respond)
 * 10. lider_red             → personas (own network), reportes grupos
 * 11. lider_casa_paz        → reportes grupos (create only)
 * 12. consulta              → read-only dashboard
 */
export const ROUTE_PERMISSIONS: Record<string, AppRole[]> = {
  "/dashboard": [],
  "/personas": ["admin", "super_admin", "pastor", "lider", "secretaria", "consolidador_lider", "consolidador"],
  "/grupos": ["admin", "super_admin", "pastor", "lider", "lider_red", "lider_casa_paz"],
  "/servicios": ["admin", "super_admin", "pastor", "lider", "secretaria"],
  "/finanzas": ["admin", "super_admin", "tesoreria"],
  "/eventos": ["admin", "super_admin", "pastor", "lider", "secretaria"],
  "/academia": ["admin", "super_admin", "pastor", "maestro"],
  "/seminario": ["admin", "super_admin", "pastor", "maestro", "seminario_admin", "seminario_docente", "seminario_estudiante"],
  "/certificados": ["admin", "super_admin", "pastor", "maestro"],
  "/reportes": ["admin", "super_admin", "pastor", "tesoreria"],
  "/peticiones": ["admin", "super_admin", "pastor", "lider", "secretaria", "consolidador_lider", "lider_intercesion"],
  "/usuarios": ["admin", "super_admin"],
  "/configuracion": ["admin", "super_admin"],
  "/donaciones": ["admin", "super_admin", "tesoreria"],
  "/reportes-grupos": ["admin", "super_admin", "pastor", "lider", "lider_red", "lider_casa_paz"],
};

/**
 * Fine-grained action permissions.
 * Used by components to show/hide specific buttons.
 *
 * lider_red     → solo lectura en personas y grupos; puede crear reportes de su red
 * lider_casa_paz → solo lectura en personas; solo puede crear reporte de su CDP
 */
export type ActionPermission =
  | "personas:create"
  | "personas:edit"
  | "personas:delete"
  | "grupos:create"
  | "grupos:edit"
  | "grupos:delete"
  | "peticiones:create"
  | "peticiones:edit"
  | "peticiones:view"
  | "peticiones:respond"
  | "reportes_grupos:create"
  | "reportes_grupos:edit"
  | "tesoreria_cdp:manage"
  | "seminario:matricular"
  | "seminario:certificar"
  | "seminario:zoom"
  | "seminario:evaluacion_crud"
  | "seminario:calificacion_edit"
  | "seminario:asistencia_edit"
  | "seminario:biblioteca_crud"
  | "seminario:anuncios_crud"
  | "seminario:reportes";

const ACTION_PERMISSIONS: Record<ActionPermission, AppRole[]> = {
  "personas:create": ["admin", "super_admin", "pastor", "lider", "secretaria", "consolidador_lider"],
  "personas:edit":   ["admin", "super_admin", "pastor", "lider", "secretaria", "consolidador_lider", "consolidador"],
  "personas:delete": ["admin", "super_admin", "pastor"],
  "grupos:create":   ["admin", "super_admin", "pastor", "lider"],
  "grupos:edit":     ["admin", "super_admin", "pastor", "lider"],
  "grupos:delete":   ["admin", "super_admin", "pastor"],
  "peticiones:create":  ["admin", "super_admin", "pastor", "lider", "secretaria", "consolidador_lider"],
  "peticiones:edit":    ["admin", "super_admin", "pastor", "lider", "secretaria", "consolidador_lider"],
  "peticiones:view":    ["admin", "super_admin", "pastor", "lider", "secretaria", "consolidador_lider", "lider_intercesion"],
  "peticiones:respond": ["admin", "super_admin", "pastor", "lider_intercesion"],
  "reportes_grupos:create": ["admin", "super_admin", "pastor", "lider", "lider_red", "lider_casa_paz"],
  "reportes_grupos:edit":   ["admin", "super_admin", "pastor", "lider", "lider_red"],
  "tesoreria_cdp:manage":   ["admin", "super_admin", "pastor", "tesoreria"],
  "seminario:matricular":          ["admin", "super_admin", "pastor", "maestro", "seminario_admin"],
  "seminario:certificar":          ["admin", "super_admin", "pastor", "seminario_admin"],
  "seminario:zoom":                ["admin", "super_admin", "pastor", "maestro", "seminario_admin", "seminario_docente"],
  "seminario:evaluacion_crud":     ["admin", "super_admin", "pastor", "maestro", "seminario_admin", "seminario_docente"],
  "seminario:calificacion_edit":   ["admin", "super_admin", "pastor", "maestro", "seminario_admin", "seminario_docente"],
  "seminario:asistencia_edit":     ["admin", "super_admin", "pastor", "maestro", "seminario_admin", "seminario_docente"],
  "seminario:biblioteca_crud":     ["admin", "super_admin", "pastor", "maestro", "seminario_admin", "seminario_docente"],
  "seminario:anuncios_crud":       ["admin", "super_admin", "pastor", "maestro", "seminario_admin", "seminario_docente"],
  "seminario:reportes":            ["admin", "super_admin", "pastor", "seminario_admin"],
};

export function canAccess(userRoles: AppRole[], path: string): boolean {
  const allowed = ROUTE_PERMISSIONS[path];
  if (!allowed || allowed.length === 0) return true;
  return userRoles.some((role) => allowed.includes(role));
}

export function canPerform(userRoles: AppRole[], action: ActionPermission): boolean {
  const allowed = ACTION_PERMISSIONS[action];
  if (!allowed || allowed.length === 0) return true;
  return userRoles.some((role) => allowed.includes(role));
}
