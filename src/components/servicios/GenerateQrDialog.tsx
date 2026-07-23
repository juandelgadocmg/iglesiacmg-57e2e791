import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QrCode, Copy, RefreshCw, Power, Printer, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  servicioId: string;
  servicioNombre: string;
  currentToken?: string | null;
  qrActivo?: boolean;
  qrExpiresAt?: string | null;
  trigger?: React.ReactNode;
}

/**
 * Genera y controla el QR de asistencia para una reunión.
 * Al activarlo genera un token único y una URL pública /check-in/:id?token=... que expira.
 */
export default function GenerateQrDialog({
  servicioId,
  servicioNombre,
  currentToken,
  qrActivo,
  qrExpiresAt,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(180);
  const [token, setToken] = useState<string | null>(currentToken || null);
  const [activo, setActivo] = useState<boolean>(!!qrActivo);
  const [expiresAt, setExpiresAt] = useState<string | null>(qrExpiresAt || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(currentToken || null);
    setActivo(!!qrActivo);
    setExpiresAt(qrExpiresAt || null);
  }, [currentToken, qrActivo, qrExpiresAt]);

  const url = useMemo(() => {
    if (!token) return "";
    return `${window.location.origin}/check-in/${servicioId}?token=${token}`;
  }, [servicioId, token]);

  const activar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("servicio_qr_activate", {
        _servicio_id: servicioId,
        _minutes: minutes,
      });
      if (error) throw error;
      const payload = data as any;
      setToken(payload.token);
      setExpiresAt(payload.expires_at);
      setActivo(true);
      toast.success("QR activado", { description: `Vigente por ${minutes} min` });
    } catch (e: any) {
      toast.error("No se pudo activar el QR", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const cerrar = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("servicio_qr_close", { _servicio_id: servicioId });
      if (error) throw error;
      setActivo(false);
      toast.success("QR cerrado");
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Enlace copiado");
  };

  const imprimir = () => {
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    const canvas = document.getElementById("qr-print-canvas") as HTMLCanvasElement | null;
    const img = canvas ? canvas.toDataURL("image/png") : "";
    w.document.write(`<!doctype html><html><head><title>QR ${servicioNombre}</title>
      <style>body{font-family:system-ui;text-align:center;padding:40px}h1{font-size:22px;margin-bottom:6px}p{color:#555}img{margin:24px auto;max-width:340px}</style>
      </head><body>
        <h1>${servicioNombre}</h1>
        <p>Escanea el QR con tu cuenta de DOXA para registrar tu asistencia</p>
        <img src="${img}" />
        <p style="font-size:11px;word-break:break-all">${url}</p>
        <script>window.onload=()=>window.print()</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <QrCode className="h-4 w-4" /> Generar QR de Asistencia
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" /> QR de Asistencia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm">
            <div className="font-medium">{servicioNombre}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={activo ? "default" : "secondary"}>
                {activo ? "Activo" : "Inactivo"}
              </Badge>
              {activo && expiresAt && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Expira: {new Date(expiresAt).toLocaleString("es-CO")}
                </span>
              )}
            </div>
          </div>

          {activo && token ? (
            <>
              <div className="flex items-center justify-center bg-white rounded-lg p-4 border">
                <QRCodeCanvas id="qr-print-canvas" value={url} size={240} includeMargin />
              </div>
              <div className="flex gap-2">
                <Input readOnly value={url} className="text-xs" />
                <Button size="icon" variant="outline" onClick={copiar} aria-label="Copiar">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={imprimir} className="gap-1.5">
                  <Printer className="h-4 w-4" /> Imprimir
                </Button>
                <Button variant="outline" onClick={activar} disabled={loading} className="gap-1.5">
                  <RefreshCw className="h-4 w-4" /> Regenerar
                </Button>
              </div>
              <Button variant="destructive" onClick={cerrar} disabled={loading} className="w-full gap-1.5">
                <Power className="h-4 w-4" /> Cerrar QR
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium">Duración (minutos)</label>
                <Input
                  type="number" min={5} max={720}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value) || 180)}
                />
                <p className="text-xs text-muted-foreground">
                  El QR expira automáticamente al terminar el tiempo o cuando lo cierres.
                </p>
              </div>
              <Button onClick={activar} disabled={loading} className="w-full gap-1.5">
                <QrCode className="h-4 w-4" /> Activar QR
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
