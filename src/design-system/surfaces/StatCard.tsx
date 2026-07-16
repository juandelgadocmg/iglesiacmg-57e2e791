import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

/** StatCard — versión compacta de KpiCard, ideal para grids densos. */
export function StatCard({
  label, value, sub, icon: Icon, className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <Card padding="md" className={cn("flex items-center gap-3", className)}>
      {Icon && (
        <span className="inline-flex items-center justify-center size-9 rounded-md bg-surface-2 text-fg">
          <Icon className="size-4" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{label}</p>
        <p className="text-lg font-bold text-fg font-mono tabular-nums leading-none mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-fg-subtle mt-1 truncate">{sub}</p>}
      </div>
    </Card>
  );
}
