import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScanLine, X, Pause, Play, RotateCcw, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  label?: string;
};

type Phase = "idle" | "starting" | "scanning" | "paused" | "error" | "success";
const MAX_RETRIES = 3;
const HINT_AFTER_MS = 5_000;

export default function ScanQrLinkButton({
  size = "sm",
  variant = "outline",
  className,
  label = "Escanear QR",
}: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastText, setLastText] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showLowLightTip, setShowLowLightTip] = useState(false);

  const containerId = useRef(`qr-scan-${Math.random().toString(36).slice(2, 8)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cancelledRef = useRef(false);
  const startedAtRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const clearTimers = () => {
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
  };

  const stopScanner = useCallback(async () => {
    const inst = scannerRef.current;
    scannerRef.current = null;
    if (!inst) return;
    try { await inst.stop(); } catch { /* already stopped */ }
    try { inst.clear(); } catch { /* ignore */ }
  }, []);

  const handleDecoded = useCallback((text: string) => {
    setLastText(text);
    setPhase("success");
    let url: URL | null = null;
    try { url = new URL(text); } catch { /* not a URL */ }
    if (!url) {
      toast.info("QR leído", { description: text });
      return;
    }
    if (url.origin === window.location.origin) {
      toast.success("Abriendo enlace…", { description: url.pathname + url.search });
      setOpen(false);
      navigate(url.pathname + url.search + url.hash);
    } else {
      toast.info("Enlace externo detectado", { description: url.href });
      window.open(url.href, "_blank", "noopener,noreferrer");
      setOpen(false);
    }
  }, [navigate]);

  const startScanner = useCallback(async (attempt: number) => {
    setError(null);
    setShowLowLightTip(false);
    setPhase("starting");
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
          if (cancelledRef.current) return;
          handleDecoded(decodedText);
        },
        () => { /* per-frame decode noise ignored */ },
      );
      if (cancelledRef.current) return;
      setPhase("scanning");
      setRetryCount(attempt);
      startedAtRef.current = Date.now();
      // Show low-light tip if no successful read in a few seconds
      hintTimerRef.current = setTimeout(() => setShowLowLightTip(true), HINT_AFTER_MS);
    } catch (e: any) {
      const msg = e?.message || "No se pudo acceder a la cámara.";
      const denied = /permission|denied|NotAllowed/i.test(msg);
      setError(msg);
      setPhase("error");
      await stopScanner();
      if (denied || cancelledRef.current) return;
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        setRetryCount(attempt + 1);
        retryTimerRef.current = setTimeout(() => {
          if (!cancelledRef.current) void startScanner(attempt + 1);
        }, delay);
      }
    }
  }, [handleDecoded, stopScanner]);

  useEffect(() => {
    if (!open) return;
    cancelledRef.current = false;
    setLastText(null);
    setRetryCount(0);
    void startScanner(0);
    return () => {
      cancelledRef.current = true;
      clearTimers();
      void stopScanner();
      setPhase("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handlePauseResume = async () => {
    const inst = scannerRef.current;
    if (!inst) return;
    if (phase === "scanning") {
      try { inst.pause(true); setPhase("paused"); clearTimers(); } catch {}
    } else if (phase === "paused") {
      try {
        inst.resume();
        setPhase("scanning");
        hintTimerRef.current = setTimeout(() => setShowLowLightTip(true), HINT_AFTER_MS);
      } catch {}
    }
  };

  const handleManualRetry = async () => {
    clearTimers();
    await stopScanner();
    setRetryCount(0);
    void startScanner(0);
  };

  const statusBadge = (() => {
    switch (phase) {
      case "starting":
        return <Badge variant="secondary">Iniciando cámara…</Badge>;
      case "scanning":
        return <Badge variant="secondary">Buscando código…</Badge>;
      case "paused":
        return <Badge variant="outline">En pausa</Badge>;
      case "error":
        return (
          <Badge variant="destructive">
            {retryCount > 0 && retryCount < MAX_RETRIES
              ? `Reintentando ${retryCount}/${MAX_RETRIES}…`
              : "Error de cámara"}
          </Badge>
        );
      case "success":
        return <Badge variant="secondary">Leído</Badge>;
      default:
        return null;
    }
  })();

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
              se abrirá aquí con los mismos filtros y estado.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <div
              id={containerId.current}
              className="w-full max-w-[320px] aspect-square overflow-hidden rounded-md border bg-black/60"
              aria-live="polite"
            />

            <div className="min-h-[1.5rem] flex items-center justify-center">
              {statusBadge}
            </div>

            {showLowLightTip && phase === "scanning" && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground rounded-md border p-2 w-full">
                <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  ¿Poca luz o QR pequeño? Acerca el código, sostén firme el dispositivo
                  y evita reflejos.
                </span>
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive text-center break-words">{error}</p>
            )}
            {lastText && phase !== "success" && (
              <p className="text-[11px] text-muted-foreground break-all text-center">
                Último: {lastText}
              </p>
            )}

            <div className="flex flex-wrap gap-2 w-full justify-center">
              {(phase === "scanning" || phase === "paused") && (
                <Button variant="outline" size="sm" onClick={handlePauseResume}>
                  {phase === "paused"
                    ? (<><Play className="h-3.5 w-3.5 mr-1.5" /> Reanudar</>)
                    : (<><Pause className="h-3.5 w-3.5 mr-1.5" /> Pausar</>)}
                </Button>
              )}
              {phase === "error" && (
                <Button variant="outline" size="sm" onClick={handleManualRetry}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reintentar
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5 mr-1.5" /> Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
