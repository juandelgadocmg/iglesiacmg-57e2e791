import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, ImageUp, QrCode, RefreshCw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  eventoId?: string;
  onAsistenciaMarked?: () => void;
  onScan?: (decodedText: string) => void;
  onClose?: () => void;
}

export default function QrEventoScanner({
  eventoId,
  onAsistenciaMarked,
  onScan,
  onClose,
}: Props) {
  const isInlineMode = typeof onScan === "function";
  const uniqueId = useId().replace(/:/g, "");
  const readerElementId = isInlineMode ? `qr-inline-reader-${uniqueId}` : `qr-evento-reader-${uniqueId}`;

  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDecodedQr = async (decodedText: string) => {
    const clean = (decodedText || "").trim();
    if (!clean) return;

    if (isInlineMode && onScan) {
      if (scannedRef.current.has(clean)) return;
      scannedRef.current.add(clean);
      await stopScanner();
      onScan(clean);
      return;
    }

    if (scannedRef.current.has(clean)) return;
    scannedRef.current.add(clean);

    // Look up persona by qr_code or id
    const { data: persona, error: pErr } = await supabase
      .from("personas")
      .select("id, nombres, apellidos")
      .or(`qr_code.eq.${clean},id.eq.${clean}`)
      .maybeSingle();

    if (pErr || !persona) {
      toast.error("Código QR no reconocido");
      setTimeout(() => scannedRef.current.delete(clean), 2000);
      return;
    }

    if (!eventoId) {
      onAsistenciaMarked?.();
      return;
    }

    // Find their inscription for this event
    const { data: insc, error: iErr } = await supabase
      .from("inscripciones")
      .select("id, confirmado")
      .eq("evento_id", eventoId)
      .eq("persona_id", persona.id)
      .maybeSingle();

    if (iErr || !insc) {
      toast.error(`${persona.nombres} ${persona.apellidos} no está inscrito/a en este evento`);
      setTimeout(() => scannedRef.current.delete(clean), 2000);
      return;
    }

    if (insc.confirmado) {
      toast.info(`${persona.nombres} ${persona.apellidos} ya tiene asistencia registrada`);
      return;
    }

    // Mark as present
    const { error: uErr } = await supabase
      .from("inscripciones")
      .update({ confirmado: true })
      .eq("id", insc.id);

    if (uErr) {
      toast.error("Error al registrar asistencia");
      setTimeout(() => scannedRef.current.delete(clean), 2000);
      return;
    }

    const nombre = `${persona.nombres} ${persona.apellidos}`;
    setCount(c => c + 1);
    onAsistenciaMarked?.();
    toast.success(`✓ ${nombre}`, { description: "Asistencia registrada" });
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current?.clear();
    } catch {}
    scannerRef.current = null;
    setScanning(false);
  };

  const startScanner = async () => {
    const el = document.getElementById(readerElementId);
    if (!el) return;

    await stopScanner();
    setCameraError(null);
    scannedRef.current.clear();

    const scanner = new Html5Qrcode(readerElementId, {
      verbose: false,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    } as any);
    scannerRef.current = scanner;
    setScanning(true);

    const scanConfig = {
      fps: 15,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth || 240, viewfinderHeight || 240);
        const size = Math.max(150, Math.min(240, Math.floor(minEdge * 0.8)));
        return { width: size, height: size };
      },
      aspectRatio: 1.0,
    };

    try {
      await scanner.start(
        { facingMode: "environment" },
        scanConfig,
        (decodedText) => {
          handleDecodedQr(decodedText);
        },
        () => {}
      );
    } catch {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          // Preferir cámara trasera si existe, si no la primera cámara disponible (ej. webcam de portátil)
          const backCam = cameras.find(c => /back|trasera|environment|rear/i.test(c.label));
          const camId = backCam ? backCam.id : cameras[0].id;
          await scanner.start(
            camId,
            scanConfig,
            (decodedText) => {
              handleDecodedQr(decodedText);
            },
            () => {}
          );
        } else {
          await scanner.start(
            { facingMode: "user" },
            scanConfig,
            (decodedText) => {
              handleDecodedQr(decodedText);
            },
            () => {}
          );
        }
      } catch (err: any) {
        setCameraError(err?.message || "No se pudo acceder a la cámara. Puedes subir o tomar una foto del código QR.");
        setScanning(false);
      }
    }
  };

  const handleScanImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await stopScanner();
      const tempScanner = new Html5Qrcode(readerElementId, {
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      } as any);
      const decodedText = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      await handleDecodedQr(decodedText);
    } catch {
      toast.error("No se detectó un código QR válido en la imagen", {
        description: "Intenta acercar más el código QR o asegúrate de que tenga buena iluminación."
      });
      if (isInlineMode || open) {
        setTimeout(startScanner, 300);
      }
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (isInlineMode) {
      const timer = setTimeout(startScanner, 150);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    }
  }, [isInlineMode]);

  useEffect(() => {
    if (!isInlineMode && open) {
      const timer = setTimeout(startScanner, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    }
  }, [open, isInlineMode]);

  const handleClose = () => {
    stopScanner();
    setOpen(false);
    scannedRef.current.clear();
    setCount(0);
    onClose?.();
  };

  // Modo inline para CheckInView y CarnesView
  if (isInlineMode) {
    return (
      <div className="w-full space-y-3 p-3 bg-slate-900 text-white">
        <div
          id={readerElementId}
          className="w-full min-h-[240px] rounded-xl overflow-hidden bg-black flex items-center justify-center"
        />

        {cameraError ? (
          <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-xs text-amber-100 space-y-2 text-center">
            <p>{cameraError}</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 text-xs font-bold gap-1.5"
              onClick={startScanner}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reintentar Cámara
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-center text-blue-200 font-medium animate-pulse flex items-center justify-center gap-1.5">
            <Camera className="w-3.5 h-3.5" /> Apunta al código QR del sticker o carné...
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleScanImageFile}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full h-9 text-xs font-bold gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white border-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageUp className="w-3.5 h-3.5" /> Escanear desde Foto / Imagen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setOpen(true)}>
        <QrCode className="h-3.5 w-3.5" /> Lector QR
      </Button>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> Escanear QR de Asistencia
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Apunta la cámara al código QR de la persona para registrar su asistencia automáticamente.
            </p>
            <div id={readerElementId} className="w-full min-h-[250px] rounded-lg overflow-hidden bg-black" />
            {scanning && (
              <p className="text-xs text-center text-muted-foreground animate-pulse">
                Escaneando... ({count} registrados)
              </p>
            )}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleScanImageFile}
              />
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageUp className="h-4 w-4 mr-1.5" /> Subir Foto QR
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                <X className="h-4 w-4 mr-1.5" /> Cerrar escáner
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
