/**
 * Toast helpers — envuelven sonner con tono semántico consistente.
 * Uso: `notify.success("Guardado", { description: "..." })`
 */
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";
import * as React from "react";

type Opts = { description?: React.ReactNode; action?: { label: string; onClick: () => void } };

export const notify = {
  success: (title: string, opts?: Opts) =>
    toast.success(title, { description: opts?.description, action: opts?.action, icon: <CheckCircle2 className="size-4 text-success" /> }),
  error: (title: string, opts?: Opts) =>
    toast.error(title, { description: opts?.description, action: opts?.action, icon: <XCircle className="size-4 text-destructive" /> }),
  warning: (title: string, opts?: Opts) =>
    toast.warning(title, { description: opts?.description, action: opts?.action, icon: <AlertTriangle className="size-4 text-warning" /> }),
  info: (title: string, opts?: Opts) =>
    toast.info(title, { description: opts?.description, action: opts?.action, icon: <Info className="size-4 text-info" /> }),
  message: (title: string, opts?: Opts) =>
    toast(title, { description: opts?.description, action: opts?.action }),
  loading: (title: string) => toast.loading(title),
  dismiss: (id?: string | number) => toast.dismiss(id),
  promise: toast.promise,
};

export { toast };
