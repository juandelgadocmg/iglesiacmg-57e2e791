import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger";

const cfg: Record<Tone, { icon: any; bg: string; border: string; fg: string }> = {
  info:    { icon: Info,          bg: "bg-info/10",       border: "border-info/25",       fg: "text-info" },
  success: { icon: CheckCircle2,  bg: "bg-success/10",    border: "border-success/25",    fg: "text-success" },
  warning: { icon: AlertTriangle, bg: "bg-warning/10",    border: "border-warning/30",    fg: "text-warning" },
  danger:  { icon: XCircle,       bg: "bg-destructive/10",border: "border-destructive/25",fg: "text-destructive" },
};

export interface CalloutProps {
  tone?: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function Callout({ tone = "info", title, children, actions, dismissible, onDismiss, className }: CalloutProps) {
  const c = cfg[tone];
  const Icon = c.icon;
  return (
    <div
      role="alert"
      className={cn("relative flex gap-3 rounded-xl border px-4 py-3", c.bg, c.border, className)}
    >
      <Icon className={cn("size-4 mt-0.5 shrink-0", c.fg)} />
      <div className="flex-1 min-w-0">
        {title && <p className={cn("text-sm font-semibold", c.fg)}>{title}</p>}
        {children && <div className="text-xs text-fg-muted mt-0.5">{children}</div>}
        {actions && <div className="mt-2 flex items-center gap-2">{actions}</div>}
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn("shrink-0 p-1 rounded-md hover:bg-black/5", c.fg)}
          aria-label="Cerrar"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export const InlineAlert = Callout; // alias semántico
