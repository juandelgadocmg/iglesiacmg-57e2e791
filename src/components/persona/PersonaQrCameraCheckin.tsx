import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  expectedCode: string;
  personaNombre: string;
  onMatch: () => void;
}

/**
 * Escáner QR con cámara para validar que el código escaneado coincide
 * con el QR de esta persona antes de confirmar el check-in.
 */
export default function PersonaQrCameraCheckin({ expectedCode, personaNombre, onMatch }: Props) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; message: string }>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const start = async () => {
    setStatus(null);
    const scanner = new Html5Qrcode("persona-qr-reader");
    scannerRef.current = scanner;
    setScanning(true);
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          if (decodedText === expectedCode) {
            setStatus({ kind: "ok", message: `QR de ${personaNombre} validado` });
            await stop();
            onMatch();
            setOpen(false);
          } else {
            setStatus({ kind: "err", message: "El QR no coincide con esta persona" });
          }
        },
        () => {}
      );
    } catch (err: any) {
      toast.error("No se pudo acceder a la cámara", { description: err?.message });
      setScanning(false);
    }
  };

  const stop = async () => {
    try {
      if (scannerRef.current?.isScanning) await scannerRef.current.stop();
    } catch { /* ignore */ }
    scannerRef.current = null;
    setScanning(false);
  };

  useEffect(() => {
    if (open) setTimeout(start, 300);
    return () => { void stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => setOpen(true)}
        disabled={!expectedCode}
      >
        <Camera className="h-4 w-4" /> Escanear QR con cámara
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { void stop(); setOpen(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4" /> Validar QR con cámara
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Apunta la cámara al QR impreso o mostrado por <span className="font-semibold text-foreground">{personaNombre}</span> para confirmar su identidad.
            </p>
            <div id="persona-qr-reader" className="w-full rounded-lg overflow-hidden border bg-black/5" />
            {status && (
              <div className={`flex items-center gap-2 rounded-md p-2 text-sm ${
                status.kind === "ok"
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              }`}>
                {status.kind === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {status.message}
              </div>
            )}
            {scanning && !status && (
              <p className="text-xs text-center text-muted-foreground animate-pulse">Escaneando…</p>
            )}
            <Button variant="outline" className="w-full" onClick={() => { void stop(); setOpen(false); }}>
              <X className="h-4 w-4 mr-1.5" /> Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
