/**
 * Utilidades de caché de plantillas de certificado.
 * Detecta si el navegador está sirviendo una versión antigua comparando el tamaño
 * de la respuesta con el registrado en la base de datos.
 */

export interface CacheCheckResult {
  ok: boolean;
  cacheHit: boolean;
  actualSize: number | null;
  expectedSize: number | null;
  freshUrl: string;
  message: string;
}

export function bustCacheUrl(url: string, version: number | string = Date.now()): string {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${version}`;
}

export async function loadImageAsDataUrl(url: string, forceFresh = false): Promise<string> {
  const finalUrl = forceFresh ? bustCacheUrl(url) : url;
  const res = await fetch(finalUrl, {
    cache: forceFresh ? "no-store" : "default",
    mode: "cors",
  });
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export async function checkTemplateCache(
  assetUrl: string,
  expectedSize: number | null | undefined
): Promise<CacheCheckResult> {
  const freshUrl = bustCacheUrl(assetUrl);
  try {
    const res = await fetch(freshUrl, { cache: "no-store", mode: "cors" });
    const blob = await res.blob();
    const actualSize = blob.size;
    if (!expectedSize) {
      return {
        ok: true,
        cacheHit: false,
        actualSize,
        expectedSize: null,
        freshUrl,
        message: `Plantilla cargada (${(actualSize / 1024).toFixed(0)} KB). Sin tamaño de referencia registrado.`,
      };
    }
    const diff = Math.abs(actualSize - expectedSize);
    const cacheHit = diff > 1024; // >1KB diff considered stale
    return {
      ok: !cacheHit,
      cacheHit,
      actualSize,
      expectedSize,
      freshUrl,
      message: cacheHit
        ? `Caché desactualizado detectado. Se descargará la versión oficial (${(expectedSize / 1024).toFixed(0)} KB) forzando recarga.`
        : `Plantilla actualizada verificada (${(actualSize / 1024).toFixed(0)} KB).`,
    };
  } catch (e: any) {
    return {
      ok: false,
      cacheHit: false,
      actualSize: null,
      expectedSize: expectedSize ?? null,
      freshUrl,
      message: `No se pudo verificar la plantilla: ${e?.message || "error de red"}`,
    };
  }
}

/**
 * Invalida las plantillas cacheadas por el navegador y limpia entradas de
 * localStorage con clave `cert-template-cache-*`.
 */
export function clearBrowserTemplateCache() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("cert-template-cache-"))
      .forEach((k) => localStorage.removeItem(k));
  } catch { /* no-op */ }
}
