import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Search, ChevronRight, ChevronDown, Check, Mail, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useActiveRole } from "@/hooks/useActiveRole";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { useUnreadCount } from "@/hooks/useMensajes";
import NotificationDropdown from "@/components/layout/NotificationDropdown";
import CommandBar from "./CommandBar";
import QuickCreateMenu from "./QuickCreateMenu";
import HotkeysHelpDialog from "./HotkeysHelpDialog";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useNavigate } from "react-router-dom";

const BREADCRUMB: Record<string, string> = {
  hoy: "Hoy", dashboard: "Dashboard", personas: "Personas", grupos: "Grupos",
  servicios: "Reuniones", eventos: "Eventos", academia: "Academia", seminario: "Seminario",
  certificados: "Certificados", finanzas: "Finanzas", mensajes: "Mensajes",
  peticiones: "Peticiones", reportes: "Reportes", chat: "Chat IA",
  usuarios: "Usuarios", configuracion: "Configuración", seguridad: "Seguridad",
};

export default function AppTopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const segments = loc.pathname.split("/").filter(Boolean);
  const { user } = useAuth();
  const { activeRole, setActiveRole, allRoles, roleLabel } = useActiveRole();
  const { data: config } = useConfiguracion();
  const { data: unread = 0 } = useUnreadCount();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  const sedes: string[] = (config as any)?.sedes || ["Principal"];
  const [sede, setSede] = useState<string>(sedes[0] || "Principal");

  useHotkeys({
    "mod+k": () => setCmdOpen(true),
    "shift+/": () => setHelpOpen(true),
    "c": () => window.dispatchEvent(new CustomEvent("doxa:open-quick-create")),
    "gh": () => navigate("/hoy"),
    "gd": () => navigate("/dashboard"),
    "gp": () => navigate("/personas"),
    "gg": () => navigate("/grupos"),
    "gr": () => navigate("/servicios"),
    "ge": () => navigate("/eventos"),
    "ga": () => navigate("/academia"),
    "gs": () => navigate("/seminario"),
    "gf": () => navigate("/finanzas"),
    "gm": () => navigate("/mensajes"),
    "gq": () => navigate("/peticiones"),
    "gt": () => navigate("/reportes"),
    "np": () => navigate("/personas?new=1"),
    "ne": () => navigate("/eventos?new=1"),
    "nq": () => navigate("/peticiones?new=1"),
    "nm": () => navigate("/mensajes?new=1"),
  });

  return (
    <>
      <header className="h-14 flex items-center gap-3 px-3 md:px-5 border-b bg-background/80 backdrop-blur sticky top-0 z-20">
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumbs */}
        <div className="hidden md:flex items-center gap-1.5 text-[13px] min-w-0">
          {segments.length === 0 && <span className="font-medium">DOXA</span>}
          {segments.map((s, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
              <span className={i === segments.length - 1 ? "font-medium truncate" : "text-muted-foreground truncate"}>
                {BREADCRUMB[s] || s}
              </span>
            </span>
          ))}
        </div>

        {/* Center — command bar trigger */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setCmdOpen(true)}
            className="group flex items-center gap-2 h-9 w-full max-w-md rounded-lg border bg-muted/50 hover:bg-muted transition-colors px-3 text-left"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-[13px] text-muted-foreground truncate">
              Buscar personas, ejecutar acciones…
            </span>
            <kbd className="hidden md:inline-flex items-center rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
          </button>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Sede */}
          {sedes.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-[12.5px]">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{sede}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Sede</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sedes.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setSede(s)} className="cursor-pointer">
                    <span className="flex-1 text-sm">{s}</span>
                    {sede === s && <Check className="h-4 w-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <QuickCreateMenu />

          <Link to="/mensajes" className="relative p-2 rounded-md hover:bg-muted" title="Mensajes">
            <Mail className="h-[18px] w-[18px] text-muted-foreground" />
            {unread > 0 && (
              <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] bg-primary text-primary-foreground border-0">
                {unread > 9 ? "9+" : unread}
              </Badge>
            )}
          </Link>

          <NotificationDropdown />

          {allRoles.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-muted rounded-md px-1.5 py-1 transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:flex items-center gap-1">
                    <span className="text-[11.5px] text-muted-foreground">{roleLabel}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">Cambiar rol activo</DropdownMenuLabel>
                {allRoles.map((r) => (
                  <DropdownMenuItem key={r} onClick={() => setActiveRole(r)} className="cursor-pointer">
                    <span className="flex-1 text-sm">{r}</span>
                    {activeRole === r && <Check className="h-4 w-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-semibold">{initials}</AvatarFallback>
            </Avatar>
          )}
        </div>
      </header>

      <CommandBar open={cmdOpen} onOpenChange={setCmdOpen} />
      <HotkeysHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
