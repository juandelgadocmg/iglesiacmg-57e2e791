import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileText, Table as TableIcon, Search, ChevronLeft, ChevronRight } from "lucide-react";
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

const PAGE_SIZE = 25;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
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
}

export default function PersonaExportPreviewDialog({
  open, onOpenChange, kind, persona, timeline, onDownloaded,
}: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const csvData = useMemo(() => {
    if (kind !== "csv" || !open || !persona) return null;
    const csv = buildPersonaHistorialCSV(persona, timeline);
    const lines = csv.split("\n").filter(Boolean);
    const header = lines[0] ? parseCsvLine(lines[0]) : [];
    const rows = lines.slice(1).map(parseCsvLine);
    return { header, rows };
  }, [kind, open, persona, timeline]);

  const filtered = useMemo(() => {
    if (!csvData) return [];
    const q = search.trim().toLowerCase();
    if (!q) return csvData.rows;
    return csvData.rows.filter((r) => r.some((c) => c.toLowerCase().includes(q)));
  }, [csvData, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [filtered, currentPage]
  );

  useEffect(() => { setPage(0); }, [search, open, kind]);

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
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 h-9"
                  placeholder="Buscar en el historial…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {filtered.length} de {csvData?.rows.length ?? 0} filas
              </span>
            </div>

            <div className="max-h-[55vh] overflow-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {csvData?.header.map((h, i) => (
                      <th key={i} className="text-left px-3 py-2 font-semibold border-b whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => (
                    <tr key={i} className="even:bg-muted/40">
                      {r.map((c, j) => (
                        <td key={j} className="px-3 py-1.5 border-b border-border/60 align-top">{c}</td>
                      ))}
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={csvData?.header.length || 5} className="px-3 py-6 text-center text-muted-foreground">
                        {search ? "Sin resultados para la búsqueda" : "Sin eventos en el historial"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Página {currentPage + 1} de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="sm" className="h-8 w-8 p-0"
                  disabled={currentPage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="sm" className="h-8 w-8 p-0"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button onClick={handleDownload} className="gap-1.5">
            <Download className="h-4 w-4" /> Descargar {kind === "pdf" ? "PDF" : "CSV completo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
