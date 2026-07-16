import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, RefreshCw, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import {
  useCertTemplates,
  type CertTemplate,
  type CertTipo,
  CERT_TIPO_LABEL,
} from "@/hooks/useCertTemplates";
import { bustCacheUrl, checkTemplateCache, clearBrowserTemplateCache, type CacheCheckResult } from "@/lib/certTemplateCache";
import { logCertExport } from "@/lib/logCertExport";
import { toast } from "sonner";

export interface CertDownloadDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: CertTipo;
  personaId?: string | null;
  personaNombre?: string;
  contexto?: Record<string, unknown>;
  /** Recibe la plantilla elegida (o null) y debe generar/descargar el PDF. */
  onDownload: (template: CertTemplate | null, freshUrl: string) => Promise<void> | void;
}

export default function CertDownloadDialog({
  open, onOpenChange, tipo, personaId, personaNombre, contexto, onDownload,
}: CertDownloadDialogProps) {
  const { data: templates, isLoading, refetch } = useCertTemplates(tipo);
  const activos = useMemo(() => (templates || []).filter((t) => t.activo), [templates]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [cacheResult, setCacheResult] = useState<CacheCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(Date.now());

  const selected = useMemo(() => {
    if (!activos.length) return null;
    const byId = activos.find((t) => t.id === selectedId);
    if (byId) return byId;
    return activos.find((t) => t.es_default) || activos[0];
  }, [activos, selectedId]);

  useEffect(() => {
    if (open && selected && !selectedId) setSelectedId(selected.id);
  }, [open, selected, selectedId]);

  useEffect(() => {
    if (!open || !selected) { setCacheResult(null); return; }
    let cancelled = false;
    setChecking(true);
    checkTemplateCache(selected.asset_url, selected.asset_size).then((r) => {
      if (!cancelled) { setCacheResult(r); setChecking(false); }
    });
    return () => { cancelled = true; };
  }, [open, selected?.id, previewNonce]);

  const handleForceReload = async () => {
    clearBrowserTemplateCache();
    await refetch();
    setPreviewNonce(Date.now());
    toast.success("Caché limpio. Plantillas recargadas desde el servidor.");
  };

  const handleDownload = async () => {
    if (!selected && activos.length > 0) {
      toast.error("Selecciona una plantilla");
      return;
    }
    setDownloading(true);
    try {
      const freshUrl = selected ? bustCacheUrl(selected.asset_url, `${selected.version}-${Date.now()}`) : "";
      await onDownload(selected, freshUrl);
      await logCertExport({
        tipo,
        template: selected,
        persona_id: personaId,
        contexto: { ...(contexto || {}), persona_nombre: personaNombre },
        browserCacheHit: cacheResult?.cacheHit ?? false,
      });
      toast.success("Certificado descargado", {
        description: selected
          ? `Plantilla ${selected.nombre} · v${selected.version}`
          : "Diseño por código (sin plantilla)",
      });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("No se pudo descargar", { description: e?.message });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Descargar certificado · {CERT_TIPO_LABEL[tipo]}
          </DialogTitle>
          <DialogDescription>
            {personaNombre ? `Para: ${personaNombre}` : "Selecciona la plantilla oficial a usar."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <label className="text-xs font-medium text-muted-foreground">Plantilla</label>
              {isLoading ? (
                <div className="h-9 rounded-md border bg-muted animate-pulse mt-1" />
              ) : activos.length === 0 ? (
                <div className="text-sm text-muted-foreground mt-2">
                  No hay plantillas configuradas para este tipo. Se usará el diseño por código.
                </div>
              ) : (
                <Select value={selected?.id || ""} onValueChange={setSelectedId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Elige plantilla…" /></SelectTrigger>
                  <SelectContent>
                    {activos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nombre} · v{t.version}{t.es_default ? " · por defecto" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleForceReload} title="Forzar recarga de plantillas">
              <RefreshCw className="h-4 w-4 mr-1" /> Forzar recarga
            </Button>
          </div>

          {selected && (
            <div className="text-[11px] text-muted-foreground flex flex-wrap gap-2 items-center">
              <Badge variant="outline" className="font-mono">v{selected.version}</Badge>
              <Badge variant="outline" className="font-mono" title={selected.asset_id || ""}>
                asset {(selected.asset_id || "").slice(0, 8) || "—"}
              </Badge>
              <span>·</span>
              <span>{selected.asset_filename}</span>
              {selected.asset_size && <span>· {(selected.asset_size / 1024).toFixed(0)} KB</span>}
            </div>
          )}

          {checking && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Verificando versión…
            </div>
          )}
          {cacheResult && !checking && (
            <Alert variant={cacheResult.cacheHit ? "destructive" : "default"}>
              {cacheResult.cacheHit ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              <AlertDescription className="text-xs">{cacheResult.message}</AlertDescription>
            </Alert>
          )}

          {selected && (
            <div className="rounded-lg border overflow-hidden bg-muted/30">
              <img
                key={previewNonce}
                src={bustCacheUrl(selected.asset_url, `${selected.version}-${previewNonce}`)}
                alt={`Vista previa ${selected.nombre}`}
                className="w-full h-auto max-h-[55vh] object-contain bg-white"
                loading="lazy"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleDownload} disabled={downloading || checking}>
            {downloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
