import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "../surfaces/Modal";
import { Button } from "../primitives/Button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "brand";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

/** ConfirmDialog — patrón canónico para confirmar destructivos/mutaciones. */
export function ConfirmDialog({
  open, onOpenChange, title, description,
  confirmLabel = "Confirmar", cancelLabel = "Cancelar",
  tone = "brand", loading, onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon={tone === "danger" || tone === "warning" ? AlertTriangle : undefined}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>{cancelLabel}</Button>
          <Button
            variant={tone === "danger" ? "destructive" : tone === "warning" ? "primary" : "primary"}
            onClick={() => onConfirm()}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
