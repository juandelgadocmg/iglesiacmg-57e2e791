import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, AlertTriangle, CheckCircle2, Loader2, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  parseExcelTesoreria,
  resolverGrupos,
  type FilaResuelta,
  type GrupoMin,
} from "@/lib/importTesoreriaCDPXlsx";
import { format, parseISO } from "date-fns";

interface Props {
  open: boolean;
  onClose: () => void;
}

const fmt = (n: number) =>
  `$${Number(n).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function ImportTesoreriaCDPDialog({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [filas, setFilas] = useState<FilaResuelta[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const reset = () => {
    setFile(null);
    setFilas([]);
    setProgress({ done: 0, total: 0 });
  };

  const handleClose = () => {
    if (importing) return;
    reset();
    onClose();
  };

  const handleFile = async (f: File) => {
    setParsing(true);
    setFile(f);
    try {
      const buffer = await f.arrayBuffer();
      const parsed = parseExcelTesoreria(buffer);
      if (parsed.length === 0) {
        toast.error("No se detectaron filas válidas en el archivo. Verifica el formato.");
        setParsing(false);
        return;
      }
      // Cargar grupos Casas de paz
      const { data: grupos, error } = await supabase
        .from("grupos")
        .select("id, nombre, red")
        .eq("tipo", "Casas de paz");
      if (error) throw error;
      const resolved = resolverGrupos(parsed, (grupos || []) as GrupoMin[]);
      setFilas(resolved);
    } catch (e: any) {
      toast.error("Error al leer el archivo: " + (e.message || ""));
    } finally {
      setParsing(false);
    }
  };

  const filasOk = filas.filter((f) => f.estado === "ok");
  const filasError = filas.filter((f) => f.estado === "sin_grupo");

  // Agrupar por semana para mostrar resumen
  const porSemana = filas.reduce((acc, f) => {
    const k = f.semanaInicio;
    if (!acc[k]) acc[k] = { semana: f, total: 0, ok: 0, err: 0 };
    acc[k].total++;
    if (f.estado === "ok") acc[k].ok++;
    if (f.estado === "sin_grupo") acc[k].err++;
    return acc;
  }, {} as Record<string, { semana: FilaResuelta; total: number; ok: number; err: number }>);

  const handleImport = async () => {
    if (filasOk.length === 0) return;
    setImporting(true);
    setProgress({ done: 0, total: filasOk.length });

    const { data: { user } } = await supabase.auth.getUser();
    let okCount = 0;
    let errCount = 0;
    const errores: string[] = [];

    // Lote por lote para evitar payloads enormes
    const chunkSize = 50;
    for (let i = 0; i < filasOk.length; i += chunkSize) {
      const chunk = filasOk.slice(i, i + chunkSize);
      const payload = chunk.map((f) => ({
        grupo_id: f.grupoId!,
        semana_inicio: f.semanaInicio,
        semana_fin: f.semanaFin,
        valor_entregado: f.valorEntregado,
        fecha_entrega: f.fechaEntrega,
        observacion: f.observacion,
        // Si el reportado del Excel difiere del cálculo automático,
        // se guarda como override para que prevalezca en el histórico.
        valor_reportado_override: f.valorReportado,
        registrado_por: user?.id ?? null,
      }));
      const { error } = await supabase
        .from("tesoreria_ofrendas_cdp")
        .upsert(payload, { onConflict: "grupo_id,semana_inicio" });
      if (error) {
        errCount += chunk.length;
        errores.push(error.message);
      } else {
        okCount += chunk.length;
      }
      setProgress({ done: Math.min(i + chunkSize, filasOk.length), total: filasOk.length });
    }

    setImporting(false);
    if (okCount > 0) {
      toast.success(`Se importaron ${okCount} registros correctamente.`);
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_semana"] });
      qc.invalidateQueries({ queryKey: ["tesoreria_cdp_mora"] });
    }
    if (errCount > 0) {
      toast.error(`Fallaron ${errCount} registros. ${errores[0] || ""}`);
    } else {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar histórico Tesorería Casas de Paz
          </DialogTitle>
          <DialogDescription>
            Carga un archivo Excel con el formato RE-CO-OC01. Cada hoja representa una semana
            (nombre = fecha del cuadre). Las Casas de Paz se identifican por nombre + red.
          </DialogDescription>
        </DialogHeader>

        {/* Paso 1: subir archivo */}
        {!file && (
          <div className="border-2 border-dashed rounded-lg p-10 text-center">
            <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona el archivo Excel (.xlsx)
            </p>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="max-w-sm mx-auto"
            />
          </div>
        )}

        {parsing && (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Procesando archivo…
          </div>
        )}

        {/* Paso 2: vista previa */}
        {file && !parsing && filas.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className="gap-1">
                <FileSpreadsheet className="h-3 w-3" /> {file.name}
              </Badge>
              <Badge className="bg-success text-success-foreground">
                {filasOk.length} listos para importar
              </Badge>
              {filasError.length > 0 && (
                <Badge variant="destructive">{filasError.length} sin coincidencia</Badge>
              )}
              <Button variant="ghost" size="sm" onClick={reset}>Cambiar archivo</Button>
            </div>

            {/* Resumen por semana */}
            <div>
              <p className="text-xs font-medium mb-2">Resumen por semana</p>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Semana</TableHead>
                      <TableHead className="text-center">Filas</TableHead>
                      <TableHead className="text-center">OK</TableHead>
                      <TableHead className="text-center">Sin match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(porSemana)
                      .sort((a, b) => a.semana.semanaInicio.localeCompare(b.semana.semanaInicio))
                      .map((s) => (
                        <TableRow key={s.semana.semanaInicio}>
                          <TableCell className="text-xs">
                            {format(parseISO(s.semana.semanaInicio), "dd/MM/yyyy")} —{" "}
                            {format(parseISO(s.semana.semanaFin), "dd/MM/yyyy")}
                            <span className="text-muted-foreground ml-2">
                              (hoja: {s.semana.sheetName})
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs">{s.total}</TableCell>
                          <TableCell className="text-center text-xs text-success">{s.ok}</TableCell>
                          <TableCell className="text-center text-xs">
                            {s.err > 0 ? (
                              <span className="text-destructive">{s.err}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Errores */}
            {filasError.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex items-center gap-2 mb-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm font-medium">
                    {filasError.length} fila(s) no coinciden con ninguna Casa de Paz registrada
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto text-xs space-y-1">
                  {filasError.slice(0, 50).map((f, i) => (
                    <div key={i} className="text-muted-foreground">
                      • <strong>{f.nombreExcel}</strong> (red: {f.redExcel || "—"}) ·{" "}
                      semana {format(parseISO(f.semanaInicio), "dd/MM/yyyy")}
                    </div>
                  ))}
                  {filasError.length > 50 && <p>… y {filasError.length - 50} más</p>}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Verifica que el nombre exacto de la Casa de Paz exista en Grupos. Estas filas se omitirán.
                </p>
              </div>
            )}

            {/* Vista previa de filas OK */}
            <div>
              <p className="text-xs font-medium mb-2">
                Vista previa ({Math.min(filasOk.length, 30)} de {filasOk.length})
              </p>
              <div className="rounded-lg border max-h-64 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Semana</TableHead>
                      <TableHead>Red</TableHead>
                      <TableHead>Casa de Paz</TableHead>
                      <TableHead className="text-right">Reportado</TableHead>
                      <TableHead className="text-right">Entregado</TableHead>
                      <TableHead>F. Entrega</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filasOk.slice(0, 30).map((f, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">
                          {format(parseISO(f.semanaInicio), "dd/MM/yy")}
                        </TableCell>
                        <TableCell className="text-xs">{f.grupoRed || f.redExcel}</TableCell>
                        <TableCell className="text-xs font-medium">{f.grupoNombre}</TableCell>
                        <TableCell className="text-right text-xs">{fmt(f.valorReportado)}</TableCell>
                        <TableCell className="text-right text-xs">{fmt(f.valorEntregado)}</TableCell>
                        <TableCell className="text-xs">
                          {f.fechaEntrega ? format(parseISO(f.fechaEntrega), "dd/MM/yy") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {importing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando {progress.done} / {progress.total}…
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || parsing || filasOk.length === 0}
            className="gap-1"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Importar {filasOk.length} registros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
