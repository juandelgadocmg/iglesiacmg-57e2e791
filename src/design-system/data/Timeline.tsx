import * as React from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { EmptyState } from "../surfaces/EmptyState";
import { Activity } from "lucide-react";

export interface TimelineEvent {
  id: string;
  date: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "brand" | "accent" | "success" | "warning" | "danger" | "info" | "neutral";
}

const toneMap = {
  brand: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  neutral: "bg-surface-3 text-fg-muted",
} as const;

/**
 * Timeline — línea vertical con marcadores. Diseño Linear/Notion.
 * Para virtualización con cientos de eventos, envuelve con `@tanstack/react-virtual`.
 */
export function Timeline({ events, className, empty }: { events: TimelineEvent[]; className?: string; empty?: React.ReactNode }) {
  if (events.length === 0) {
    return empty ?? <EmptyState icon={Activity} title="Sin actividad" description="Aún no hay eventos registrados." variant="muted" size="sm" />;
  }
  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border-subtle" aria-hidden />
      <ul className="space-y-4">
        {events.map((e) => {
          const Icon = e.icon;
          let dateStr = e.date;
          try { dateStr = format(parseISO(e.date), "d MMM yyyy · HH:mm", { locale: es }); } catch { /* raw */ }
          return (
            <li key={e.id} className="relative pl-12">
              <div className={cn(
                "absolute left-0 top-0 h-10 w-10 rounded-full flex items-center justify-center ring-4 ring-background",
                toneMap[e.tone || "neutral"]
              )}>
                {Icon ? <Icon className="size-4" /> : <span className="size-1.5 rounded-full bg-current" />}
              </div>
              <div className="bg-card border border-border-subtle rounded-xl p-3 shadow-elev-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg">{e.title}</p>
                    {e.description && <p className="text-xs text-fg-muted mt-0.5 whitespace-pre-wrap">{e.description}</p>}
                    {e.meta && <p className="text-[11px] text-fg-subtle mt-1">{e.meta}</p>}
                  </div>
                  <span className="text-[11px] text-fg-subtle whitespace-nowrap">{dateStr}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
