import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

export interface KpiCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: { value: number; label?: string; positive?: boolean };
  icon?: React.ComponentType<{ className?: string }>;
  sparkline?: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "brand" | "accent" | "success" | "warning" | "danger" | "neutral";
  className?: string;
  onClick?: () => void;
}

const toneMap = {
  brand: "text-primary bg-primary/10",
  accent: "text-accent bg-accent/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  danger: "text-destructive bg-destructive/10",
  neutral: "text-fg-muted bg-surface-2",
} as const;

/** KpiCard — tarjeta canónica de métrica: label, valor, delta, sparkline. */
export function KpiCard({
  label, value, delta, icon: Icon, sparkline, hint, tone = "brand", className, onClick,
}: KpiCardProps) {
  const positive = delta ? (delta.positive ?? delta.value >= 0) : undefined;
  return (
    <Card
      padding="none"
      interactive={!!onClick}
      onClick={onClick}
      className={cn("relative overflow-hidden", className)}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">{label}</p>
          {Icon && (
            <span className={cn("inline-flex items-center justify-center size-8 rounded-lg", toneMap[tone])}>
              <Icon className="size-4" />
            </span>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[30px] leading-none font-bold tracking-tight text-fg font-mono tabular-nums">
            {value}
          </span>
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}
            >
              {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(delta.value).toFixed(1)}%
            </span>
          )}
        </div>
        {hint && <p className="mt-1 text-xs text-fg-muted">{hint}</p>}
      </div>
      {sparkline && (
        <div className="h-14 -mt-2 px-2 pb-1">{sparkline}</div>
      )}
    </Card>
  );
}
