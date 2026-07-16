import * as React from "react";
import { cn } from "@/lib/utils";

/** Tag — etiqueta discreta, para metadatos en tablas o cards. */
export function Tag({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-5 px-1.5 rounded-sm text-[11px] font-medium",
        "bg-surface-2 text-fg-muted border border-border-subtle",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
