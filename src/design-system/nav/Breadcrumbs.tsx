import * as React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb { label: React.ReactNode; to?: string }

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm text-fg-muted min-w-0", className)}>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {c.to && !last ? (
              <Link to={c.to} className="hover:text-fg transition-colors truncate max-w-[160px]">{c.label}</Link>
            ) : (
              <span className={cn("truncate max-w-[220px]", last && "text-fg font-medium")}>{c.label}</span>
            )}
            {!last && <ChevronRight className="size-3.5 text-fg-subtle shrink-0" />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
