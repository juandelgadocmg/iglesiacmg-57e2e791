import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eraser, Check, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  personaNombre: string;
  onSave: (dataUrl: string) => Promise<void> | void;
}

export default function SignatureCaptureDialog({ open, onOpenChange, personaNombre, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
    setHasInk(false);
  }, [open]);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    const { x, y } = pos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const { x, y } = pos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };
  const end = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const rect = c.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasInk(false);
  };

  const save = async () => {
    if (!hasInk) return;
    setSaving(true);
    try {
      const dataUrl = canvasRef.current!.toDataURL("image/png");
      await onSave(dataUrl);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Firma de asistencia</DialogTitle>
          <DialogDescription>{personaNombre} — firma con dedo o mouse.</DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-white overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            className="w-full h-48 block cursor-crosshair"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
          />
        </div>
        <div className="flex justify-between gap-2">
          <Button variant="outline" size="sm" onClick={clear} disabled={!hasInk}>
            <Eraser className="h-4 w-4 mr-1.5" /> Borrar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-1.5" /> Cancelar
            </Button>
            <Button size="sm" onClick={save} disabled={!hasInk || saving}>
              <Check className="h-4 w-4 mr-1.5" /> {saving ? "Guardando..." : "Guardar firma"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
