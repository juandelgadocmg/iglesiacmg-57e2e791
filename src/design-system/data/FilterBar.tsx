import * as React from "react";
import { Filter, X } from "lucide-react";
import { Chip } from "../primitives/Chip";
import { Button } from "../primitives/Button";
import { cn } from "@/lib/utils";

export interface FilterChipDef {
  id: string;
  label: React.ReactNode;
  onRemove?: () => void;
  active?: boolean;
}

/** FilterBar — barra de filtros activos + slot para search y acciones. */
export function FilterBar({
  chips, search, actions, onClearAll, className,
}: {
  chips?: FilterChipDef[];
  search?: React.ReactNode;
  actions?: React.ReactNode;
  onClearAll?: () => void;
  className?: string;
}) {
  const hasActive = (chips || []).some((c) => c.active);
  return (
    <div className={cn("flex items-center flex-wrap gap-2 py-2", className)}>
      {search && <div className="min-w-[220px] flex-1 max-w-md">{search}</div>}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter className="size-3.5 text-fg-subtle" />
        {chips?.map((c) => (
          <Chip key={c.id} tone={c.active ? "brand" : "neutral"} active={c.active} onRemove={c.onRemove}>
            {c.label}
          </Chip>
        ))}
        {hasActive && onClearAll && (
          <Button size="xs" variant="ghost" onClick={onClearAll} leadingIcon={<X />}>
            Limpiar
          </Button>
        )}
      </div>
      <div className="ml-auto flex items-center gap-1.5">{actions}</div>
    </div>
  );
}
