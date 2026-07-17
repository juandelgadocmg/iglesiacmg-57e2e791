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
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-muted">{label}</p>
          {Icon && (
            <span className={cn("inline-flex items-center justify-center h-11 w-11 rounded-xl", toneMap[tone])}>
              <Icon className="h-6 w-6" />
            </span>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-2 flex-wrap">
          <span className="text-3xl md:text-4xl leading-none font-bold tracking-tight text-fg font-mono tabular-nums">
            {value}
          </span>
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
                positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}
            >
              {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(delta.value).toFixed(1)}%
            </span>
          )}
        </div>
        {hint && <p className="mt-2 text-sm text-fg-muted">{hint}</p>}
      </div>
      {sparkline && (
        <div className="h-16 -mt-2 px-2 pb-2">{sparkline}</div>
      )}
    </Card>
  );
}
