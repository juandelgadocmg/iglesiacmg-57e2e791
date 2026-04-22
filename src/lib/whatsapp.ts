/**
 * Helpers para abrir WhatsApp (web/app) con un mensaje pre-redactado.
 */

export function normalizePhone(raw: string | null | undefined, defaultCountryCode = "57"): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length <= 10) {
    digits = defaultCountryCode + digits;
  }
  return digits;
}

export function buildWhatsAppUrl(numero: string | null | undefined, mensaje: string, defaultCountryCode = "57"): string | null {
  const phone = normalizePhone(numero, defaultCountryCode);
  if (!phone) return null;
  const text = encodeURIComponent(mensaje);
  return `https://wa.me/${phone}?text=${text}`;
}

/** URL específica para WhatsApp Web (escritorio). */
export function buildWhatsAppWebUrl(numero: string | null | undefined, mensaje: string, defaultCountryCode = "57"): string | null {
  const phone = normalizePhone(numero, defaultCountryCode);
  if (!phone) return null;
  const text = encodeURIComponent(mensaje);
  return `https://web.whatsapp.com/send?phone=${phone}&text=${text}`;
}

/** URL universal api.whatsapp.com (suele evitar bloqueos del navegador). */
export function buildWhatsAppApiUrl(numero: string | null | undefined, mensaje: string, defaultCountryCode = "57"): string | null {
  const phone = normalizePhone(numero, defaultCountryCode);
  if (!phone) return null;
  const text = encodeURIComponent(mensaje);
  return `https://api.whatsapp.com/send?phone=${phone}&text=${text}`;
}

/** Detecta si el dispositivo es móvil. */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Abre WhatsApp de forma robusta, eligiendo la mejor URL según plataforma
 * y aplicando fallback si el navegador bloquea window.open.
 * Devuelve diagnóstico para modo de prueba.
 */
export interface OpenWhatsAppResult {
  ok: boolean;
  url: string;
  platform: "mobile" | "desktop";
  method: "window.open" | "anchor-fallback" | "location.href";
  blocked: boolean;
  message: string;
}

export function openWhatsApp(
  numero: string | null | undefined,
  mensaje: string,
  opts: { forceUrl?: string; defaultCountryCode?: string; navigateInPlace?: boolean } = {}
): OpenWhatsAppResult {
  const platform: "mobile" | "desktop" = isMobileDevice() ? "mobile" : "desktop";
  const url =
    opts.forceUrl ||
    (platform === "mobile"
      ? buildWhatsAppUrl(numero, mensaje, opts.defaultCountryCode)
      : buildWhatsAppWebUrl(numero, mensaje, opts.defaultCountryCode)) ||
    buildWhatsAppUrl(numero, mensaje, opts.defaultCountryCode) ||
    "";

  if (!url) {
    return { ok: false, url: "", platform, method: "window.open", blocked: false, message: "Número de WhatsApp inválido" };
  }

  // Intento 1: window.open
  try {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win && !win.closed) {
      return { ok: true, url, platform, method: "window.open", blocked: false, message: "Abierto en nueva pestaña" };
    }
  } catch {
    /* sigue al fallback */
  }

  // Intento 2: ancla simulada (suele superar bloqueos cuando proviene de un click trusted)
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return { ok: true, url, platform, method: "anchor-fallback", blocked: false, message: "Abierto vía enlace alterno" };
  } catch {
    /* sigue */
  }

  // Intento 3: navegar en la misma pestaña como último recurso
  if (opts.navigateInPlace) {
    try {
      window.location.href = url;
      return { ok: true, url, platform, method: "location.href", blocked: false, message: "Navegando en la misma pestaña" };
    } catch {
      /* fallthrough */
    }
  }

  return {
    ok: false,
    url,
    platform,
    method: "window.open",
    blocked: true,
    message: "El navegador bloqueó la apertura. Permite ventanas emergentes para wa.me / web.whatsapp.com.",
  };
}

/**
 * Devuelve true si las notas de seguimiento contienen al menos un registro
 * de contacto por WhatsApp.
 */
export function fueContactadoPorWhatsApp(notas?: string | null): boolean {
  if (!notas) return false;
  return /Contactado por WhatsApp/i.test(notas);
}

/**
 * Devuelve la última fecha (DD/MM/YYYY) de contacto por WhatsApp registrada
 * en notas_seguimiento, o null si no hay.
 */
export function ultimoContactoWhatsApp(notas?: string | null): string | null {
  if (!notas) return null;
  const matches = [...notas.matchAll(/\[(\d{2}\/\d{2}\/\d{4})\]\s*Contactado por WhatsApp/gi)];
  if (!matches.length) return null;
  return matches[matches.length - 1][1];
}
