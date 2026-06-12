// Valida las credenciales de Zoom Server-to-Server OAuth solicitando un access token.
// No expone los secretos al cliente; solo devuelve estado, masked account id y user host.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function mask(v: string | undefined | null): string | null {
  if (!v) return null;
  if (v.length <= 6) return "***";
  return `${v.slice(0, 3)}…${v.slice(-3)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    // Verifica sesión del usuario
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: uerr } = await userClient.auth.getUser();
    if (uerr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "no-auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica rol staff Seminario
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isStaff } = await admin.rpc("sem_is_staff", { _uid: userData.user.id });
    if (!isStaff) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountId = Deno.env.get("ZOOM_ACCOUNT_ID");
    const clientId = Deno.env.get("ZOOM_CLIENT_ID");
    const clientSecret = Deno.env.get("ZOOM_CLIENT_SECRET");

    if (!accountId || !clientId || !clientSecret) {
      const missing = [
        !accountId && "ZOOM_ACCOUNT_ID",
        !clientId && "ZOOM_CLIENT_ID",
        !clientSecret && "ZOOM_CLIENT_SECRET",
      ].filter(Boolean);
      const msg = `Faltan secretos: ${missing.join(", ")}`;
      await admin.from("sem_zoom_config").update({
        last_validation_status: "error",
        last_validation_at: new Date().toISOString(),
        last_validation_message: msg,
        validated_by: userData.user.id,
      }).eq("singleton", true);
      return new Response(JSON.stringify({ ok: false, error: "missing-secrets", missing, message: msg }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pide access token a Zoom (Server-to-Server OAuth)
    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`;
    const basic = btoa(`${clientId}:${clientSecret}`);
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    });
    const tokenJson: any = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok || !tokenJson.access_token) {
      const msg = tokenJson?.reason || tokenJson?.error || `HTTP ${tokenRes.status}`;
      await admin.from("sem_zoom_config").update({
        last_validation_status: "error",
        last_validation_at: new Date().toISOString(),
        last_validation_message: `Token: ${msg}`,
        account_id_masked: mask(accountId),
        validated_by: userData.user.id,
      }).eq("singleton", true);
      return new Response(JSON.stringify({ ok: false, error: "zoom-token", message: msg }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica que el usuario "me" exista y tenga email (host por defecto)
    const meRes = await fetch("https://api.zoom.us/v2/users/me", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const meJson: any = await meRes.json().catch(() => ({}));
    if (!meRes.ok) {
      const msg = meJson?.message || `HTTP ${meRes.status}`;
      await admin.from("sem_zoom_config").update({
        last_validation_status: "error",
        last_validation_at: new Date().toISOString(),
        last_validation_message: `users/me: ${msg}`,
        account_id_masked: mask(accountId),
        validated_by: userData.user.id,
      }).eq("singleton", true);
      return new Response(JSON.stringify({ ok: false, error: "zoom-me", message: msg }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("sem_zoom_config").update({
      last_validation_status: "ok",
      last_validation_at: new Date().toISOString(),
      last_validation_message: `Validado: ${meJson?.email ?? "ok"}`,
      account_id_masked: mask(accountId),
      validated_by: userData.user.id,
    }).eq("singleton", true);

    return new Response(JSON.stringify({
      ok: true,
      account_id_masked: mask(accountId),
      host_email: meJson?.email ?? null,
      host_name: [meJson?.first_name, meJson?.last_name].filter(Boolean).join(" ") || null,
      account_type: meJson?.type ?? null,
      scopes: (tokenJson?.scope || "").split(" ").filter(Boolean),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: "exception", message: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
