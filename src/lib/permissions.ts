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
 *  8. consolidador          → personas (create/edit growth only)
 *  9. lider_intercesion     → peticiones (view/respond)
 * 10. lider_red             → personas (own network), reportes grupos
 * 11. lider_casa_paz        → reportes grupos (create only)
 * 12. consulta              → read-only dashboard
 */
export const ROUTE_PERMISSIONS: Record<string, AppRole[]> = {
  "/hoy": [],
  "/dashboard": [],
  "/personas": ["admin", "super_admin", "pastor", "lider", "secretaria", "consolidador_lider", "consolidador"],
  "/grupos": ["admin", "super_admin", "pastor", "lider", "lider_red", "lider_casa_paz"],
  "/servicios": ["admin", "super_admin", "pastor", "lider", "lider_red", "secretaria"],
  "/finanzas": ["admin", "super_admin", "tesoreria"],
  "/eventos": ["admin", "super_admin", "pastor", "lider", "secretaria"],
  "/academia": ["admin", "super_admin", "pastor", "maestro"],
  "/afirmacion": ["admin", "super_admin", "pastor", "lider", "consolidador", "consolidador_lider"],
  "/discipulado": [],
  "/consolidacion": ["admin", "super_admin", "pastor", "lider", "consolidador", "consolidador_lider"],
  "/seminario": ["admin", "super_admin", "pastor", "maestro", "seminario_admin", "seminario_docente", "seminario_estudiante"],
  "/mensajes": [],
  "/certificados": ["admin", "super_admin", "pastor", "maestro"],
  "/reportes": ["admin", "super_admin", "pastor", "tesoreria"],
  "/peticiones": ["admin", "super_admin", "pastor", "lider", "secretaria", "consolidador_lider", "lider_intercesion"],
  "/usuarios": ["admin", "super_admin"],
  "/configuracion": ["admin", "super_admin"],
  "/seguridad": ["admin", "super_admin", "pastor", "lider_red"],
  "/donaciones": ["admin", "super_admin", "tesoreria"],
  "/reportes-grupos": ["admin", "super_admin", "pastor", "lider", "lider_red", "lider_casa_paz"],
  "/casas-de-paz": [],
  "/infantil": ["admin", "super_admin", "pastor", "lider", "maestro", "coordinador_infantil" as any, "recepcion_infantil" as any],
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
  | "seminario:reportes"
  | "programa:manage"
  | "programa:assign"
  | "programa:confirm:pastor"
  | "programa:confirm:lider"
  | "programa:confirm:servidor"
  | "programa:confirm:colaborador"
  | "share:link"
  | "share:qr_download"
  | "share:view_audit";

export const ACTION_PERMISSIONS: Record<ActionPermission, AppRole[]> = {
  "personas:create": ["admin", "super_admin", "pastor", "lider", "lider_red", "lider_casa_paz", "secretaria", "consolidador_lider", "consolidador", "maestro", "tesoreria"],
  "personas:edit":   ["admin", "super_admin", "pastor", "lider", "lider_red", "lider_casa_paz", "secretaria", "consolidador_lider", "consolidador", "maestro", "tesoreria"],
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
  // Programación: control granular por cargo. Cada cargo solo puede ver/confirmar lo que le corresponde.
  "programa:manage":              ["admin", "super_admin", "pastor", "lider"],
  "programa:assign":              ["admin", "super_admin", "pastor", "lider"],
  "programa:confirm:pastor":      ["admin", "super_admin", "pastor"],
  "programa:confirm:lider":       ["admin", "super_admin", "pastor", "lider"],
  "programa:confirm:servidor":    ["admin", "super_admin", "pastor", "lider", "secretaria"],
  "programa:confirm:colaborador": ["admin", "super_admin", "pastor", "lider", "secretaria"],
  // Sharing / auditing capabilities for deep-link + QR flows
  "share:link":        ["admin", "super_admin", "pastor", "lider", "lider_red", "secretaria", "maestro", "consolidador_lider", "consolidador", "tesoreria", "seminario_admin", "seminario_docente"],
  "share:qr_download": ["admin", "super_admin", "pastor", "lider", "lider_red", "secretaria", "maestro", "consolidador_lider", "tesoreria", "seminario_admin"],
  "share:view_audit":  ["admin", "super_admin", "pastor", "lider_red"],
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

/**
 * canPerform with DB overrides. If an override exists for the (role, action) pair,
 * it wins over the hardcoded default. Admins/super_admins always bypass.
 */
export function canPerformWithOverrides(
  userRoles: AppRole[],
  action: ActionPermission,
  overrides?: Partial<Record<AppRole, boolean>>,
): boolean {
  if (userRoles.includes("admin") || userRoles.includes("super_admin")) return true;
  const defaults = ACTION_PERMISSIONS[action] ?? [];
  return userRoles.some((role) => {
    const override = overrides?.[role];
    if (typeof override === "boolean") return override;
    return defaults.includes(role);
  });
}

/** All app roles, exposed for admin UIs (matrix, filters). */
export const ALL_ROLES: AppRole[] = [
  "super_admin", "admin", "pastor", "lider", "secretaria", "tesoreria",
  "maestro", "consolidador_lider", "consolidador", "lider_intercesion",
  "lider_red", "lider_casa_paz", "seminario_admin", "seminario_docente",
  "seminario_estudiante", "consulta",
];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  pastor: "Pastor",
  lider: "Líder",
  secretaria: "Secretaría",
  tesoreria: "Tesorería",
  maestro: "Maestro",
  consolidador_lider: "Consolidador Líder",
  consolidador: "Consolidador",
  lider_intercesion: "Líder Intercesión",
  lider_red: "Líder de Red",
  lider_casa_paz: "Líder Casa de Paz",
  seminario_admin: "Seminario Admin",
  seminario_docente: "Docente Seminario",
  seminario_estudiante: "Estudiante Seminario",
  consulta: "Consulta",
};

/** Grouped action catalog for the admin permissions matrix. */
export const ACTION_GROUPS: { module: string; actions: { key: ActionPermission; label: string }[] }[] = [
  {
    module: "Personas",
    actions: [
      { key: "personas:create", label: "Crear personas" },
      { key: "personas:edit",   label: "Editar personas" },
      { key: "personas:delete", label: "Eliminar personas" },
    ],
  },
  {
    module: "Grupos",
    actions: [
      { key: "grupos:create", label: "Crear grupos" },
      { key: "grupos:edit",   label: "Editar grupos" },
      { key: "grupos:delete", label: "Eliminar grupos" },
    ],
  },
  {
    module: "Reportes de grupos",
    actions: [
      { key: "reportes_grupos:create", label: "Crear reporte" },
      { key: "reportes_grupos:edit",   label: "Editar reporte" },
      { key: "tesoreria_cdp:manage",   label: "Gestionar Tesorería CDP" },
    ],
  },
  {
    module: "Peticiones",
    actions: [
      { key: "peticiones:view",    label: "Ver peticiones" },
      { key: "peticiones:create",  label: "Crear peticiones" },
      { key: "peticiones:edit",    label: "Editar peticiones" },
      { key: "peticiones:respond", label: "Responder / cerrar" },
    ],
  },
  {
    module: "Seminario",
    actions: [
      { key: "seminario:matricular",        label: "Matricular" },
      { key: "seminario:certificar",        label: "Emitir certificados" },
      { key: "seminario:zoom",              label: "Zoom / clases en vivo" },
      { key: "seminario:evaluacion_crud",   label: "Gestionar evaluaciones" },
      { key: "seminario:calificacion_edit", label: "Editar calificaciones" },
      { key: "seminario:asistencia_edit",   label: "Editar asistencia" },
      { key: "seminario:biblioteca_crud",   label: "Biblioteca / recursos" },
      { key: "seminario:anuncios_crud",     label: "Anuncios" },
      { key: "seminario:reportes",          label: "Reportes académicos" },
    ],
  },
  {
    module: "Programación de Reunión",
    actions: [
      { key: "programa:manage",              label: "Administrar programación" },
      { key: "programa:assign",              label: "Asignar servidores" },
      { key: "programa:confirm:pastor",      label: "Confirmar (pastor)" },
      { key: "programa:confirm:lider",       label: "Confirmar (líder)" },
      { key: "programa:confirm:servidor",    label: "Confirmar (servidor)" },
      { key: "programa:confirm:colaborador", label: "Confirmar (colaborador)" },
    ],
  },
];

