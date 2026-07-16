import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, LucideIcon } from "lucide-react";

/**
 * GrupoInfoCard — tarjeta unificada usada por Planeación y Reportes de grupo.
 * Normaliza tipografía, colores de badge, sombras/hover y espaciados para que
 * ambas vistas se vean idénticas.
 */

export type GrupoCardBadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

const BADGE_TONE: Record<
  GrupoCardBadgeTone,
  { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  neutral: { variant: "outline" },
  info:    { variant: "outline", className: "border-info text-info" },
  success: { variant: "default", className: "bg-success text-success-foreground" },
  warning: { variant: "outline", className: "border-amber-500 text-amber-600" },
  danger:  { variant: "destructive" },
};

export interface GrupoCardSummaryRow {
  label: ReactNode;
  value: ReactNode;
  emphasis?: boolean;
  divided?: boolean;
  icon?: LucideIcon;
  iconClassName?: string;
}

export interface GrupoInfoCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: { label: ReactNode; tone?: GrupoCardBadgeTone };
  metaDate?: { label: string; value: string };
  metaSecondary?: ReactNode;
  extraBadge?: ReactNode;
  description?: ReactNode;
  attendance?: ReactNode;
  summaryTitle?: ReactNode;
  summary?: GrupoCardSummaryRow[];
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

export function GrupoInfoCard({
  title, subtitle, badge, metaDate, metaSecondary, extraBadge,
  description, attendance, summaryTitle, summary, actions, onClick, className, ariaLabel,
}: GrupoInfoCardProps) {
  const tone = BADGE_TONE[badge?.tone ?? "neutral"];
  const clickable = !!onClick;
  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <div
      onClick={onClick}
      onKeyDown={handleKey}
      role={clickable ? "button" : "group"}
      tabIndex={clickable ? 0 : undefined}
      aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
      className={cn(
        "rounded-xl border bg-card p-4 sm:p-5 space-y-3 shadow-sm transition-shadow",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        clickable && "cursor-pointer hover:shadow-md focus-within:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {badge && (
          <Badge variant={tone.variant} className={cn("shrink-0", tone.className)}>
            {badge.label}
          </Badge>
        )}
      </div>

      {(metaDate || metaSecondary) && (
        <div className="text-sm text-muted-foreground space-y-0.5">
          {metaDate && (
            <div>
              <CalendarIcon aria-hidden className="inline h-3.5 w-3.5 mr-1" />
              <span className="sr-only">{metaDate.label}: </span>
              <span aria-hidden>{metaDate.label}: </span>{metaDate.value}
            </div>
          )}
          {metaSecondary && (
            <div className="text-xs text-muted-foreground/70">{metaSecondary}</div>
          )}
        </div>
      )}

      {extraBadge}

      {description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
      )}

      {attendance}

      {summary && summary.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
          {summaryTitle && (
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {summaryTitle}
            </p>
          )}
          {summary.map((row, i) => {
            const Icon = row.icon;
            return (
              <div
                key={i}
                className={cn(
                  "flex justify-between text-sm",
                  row.emphasis && "font-semibold",
                  row.divided && "pt-1 border-t border-border"
                )}
              >
                <span className="flex items-center gap-1">
                  {Icon && <Icon className={cn("h-3.5 w-3.5", row.iconClassName)} />}
                  {row.label}
                </span>
                <span className={cn(!row.emphasis && "font-medium")}>{row.value}</span>
              </div>
            );
          })}
        </div>
      )}

      {actions && (
        <div
          className="flex items-center gap-2 pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

/** Skeleton acorde a la tarjeta, para estados de carga uniformes. */
export function GrupoInfoCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/2" />
      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

/** Grilla de skeletons homogénea. */
export function GrupoCardsSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <GrupoInfoCardSkeleton key={i} />
      ))}
    </div>
  );
}
