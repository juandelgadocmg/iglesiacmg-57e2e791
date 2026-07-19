import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chip — filtro/tag interactivo con opción de eliminación.
 * Se usa en FilterBar, MultiSelect, tag inputs.
 */
export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "brand" | "accent";
  onRemove?: () => void;
  active?: boolean;
  disabled?: boolean;
  leading?: React.ReactNode;
}

const toneMap = {
  neutral: "bg-surface-2 text-fg border-border-subtle hover:bg-surface-3",
  brand: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15",
  accent: "bg-accent/10 text-accent border-accent/25 hover:bg-accent/15",
} as const;

export function Chip({
  className, tone = "neutral", active, disabled, onRemove, leading, children, ...props
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-medium",
        "transition-colors duration-[var(--motion-fast)] cursor-pointer select-none",
        toneMap[tone],
        active && "ring-2 ring-ring/40 border-primary/40",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      {...props}
    >
      {leading}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 -mr-1 opacity-60 hover:opacity-100 rounded-sm p-0.5"
          aria-label="Quitar"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
