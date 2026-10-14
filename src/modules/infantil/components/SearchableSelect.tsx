import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  /** Texto secundario (teléfono, documento, etc.) — también se usa para buscar. */
  hint?: string;
  /** Etiqueta pequeña a la derecha (ej. "Niño"). */
  badge?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  allowClear?: boolean;
  /** Máximo de resultados renderizados (evita lentitud con miles de personas). */
  maxResults?: number;
  /** Acción extra al final de la lista (ej. "Registrar nuevo"). */
  footer?: (close: () => void, search: string) => ReactNode;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Selector con buscador. Usa un Popover *modal* para que el scroll y el
 * input funcionen correctamente cuando se abre dentro de un Dialog.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar por nombre...",
  emptyText = "Sin resultados.",
  className,
  allowClear = false,
  maxResults = 60,
  footer,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = normalize(search);
    const terms = q.split(/\s+/).filter(Boolean);
    const list = terms.length
      ? options.filter((o) => {
          const hay = normalize(`${o.label} ${o.hint ?? ""}`);
          return terms.every((t) => hay.includes(t));
        })
      : options;
    return list.slice(0, maxResults);
  }, [options, search, maxResults]);

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover
      modal
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <span className="flex items-center gap-1 shrink-0">
            {allowClear && selected && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0"
        align="start"
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div
          className="max-h-[260px] overflow-y-auto overscroll-contain p-1"
          onWheel={(e) => e.stopPropagation()}
        >
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            filtered.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  close();
                }}
                className={cn(
                  "w-full flex items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                  value === o.value && "bg-accent/60",
                )}
              >
                <Check className={cn("h-4 w-4 shrink-0", value === o.value ? "opacity-100" : "opacity-0")} />
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.hint && <span className="block truncate text-xs text-muted-foreground">{o.hint}</span>}
                </span>
                {o.badge && (
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    {o.badge}
                  </span>
                )}
              </button>
            ))
          )}
          {!search && options.length > maxResults && (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground text-center">
              Mostrando {maxResults} de {options.length}. Escribe para filtrar.
            </p>
          )}
        </div>
        {footer && <div className="border-t p-1">{footer(close, search)}</div>}
      </PopoverContent>
    </Popover>
  );
}

export default SearchableSelect;
