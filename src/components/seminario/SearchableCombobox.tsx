import { useState, useMemo, useRef, useEffect, useId, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, ChevronDown } from "lucide-react";

export interface ComboboxItem {
  id: string;
  label: string;
  sub?: string;
  disabled?: boolean;
  badge?: string;
  /** Texto accesible adicional. Si se omite se compone con label + badge. */
  ariaLabel?: string;
  action?: { label: string; onClick: () => void; ariaLabel?: string };
}

interface Props {
  items: ComboboxItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
  width?: string;
  allowClear?: boolean;
  /** Resultados por página (cap visible). Estable independientemente del filtro externo. */
  pageSize?: number;
}

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function SearchableCombobox({
  items,
  value,
  onChange,
  placeholder = "Buscar…",
  emptyLabel = "Sin resultados",
  className,
  width = "w-56",
  allowClear = true,
  pageSize = 80,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = items.find(i => i.id === value);

  const filtered = useMemo(() => {
    const q = norm(query);
    const base = !q
      ? items
      : items.filter(i => norm(`${i.label} ${i.sub || ""}`).includes(q));
    // pageSize estable: NO depende del filtro externo de la página padre,
    // así el conteo visible se mantiene consistente al alternar toggles.
    return base.slice(0, pageSize);
  }, [items, query, pageSize]);

  // Resetear cursor al cambiar la lista filtrada
  useEffect(() => { setActiveIdx(0); }, [query, items]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const findNextEnabled = useCallback((start: number, dir: 1 | -1) => {
    if (filtered.length === 0) return -1;
    let i = start;
    for (let step = 0; step < filtered.length; step++) {
      i = (i + dir + filtered.length) % filtered.length;
      if (!filtered[i].disabled) return i;
    }
    return -1;
  }, [filtered]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault(); setOpen(true);
      const next = findNextEnabled(activeIdx, 1);
      if (next >= 0) setActiveIdx(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = findNextEnabled(activeIdx, -1);
      if (prev >= 0) setActiveIdx(prev);
    } else if (e.key === "Enter") {
      const item = filtered[activeIdx];
      if (item && !item.disabled) {
        e.preventDefault();
        onChange(item.id); setQuery(""); setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const buildAriaLabel = (i: ComboboxItem) => {
    if (i.ariaLabel) return i.ariaLabel;
    const parts = [i.label];
    if (i.sub) parts.push(i.sub);
    if (i.badge) parts.push(i.badge);
    if (i.disabled) parts.push("opción no disponible");
    return parts.join(", ");
  };

  return (
    <div ref={wrapperRef} className={`relative ${width} ${className || ""}`}>
      {selected && !open ? (
        <div
          className="flex items-center justify-between rounded-md border px-3 h-9 bg-background text-sm cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}
          aria-label={`Selección actual: ${selected.label}. Presiona Enter para cambiar.`}
        >
          <div className="truncate">
            <span className="font-medium">{selected.label}</span>
            {selected.sub && <span className="text-muted-foreground"> · {selected.sub}</span>}
          </div>
          {allowClear ? (
            <button
              type="button"
              aria-label="Limpiar selección"
              onClick={(e) => { e.stopPropagation(); onChange(""); setQuery(""); }}
              className="text-muted-foreground hover:text-destructive ml-2 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-2 shrink-0" aria-hidden="true" />
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <Input
            placeholder={placeholder}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="pl-8 h-9 text-sm"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={open && filtered[activeIdx] ? `${listboxId}-opt-${filtered[activeIdx].id}` : undefined}
          />
        </div>
      )}
      {open && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Resultados de búsqueda"
          className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto"
        >
          {/* Total accesible para lectores de pantalla */}
          <span className="sr-only" aria-live="polite">
            {filtered.length === 0
              ? emptyLabel
              : `${filtered.length} resultado${filtered.length === 1 ? "" : "s"} disponibles`}
          </span>
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-center text-muted-foreground">{emptyLabel}</div>
          ) : filtered.map((i, idx) => {
            const isDisabled = !!i.disabled;
            const isActive = idx === activeIdx;
            return (
              <div
                key={i.id}
                id={`${listboxId}-opt-${i.id}`}
                role="option"
                aria-selected={i.id === value}
                aria-disabled={isDisabled || undefined}
                aria-label={buildAriaLabel(i)}
                className={`px-3 py-1.5 text-sm flex items-start justify-between gap-2 ${
                  isDisabled && !i.action ? "opacity-60 cursor-not-allowed"
                  : isDisabled ? "cursor-default"
                  : "cursor-pointer hover:bg-muted/60"
                } ${isActive && !isDisabled ? "bg-muted/60" : ""} ${i.id === value ? "bg-muted/40" : ""}`}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseDown={(e) => {
                  if (isDisabled) return;
                  if ((e.target as HTMLElement).closest("[data-combobox-action]")) return;
                  onChange(i.id); setQuery(""); setOpen(false);
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium flex items-center gap-2">
                    <span className="truncate">{i.label}</span>
                    {i.badge && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0"
                        // Visible text es el badge; aria-label en el option lo incluye, así que ocultar como decorativo evita doble lectura
                        aria-hidden="true"
                      >
                        {i.badge}
                      </span>
                    )}
                  </div>
                  {i.sub && <div className="text-[11px] text-muted-foreground truncate">{i.sub}</div>}
                </div>
                {i.action && (
                  <button
                    type="button"
                    data-combobox-action
                    aria-label={i.action.ariaLabel || i.action.label}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); i.action!.onClick(); setOpen(false); }}
                    className="text-[10px] px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {i.action.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
