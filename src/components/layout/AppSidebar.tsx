import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useActiveRole } from "@/hooks/useActiveRole";
import { canAccess } from "@/lib/permissions";
import { useIsMobile } from "@/hooks/use-mobile";
import logo from "@/assets/logo.jpeg";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LayoutDashboard, Users, UsersRound, Church,
  DollarSign, CalendarDays, GraduationCap, BookMarked,
  Award, BarChart3, Settings, UserCog, ChevronLeft, ChevronRight,
  LogOut, HandHeart, LifeBuoy, Mail, ShieldCheck
} from "lucide-react";

type MenuItem = { label: string; icon: any; path: string; section: string };

const menuItems: MenuItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", section: "Principal" },
  { label: "Personas", icon: Users, path: "/personas", section: "Comunidad" },
  { label: "Grupos", icon: UsersRound, path: "/grupos", section: "Comunidad" },
  { label: "Reuniones", icon: Church, path: "/servicios", section: "Comunidad" },
  { label: "Eventos", icon: CalendarDays, path: "/eventos", section: "Comunidad" },
  { label: "Academia", icon: GraduationCap, path: "/academia", section: "Formación" },
  { label: "Seminario", icon: BookMarked, path: "/seminario", section: "Formación" },
  { label: "Certificados", icon: Award, path: "/certificados", section: "Formación" },
  { label: "Finanzas", icon: DollarSign, path: "/finanzas", section: "Operación" },
  { label: "Mensajes", icon: Mail, path: "/mensajes", section: "Operación" },
  { label: "Peticiones", icon: HandHeart, path: "/peticiones", section: "Operación" },
  { label: "Reportes", icon: BarChart3, path: "/reportes", section: "Operación" },
  { label: "Asistente DOXA IA", icon: LifeBuoy, path: "/chat", section: "Inteligencia" },
  { label: "Usuarios", icon: UserCog, path: "/usuarios", section: "Administración" },
  { label: "Configuración", icon: Settings, path: "/configuracion", section: "Administración" },
  { label: "Seguridad", icon: ShieldCheck, path: "/seguridad", section: "Administración" },
];

const SECTION_ORDER = ["Principal", "Comunidad", "Formación", "Operación", "Inteligencia", "Administración"];

interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { roles } = useUserRoles();
  const { activeRole } = useActiveRole();
  const isMobile = useIsMobile();

  const effectiveRoles = activeRole ? [activeRole as any] : roles;
  const visibleItems = menuItems.filter((item) => canAccess(effectiveRoles, item.path));

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const showCollapsed = !isMobile && collapsed;

  // Group by section preserving canonical order
  const grouped = SECTION_ORDER.map((section) => ({
    section,
    items: visibleItems.filter((i) => i.section === section),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-sidebar",
        !isMobile && "transition-[width] duration-300 border-r border-sidebar-border",
        !isMobile && (showCollapsed ? "w-[80px]" : "w-[280px]")
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="relative shrink-0">
          <img
            src={logo}
            alt="DOXA"
            className="w-11 h-11 rounded-xl object-cover ring-1 ring-black/5"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent ring-2 ring-sidebar" />
        </div>
        {!showCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-heading text-lg font-bold text-foreground leading-tight tracking-tight">DOXA</span>
            <span className="text-sm text-muted-foreground truncate">Centro Mundial de Gloria</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {grouped.map((group, gi) => (
          <div key={group.section} className={cn(gi === 0 ? "mt-1" : "mt-4")}>
            {!showCollapsed && (
              <div className="sidebar-section-label">{group.section}</div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    data-active={isActive}
                    className={cn(
                      "sidebar-link",
                      showCollapsed && "justify-center px-2"
                    )}
                    title={showCollapsed ? item.label : undefined}
                  >
                    <item.icon
                      className={cn(
                        "h-6 w-6 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    {!showCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "sidebar-link w-full",
              showCollapsed && "justify-center px-2"
            )}
          >
            {showCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            {!showCollapsed && <span>Colapsar</span>}
          </button>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "sidebar-link w-full",
            showCollapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!showCollapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );
}

export default function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent side="left" className="p-0 w-[280px] bg-sidebar">
          <SheetHeader className="sr-only">
            <SheetTitle>Menú</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={onMobileClose} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="h-screen sticky top-0 z-30">
      <SidebarContent />
    </aside>
  );
}
