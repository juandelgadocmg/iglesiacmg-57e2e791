import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const cardVariants = cva(
  "bg-card text-card-foreground border rounded-2xl transition-colors",
  {
    variants: {
      elevation: {
        flat: "border-border-subtle shadow-none",
        low: "border-border-subtle shadow-elev-1",
        mid: "border-border-subtle shadow-elev-2",
        high: "border-border-subtle shadow-elev-3",
      },
      interactive: {
        true: "hover:border-border hover:shadow-elev-2 cursor-pointer transition-all duration-[var(--motion-base)]",
        false: "",
      },
      padding: {
        none: "",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
        xl: "p-10",
      },
    },
    defaultVariants: { elevation: "low", interactive: false, padding: "md" },
  }
);

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation, interactive, padding, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ elevation, interactive, padding }), className)} {...props} />
  )
);
Card.displayName = "DoxaCard";

export interface SectionCardProps extends Omit<CardProps, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  footer?: React.ReactNode;
  bodyClassName?: string;
}

export function SectionCard({
  title, description, actions, icon: Icon, footer, children, bodyClassName, padding = "none", className, ...rest
}: SectionCardProps) {
  return (
    <Card padding={padding} className={cn("overflow-hidden", className)} {...rest}>
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-border-subtle">
          <div className="flex items-start gap-2.5 min-w-0">
            {Icon && (
              <span className="mt-0.5 inline-flex items-center justify-center size-7 rounded-md bg-primary/8 text-primary">
                <Icon className="size-4" />
              </span>
            )}
            <div className="min-w-0">
              {title && <h3 className="text-[15px] font-semibold text-fg leading-tight truncate">{title}</h3>}
              {description && <p className="text-xs text-fg-muted mt-0.5">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
      {footer && <div className="px-5 py-3 border-t border-border-subtle bg-surface-2/40 text-xs text-fg-muted">{footer}</div>}
    </Card>
  );
}
