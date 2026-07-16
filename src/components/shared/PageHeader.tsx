import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  eyebrow?: string;
}

export default function PageHeader({ title, description, children, className, eyebrow }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-[26px] md:text-[32px] font-bold text-foreground tracking-tight leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[14px] md:text-[15px] text-muted-foreground mt-1.5 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
