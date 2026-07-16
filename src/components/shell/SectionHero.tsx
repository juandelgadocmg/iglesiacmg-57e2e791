import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type Stat = { label: string; value: ReactNode; tone?: "ok" | "warn" | "bad" | "info" };

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  eyebrow?: string;
  gradient?: string; // tailwind "from-x via-y to-z"
  stats?: Stat[];
  actions?: ReactNode;
  className?: string;
}

const tone = (t?: Stat["tone"]) =>
  t === "ok" ? "text-emerald-600 dark:text-emerald-400"
  : t === "warn" ? "text-amber-600 dark:text-amber-400"
  : t === "bad" ? "text-rose-600 dark:text-rose-400"
  : t === "info" ? "text-sky-600 dark:text-sky-400"
  : "text-foreground";

export default function SectionHero({
  icon: Icon, title, description, eyebrow,
  gradient = "from-slate-800 via-slate-700 to-slate-600",
  stats = [], actions, className,
}: Props) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-card/60 backdrop-blur",
      "ring-1 ring-border/60",
      className,
    )}>
      <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", gradient)} />
      <div className={cn("absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-20 bg-gradient-to-br", gradient)} />
      <div className="relative p-4 md:p-5 flex items-start gap-4 flex-wrap">
        <div className={cn(
          "h-10 w-10 rounded-lg text-white flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br",
          gradient,
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
          )}
          <h2 className="text-base md:text-lg font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-xs md:text-[13px] text-muted-foreground mt-0.5 max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        {stats.length > 0 && (
          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
            {stats.map((s, i) => (
              <div key={i} className="rounded-lg border bg-background/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</p>
                <p className={cn("text-base font-bold tabular-nums mt-0.5", tone(s.tone))}>{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
