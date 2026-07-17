import * as React from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../primitives/Badge";

export interface SidebarItem {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  end?: boolean;
}

export interface SidebarGroup {
  label?: string;
  items: SidebarItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

/**
 * Sidebar shell — layout Linear/Vercel.
 * Item activo con barra lateral acento. Grupos colapsables opcionales.
 */
export function Sidebar({
  brand, groups, footer, collapsed, className,
}: {
  brand?: React.ReactNode;
  groups: SidebarGroup[];
  footer?: React.ReactNode;
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border h-full",
        collapsed ? "w-16" : "w-64",
        "transition-[width] duration-[var(--motion-base)]",
        className
      )}
    >
      {brand && (
        <div className={cn("h-16 flex items-center border-b border-sidebar-border", collapsed ? "justify-center" : "px-4")}>
          {brand}
        </div>
      )}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-2">
        {groups.map((g, i) => (
          <SidebarGroupBlock key={i} group={g} collapsed={collapsed} />
        ))}
      </nav>
      {footer && <div className="border-t border-sidebar-border p-4">{footer}</div>}
    </aside>
  );
}

function SidebarGroupBlock({ group, collapsed }: { group: SidebarGroup; collapsed?: boolean }) {
  const [open, setOpen] = React.useState(group.defaultOpen ?? true);
  const showLabel = !collapsed && group.label;
  return (
    <div className="pb-1">
      {showLabel && (
        group.collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between px-2 pt-3 pb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            {group.label}
            <ChevronDown className={cn("size-3 transition-transform", !open && "-rotate-90")} />
          </button>
        ) : (
          <div className="px-2 pt-3 pb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-sidebar-foreground/70">
            {group.label}
          </div>
        )
      )}
      {open && group.items.map((item) => <SidebarLink key={item.to} item={item} collapsed={collapsed} />)}
    </div>
  );
}

function SidebarLink({ item, collapsed }: { item: SidebarItem; collapsed?: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-3 rounded-lg text-base font-medium transition-colors",
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          collapsed ? "justify-center h-[52px] w-[52px] mx-auto" : "h-[52px] px-3",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
          isActive && "before:content-[''] before:absolute before:left-[-4px] before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded before:bg-accent"
        )
      }
      title={collapsed ? item.label : undefined}
    >
      {Icon && <Icon className="size-6 shrink-0" />}
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge != null && (
            <Badge tone="neutral" size="sm">{item.badge}</Badge>
          )}
        </>
      )}
    </NavLink>
  );
}
