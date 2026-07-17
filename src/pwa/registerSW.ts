/**
 * Guarded PWA service worker registration.
 * - Never runs in dev, iframes, or Lovable preview hostnames.
 * - Supports ?sw=off kill switch: unregisters any /sw.js and skips.
 * - Emits a `doxa:pwa-update` window event when a new SW is waiting so
 *   the app can prompt the user to reload.
 */

const PREVIEW_HOSTS = [
  "lovableproject.com",
  "lovableproject-dev.com",
  "beta.lovable.dev",
];

function isPreviewHost(hostname: string): boolean {
  if (hostname.startsWith("id-preview--") || hostname.startsWith("preview--")) return true;
  return PREVIEW_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
}

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith("/sw.js");
        })
        .map((r) => r.unregister())
    );
  } catch {
    /* ignore */
  }
}

export async function registerPWA() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const inIframe = window.self !== window.top;
  const params = new URLSearchParams(window.location.search);
  const killSwitch = params.get("sw") === "off";
  const host = window.location.hostname;

  if (!import.meta.env.PROD || inIframe || killSwitch || isPreviewHost(host)) {
    await unregisterAppSW();
    return;
  }

  try {
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox("/sw.js");

    const notifyUpdate = () => {
      window.dispatchEvent(
        new CustomEvent("doxa:pwa-update", {
          detail: {
            reload: () => {
              wb.addEventListener("controlling", () => window.location.reload());
              wb.messageSkipWaiting();
            },
          },
        })
      );
    };

    wb.addEventListener("waiting", notifyUpdate);
    wb.addEventListener("externalwaiting" as any, notifyUpdate);

    await wb.register();
  } catch {
    /* ignore */
  }
}
