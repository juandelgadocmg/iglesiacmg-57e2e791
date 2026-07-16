import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Chip } from "../primitives/Chip";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  maxChips?: number;
  size?: "sm" | "md";
  className?: string;
}

export function MultiSelect({
  options, value, onChange, placeholder = "Selecciona…", maxChips = 3, size = "md", className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );
  const selected = options.filter((o) => value.includes(o.value));
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-between gap-2 bg-surface-1 border border-border rounded-lg",
            "hover:border-border-strong transition-colors text-left",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            size === "sm" ? "min-h-8 px-2 py-1" : "min-h-9 px-2.5 py-1.5",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selected.length === 0 && <span className="text-fg-subtle text-sm">{placeholder}</span>}
            {selected.slice(0, maxChips).map((o) => (
              <Chip
                key={o.value}
                tone="brand"
                onRemove={() => toggle(o.value)}
              >
                {o.icon}
                {o.label}
              </Chip>
            ))}
            {selected.length > maxChips && (
              <Chip tone="neutral">+{selected.length - maxChips}</Chip>
            )}
          </div>
          <ChevronDown className="size-4 text-fg-subtle shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-[--radix-popover-trigger-width] rounded-lg border-border shadow-elev-4">
        <div className="p-2 border-b border-border-subtle">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            className="w-full bg-transparent text-sm px-1.5 py-1 outline-none placeholder:text-fg-subtle"
          />
        </div>
        <div className="max-h-64 overflow-auto py-1">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-fg-subtle">Sin resultados</div>
          )}
          {filtered.map((o) => {
            const active = value.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 text-sm text-left rounded-md mx-1",
                  "hover:bg-surface-2 transition-colors"
                )}
              >
                <span className={cn(
                  "size-4 rounded-sm border flex items-center justify-center",
                  active ? "bg-primary border-primary text-primary-foreground" : "border-border"
                )}>
                  {active && <Check className="size-3" />}
                </span>
                {o.icon}
                <span className="flex-1 truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
        {value.length > 0 && (
          <div className="p-2 border-t border-border-subtle flex items-center justify-between text-xs">
            <span className="text-fg-muted">{value.length} seleccionados</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-fg-muted hover:text-fg"
              onClick={() => onChange([])}
            >
              <X className="size-3" /> Limpiar
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
