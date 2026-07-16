import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Banner full-width para anuncios de sistema (billing, upgrade, mantenimiento). */
export function Banner({
  tone = "brand", icon: Icon, children, actions, dismissible, onDismiss, className,
}: {
  tone?: "brand" | "accent" | "warning" | "info";
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  actions?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}) {
  const toneMap = {
    brand: "bg-primary text-primary-foreground",
    accent: "bg-accent text-accent-foreground",
    warning: "bg-warning text-warning-foreground",
    info: "bg-info text-info-foreground",
  };
  return (
    <div className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-sm", toneMap[tone], className)}>
      {Icon && <Icon className="size-4 shrink-0" />}
      <div className="flex-1 min-w-0">{children}</div>
      {actions}
      {dismissible && (
        <button onClick={onDismiss} className="p-1 rounded hover:bg-white/10" aria-label="Cerrar">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
