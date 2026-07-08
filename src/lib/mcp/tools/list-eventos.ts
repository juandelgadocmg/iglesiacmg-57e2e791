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
  name: "list_upcoming_eventos",
  title: "Listar próximos eventos",
  description:
    "Lista los próximos eventos de la iglesia CMG a partir de hoy. Respeta los permisos (RLS) del usuario autenticado.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10).describe("Máximo de eventos."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb
      .from("eventos")
      .select("id, nombre, fecha_inicio, fecha_fin, lugar, sede, estado, tipo")
      .gte("fecha_inicio", today)
      .order("fecha_inicio", { ascending: true })
      .limit(limit);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { eventos: data ?? [] },
    };
  },
});
