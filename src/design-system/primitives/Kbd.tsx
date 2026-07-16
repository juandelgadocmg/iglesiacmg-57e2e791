import * as React from "react";
import { cn } from "@/lib/utils";

/** Kbd — muestra atajos de teclado. */
export function Kbd({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5",
        "font-mono text-[10.5px] font-semibold text-fg-muted",
        "bg-surface-1 border border-border rounded-sm shadow-elev-1",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
