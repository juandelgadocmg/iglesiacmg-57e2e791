import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Abre un archivo (PDF, video, imagen, etc.) evitando ERR_BLOCKED_BY_CLIENT.
 *
 * Muchas extensiones (uBlock, AdGuard, Brave Shields, listas easylist) bloquean
 * URLs directas a dominios tipo `*.supabase.co/storage/...`. Para esquivarlo:
 *   1. Descargamos el archivo con fetch (el ad-blocker no intercepta XHR a esa ruta
 *      cuando viene del cliente Supabase autenticado en muchos casos, y si lo hace
 *      mostramos un mensaje claro).
 *   2. Creamos un objectURL (blob:) y lo abrimos en una pestaña nueva.
 *   3. Si el bucket es privado, usamos createSignedUrl.
 *
 * Acepta tanto una URL pública como un path `bucket/clave` o solo `clave` con bucket.
 */
export interface OpenAssetOptions {
  url?: string | null;
  bucket?: string;
  path?: string | null;
  filename?: string;
  /** Si true, fuerza descarga en lugar de abrir en visor */
  download?: boolean;
}

const SUPABASE_PUBLIC_RE = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
const SUPABASE_SIGNED_RE = /\/storage\/v1\/object\/sign\/([^/]+)\/(.+?)(\?|$)/;

function parseSupabaseUrl(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    let m = u.pathname.match(SUPABASE_PUBLIC_RE);
    if (m) return { bucket: m[1], path: decodeURIComponent(m[2]) };
    m = url.match(SUPABASE_SIGNED_RE);
    if (m) return { bucket: m[1], path: decodeURIComponent(m[2]) };
  } catch {
    /* not a URL */
  }
  return null;
}

export async function openAsset(opts: OpenAssetOptions): Promise<void> {
  const { url, bucket, path, filename, download } = opts;

  // 1. Resolver bucket + path
  let resolvedBucket = bucket;
  let resolvedPath = path || undefined;
  if (!resolvedBucket || !resolvedPath) {
    if (url) {
      const parsed = parseSupabaseUrl(url);
      if (parsed) {
        resolvedBucket = resolvedBucket || parsed.bucket;
        resolvedPath = resolvedPath || parsed.path;
      }
    }
  }

  // 2. Si no es un recurso de Supabase Storage (link externo), abrir directo
  if (!resolvedBucket || !resolvedPath) {
    if (!url) {
      toast.error("Recurso sin URL");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  // 3. Descargar vía SDK (esquiva bloqueadores que filtran por patrón de URL pública)
  try {
    const { data, error } = await supabase.storage.from(resolvedBucket).download(resolvedPath);
    if (error || !data) throw error || new Error("No se pudo descargar");
    const blobUrl = URL.createObjectURL(data);

    if (download) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || resolvedPath.split("/").pop() || "archivo";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        // Pop-up bloqueado: forzar descarga como fallback
        const a = document.createElement("a");
        a.href = blobUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    }

    // Liberar memoria después de un tiempo prudente
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (e: any) {
    console.error("openAsset error", e);
    // Último recurso: intentar la URL pública directa
    if (url) {
      toast.message("Intentando abrir directamente. Si tu navegador lo bloquea, desactiva el ad-blocker para esta página.");
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      toast.error(e?.message || "No se pudo abrir el archivo");
    }
  }
}
