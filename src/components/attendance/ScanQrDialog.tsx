import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, CheckCircle2, AlertTriangle, Loader2, Clock, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PUNT_COLOR: Record<string, string> = {
  "Excelente": "bg-success/15 text-success",
  "Puntual": "bg-success/15 text-success",
  "Tarde leve": "bg-amber-500/15 text-amber-700",
  "Tarde": "bg-orange-500/15 text-orange-700",
  "Muy tarde": "bg-destructive/15 text-destructive",
};

type Status = "scanning" | "checking" | "success" | "already" | "error";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const READER_ID = "doxa-qr-reader";

export default function ScanQrDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const [status, setStatus] = useState<Status>("scanning");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<any>(null);
  const [servicioNombre, setServicioNombre] = useState<string>("");

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
      await s.clear();
    } catch { /* noop */ }
  }, []);

  const parseQr = (text: string): { servicioId: string; token: string } | null => {
    try {
      const url = new URL(text);
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("check-in");
      const servicioId = idx >= 0 ? parts[idx + 1] : parts[parts.length - 1];
      const token = url.searchParams.get("token");
      if (!servicioId || !token) return null;
      return { servicioId, token };
    } catch {
      return null;
    }
  };

  const handleDecoded = useCallback(async (decoded: string) => {
    if (handledRef.current) return;
    handledRef.current = true;
    await stopScanner();

    const parsed = parseQr(decoded);
    if (!parsed) {
      setStatus("error");
      setMessage("Código QR no válido. Escanea un QR de asistencia de DOXA.");
      return;
    }

    setStatus("checking");
    const { data: servicio } = await supabase
      .from("servicios")
      .select("nombre")
      .eq("id", parsed.servicioId)
      .maybeSingle();
    if (servicio?.nombre) setServicioNombre(servicio.nombre);

    const { data, error } = await supabase.rpc("checkin_qr", {
      _servicio_id: parsed.servicioId,
      _token: parsed.token,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message || "No se pudo registrar la asistencia.");
      return;
    }
    const payload = data as any;
    if (!payload?.ok) {
      setStatus("error");
      setMessage(payload?.message || "No se pudo registrar la asistencia.");
      return;
    }
    setResult(payload);
    if (payload.code === "already") {
      setStatus("already");
      setMessage("Ya registraste tu asistencia.");
    } else {
      setStatus("success");
      setMessage(payload.message || "¡Asistencia registrada!");
    }
  }, [stopScanner]);

  // Auto-close after 3s on success/already
  useEffect(() => {
    if (status !== "success" && status !== "already") return;
    const t = setTimeout(() => {
      onOpenChange(false);
      navigate("/");
    }, 3000);
    return () => clearTimeout(t);
  }, [status, onOpenChange, navigate]);

  // Start / stop scanner with dialog
  useEffect(() => {
    if (!open) {
      handledRef.current = false;
      setStatus("scanning");
      setMessage("");
      setResult(null);
      setServicioNombre("");
      stopScanner();
      return;
    }

    let cancelled = false;
    const start = async () => {
      // wait a tick for the reader div to mount
      await new Promise((r) => setTimeout(r, 50));
      if (cancelled) return;
      try {
        const scanner = new Html5Qrcode(READER_ID, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => { handleDecoded(decoded); },
          () => { /* ignore per-frame errors */ }
        );
      } catch (e: any) {
        setStatus("error");
        setMessage(
          e?.message?.includes("Permission")
            ? "Permiso de cámara denegado. Habilítalo en la configuración del navegador."
            : "No se pudo acceder a la cámara del dispositivo."
        );
      }
    };
    start();
    return () => { cancelled = true; stopScanner(); };
  }, [open, handleDecoded, stopScanner]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Escanear QR de asistencia
          </DialogTitle>
          <DialogDescription>
            Apunta la cámara al código QR de la reunión.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          {/* Camera container is always mounted so html5-qrcode can attach */}
          <div
            id={READER_ID}
            className={
              status === "scanning"
                ? "w-full overflow-hidden rounded-lg border bg-black aspect-square"
                : "hidden"
            }
          />

          {status === "scanning" && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Camera className="h-3.5 w-3.5" /> Buscando código QR…
            </div>
          )}

          {status === "checking" && (
            <div className="text-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Registrando asistencia…</p>
            </div>
          )}

          {(status === "success" || status === "already") && (
            <div className="text-center py-6 space-y-3 animate-scale-in">
              <div className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-14 w-14 text-success animate-fade-in" />
              </div>
              <p className="text-foreground font-semibold text-lg">
                {status === "already" ? "Ya registraste tu asistencia" : "✅ Asistencia registrada"}
              </p>
              {(servicioNombre || result?.servicio) && (
                <p className="text-sm text-muted-foreground">{servicioNombre || result?.servicio}</p>
              )}
              {result?.checkin_time && (
                <p className="text-xs text-muted-foreground">
                  {new Date(result.checkin_time).toLocaleString("es-CO")}
                </p>
              )}
              {result?.puntualidad && (
                <Badge className={PUNT_COLOR[result.puntualidad] || ""}>
                  <Clock className="h-3 w-3 mr-1" /> {result.puntualidad}
                </Badge>
              )}
              <p className="text-[11px] text-muted-foreground pt-2">Cerrando automáticamente…</p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-6 space-y-3">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-sm text-foreground">{message}</p>
              <Button
                variant="outline"
                onClick={() => {
                  handledRef.current = false;
                  setStatus("scanning");
                  setMessage("");
                }}
              >
                Reintentar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
