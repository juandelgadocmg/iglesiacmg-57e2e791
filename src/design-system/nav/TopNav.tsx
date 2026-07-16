import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * TopNav — cabecera Linear-style: título/breadcrumbs a la izquierda,
 * búsqueda al centro, acciones a la derecha.
 */
export function TopNav({
  leading, center, actions, className,
}: {
  leading?: React.ReactNode;
  center?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "h-14 flex items-center gap-3 px-4 border-b border-border-subtle bg-surface-1/70 backdrop-blur",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">{leading}</div>
      <div className="flex-1 flex items-center justify-center max-w-xl mx-auto">{center}</div>
      <div className="flex items-center gap-1.5">{actions}</div>
    </header>
  );
}
