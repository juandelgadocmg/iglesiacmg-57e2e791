import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteConfirmDialogProps {
  title?: string;
  description?: string;
  onConfirm: () => Promise<void> | void;
  trigger?: React.ReactNode;
  /** Modo controlado: abre el diálogo sin trigger externo */
  isOpen?: boolean;
  /** Modo controlado: se invoca al cancelar o cerrar */
  onCancel?: () => void;
}

export default function DeleteConfirmDialog({
  title = "¿Eliminar registro?",
  description = "Esta acción no se puede deshacer. El registro será eliminado permanentemente.",
  onConfirm,
  trigger,
  isOpen,
  onCancel,
}: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const controlled = isOpen !== undefined;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && controlled) onCancel?.();
  };

  return (
    <AlertDialog open={controlled ? isOpen : undefined} onOpenChange={handleOpenChange}>
      {!controlled && (
        <AlertDialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Eliminar">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={controlled ? onCancel : undefined}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {loading ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
