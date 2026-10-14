import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { toast } from "sonner";
import discipulandoLogoAsset from "@/assets/discipulando-naciones-logo-v2.png.asset.json";

export const DEFAULT_DISCIPULANDO_URL = "https://discipulandonaciones.lovable.app";
export const DEFAULT_DISCIPULANDO_LOGO = discipulandoLogoAsset.url;

async function logAccess(params: {
  userId: string | null;
  userEmail: string | null;
  action: "open" | "error" | "retry";
  targetUrl: string;
  errorMessage?: string;
}) {
  if (!params.userId) return;
  try {
    await supabase.from("discipulando_access_log" as any).insert({
      user_id: params.userId,
      user_email: params.userEmail,
      action: params.action,
      target_url: params.targetUrl,
      error_message: params.errorMessage ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    // audit best-effort
  }
}

export function useDiscipulando() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: config } = useConfiguracion();

  const customUrl = ((config as any)?.discipulando_url as string | undefined)?.trim();
  const url = customUrl || DEFAULT_DISCIPULANDO_URL;
  const logo =
    ((config as any)?.discipulando_logo_url as string | undefined)?.trim() ||
    DEFAULT_DISCIPULANDO_LOGO;

  const open = useCallback(
    async (opts?: { isRetry?: boolean; forceExternal?: boolean }) => {
      if (!opts?.forceExternal && !customUrl) {
        navigate("/discipulado");
        void logAccess({
          userId: user?.id ?? null,
          userEmail: user?.email ?? null,
          action: "open",
          targetUrl: "/discipulado",
        });
        return;
      }

      const action: "open" | "retry" = opts?.isRetry ? "retry" : "open";
      try {
        const win = window.open(url, "_blank", "noopener,noreferrer");
        if (!win) throw new Error("Ventana emergente bloqueada por el navegador");
        await logAccess({
          userId: user?.id ?? null,
          userEmail: user?.email ?? null,
          action,
          targetUrl: url,
        });
      } catch (e: any) {
        const message = e?.message || "No se pudo abrir Discipulando Naciones";
        toast.error("No se pudo abrir la ventana externa", {
          description: message,
          action: {
            label: "Ver interno",
            onClick: () => {
              navigate("/discipulado");
            },
          },
        });
      }
    },
    [customUrl, navigate, url, user?.id, user?.email]
  );

  return { url, logo, open };
}
