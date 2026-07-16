import { supabase } from "@/integrations/supabase/client";
import type { CertTipo, CertTemplate } from "@/hooks/useCertTemplates";

interface LogInput {
  tipo: CertTipo;
  template: CertTemplate | null;
  persona_id?: string | null;
  contexto?: Record<string, unknown>;
  browserCacheHit?: boolean;
}

export async function logCertExport(input: LogInput) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    await (supabase as any).from("cert_export_log").insert({
      tipo: input.tipo,
      template_id: input.template?.id ?? null,
      template_version: input.template?.version ?? null,
      template_asset_id: input.template?.asset_id ?? null,
      template_asset_url: input.template?.asset_url ?? null,
      persona_id: input.persona_id ?? null,
      contexto: input.contexto ?? {},
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      browser_cache_hit: input.browserCacheHit ?? false,
      actor_user_id: user.id,
      actor_email: user.email ?? null,
    });
  } catch (e) {
    console.warn("[cert_export_log] no se pudo registrar", e);
  }
}
