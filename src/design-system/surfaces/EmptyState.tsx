import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  variant?: "default" | "bordered" | "muted";
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * EmptyState — cero-dato canónico. Úsalo en tablas vacías, listas, tabs sin registros.
 */
export function EmptyState({
  icon: Icon, title, description, action, secondaryAction, variant = "default", size = "md", className,
}: EmptyStateProps) {
  const paddingMap = { sm: "py-8 px-4", md: "py-14 px-6", lg: "py-20 px-8" };
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variant === "bordered" && "border border-dashed border-border rounded-xl",
        variant === "muted" && "bg-surface-2/60 rounded-xl",
        paddingMap[size],
        className
      )}
    >
      {Icon && (
        <div className="mb-3 inline-flex items-center justify-center size-12 rounded-full bg-surface-2 text-fg-muted">
          <Icon className={size === "lg" ? "size-6" : "size-5"} />
        </div>
      )}
      <h3 className={cn("font-semibold text-fg", size === "lg" ? "text-lg" : "text-sm")}>{title}</h3>
      {description && (
        <p className={cn("text-fg-muted max-w-sm mx-auto mt-1.5", size === "lg" ? "text-sm" : "text-xs")}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-4 flex items-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
