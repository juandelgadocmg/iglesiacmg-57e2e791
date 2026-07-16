import { useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import {
  BookOpen, Upload, X, Trash2, Loader2, CalendarIcon, RotateCcw,
  History, CheckCircle2, ExternalLink, AlertCircle, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  useTemaSemanaHistorial, useTemaSemanaVigente, usePublicarVersion,
  useRevertirVersion, useEliminarVersion, type TemaSemanaVersion,
} from "@/hooks/useTemaSemana";
import TemaSemanaPdfPreview from "./TemaSemanaPdfPreview";

const MAX_PDF_MB = 10;

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(parseISO(d), "d MMM yyyy", { locale: es }); } catch { return d; }
}

function estadoVersion(v: TemaSemanaVersion, hoy = new Date()): "vigente" | "programada" | "expirada" | "revertida" {
  if (v.estado === "revertido") return "revertida";
  const hoyStr = format(hoy, "yyyy-MM-dd");
  if (v.fecha_inicio && v.fecha_inicio > hoyStr) return "programada";
  if (v.fecha_fin && v.fecha_fin < hoyStr) return "expirada";
  return "vigente";
}

const BADGE_TONE: Record<string, string> = {
  vigente: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  programada: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  expirada: "bg-muted text-muted-foreground",
  revertida: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
};

export default function TemaSemanaManager() {
  const { data: vigente } = useTemaSemanaVigente();
  const { data: historial = [], isLoading: histLoading } = useTemaSemanaHistorial();
  const publicar = usePublicarVersion();
  const revertir = useRevertirVersion();
  const eliminar = useEliminarVersion();

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [url, setUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [range, setRange] = useState<DateRange | undefined>();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitulo(""); setDescripcion(""); setUrl("");
    setPdfUrl(null); setPdfFile(null); setRange(undefined);
    setUploadError(null);
  };

  const validatePdf = (file: File): string | null => {
    if (file.type !== "application/pdf") return `Formato no válido (${file.type || "desconocido"}). Solo se permite PDF.`;
    const mb = file.size / (1024 * 1024);
    if (mb > MAX_PDF_MB) return `El archivo es de ${mb.toFixed(1)} MB, excede el máximo de ${MAX_PDF_MB} MB.`;
    return null;
  };

  const handleFile = async (file: File) => {
    const err = validatePdf(file);
    if (err) {
      setUploadError(err);
      toast.error(err);
      return;
    }
    setUploadError(null);
    setPdfFile(file);
    setUploading(true);
    try {
      const path = `tema-semana/tema-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from("banners").upload(path, file, {
        cacheControl: "31536000", upsert: false, contentType: "application/pdf",
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("banners").getPublicUrl(path);
      setPdfUrl(data.publicUrl);
      // Auditoría de subida
      try { await (supabase as any).rpc("log_storage_event", { _bucket: "banners", _path: path, _operation: "UPLOAD", _details: { section: "tema_semana" } }); } catch {}
      toast.success("PDF subido correctamente");
    } catch (e: any) {
      setUploadError(e?.message || "Error subiendo el PDF");
      toast.error(e?.message || "Error subiendo el PDF");
      setPdfFile(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleClearPdf = async () => {
    // Registra auditoría si había uno
    if (pdfUrl) {
      try {
        const marker = "/storage/v1/object/public/banners/";
        const idx = pdfUrl.indexOf(marker);
        const path = idx >= 0 ? pdfUrl.slice(idx + marker.length) : pdfUrl;
        await (supabase as any).rpc("log_storage_event", { _bucket: "banners", _path: path, _operation: "DELETE", _details: { section: "tema_semana", context: "clear_before_publish" } });
      } catch {}
    }
    setPdfUrl(null); setPdfFile(null); setUploadError(null);
    toast.success("PDF removido. Al publicar sin PDF, el dashboard usará el PDF básico.");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const isValidUrl = (v: string) => { if (!v) return true; try { new URL(v); return true; } catch { return false; } };

  const handlePublicar = async () => {
    if (!titulo.trim() && !descripcion.trim() && !pdfUrl) {
      toast.error("Ingresa al menos un título, descripción o PDF");
      return;
    }
    if (url && !isValidUrl(url)) { toast.error("La URL no es válida"); return; }
    try {
      await publicar.mutateAsync({
        titulo: titulo.trim() || null,
        descripcion: descripcion.trim() || null,
        url: url.trim() || null,
        pdf_url: pdfUrl,
        fecha_inicio: range?.from ? format(range.from, "yyyy-MM-dd") : null,
        fecha_fin: range?.to ? format(range.to, "yyyy-MM-dd") : null,
      });
      toast.success("Nueva versión publicada");
      resetForm();
    } catch (e: any) {
      toast.error(e?.message || "Error publicando la versión");
    }
  };

  const handleRevertir = async (v: TemaSemanaVersion) => {
    try {
      await revertir.mutateAsync(v.id);
      toast.success("Versión restaurada como vigente");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo revertir");
    }
  };

  const handleEliminar = async (v: TemaSemanaVersion) => {
    try {
      await eliminar.mutateAsync(v.id);
      toast.success("Versión eliminada del historial");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo eliminar");
    }
  };

  const rangeLabel = useMemo(() => {
    if (!range?.from) return "Sin fecha (vigente al publicar)";
    if (range.to) return `${format(range.from, "d MMM", { locale: es })} → ${format(range.to, "d MMM yyyy", { locale: es })}`;
    return `Desde ${format(range.from, "d MMM yyyy", { locale: es })}`;
  }, [range]);

  const previewSource: File | string | null = pdfFile || pdfUrl;

  return (
    <div className="space-y-4">
      {/* Vigente ahora */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Vigente ahora
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          {vigente?.titulo || vigente?.descripcion ? (
            <>
              <div className="font-semibold">{vigente.titulo || "(sin título)"}</div>
              {vigente.descripcion && <div className="text-muted-foreground">{vigente.descripcion}</div>}
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                <span>Vigencia: {fmtDate(vigente.fecha_inicio)} — {fmtDate(vigente.fecha_fin)}</span>
                {vigente.created_by_email && <span>· Publicado por {vigente.created_by_email}</span>}
                {vigente.pdf_url && (
                  <a href={vigente.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Ver PDF
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="text-muted-foreground italic">Sin versión publicada. Se está usando el respaldo básico.</div>
          )}
        </CardContent>
      </Card>

      {/* Editor de nueva versión */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Publicar nueva versión</CardTitle>
          <CardDescription>Los campos vacíos no se muestran en el dashboard. Puedes programar la vigencia con fechas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Tema de la semana" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea rows={3} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="LA COMUNIÓN CON EL ESPÍRITU SANTO" />
            </div>
            <div className="space-y-2">
              <Label>URL del enlace (opcional)</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Vigencia (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="h-4 w-4 mr-2" /> {rangeLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} className="pointer-events-auto" />
                  <div className="flex justify-between p-2 border-t">
                    <Button size="sm" variant="ghost" onClick={() => setRange(undefined)}>Limpiar</Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      const now = new Date();
                      const day = now.getDay();
                      const from = new Date(now); from.setDate(now.getDate() - day);
                      const to = new Date(from); to.setDate(from.getDate() + 6);
                      setRange({ from, to });
                    }}>Esta semana</Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>PDF descargable (opcional)</Label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "cursor-pointer rounded-lg border-2 border-dashed p-4 transition-colors flex flex-col items-center gap-2 text-center",
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                uploadError && "border-destructive/60 bg-destructive/5"
              )}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
            >
              <input
                ref={inputRef} type="file" accept="application/pdf" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Subiendo PDF...</span>
                </>
              ) : pdfUrl ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  <TemaSemanaPdfPreview source={previewSource} width={160} height={210} />
                  <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> PDF cargado — clic para reemplazar
                  </span>
                </div>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <div className="text-sm font-medium">Arrastra un PDF aquí o haz clic para elegir</div>
                  <div className="text-[11px] text-muted-foreground">Solo PDF · máx. {MAX_PDF_MB} MB</div>
                </>
              )}
              {uploadError && (
                <div className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3.5 w-3.5" /> {uploadError}
                </div>
              )}
            </div>
            {pdfUrl && (
              <div className="flex flex-wrap items-center gap-2">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Ver PDF cargado
                </a>
                <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={handleClearPdf}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Quitar PDF (usar respaldo)
                </Button>
              </div>
            )}
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={resetForm} disabled={publicar.isPending}>Limpiar</Button>
            <Button onClick={handlePublicar} disabled={publicar.isPending || uploading}>
              {publicar.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Publicar versión
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Historial de versiones</CardTitle>
          <CardDescription>Trazabilidad completa: quién publicó, cuándo y con qué vigencia.</CardDescription>
        </CardHeader>
        <CardContent>
          {histLoading ? (
            <div className="text-sm text-muted-foreground">Cargando historial...</div>
          ) : historial.length === 0 ? (
            <div className="text-sm text-muted-foreground italic">Aún no hay versiones publicadas.</div>
          ) : (
            <ul className="divide-y">
              {historial.map((v) => {
                const est = estadoVersion(v);
                return (
                  <li key={v.id} className="py-3 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{v.titulo || "(sin título)"}</span>
                        <Badge variant="outline" className={cn("text-[10px] capitalize", BADGE_TONE[est])}>{est}</Badge>
                        {v.parent_version_id && <Badge variant="outline" className="text-[10px]">Reversión</Badge>}
                      </div>
                      {v.descripcion && <div className="text-xs text-muted-foreground truncate mt-0.5">{v.descripcion}</div>}
                      <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>Vigencia: {fmtDate(v.fecha_inicio)} → {fmtDate(v.fecha_fin)}</span>
                        <span>Publicado: {fmtDate(v.created_at)}</span>
                        {v.created_by_email && <span>por {v.created_by_email}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {v.pdf_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={v.pdf_url} target="_blank" rel="noopener noreferrer" aria-label="Ver PDF">
                            <FileText className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {est !== "vigente" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" aria-label="Restaurar esta versión">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Restaurar esta versión?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se creará una nueva versión clonada, vigente desde hoy, y se cerrará la actual.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRevertir(v)}>Restaurar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive" aria-label="Eliminar versión">
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar del historial?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. El PDF permanecerá en el almacenamiento.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleEliminar(v)}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
