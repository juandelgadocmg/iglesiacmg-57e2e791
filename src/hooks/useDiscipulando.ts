import { useCallback } from "react";
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
    await supabase.from("discipulando_access_log").insert({
      user_id: params.userId,
      user_email: params.userEmail,
      action: params.action,
      target_url: params.targetUrl,
      error_message: params.errorMessage ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    // audit best-effort, no bloquea la UX
  }
}

export function useDiscipulando() {
  const { user } = useAuth();
  const { data: config } = useConfiguracion();

  const url =
    ((config as any)?.discipulando_url as string | undefined)?.trim() ||
    DEFAULT_DISCIPULANDO_URL;
  const logo =
    ((config as any)?.discipulando_logo_url as string | undefined)?.trim() ||
    DEFAULT_DISCIPULANDO_LOGO;

  const open = useCallback(
    async (opts?: { isRetry?: boolean }) => {
      const action: "open" | "retry" = opts?.isRetry ? "retry" : "open";
      let win: Window | null = null;
      try {
        win = window.open(url, "_blank", "noopener,noreferrer");
        if (!win) throw new Error("Ventana emergente bloqueada por el navegador");
        await logAccess({
          userId: user?.id ?? null,
          userEmail: user?.email ?? null,
          action,
          targetUrl: url,
        });
      } catch (e: any) {
        const message = e?.message || "No se pudo abrir Discipulando Naciones";
        await logAccess({
          userId: user?.id ?? null,
          userEmail: user?.email ?? null,
          action: "error",
          targetUrl: url,
          errorMessage: message,
        });
        toast.error("No se pudo abrir Discipulando Naciones", {
          description: message,
          action: {
            label: "Reintentar",
            onClick: () => {
              void open({ isRetry: true });
            },
          },
        });
      }
    },
    [url, user?.id, user?.email]
  );

  return { url, logo, open };
}
