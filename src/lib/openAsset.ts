import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Abre/descarga un archivo de Storage sin pasar por la URL pública
 * `/storage/v1/object/public/...` (filtrada por muchos ad-blockers con reglas
 * tipo `||supabase.co/storage/v1/object/public/*`).
 *
 * Estrategia:
 *   1. Resuelve bucket + path desde una URL pública o desde parámetros.
 *   2. Genera un signed URL (`/storage/v1/object/sign/...`, ruta distinta).
 *   3. Hace fetch del signed URL → Blob → blob: URL → ventana / descarga.
 *   4. Si el navegador del usuario está bloqueando incluso /sign/, mostramos
 *      un mensaje claro en lugar de redirigir (la redirección a la URL pública
 *      es lo que producía el "ERR_BLOCKED_BY_CLIENT" en pantalla).
 */

export interface OpenAssetOptions {
  url?: string | null;
  bucket?: string;
  path?: string | null;
  filename?: string;
  download?: boolean;
}

const PUBLIC_RE = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
const SIGN_RE = /\/storage\/v1\/object\/sign\/([^/]+)\/(.+?)(?:\?|$)/;

function parseSupabaseUrl(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    let m = u.pathname.match(PUBLIC_RE);
    if (m) return { bucket: m[1], path: decodeURIComponent(m[2]) };
    m = url.match(SIGN_RE);
    if (m) return { bucket: m[1], path: decodeURIComponent(m[2]) };
  } catch {
    /* ignore */
  }
  return null;
}

function isLikelyAdblock(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("blocked") ||
    msg.includes("err_blocked_by_client") ||
    msg.includes("load failed")
  );
}

/**
 * Descarga un asset del Storage como Blob usando un signed URL.
 * Devuelve null si no se pudo (con toast explicativo).
 */
export async function fetchAssetBlob(opts: OpenAssetOptions): Promise<Blob | null> {
  const { url } = opts;
  let bucket = opts.bucket;
  let path = opts.path || undefined;

  if ((!bucket || !path) && url) {
    const parsed = parseSupabaseUrl(url);
    if (parsed) {
      bucket = bucket || parsed.bucket;
      path = path || parsed.path;
    }
  }

  if (!bucket || !path) {
    // No es de Storage → intentar fetch directo
    if (!url) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.blob();
    } catch (e) {
      if (isLikelyAdblock(e)) {
        toast.error("Tu navegador o una extensión está bloqueando la descarga. Desactiva el bloqueador de anuncios para esta página y vuelve a intentar.");
      } else {
        toast.error("No se pudo descargar el archivo");
      }
      return null;
    }
  }

  // 1) Intentar signed URL (ruta /sign/)
  try {
    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 10);
    if (signErr || !signed?.signedUrl) throw signErr || new Error("No signed URL");
    const res = await fetch(signed.signedUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.blob();
  } catch (e1) {
    // 2) Fallback: SDK download (ruta /authenticated/ o /public/)
    try {
      const { data, error } = await supabase.storage.from(bucket).download(path);
      if (error || !data) throw error || new Error("download failed");
      return data;
    } catch (e2) {
      if (isLikelyAdblock(e1) || isLikelyAdblock(e2)) {
        toast.error(
          "Una extensión del navegador (ad-blocker, privacy guard) está bloqueando la descarga de archivos. " +
          "Desactívala para este sitio y recarga la página."
        );
      } else {
        console.error("fetchAssetBlob error", e1, e2);
        toast.error("No se pudo descargar el archivo");
      }
      return null;
    }
  }
}

export async function openAsset(opts: OpenAssetOptions): Promise<void> {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isIOS = /iP(hone|od|ad)/.test(ua) || (/Mac/.test(ua) && typeof document !== "undefined" && "ontouchend" in document);
  const isMobile = isIOS || /Android|Mobile|iPhone|iPad|iPod/i.test(ua);

  // Resolver bucket + path
  let bucket = opts.bucket;
  let path = opts.path || undefined;
  if ((!bucket || !path) && opts.url) {
    const parsed = parseSupabaseUrl(opts.url);
    if (parsed) {
      bucket = bucket || parsed.bucket;
      path = path || parsed.path;
    }
  }
  const filename = opts.filename || path?.split("/").pop() || opts.url?.split("/").pop() || "archivo";

  // Estrategia preferida (funciona en móvil e iOS): signed URL con
  // response-content-disposition=attachment. El navegador dispara la descarga
  // nativa al navegar a esa URL, sin depender de blob:.
  if (bucket && path) {
    try {
      const { data: signed, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 10, opts.download ? { download: filename } : undefined);
      if (!error && signed?.signedUrl) {
        if (opts.download && isMobile) {
          // Navegar en la pestaña actual → el SO muestra el diálogo de guardado.
          window.location.href = signed.signedUrl;
        } else {
          const win = window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
          if (!win) window.location.href = signed.signedUrl;
        }
        return;
      }
    } catch {
      /* cae al fallback blob */
    }
  }

  // Fallback: descargar como blob (para URLs no-Storage o si signed falla)
  const blob = await fetchAssetBlob(opts);
  if (!blob) return;
  const blobUrl = URL.createObjectURL(blob);

  const triggerDownloadAnchor = () => {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (opts.download) {
    if (isMobile) {
      const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
      if (!win) triggerDownloadAnchor();
    } else {
      triggerDownloadAnchor();
    }
  } else {
    const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
    if (!win) triggerDownloadAnchor();
  }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

/**
 * Hook que convierte una URL/path de Storage en un blob: URL local listo para
 * usar en <img>, <iframe>, <video>, <audio> sin atravesar el ad-blocker.
 */
export function useAssetBlobUrl(opts: OpenAssetOptions | null | undefined): {
  url: string | null;
  loading: boolean;
  error: string | null;
} {
  const [state, setState] = useState<{ url: string | null; loading: boolean; error: string | null }>({
    url: null,
    loading: !!opts,
    error: null,
  });

  const key = opts ? `${opts.bucket || ""}|${opts.path || ""}|${opts.url || ""}` : "";

  useEffect(() => {
    if (!opts || (!opts.url && !(opts.bucket && opts.path))) {
      setState({ url: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    let createdUrl: string | null = null;
    setState({ url: null, loading: true, error: null });
    (async () => {
      const blob = await fetchAssetBlob(opts);
      if (cancelled) return;
      if (!blob) {
        setState({ url: null, loading: false, error: "blocked" });
        return;
      }
      createdUrl = URL.createObjectURL(blob);
      setState({ url: createdUrl, loading: false, error: null });
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
