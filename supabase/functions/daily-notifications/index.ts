import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Verify caller is admin or super_admin
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isAdmin = (callerRoles || []).some(
      (r: any) => r.role === "admin" || r.role === "super_admin"
    );
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Acceso denegado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();

    // Get upcoming events (next 3 days)
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const { data: upcomingEvents } = await supabase
      .from("eventos")
      .select("nombre, fecha_inicio, lugar")
      .gte("fecha_inicio", today)
      .lte("fecha_inicio", threeDaysLater.toISOString().split("T")[0]);

    // Get birthdays today
    const { data: allPersonas } = await supabase
      .from("personas")
      .select("nombres, apellidos, fecha_nacimiento");

    const birthdaysToday = (allPersonas || []).filter((p) => {
      if (!p.fecha_nacimiento) return false;
      const bday = new Date(p.fecha_nacimiento);
      return bday.getMonth() + 1 === todayMonth && bday.getDate() === todayDay;
    });

    // CDP en mora — leer días configurados
    const { data: cfg } = await supabase
      .from("configuracion_iglesia")
      .select("tesoreria_cdp_dias_mora")
      .limit(1)
      .single();
    const diasMoraCfg = Number((cfg as any)?.tesoreria_cdp_dias_mora ?? 7);

    const limiteMora = new Date(now);
    limiteMora.setDate(limiteMora.getDate() - diasMoraCfg);
    const limiteMoraStr = limiteMora.toISOString().split("T")[0];

    const { data: reportesCDP } = await supabase
      .from("reportes_grupos")
      .select("id, grupo_id, fecha, ofrenda_casa_paz, grupos(nombre, red)")
      .gt("ofrenda_casa_paz", 0)
      .lte("fecha", limiteMoraStr);

    const { data: registrosCDP } = await supabase
      .from("tesoreria_ofrendas_cdp")
      .select("grupo_id, semana_inicio, valor_entregado, consignacion_completada");

    // Agrupar reportes por grupo+semana (lunes)
    const startOfWeekMonday = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      date.setDate(date.getDate() + diff);
      return date.toISOString().split("T")[0];
    };

    const agrupados: Record<string, { grupo: string; semana: string; reportado: number }> = {};
    (reportesCDP || []).forEach((r: any) => {
      const semana = startOfWeekMonday(new Date(r.fecha + "T00:00:00"));
      const key = `${r.grupo_id}__${semana}`;
      if (!agrupados[key]) {
        agrupados[key] = {
          grupo: r.grupos?.nombre || "—",
          semana,
          reportado: 0,
        };
      }
      agrupados[key].reportado += Number(r.ofrenda_casa_paz) || 0;
    });

    let cdpEnMora = 0;
    Object.entries(agrupados).forEach(([key, v]) => {
      const [grupoId, semanaInicio] = key.split("__");
      const reg = (registrosCDP || []).find(
        (x: any) => x.grupo_id === grupoId && x.semana_inicio === semanaInicio
      );
      if ((reg as any)?.consignacion_completada) return;
      const entregado = Number(reg?.valor_entregado || 0);
      if (entregado < v.reportado) cdpEnMora++;
    });

    // Build notification content
    const notifications: string[] = [];

    if (birthdaysToday.length > 0) {
      notifications.push("🎂 CUMPLEAÑOS DE HOY:");
      birthdaysToday.forEach((p) => {
        notifications.push(`  • ${p.nombres} ${p.apellidos}`);
      });
    }

    if ((upcomingEvents || []).length > 0) {
      notifications.push("\n📅 EVENTOS PRÓXIMOS (3 días):");
      (upcomingEvents || []).forEach((e) => {
        notifications.push(
          `  • ${e.nombre} — ${e.fecha_inicio} ${e.lugar ? `(${e.lugar})` : ""}`
        );
      });
    }

    if (cdpEnMora > 0) {
      notifications.push(
        `\n⏱ TESORERÍA CDP — MORA:\n  • ${cdpEnMora} ${cdpEnMora === 1 ? "Casa de Paz lleva" : "Casas de Paz llevan"} más de ${diasMoraCfg} días sin registrar consignación.`
      );
    }

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No notifications to send today" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store notifications summary for in-app reference
    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          birthdaysToday: birthdaysToday.length,
          upcomingEvents: (upcomingEvents || []).length,
          cdpEnMora,
          content: notifications.join("\n"),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in daily-notifications:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
