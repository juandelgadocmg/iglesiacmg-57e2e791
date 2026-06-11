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
  DollarSign, CalendarDays, GraduationCap,
  Award, BarChart3, Settings, UserCog, ChevronLeft, ChevronRight,
  LogOut, HandHeart, MessageCircle
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Personas", icon: Users, path: "/personas" },
  { label: "Grupos", icon: UsersRound, path: "/grupos" },
  { label: "Reuniones", icon: Church, path: "/servicios" },
  { label: "Finanzas", icon: DollarSign, path: "/finanzas" },
  { label: "Eventos", icon: CalendarDays, path: "/eventos" },
  { label: "Academia", icon: GraduationCap, path: "/academia" },
  { label: "Seminario", icon: BookMarked, path: "/seminario" },
  { label: "Certificados", icon: Award, path: "/certificados" },
  { label: "Peticiones", icon: HandHeart, path: "/peticiones" },
  { label: "Reportes", icon: BarChart3, path: "/reportes" },
  { label: "Usuarios", icon: UserCog, path: "/usuarios" },
  { label: "Configuración", icon: Settings, path: "/configuracion" },
  { label: "Chat IA", icon: MessageCircle, path: "/chat" },
];

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

  // When a specific profile is active, filter menu by that single role
  // This makes the sidebar reflect what the user can do in their current profile
  const effectiveRoles = activeRole ? [activeRole as any] : roles;
  const visibleItems = menuItems.filter((item) => canAccess(effectiveRoles, item.path));

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const showCollapsed = !isMobile && collapsed;

  return (
    <div
      className={cn(
        "h-full flex flex-col",
        !isMobile && "sidebar-gradient transition-all duration-300",
        !isMobile && (showCollapsed ? "w-[68px]" : "w-[250px]")
      )}
    >
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <img src={logo} alt="CMG" className="w-9 h-9 rounded-lg object-cover" />
        {!showCollapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-primary-foreground leading-tight">CMG Admin</span>
            <span className="text-[10px] text-sidebar-foreground opacity-60">Centro Mundial de Gloria</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-sidebar-primary")} />
              {!showCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
          >
            {showCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!showCollapsed && <span>Colapsar</span>}
          </button>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
        >
          <LogOut className="h-4 w-4" />
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
        <SheetContent side="left" className="p-0 w-[280px] sidebar-gradient">
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
