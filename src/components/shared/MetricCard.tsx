import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "accent" | "success" | "info";
  sparkline?: number[];
}

const accentBg = {
  default: "bg-primary/8 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
};

function Sparkline({ data, positive = true }: { data: number[]; positive?: boolean }) {
  if (!data || data.length < 2) return null;
  const w = 88, h = 28, pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const stroke = positive ? "hsl(var(--success))" : "hsl(var(--destructive))";
  const fill = positive ? "hsl(var(--success) / 0.12)" : "hsl(var(--destructive) / 0.12)";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        points={`${pad},${h - pad} ${pts.join(" ")} ${w - pad},${h - pad}`}
        fill={fill}
        stroke="none"
      />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  sparkline,
}: MetricCardProps) {
  const DeltaIcon = trend ? (trend.positive ? TrendingUp : TrendingDown) : Minus;
  return (
    <div className="surface-card card-hover p-5 group">
      <div className="flex items-start justify-between mb-3">
        <p className="kpi-label">{title}</p>
        <div className={cn("p-2 rounded-lg transition-colors", accentBg[variant])}>
          <Icon className="h-[16px] w-[16px]" />
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="kpi-value">{value}</p>
          {subtitle && (
            <p className="text-[12px] text-muted-foreground mt-1 truncate">{subtitle}</p>
          )}
        </div>
        {sparkline && sparkline.length > 1 && (
          <div className="shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
            <Sparkline data={sparkline} positive={trend?.positive ?? true} />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className={cn(
              trend.positive ? "kpi-delta-up" : "kpi-delta-down"
            )}
          >
            <DeltaIcon className="h-3 w-3" />
            {trend.value}
          </span>
          <span className="text-[11px] text-muted-foreground">vs mes anterior</span>
        </div>
      )}
    </div>
  );
}
