import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium border transition-colors " +
    "[&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "bg-surface-2 text-fg border-border-subtle",
        brand: "bg-primary/10 text-primary border-primary/20",
        accent: "bg-accent/10 text-accent border-accent/20",
        success: "bg-[hsl(var(--success-soft))] text-success border-success/25",
        warning: "bg-[hsl(var(--warning-soft))] text-warning border-warning/30",
        danger: "bg-[hsl(var(--danger-soft))] text-destructive border-destructive/25",
        info: "bg-[hsl(var(--info-soft))] text-info border-info/25",
        outline: "bg-transparent text-fg-muted border-border",
      },
      size: {
        xs: "text-[10px] px-1.5 py-0.5 rounded-sm",
        sm: "text-[11px] px-2 py-0.5 rounded-md",
        md: "text-xs px-2.5 py-1 rounded-md",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}
