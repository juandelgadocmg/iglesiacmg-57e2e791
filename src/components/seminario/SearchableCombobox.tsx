import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, ChevronDown } from "lucide-react";

export interface ComboboxItem {
  id: string;
  label: string;
  sub?: string;
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
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = items.find(i => i.id === value);

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return items.slice(0, 80);
    return items
      .filter(i => norm(`${i.label} ${i.sub || ""}`).includes(q))
      .slice(0, 80);
  }, [items, query]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={wrapperRef} className={`relative ${width} ${className || ""}`}>
      {selected && !open ? (
        <div className="flex items-center justify-between rounded-md border px-3 h-9 bg-background text-sm cursor-pointer"
          onClick={() => setOpen(true)}>
          <div className="truncate">
            <span className="font-medium">{selected.label}</span>
            {selected.sub && <span className="text-muted-foreground"> · {selected.sub}</span>}
          </div>
          {allowClear ? (
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(""); setQuery(""); }}
              className="text-muted-foreground hover:text-destructive ml-2 shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-2 shrink-0" />
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={placeholder}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="pl-8 h-9 text-sm"
            autoComplete="off"
          />
        </div>
      )}
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-center text-muted-foreground">{emptyLabel}</div>
          ) : filtered.map(i => (
            <div key={i.id}
              className={`px-3 py-1.5 cursor-pointer hover:bg-muted/60 text-sm ${i.id === value ? "bg-muted/40" : ""}`}
              onMouseDown={() => { onChange(i.id); setQuery(""); setOpen(false); }}>
              <div className="truncate font-medium">{i.label}</div>
              {i.sub && <div className="text-[11px] text-muted-foreground truncate">{i.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
