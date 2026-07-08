import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

export default defineTool({
  name: "search_personas",
  title: "Buscar personas",
  description:
    "Busca personas en CMG Admin por nombre, documento o teléfono. Respeta los permisos (RLS) del usuario autenticado.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Texto a buscar (nombre, documento o teléfono)."),
    limit: z.number().int().min(1).max(50).default(20).describe("Máximo de resultados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const like = `%${query}%`;
    const { data, error } = await sb
      .from("personas")
      .select("id, nombres, apellidos, documento, telefono, correo, sede, tipo_persona")
      .or(
        `nombres.ilike.${like},apellidos.ilike.${like},documento.ilike.${like},telefono.ilike.${like}`
      )
      .limit(limit);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { results: data ?? [] },
    };
  },
});
