import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const REASONS = [
  { value: "duplicado", label: "Duplicado" },
  { value: "fallecido", label: "Fallecido" },
  { value: "retirado", label: "Retirado de la iglesia" },
  { value: "solicitud_1581", label: "Solicitud Ley 1581 (habeas data)" },
  { value: "error_registro", label: "Error de registro" },
  { value: "otro", label: "Otro" },
];

interface Props {
  personaId: string;
  personaNombre: string;
  onConfirm: () => Promise<void> | void;
  trigger?: React.ReactNode;
}

export default function DeletePersonaDialog({ personaId, personaNombre, onConfirm, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState<string>("");
  const [detalle, setDetalle] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setMotivo(""); setDetalle(""); };

  const handleConfirm = async () => {
    if (!motivo) {
      toast.error("Debes seleccionar un motivo de eliminación");
      return;
    }
    if (motivo === "otro" && detalle.trim().length < 5) {
      toast.error("Describe el motivo (mín. 5 caracteres)");
      return;
    }
    setLoading(true);
    try {
      // 1) Registrar el motivo en auditoría ANTES de eliminar
      try {
        await supabase.rpc("log_persona_action", {
          _persona_id: personaId,
          _action: "PROFILE_QUICK_ACTION",
          _details: {
            kind: "delete_reason",
            persona_nombre: personaNombre,
            motivo,
            motivo_label: REASONS.find(r => r.value === motivo)?.label,
            detalle: detalle.trim() || null,
            at: new Date().toISOString(),
          } as any,
        });
      } catch (e) {
        console.warn("[DeletePersonaDialog] no se pudo registrar motivo:", e);
      }
      // 2) Ejecutar eliminación
      await onConfirm();
      setOpen(false);
      reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Eliminar persona">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> ¿Eliminar a {personaNombre}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción es permanente. Se registrará en auditoría con el motivo indicado y el usuario que la realiza.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label className="text-sm font-medium">Motivo de eliminación *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecciona un motivo…" /></SelectTrigger>
              <SelectContent>
                {REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">
              Detalle {motivo === "otro" ? "*" : "(opcional)"}
            </Label>
            <Textarea
              value={detalle}
              onChange={e => setDetalle(e.target.value)}
              placeholder="Contexto adicional para la auditoría…"
              rows={3}
              maxLength={500}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">{detalle.length}/500</p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
            disabled={loading || !motivo}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Eliminando…" : "Eliminar definitivamente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
