import * as React from "react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface CommandAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  shortcut?: string;
  keywords?: string[];
  onRun: () => void;
}

export interface CommandGroupDef {
  heading: string;
  actions: CommandAction[];
}

/**
 * CommandPalette — ⌘K / Ctrl+K. Wrapper del CMDK.
 * Uso: <CommandPalette open={o} onOpenChange={setO} groups={[...]} />
 */
export function CommandPalette({
  open, onOpenChange, groups, placeholder = "Buscar acciones, personas, páginas…",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groups: CommandGroupDef[];
  placeholder?: string;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={placeholder} />
      <CommandList className={cn("max-h-[440px]")}>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        {groups.map((g, gi) => (
          <React.Fragment key={g.heading}>
            {gi > 0 && <CommandSeparator />}
            <CommandGroup heading={g.heading}>
              {g.actions.map((a) => {
                const Icon = a.icon;
                return (
                  <CommandItem
                    key={a.id}
                    value={`${a.label} ${a.keywords?.join(" ") ?? ""}`}
                    onSelect={() => { onOpenChange(false); a.onRun(); }}
                    className="gap-2"
                  >
                    {Icon && <Icon className="size-4 text-fg-muted" />}
                    <span className="flex-1">{a.label}</span>
                    {a.hint && <span className="text-xs text-fg-subtle">{a.hint}</span>}
                    {a.shortcut && <CommandShortcut>{a.shortcut}</CommandShortcut>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
      <div className="border-t border-border-subtle px-3 py-2 flex items-center justify-between text-[11px] text-fg-subtle">
        <span>DOXA · Comandos</span>
        <span className="inline-flex items-center gap-2">
          <kbd className="font-mono bg-surface-2 border border-border rounded px-1">↵</kbd> ejecutar
          <kbd className="font-mono bg-surface-2 border border-border rounded px-1">esc</kbd> cerrar
        </span>
      </div>
    </CommandDialog>
  );
}
