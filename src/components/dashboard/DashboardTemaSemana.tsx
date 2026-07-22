import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, Pencil, Download, CalendarClock, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";

import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useUserRoles } from "@/hooks/useUserRoles";

interface Props {
  titulo?: string | null;
  descripcion?: string | null;
  url?: string | null;
  pdfUrl?: string | null;
  fechaFin?: string | null;
  versionId?: string | null;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}

/**
 * Devuelve la URL del PDF con un parámetro `?v=<versión>` para invalidar caché
 * del navegador y del service worker cuando el tema vigente cambia.
 */
function withCacheBust(rawUrl: string | null | undefined, version?: string | null): string | null {
  if (!rawUrl) return null;
  const v = version ?? "current";
  try {
    // URLs absolutas
    const u = new URL(rawUrl, window.location.origin);
    u.searchParams.set("v", v);
    // Para URLs same-origin devolvemos ruta relativa para no forzar host
    if (u.origin === window.location.origin) return u.pathname + u.search + u.hash;
    return u.toString();
  } catch {
    const sep = rawUrl.includes("?") ? "&" : "?";
    return `${rawUrl}${sep}v=${encodeURIComponent(v)}`;
  }
}

// Cache en memoria del blob por versión: si ya se descargó una vez,
// se reutiliza sin ir a la red (política "reutilizar si existe").
const PDF_BLOB_CACHE = new Map<string, { url: string; ts: number }>();
const PDF_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min: renovar si expiró

export default function DashboardTemaSemana({ titulo, descripcion, url, pdfUrl, fechaFin, versionId, isLoading, error, onRetry }: Props) {
  const navigate = useNavigate();
  const { roles } = useUserRoles();
  const canEdit = (roles as string[])?.some((r) => ["admin", "super_admin", "pastor"].includes(r));
  const [pdfState, setPdfState] = useState<{
    action: null | "open" | "download";
    error: string | null;
  }>({ action: null, error: null });
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);




  const isEmpty = !titulo && !descripcion;
  const vigenteHasta = fechaFin ? (() => { try { return format(parseISO(fechaFin), "d MMM", { locale: es }); } catch { return null; } })() : null;

  // 🔒 Validación: ambos botones deben apuntar al MISMO PDF del tema vigente.
  // Si hay pdfUrl cargado, es la fuente única de verdad tanto para descargar
  // como para "Abrir link". El campo `url` sólo se usa como fallback cuando no
  // existe un PDF asociado a la versión vigente.
  const sourcePdf = pdfUrl || url || null;
  const effectivePdfUrl = withCacheBust(sourcePdf, versionId);
  const effectiveOpenUrl = effectivePdfUrl; // mismo destino garantizado

  if (import.meta.env.DEV && pdfUrl && url && pdfUrl !== url) {
    // Aviso de diagnóstico: la BD tiene url ≠ pdf_url para la vigente.
    console.warn("[TemaSemana] url y pdf_url difieren; se prioriza pdf_url para ambos botones.", { url, pdfUrl });
  }

  const fetchPdfBlobUrl = async (pdfHref: string) => {
    const cacheKey = `${versionId ?? "current"}::${pdfHref}`;
    const cached = PDF_BLOB_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < PDF_CACHE_TTL_MS) {
      return cached.url;
    }
    if (cached) {
      // Expiró: intentar renovar, pero si falla (offline) reutilizar el existente.
      try {
        const fresh = await doFetch(pdfHref);
        URL.revokeObjectURL(cached.url);
        PDF_BLOB_CACHE.set(cacheKey, { url: fresh, ts: Date.now() });
        return fresh;
      } catch {
        return cached.url;
      }
    }
    const fresh = await doFetch(pdfHref);
    PDF_BLOB_CACHE.set(cacheKey, { url: fresh, ts: Date.now() });
    return fresh;
  };

  const doFetch = async (pdfHref: string) => {
    const res = await fetch(pdfHref, {
      cache: "default",
      headers: { Accept: "application/pdf,*/*" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const isPdf = blob.type === "application/pdf" || blob.type === "application/octet-stream";
    if (!isPdf) {
      throw new Error(`Respuesta no es PDF: ${blob.type || "sin tipo"}`);
    }
    return URL.createObjectURL(blob);
  };

  const handleOpenPDF = async () => {
    if (!effectiveOpenUrl) return;
    setPdfState({ action: "open", error: null });
    const popup = window.open("about:blank", "_blank");
    try {
      const objUrl = await fetchPdfBlobUrl(effectiveOpenUrl);
      if (popup) {
        popup.location.href = objUrl;
      } else {
        window.open(objUrl, "_blank", "noopener,noreferrer");
      }
      // No revocamos: el blob queda cacheado por versión para reutilizar.
      setPdfState({ action: null, error: null });
    } catch (err: any) {
      if (popup) popup.close();
      console.error("[TemaSemana] No se pudo abrir el PDF vigente:", err);
      setPdfState({
        action: null,
        error: `No se pudo abrir el PDF (${err?.message ?? "error de red o caché"}). Toca reintentar.`,
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (effectivePdfUrl) {
      setPdfState({ action: "download", error: null });
      try {
        const link = document.createElement("a");
        const objUrl = await fetchPdfBlobUrl(effectivePdfUrl);
        link.href = objUrl;
        link.download = `tema-de-la-semana-${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objUrl);
        setPdfState({ action: null, error: null });
        return;
      } catch (err: any) {
        console.error("[TemaSemana] Descarga falló:", err);
        setPdfState({
          action: null,
          error: `No se pudo descargar el PDF (${err?.message ?? "error de red o caché"}). Toca reintentar.`,
        });
        return;
      }
    }

    // Fallback: generar PDF simple con los campos configurados
    const doc = new jsPDF();
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, 210, 60, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("Tema de la Semana", 105, 30, { align: "center" });

    doc.setFontSize(12);
    doc.text("Centro Mundial de Gloria", 105, 45, { align: "center" });

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(18);
    doc.text(titulo || "Sin título", 105, 80, { align: "center" });

    if (descripcion) {
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      const lines = doc.splitTextToSize(descripcion, 170);
      doc.text(lines, 105, 95, { align: "center" });
    }

    doc.save("tema-de-la-semana.pdf");
  };


  if (error) {
    return (
      <div className="rounded-xl overflow-hidden border shadow-sm bg-red-600 text-white">
        <div className="px-6 py-6 text-center">
          <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="font-bold text-lg">No se pudo cargar la lección</h3>
          <p className="text-xs mt-2 opacity-90 break-words">
            {(error as any)?.message ?? "Error desconocido al consultar tema_semana_vigente"}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border shadow-sm bg-teal-600 text-white">
      <div className="px-6 py-6 text-center">
        <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
          {isLoading ? <Loader2 className="h-7 w-7 animate-spin" /> : <BookOpen className="h-7 w-7" />}
        </div>
        <h3 className="font-bold text-lg">Tema de la semana</h3>
        <p className="text-sm mt-2 uppercase tracking-wide font-semibold opacity-95">
          {isEmpty ? "Sin tema configurado" : (descripcion || titulo)}
        </p>
        {vigenteHasta && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-[10.5px] font-medium">
            <CalendarClock className="h-3 w-3" /> Vigente hasta {vigenteHasta}
          </div>
        )}
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {effectivePdfUrl && (
            <button
              onClick={handleDownloadPDF}
              disabled={pdfState.action !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-60"
            >
              {pdfState.action === "download"
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Download className="h-3.5 w-3.5" />}
              {pdfState.action === "download" ? "Descargando…" : "Descargar PDF"}
            </button>
          )}
          {effectiveOpenUrl && (
            <button
              type="button"
              onClick={handleOpenPDF}
              disabled={pdfState.action !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-60"
            >
              {pdfState.action === "open"
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <ExternalLink className="h-3.5 w-3.5" />}
              {pdfState.action === "open" ? "Abriendo…" : "Abrir link"}
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => navigate("/configuracion")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
          )}
        </div>
        {pdfState.error && (
          <div className="mt-3 mx-auto max-w-xs rounded-lg bg-white/15 border border-white/30 p-2.5 text-[11px] leading-snug">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="flex-1 text-left">{pdfState.error}</span>
            </div>
            <div className="flex gap-2 mt-2 justify-center">
              <button
                onClick={handleOpenPDF}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/20 hover:bg-white/30 font-semibold"
              >
                <RefreshCw className="h-3 w-3" /> Reintentar abrir
              </button>
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/20 hover:bg-white/30 font-semibold"
              >
                <RefreshCw className="h-3 w-3" /> Reintentar descarga
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

