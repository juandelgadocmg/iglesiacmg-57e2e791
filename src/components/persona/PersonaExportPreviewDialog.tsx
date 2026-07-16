import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Table as TableIcon } from "lucide-react";
import {
  buildPersonaHistorialCSV,
  exportPersonaFichaPDF,
  exportPersonaHistorialCSV,
  getPersonaFichaPDFBlobUrl,
} from "@/lib/exportPersonaFicha";
import type { TimelineEvent } from "@/components/persona/PersonaActivityTimeline";

type Kind = "pdf" | "csv";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: Kind;
  persona: any;
  timeline: TimelineEvent[];
  onDownloaded?: () => void;
}

export default function PersonaExportPreviewDialog({
  open, onOpenChange, kind, persona, timeline, onDownloaded,
}: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const csvPreview = useMemo(() => {
    if (kind !== "csv" || !open || !persona) return null;
    const csv = buildPersonaHistorialCSV(persona, timeline);
    const lines = csv.split("\n");
    const header = lines[0]?.split(",") ?? [];
    const rows = lines.slice(1, 51).map((l) => {
      // simple split respecting quotes
      const out: string[] = [];
      let cur = ""; let inQ = false;
      for (let i = 0; i < l.length; i++) {
        const ch = l[i];
        if (inQ) {
          if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; }
          else if (ch === '"') inQ = false;
          else cur += ch;
        } else {
          if (ch === ',') { out.push(cur); cur = ""; }
          else if (ch === '"') inQ = true;
          else cur += ch;
        }
      }
      out.push(cur);
      return out;
    });
    return { header, rows, total: Math.max(lines.length - 1, 0) };
  }, [kind, open, persona, timeline]);

  useEffect(() => {
    if (!open || kind !== "pdf" || !persona) return;
    const url = getPersonaFichaPDFBlobUrl(persona, timeline);
    setPdfUrl(url);
    return () => {
      try { URL.revokeObjectURL(url); } catch { /* no-op */ }
      setPdfUrl(null);
    };
  }, [open, kind, persona, timeline]);

  const handleDownload = () => {
    if (kind === "pdf") exportPersonaFichaPDF(persona, timeline);
    else exportPersonaHistorialCSV(persona, timeline);
    onDownloaded?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {kind === "pdf" ? <FileText className="h-4 w-4" /> : <TableIcon className="h-4 w-4" />}
            Vista previa · {kind === "pdf" ? "Ficha PDF" : "Historial CSV"}
          </DialogTitle>
        </DialogHeader>

        {kind === "pdf" ? (
          <div className="h-[70vh] w-full rounded-lg overflow-hidden border bg-muted">
            {pdfUrl ? (
              <iframe title="Vista previa PDF" src={pdfUrl} className="w-full h-full" />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Generando vista previa…
              </div>
            )}
          </div>
        ) : (
          <div className="max-h-[65vh] overflow-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {csvPreview?.header.map((h, i) => (
                    <th key={i} className="text-left px-3 py-2 font-semibold border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreview?.rows.map((r, i) => (
                  <tr key={i} className="even:bg-muted/40">
                    {r.map((c, j) => (
                      <td key={j} className="px-3 py-1.5 border-b border-border/60 align-top">{c}</td>
                    ))}
                  </tr>
                ))}
                {(!csvPreview || csvPreview.rows.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      Sin eventos para mostrar en el historial.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {csvPreview && csvPreview.total > csvPreview.rows.length && (
              <p className="text-[11px] text-muted-foreground px-3 py-2">
                Mostrando {csvPreview.rows.length} de {csvPreview.total} filas. La descarga incluye el historial completo.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button onClick={handleDownload} className="gap-1.5">
            <Download className="h-4 w-4" /> Descargar {kind === "pdf" ? "PDF" : "CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
