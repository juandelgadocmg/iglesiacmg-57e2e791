import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchPersonas from "./tools/search-personas";
import listEventos from "./tools/list-eventos";
import whoami from "./tools/whoami";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "cmg-admin-mcp",
  title: "CMG Admin MCP",
  version: "0.1.0",
  instructions:
    "Herramientas de solo lectura para CMG Admin (Iglesia Cristiana CMG). Usa `whoami` para verificar la conexión, `search_personas` para buscar personas y `list_upcoming_eventos` para ver los próximos eventos. Todas las herramientas respetan los permisos (RLS) del usuario autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, searchPersonas, listEventos],
});
