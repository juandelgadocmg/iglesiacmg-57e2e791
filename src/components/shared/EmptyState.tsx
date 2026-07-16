import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  secondary?: ReactNode;
  className?: string;
  variant?: "default" | "compact" | "hero";
}

/**
 * EmptyState — Linear/Vercel style. Use whenever a list, grid, or panel
 * has zero data. Consistent, warm and actionable — never a dead end.
 */
export default function EmptyState({
  icon: Icon, title, description, action, secondary, className, variant = "default",
}: Props) {
  const isHero = variant === "hero";
  const isCompact = variant === "compact";
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-dashed border-border/70 bg-card/60",
        "flex flex-col items-center justify-center text-center",
        "animate-fade-in",
        isCompact ? "px-6 py-10" : isHero ? "px-8 py-20" : "px-8 py-14",
        className
      )}
    >
      {Icon && (
        <div className={cn(
          "relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-accent/10 via-accent/5 to-transparent",
          "ring-1 ring-accent/15",
          isHero ? "h-16 w-16 mb-5" : "h-12 w-12 mb-4"
        )}>
          <Icon className={cn(isHero ? "h-7 w-7" : "h-5 w-5", "text-accent")} strokeWidth={1.75} />
          <span className="absolute inset-0 rounded-2xl bg-accent/5 blur-xl -z-10" aria-hidden />
        </div>
      )}
      <h3 className={cn("font-semibold text-foreground", isHero ? "text-lg" : "text-[15px]")}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          "text-muted-foreground max-w-md mt-1.5",
          isHero ? "text-sm" : "text-[13px]"
        )}>
          {description}
        </p>
      )}
      {(action || secondary) && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          {action}
          {secondary}
        </div>
      )}
    </div>
  );
}
