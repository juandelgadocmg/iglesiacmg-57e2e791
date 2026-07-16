import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "../primitives/Badge";

export interface TabItem {
  value: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (v: string) => void;
  variant?: "underline" | "pill" | "segmented";
  size?: "sm" | "md";
  className?: string;
}

/** Tabs — 3 variantes: underline (Stripe), pill (Linear), segmented (iOS). */
export function Tabs({ items, value, onChange, variant = "underline", size = "md", className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center",
        variant === "underline" && "gap-1 border-b border-border-subtle",
        variant === "pill" && "gap-1 p-1",
        variant === "segmented" && "gap-0 p-0.5 rounded-lg bg-surface-2 border border-border-subtle",
        className
      )}
    >
      {items.map((t) => {
        const active = t.value === value;
        const Icon = t.icon;
        const base = size === "sm" ? "text-xs h-8 px-3" : "text-sm h-9 px-3.5";
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            disabled={t.disabled}
            onClick={() => onChange(t.value)}
            className={cn(
              "inline-flex items-center gap-1.5 font-medium transition-colors whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none",
              base,
              variant === "underline" && cn(
                "border-b-2 -mb-px rounded-none",
                active
                  ? "text-primary border-primary"
                  : "text-fg-muted border-transparent hover:text-fg hover:border-border-strong"
              ),
              variant === "pill" && cn(
                "rounded-full",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-fg-muted hover:bg-surface-2 hover:text-fg"
              ),
              variant === "segmented" && cn(
                "flex-1 rounded-md",
                active
                  ? "bg-surface-1 text-fg shadow-elev-1"
                  : "text-fg-muted hover:text-fg"
              )
            )}
          >
            {Icon && <Icon className="size-4" />}
            {t.label}
            {t.badge != null && <Badge tone={active ? "brand" : "neutral"} size="xs">{t.badge}</Badge>}
          </button>
        );
      })}
    </div>
  );
}
