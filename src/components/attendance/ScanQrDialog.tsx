import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode, CheckCircle2, AlertTriangle, Loader2, Clock, Camera, Pause, Play, RotateCcw, SwitchCamera, WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { enqueueScan, flushQueue } from "@/lib/qrOfflineQueue";
import { toast } from "sonner";

const PUNT_COLOR: Record<string, string> = {
  "Excelente": "bg-success/15 text-success",
  "Puntual": "bg-success/15 text-success",
  "Tarde leve": "bg-amber-500/15 text-amber-700",
  "Tarde": "bg-orange-500/15 text-orange-700",
  "Muy tarde": "bg-destructive/15 text-destructive",
};

type Status = "scanning" | "paused" | "checking" | "success" | "already" | "error";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const READER_ID = "doxa-qr-reader";

// Map RPC error codes to friendly messages
const CODE_MSG: Record<string, string> = {
  unauthenticated: "Debes iniciar sesión para registrar tu asistencia.",
  not_found: "La reunión asociada al QR no existe.",
  qr_inactive: "Este QR ya no está activo o expiró. Pide al organizador que lo reactive.",
  no_persona: "Tu usuario no está vinculado a una persona de la congregación. Contacta al administrador.",
};

export default function ScanQrDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  const [status, setStatus] = useState<Status>("scanning");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<any>(null);
  const [servicioNombre, setServicioNombre] = useState<string>("");

  // Camera controls
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraId, setCameraId] = useState<string | undefined>(undefined);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

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

    // Validate session before calling RPC
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session) {
      setStatus("error");
      setMessage(CODE_MSG.unauthenticated);
      return;
    }

    // Preview servicio name (best-effort)
    const { data: servicio } = await supabase
      .from("servicios")
      .select("nombre, qr_activo, qr_expires_at")
      .eq("id", parsed.servicioId)
      .maybeSingle();
    if (servicio?.nombre) setServicioNombre(servicio.nombre);
    if (servicio && (!servicio.qr_activo || (servicio.qr_expires_at && new Date(servicio.qr_expires_at) < new Date()))) {
      setStatus("error");
      setMessage(CODE_MSG.qr_inactive);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("checkin_qr", {
        _servicio_id: parsed.servicioId,
        _token: parsed.token,
      });

      if (error) {
        setStatus("error");
        setMessage(error.message?.includes("Failed to fetch")
          ? "Sin conexión. Verifica tu internet e intenta de nuevo."
          : (error.message || "No se pudo registrar la asistencia."));
        return;
      }
      const payload = data as any;
      if (!payload?.ok) {
        setStatus("error");
        setMessage(CODE_MSG[payload?.code] || payload?.message || "No se pudo registrar la asistencia.");
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
    } catch (e: any) {
      setStatus("error");
      setMessage("No se pudo conectar con el servidor. Revisa tu conexión.");
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

  // Enumerate cameras once dialog opens
  useEffect(() => {
    if (!open) return;
    Html5Qrcode.getCameras()
      .then((devs) => {
        const list = (devs || []).map((d) => ({ id: d.id, label: d.label || "Cámara" }));
        setCameras(list);
        if (list.length && !cameraId) {
          const back = list.find((d) => /back|rear|environment|trasera/i.test(d.label));
          setCameraId((back || list[list.length - 1]).id);
        }
      })
      .catch(() => { /* keep facingMode fallback */ });
  }, [open, cameraId]);

  const startScanner = useCallback(async () => {
    await stopScanner();
    handledRef.current = false;
    setStatus("scanning");
    setMessage("");
    // wait for reader div
    await new Promise((r) => setTimeout(r, 50));
    try {
      const scanner = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = scanner;
      const config = { fps: 10, qrbox: { width: 240, height: 240 } } as const;
      const source = cameraId ? { deviceId: { exact: cameraId } } : { facingMode: facing };
      await scanner.start(source as any, config as any,
        (decoded) => { handleDecoded(decoded); },
        () => { /* ignore per-frame errors */ }
      );
    } catch (e: any) {
      setStatus("error");
      setMessage(
        e?.message?.toLowerCase?.().includes("permission")
          ? "Permiso de cámara denegado. Habilítalo en la configuración del navegador."
          : "No se pudo acceder a la cámara del dispositivo."
      );
    }
  }, [cameraId, facing, handleDecoded, stopScanner]);

  // Start / stop scanner with dialog open state, camera selection
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
    (async () => { if (!cancelled) await startScanner(); })();
    return () => { cancelled = true; stopScanner(); };
    // Restart when camera changes
  }, [open, cameraId, facing, startScanner, stopScanner]);

  const pauseScanner = useCallback(async () => {
    await stopScanner();
    setStatus("paused");
  }, [stopScanner]);

  const swapFacing = useCallback(() => {
    setCameraId(undefined);
    setFacing((f) => (f === "environment" ? "user" : "environment"));
  }, []);

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

        {/* Camera picker / toggle */}
        {(status === "scanning" || status === "paused") && (
          <div className="flex items-center gap-2">
            {cameras.length > 1 ? (
              <Select value={cameraId} onValueChange={(v) => setCameraId(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Seleccionar cámara" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={swapFacing}>
                <SwitchCamera className="h-3.5 w-3.5" />
                {facing === "environment" ? "Cámara trasera" : "Cámara frontal"}
              </Button>
            )}
            {status === "scanning" ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={pauseScanner}>
                <Pause className="h-3.5 w-3.5" /> Pausar
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={startScanner}>
                <Play className="h-3.5 w-3.5" /> Reanudar
              </Button>
            )}
          </div>
        )}

        <div className="relative">
          {/* Camera container is always mounted so html5-qrcode can attach */}
          <div
            id={READER_ID}
            className={
              status === "scanning" || status === "paused"
                ? "w-full overflow-hidden rounded-lg border bg-black aspect-square"
                : "hidden"
            }
          />

          {/* Framing guide overlay */}
          {status === "scanning" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative w-[62%] aspect-square">
                <span className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-md" />
                <span className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-md" />
                <span className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-md" />
                <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-md" />
              </div>
            </div>
          )}

          {status === "scanning" && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Camera className="h-3.5 w-3.5" /> Centra el QR dentro del recuadro…
            </div>
          )}

          {status === "paused" && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Pause className="h-3.5 w-3.5" /> Cámara en pausa
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
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={startScanner}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reintentar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
