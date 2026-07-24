import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Subscribes to qr_scan_log inserts. When servicioId is provided, only events
 * for that meeting are surfaced. Notifies organizers of successes, duplicates
 * and errors (e.g. invalid tokens) in real time.
 */
export function useQrScanNotifier(servicioId?: string | null, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    const filter = servicioId ? `servicio_id=eq.${servicioId}` : undefined;
    const channel = supabase
      .channel(`qr-scan-log-${servicioId || "all"}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "qr_scan_log", ...(filter ? { filter } : {}) } as any,
        (payload) => {
          const row = payload.new as {
            result: string;
            code: string | null;
            message: string | null;
          };
          if (row.result === "ok") {
            toast.success("Nuevo check-in por QR", { description: row.message ?? undefined });
          } else if (row.result === "already") {
            toast.message("QR duplicado", { description: "Un usuario reintentó registrar su asistencia." });
          } else if (row.result === "throttled") {
            // silent
          } else if (row.code === "qr_inactive" || row.code === "not_found") {
            toast.warning("Intento con QR inválido", { description: row.message ?? undefined });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [servicioId, enabled]);
}
