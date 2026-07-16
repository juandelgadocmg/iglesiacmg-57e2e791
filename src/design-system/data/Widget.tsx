import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "../surfaces/Card";

/**
 * Widget — shell canónico para bloques de dashboard.
 * Cabecera con título opcional, badge/acciones y cuerpo libre.
 */
export function Widget({
  title, subtitle, icon: Icon, actions, children, footer, tone = "default", padding = "md", className,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  tone?: "default" | "brand" | "accent";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}) {
  const padMap = { none: "", sm: "p-3", md: "p-4", lg: "p-5" };
  return (
    <Card padding="none" className={cn("flex flex-col", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-border-subtle">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && (
              <span className={cn(
                "inline-flex items-center justify-center size-6 rounded-md",
                tone === "brand" && "bg-primary/10 text-primary",
                tone === "accent" && "bg-accent/10 text-accent",
                tone === "default" && "bg-surface-2 text-fg-muted"
              )}>
                <Icon className="size-3.5" />
              </span>
            )}
            <div className="min-w-0">
              {title && <h4 className="text-[13px] font-semibold text-fg truncate">{title}</h4>}
              {subtitle && <p className="text-[11px] text-fg-subtle">{subtitle}</p>}
            </div>
          </div>
          {actions ?? (
            <button className="p-1 rounded hover:bg-surface-2 text-fg-subtle" aria-label="Más">
              <MoreHorizontal className="size-3.5" />
            </button>
          )}
        </div>
      )}
      <div className={cn("flex-1", padMap[padding])}>{children}</div>
      {footer && <div className="px-4 py-2.5 border-t border-border-subtle bg-surface-2/40 text-xs text-fg-muted">{footer}</div>}
    </Card>
  );
}
