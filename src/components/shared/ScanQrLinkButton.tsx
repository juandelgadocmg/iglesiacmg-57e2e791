import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScanLine, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  label?: string;
};

/**
 * Opens the device camera to scan a QR code. When the scanned value is a URL
 * belonging to this same origin, we navigate in-app (preserving SPA state and
 * skipping a full reload); otherwise we open it in a new tab so the user can
 * still make the choice. External non-URL payloads are shown as read-only text.
 *
 * Designed so a shared link QR from another Doxa device opens in this one
 * with all deep-link state (filters, thread, focused message) restored.
 */
export default function ScanQrLinkButton({
  size = "sm",
  variant = "outline",
  className,
  label = "Escanear QR",
}: Props) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastText, setLastText] = useState<string | null>(null);
  const containerId = useRef(`qr-scan-${Math.random().toString(36).slice(2, 8)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const start = async () => {
      setError(null);
      setLastText(null);
      try {
        const inst = new Html5Qrcode(containerId.current, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = inst;
        await inst.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (cancelled) return;
            handleDecoded(decodedText);
          },
          () => { /* per-frame decode noise ignored */ },
        );
        if (!cancelled) setScanning(true);
      } catch (e: any) {
        setError(e?.message || "No se pudo acceder a la cámara. Revisa los permisos.");
      }
    };
    void start();
    return () => {
      cancelled = true;
      const inst = scannerRef.current;
      scannerRef.current = null;
      setScanning(false);
      if (inst) {
        inst.stop().catch(() => {}).finally(() => {
          try { inst.clear(); } catch {}
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDecoded = (text: string) => {
    setLastText(text);
    let url: URL | null = null;
    try { url = new URL(text); } catch { /* not a URL */ }
    if (!url) {
      toast.info("QR leído", { description: text });
      return;
    }
    if (url.origin === window.location.origin) {
      toast.success("Abriendo enlace…", { description: url.pathname + url.search });
      setOpen(false);
      // SPA navigation preserves auth and avoids a full reload
      navigate(url.pathname + url.search + url.hash);
    } else {
      // Cross-origin: let the user decide (opens in new tab)
      toast.info("Enlace externo detectado", { description: url.href });
      window.open(url.href, "_blank", "noopener,noreferrer");
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={() => setOpen(true)}
        className={cn("gap-1.5", className)}
        aria-label={label}
        title={label}
      >
        <ScanLine className="h-3.5 w-3.5" />
        {size !== "icon" && <span className="hidden sm:inline">{label}</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear enlace compartido</DialogTitle>
            <DialogDescription>
              Apunta la cámara al QR generado en Eventos o Mensajes. Si el enlace es de Doxa,
              se abrirá en esta app con los mismos filtros y estado.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <div
              id={containerId.current}
              className="w-full max-w-[320px] aspect-square overflow-hidden rounded-md border bg-black/60"
              aria-live="polite"
            />
            {!scanning && !error && (
              <p className="text-xs text-muted-foreground">Iniciando cámara…</p>
            )}
            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}
            {lastText && (
              <p className="text-[11px] text-muted-foreground break-all text-center">
                Último: {lastText}
              </p>
            )}
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="h-3.5 w-3.5 mr-1.5" /> Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
