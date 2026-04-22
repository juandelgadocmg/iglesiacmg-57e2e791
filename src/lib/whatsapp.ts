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
