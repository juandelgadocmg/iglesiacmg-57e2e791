import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useActiveRole } from "@/hooks/useActiveRole";
import { canAccess } from "@/lib/permissions";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserPins } from "@/hooks/useUserPins";
import { useRecentEntities } from "@/hooks/useRecentEntities";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.jpeg";
import {
  Home, Users, UsersRound, Church, CalendarDays, GraduationCap, BookMarked,
  Award, DollarSign, BarChart3, HandHeart, MessageCircle, Mail, Settings,
  UserCog, ShieldCheck, ChevronLeft, ChevronRight, LogOut, Star, Clock,
  ChevronDown, Sparkles, BookOpenText, ExternalLink,
} from "lucide-react";
import { useUnreadCount } from "@/hooks/useMensajes";
import { useDiscipulando } from "@/hooks/useDiscipulando";

type Item = { label: string; icon: any; to: string; badgeKey?: "mensajes" };

const ZONES: { label: string; items: Item[] }[] = [
  {
    label: "Comunidad",
    items: [
      { label: "Personas", icon: Users, to: "/personas" },
      { label: "Grupos", icon: UsersRound, to: "/grupos" },
      { label: "Reuniones", icon: Church, to: "/servicios" },
      { label: "Eventos", icon: CalendarDays, to: "/eventos" },
    ],
  },
  {
    label: "Formación",
    items: [
      { label: "Academia", icon: GraduationCap, to: "/academia" },
      { label: "Seminario", icon: BookMarked, to: "/seminario" },
      { label: "Certificados", icon: Award, to: "/certificados" },
    ],
  },
  {
    label: "Pastoral",
    items: [
      { label: "Mensajes", icon: Mail, to: "/mensajes", badgeKey: "mensajes" },
      { label: "Peticiones", icon: HandHeart, to: "/peticiones" },
      { label: "Chat IA", icon: MessageCircle, to: "/chat" },
    ],
  },
  {
    label: "Operación",
    items: [
      { label: "Finanzas", icon: DollarSign, to: "/finanzas" },
      { label: "Reportes", icon: BarChart3, to: "/reportes" },
    ],
  },
];

const ADMIN: Item[] = [
  { label: "Usuarios", icon: UserCog, to: "/usuarios" },
  { label: "Configuración", icon: Settings, to: "/configuracion" },
  { label: "Seguridad", icon: ShieldCheck, to: "/seguridad" },
];

function Content({ onNav }: { onNav?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { signOut } = useAuth();
  const { roles } = useUserRoles();
  const { activeRole } = useActiveRole();
  const isMobile = useIsMobile();
  const { pins } = useUserPins();
  const { items: recents } = useRecentEntities();
  const { data: unread = 0 } = useUnreadCount();
  const { open: openDiscipulando } = useDiscipulando();

  const effective = activeRole ? [activeRole as any] : roles;
  const canShow = (to: string) => canAccess(effective, to.split("?")[0]);
  const showCollapsed = !isMobile && collapsed;
  const activeCls = "bg-accent/60 text-foreground";

  const renderLink = (it: Item) => {
    if (!canShow(it.to)) return null;
    const isActive = pathname.startsWith(it.to);
    const badge = it.badgeKey === "mensajes" && unread > 0 ? unread : null;
    return (
      <NavLink
        key={it.to}
        to={it.to}
        onClick={onNav}
        className={cn(
          "group relative flex items-center gap-2.5 h-8 rounded-md text-[13px] font-medium transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
          showCollapsed ? "justify-center px-0 mx-1" : "px-2.5",
          isActive && activeCls
        )}
        title={showCollapsed ? it.label : undefined}
      >
        {isActive && !showCollapsed && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded bg-primary" />
        )}
        <it.icon className={cn("h-[16px] w-[16px] shrink-0", isActive && "text-primary")} />
        {!showCollapsed && (
          <>
            <span className="flex-1 truncate">{it.label}</span>
            {badge != null && (
              <Badge className="h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground border-0">
                {badge > 9 ? "9+" : badge}
              </Badge>
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-sidebar",
        !isMobile && "border-r border-sidebar-border transition-[width] duration-200",
        !isMobile && (showCollapsed ? "w-[64px]" : "w-[236px]")
      )}
    >
      {/* Brand */}
      <div className={cn("flex items-center gap-2.5 h-14 border-b border-sidebar-border", showCollapsed ? "justify-center px-2" : "px-4")}>
        <img src={logo} alt="DOXA" className="w-8 h-8 rounded-lg object-cover ring-1 ring-black/5" />
        {!showCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[14px] leading-tight tracking-tight">DOXA</span>
            <span className="text-[10px] text-muted-foreground truncate">Centro Mundial de Gloria</span>
          </div>
        )}
      </div>

      {/* Scroll */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
        {/* Home / Hoy */}
        <div className="space-y-0.5">
          <NavLink
            to="/hoy"
            onClick={onNav}
            className={cn(
              "flex items-center gap-2.5 h-8 rounded-md text-[13px] font-medium",
              "text-muted-foreground hover:text-foreground hover:bg-muted",
              showCollapsed ? "justify-center px-0 mx-1" : "px-2.5",
              pathname.startsWith("/hoy") && activeCls
            )}
          >
            <Home className={cn("h-[16px] w-[16px]", pathname.startsWith("/hoy") && "text-primary")} />
            {!showCollapsed && <span className="flex-1">Hoy</span>}
            {!showCollapsed && (
              <Sparkles className="h-3 w-3 text-primary/70" />
            )}
          </NavLink>
        </div>

        {/* Favoritos */}
        {pins.length > 0 && (
          <div>
            {!showCollapsed && <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">Favoritos</div>}
            <div className="space-y-0.5">
              {pins.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => { nav(p.to); onNav?.(); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 h-8 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted",
                    showCollapsed ? "justify-center px-0 mx-1" : "px-2.5"
                  )}
                  title={showCollapsed ? p.label : undefined}
                >
                  <Star className="h-[14px] w-[14px] text-amber-500 shrink-0" />
                  {!showCollapsed && <span className="flex-1 truncate text-left">{p.label}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recientes */}
        {recents.length > 0 && !showCollapsed && (
          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">Recientes</div>
            <div className="space-y-0.5">
              {recents.slice(0, 4).map((r) => (
                <button
                  key={r.id}
                  onClick={() => { nav(r.to); onNav?.(); }}
                  className="w-full flex items-center gap-2.5 h-8 px-2.5 rounded-md text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Clock className="h-[13px] w-[13px] shrink-0" />
                  <span className="flex-1 truncate text-left">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Zonas */}
        {ZONES.map((z) => {
          const visible = z.items.filter((i) => canShow(i.to));
          if (visible.length === 0) return null;
          return (
            <div key={z.label}>
              {!showCollapsed && (
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                  {z.label}
                </div>
              )}
              <div className="space-y-0.5">{visible.map(renderLink)}</div>
            </div>
          );
        })}

        {/* Admin colapsable */}
        {ADMIN.some((i) => canShow(i.to)) && (
          <div>
            {!showCollapsed ? (
              <button
                onClick={() => setAdminOpen((v) => !v)}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70 hover:text-foreground"
              >
                Admin
                <ChevronDown className={cn("h-3 w-3 transition-transform", !adminOpen && "-rotate-90")} />
              </button>
            ) : (
              <div className="h-2" />
            )}
            {(adminOpen || showCollapsed) && (
              <div className="space-y-0.5">{ADMIN.map(renderLink)}</div>
            )}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-0.5">
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-full flex items-center gap-2.5 h-8 rounded-md text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-muted",
              showCollapsed ? "justify-center px-0" : "px-2.5"
            )}
          >
            {showCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!showCollapsed && <span>Colapsar</span>}
          </button>
        )}
        <button
          onClick={async () => { await signOut(); nav("/login"); }}
          className={cn(
            "w-full flex items-center gap-2.5 h-8 rounded-md text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-muted",
            showCollapsed ? "justify-center px-0" : "px-2.5"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!showCollapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );
}

export default function AppSidebarNew({ mobileOpen, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={(o) => !o && onMobileClose?.()}>
        <SheetContent side="left" className="p-0 w-[260px] bg-sidebar">
          <SheetHeader className="sr-only"><SheetTitle>Menú</SheetTitle></SheetHeader>
          <Content onNav={onMobileClose} />
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <aside className="h-screen sticky top-0 z-30">
      <Content />
    </aside>
  );
}
