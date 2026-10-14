import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Network, Users, Search, Home, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUserPins } from "@/hooks/useUserPins";

const REDES = ["Nissi", "Rohi", "Jireh", "Adonai", "Shaddai", "Elohim"];

interface Props {
  grupos: any[];
  selectedRed: string | null;
  selectedGrupoId: string | null;
  onSelectAll: () => void;
  onSelectRed: (red: string) => void;
  onSelectGrupo: (id: string) => void;
  className?: string;
  onItemSelect?: () => void;
}

export default function GruposRedRail({
  grupos,
  selectedRed,
  selectedGrupoId,
  onSelectAll,
  onSelectRed,
  onSelectGrupo,
  className,
  onItemSelect,
}: Props) {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(REDES.map((r) => [r, false]))
  );
  const { pins } = useUserPins();

  const gruposByRed = useMemo(() => {
    const map = new Map<string, any[]>();
    REDES.forEach((r) => map.set(r, []));
    const sinRed: any[] = [];
    for (const g of grupos) {
      if (q && !g.nombre?.toLowerCase().includes(q.toLowerCase())) continue;
      if (g.red && map.has(g.red)) map.get(g.red)!.push(g);
      else sinRed.push(g);
    }
    return { map, sinRed };
  }, [grupos, q]);

  const totalGrupos = grupos.length;
  const pinnedGrupos = pins.filter((p) => p.to.startsWith("/grupos"));

  const toggle = (r: string) => setExpanded((e) => ({ ...e, [r]: !e[r] }));

  const handleSelectAll = () => {
    onSelectAll();
    onItemSelect?.();
  };

  const handleSelectRed = (red: string) => {
    onSelectRed(red);
    onItemSelect?.();
  };

  const handleSelectGrupo = (id: string) => {
    onSelectGrupo(id);
    onItemSelect?.();
  };

  return (
    <aside className={cn("w-64 shrink-0 border-r bg-card/40 flex flex-col h-[calc(100vh-3.5rem)] sticky top-14", className)}>
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar grupo…"
            className="pl-8 h-8 text-[13px]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <button
          onClick={handleSelectAll}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-muted/60 transition-colors",
            !selectedRed && !selectedGrupoId && "bg-primary/10 text-primary font-medium"
          )}
        >
          <Home className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Todas las redes</span>
          <span className="text-[11px] text-muted-foreground">{totalGrupos}</span>
        </button>

        {pinnedGrupos.length > 0 && (
          <div className="mt-3">
            <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Anclados</p>
            {pinnedGrupos.slice(0, 5).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  const id = p.to.split("/").pop();
                  if (id) handleSelectGrupo(id);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-muted/60 transition-colors"
              >
                <Star className="h-3.5 w-3.5 text-amber-500" />
                <span className="flex-1 text-left truncate">{p.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3">
          <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Redes</p>
          {REDES.map((red) => {
            const items = gruposByRed.map.get(red) || [];
            const open = expanded[red] || selectedRed === red;
            const isRedActive = selectedRed === red && !selectedGrupoId;
            return (
              <div key={red}>
                <div
                  className={cn(
                    "group flex items-center px-3 py-1.5 text-[13px] hover:bg-muted/60 cursor-pointer transition-colors",
                    isRedActive && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <button onClick={() => toggle(red)} className="p-0.5 -ml-0.5 mr-0.5 text-muted-foreground hover:text-foreground">
                    {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => handleSelectRed(red)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <Network className="h-3.5 w-3.5" />
                    <span className="flex-1">{red}</span>
                    <span className="text-[11px] text-muted-foreground">{items.length}</span>
                  </button>
                </div>
                {open && items.length > 0 && (
                  <div>
                    {items.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => handleSelectGrupo(g.id)}
                        className={cn(
                          "w-full flex items-center gap-2 pl-9 pr-3 py-1 text-[12.5px] hover:bg-muted/60 transition-colors",
                          selectedGrupoId === g.id && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <Users className="h-3 w-3 opacity-70" />
                        <span className="flex-1 text-left truncate">{g.nombre}</span>
                        {g.grupo_miembros?.[0]?.count > 0 && (
                          <span className="text-[10px] text-muted-foreground">{g.grupo_miembros[0].count}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {open && items.length === 0 && (
                  <p className="pl-9 pr-3 py-1 text-[11.5px] text-muted-foreground italic">Sin grupos</p>
                )}
              </div>
            );
          })}

          {gruposByRed.sinRed.length > 0 && (
            <div className="mt-2">
              <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Sin red</p>
              {gruposByRed.sinRed.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleSelectGrupo(g.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1 text-[12.5px] hover:bg-muted/60 transition-colors",
                    selectedGrupoId === g.id && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <Users className="h-3 w-3 opacity-70" />
                  <span className="flex-1 text-left truncate">{g.nombre}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
