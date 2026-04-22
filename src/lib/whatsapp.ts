/**
 * Helpers para abrir WhatsApp (web/app) con un mensaje pre-redactado.
 */

export function normalizePhone(raw: string | null | undefined, defaultCountryCode = "57"): string | null {
  if (!raw) return null;
  // Quitar todo lo que no sea dígito
  let digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) return null;
  // Si comienza con 00, quitarlo (formato internacional)
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Si tiene menos de 11 dígitos, asumimos que falta el código de país
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
