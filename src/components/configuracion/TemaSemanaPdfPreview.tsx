import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

// Configurar worker de pdfjs-dist (Vite maneja ?url)
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - Vite resuelve el worker como URL
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

interface Props {
  source: File | string | null; // File local o URL remota
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Renderiza la primera página de un PDF en un <canvas>.
 */
export default function TemaSemanaPdfPreview({ source, width = 180, height = 240, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!source) return;
      setLoading(true);
      setError(null);
      try {
        let data: ArrayBuffer;
        if (typeof source === "string") {
          const res = await fetch(source);
          data = await res.arrayBuffer();
        } else {
          data = await source.arrayBuffer();
        }
        if (cancelled) return;
        const pdf = await (pdfjsLib as any).getDocument({ data }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(width / viewport.width, height / viewport.height);
        const scaled = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = scaled.width;
        canvas.height = scaled.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport: scaled }).promise;
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "No se pudo renderizar el PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [source, width, height]);

  if (!source) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 text-muted-foreground ${className || ""}`}
        style={{ width, height }}
      >
        <FileText className="h-8 w-8 opacity-40" />
        <span className="text-[10px] mt-1">Sin PDF</span>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-lg border overflow-hidden bg-white flex items-center justify-center ${className || ""}`}
      style={{ width, height }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}
      {error ? (
        <div className="p-2 text-[11px] text-destructive text-center">{error}</div>
      ) : (
        <canvas ref={canvasRef} className="max-w-full max-h-full" />
      )}
    </div>
  );
}
