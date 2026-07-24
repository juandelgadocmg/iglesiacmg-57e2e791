import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PREF_ENABLED_KEY = "doxa.qr.notify.enabled";
const PREF_CHANNEL_KEY = "doxa.qr.notify.channel"; // "websocket" | "polling"
const PREF_POLL_MS_KEY = "doxa.qr.notify.pollMs";

export function getQrAlertPrefs() {
  const enabled = (localStorage.getItem(PREF_ENABLED_KEY) ?? "true") === "true";
  const channel = (localStorage.getItem(PREF_CHANNEL_KEY) as "websocket" | "polling") || "websocket";
  const pollMs = Number(localStorage.getItem(PREF_POLL_MS_KEY) || "15000");
  return { enabled, channel, pollMs };
}
export function setQrAlertPrefs(p: Partial<ReturnType<typeof getQrAlertPrefs>>) {
  if (p.enabled !== undefined) localStorage.setItem(PREF_ENABLED_KEY, String(p.enabled));
  if (p.channel) localStorage.setItem(PREF_CHANNEL_KEY, p.channel);
  if (p.pollMs) localStorage.setItem(PREF_POLL_MS_KEY, String(p.pollMs));
  window.dispatchEvent(new CustomEvent("qr-alert-prefs-changed"));
}

function notify(row: { result: string; code: string | null; message: string | null }) {
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

/**
 * Subscribes to qr_scan_log inserts. Respects user preference (enabled/channel).
 * websocket: postgres_changes; polling: periodic query with created_at cursor.
 */
export function useQrScanNotifier(servicioId?: string | null, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    let cleanup = () => {};
    const install = () => {
      cleanup();
      cleanup = () => {};
      const prefs = getQrAlertPrefs();
      if (!prefs.enabled) return;
      const filter = servicioId ? `servicio_id=eq.${servicioId}` : undefined;

      if (prefs.channel === "polling") {
        let since = new Date().toISOString();
        const tick = async () => {
          let q = supabase.from("qr_scan_log")
            .select("result,code,message,created_at,servicio_id")
            .gt("created_at", since)
            .order("created_at", { ascending: true });
          if (servicioId) q = q.eq("servicio_id", servicioId);
          const { data } = await q;
          (data || []).forEach((row: any) => { notify(row); since = row.created_at; });
        };
        const iv = window.setInterval(tick, Math.max(5000, prefs.pollMs));
        cleanup = () => window.clearInterval(iv);
        return;
      }

      const channel = supabase
        .channel(`qr-scan-log-${servicioId || "all"}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "qr_scan_log", ...(filter ? { filter } : {}) } as any,
          (payload) => notify(payload.new as any)
        )
        .subscribe();
      cleanup = () => { supabase.removeChannel(channel); };
    };
    install();
    const onChange = () => install();
    window.addEventListener("qr-alert-prefs-changed", onChange);
    return () => {
      window.removeEventListener("qr-alert-prefs-changed", onChange);
      cleanup();
    };
  }, [servicioId, enabled]);
}
