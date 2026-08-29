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
  "lovable.app",
];

function isPreviewHost(hostname: string): boolean {
  if (hostname.startsWith("id-preview--") || hostname.startsWith("preview--")) return true;
  return PREVIEW_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
}

async function unregisterAppSW() {
  if (typeof window === "undefined") return;
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
}

if (typeof window !== "undefined") {
  (window as any).__clearDoxaCaches = unregisterAppSW;
}

export function registerPWA() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const run = async () => {
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

      wb.addEventListener("waiting", () => {
        window.dispatchEvent(
          new CustomEvent("doxa:pwa-update", {
            detail: {
              reload: () => {
                wb.messageSkipWaiting();
                window.location.reload();
              },
            },
          })
        );
      });

      await wb.register();
    } catch {
      /* ignore */
    }
  };

  // Run deferred so initial script loading and React mount are never interrupted
  if (document.readyState === "complete") {
    setTimeout(run, 2000);
  } else {
    window.addEventListener("load", () => setTimeout(run, 2000));
  }
}
