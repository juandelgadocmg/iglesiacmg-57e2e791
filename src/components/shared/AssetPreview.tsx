import { useAssetBlobUrl, openAsset } from "@/lib/openAsset";
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle, Loader2 } from "lucide-react";

interface AssetPreviewProps {
  url: string | null | undefined;
  bucket?: string;
  path?: string | null;
  kind: "image" | "pdf" | "video" | "audio" | "other";
  filename?: string;
  className?: string;
}

/**
 * Renderiza una vista previa de un archivo de Storage usando un blob: URL
 * local (evita bloqueos tipo ERR_BLOCKED_BY_CLIENT en /storage/v1/object/public/).
 */
export default function AssetPreview({ url, bucket, path, kind, filename, className }: AssetPreviewProps) {
  const { url: blobUrl, loading, error } = useAssetBlobUrl(
    url || (bucket && path) ? { url: url || undefined, bucket, path: path || undefined } : null
  );

  if (loading) {
    return (
      <div className={"flex items-center justify-center p-8 text-muted-foreground gap-2 " + (className || "")}>
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando vista previa…
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className={"flex flex-col items-center justify-center p-8 gap-3 text-center " + (className || "")}>
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <div className="space-y-1">
          <p className="font-medium text-sm">No se pudo cargar el archivo</p>
          <p className="text-xs text-muted-foreground max-w-md">
            Una extensión del navegador (bloqueador de anuncios o privacidad) está bloqueando la descarga.
            Desactívala para este sitio y recarga la página.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => openAsset({ url: url || undefined, bucket, path: path || undefined, filename, download: true })}>
          <Download className="h-3 w-3 mr-1" /> Intentar descargar
        </Button>
      </div>
    );
  }

  if (kind === "image") return <img src={blobUrl} alt={filename || ""} className={className || "max-h-[70vh] mx-auto"} />;
  if (kind === "pdf") return <iframe src={blobUrl} title={filename || "PDF"} className={className || "w-full h-[70vh]"} />;
  if (kind === "video") return <video src={blobUrl} controls className={className || "w-full max-h-[70vh] bg-black"} />;
  if (kind === "audio") return <audio src={blobUrl} controls className={className || "w-full"} />;

  return (
    <div className="p-4 text-center space-y-2">
      <p className="text-sm text-muted-foreground">No hay vista previa disponible para este tipo de archivo.</p>
      <Button size="sm" onClick={() => openAsset({ url: url || undefined, bucket, path: path || undefined, filename, download: true })}>
        <Download className="h-3 w-3 mr-1" /> Descargar
      </Button>
    </div>
  );
}
