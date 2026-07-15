import { useState } from "react";
import { Search, ChevronRight, Menu, ChevronDown, Check, Mail, BookOpenText } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useActiveRole, ROLE_LABELS } from "@/hooks/useActiveRole";
import NotificationDropdown from "@/components/layout/NotificationDropdown";
import { useUnreadCount } from "@/hooks/useMensajes";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import discipulandoLogoAsset from "@/assets/discipulando-naciones-logo.png.asset.json";

const DEFAULT_DISCIPULANDO_URL = "https://discipulandonaciones.lovable.app";
const DEFAULT_LOGO_SRC = discipulandoLogoAsset.url;

const breadcrumbMap: Record<string, string> = {
  dashboard: "Dashboard", personas: "Personas", grupos: "Grupos",
  servicios: "Servicios", asistencia: "Asistencia", finanzas: "Finanzas",
  donaciones: "Donaciones", eventos: "Eventos", inscripciones: "Inscripciones",
  academia: "Academia", certificados: "Certificados", reportes: "Reportes",
  usuarios: "Usuarios", configuracion: "Configuración", nuevo: "Nuevo",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-destructive/10 text-destructive",
  admin: "bg-destructive/10 text-destructive",
  pastor: "bg-primary/10 text-primary",
  lider: "bg-blue-100 text-blue-700",
  secretaria: "bg-purple-100 text-purple-700",
  tesoreria: "bg-amber-100 text-amber-700",
  maestro: "bg-green-100 text-green-700",
  consolidador_lider: "bg-cyan-100 text-cyan-700",
  consolidador: "bg-slate-100 text-slate-600",
  lider_intercesion: "bg-pink-100 text-pink-700",
  lider_red: "bg-orange-100 text-orange-700",
  lider_casa_paz: "bg-teal-100 text-teal-700",
  consulta: "bg-muted text-muted-foreground",
};

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  const { user } = useAuth();
  const { activeRole, setActiveRole, allRoles, roleLabel } = useActiveRole();
  const { data: unreadMsgs = 0 } = useUnreadCount();
  const { data: config } = useConfiguracion();
  const [logoFailed, setLogoFailed] = useState(false);
  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";
  const hasMultipleRoles = allRoles.length > 1;
  const discipulandoUrl =
    (config as any)?.discipulando_url?.trim() || DEFAULT_DISCIPULANDO_URL;
  const customLogoUrl = (config as any)?.discipulando_logo_url?.trim() || "";
  const logoSrc = customLogoUrl || DEFAULT_LOGO_SRC;

  return (
    <header className="h-14 md:h-16 border-b bg-card flex items-center justify-between px-3 md:px-6 sticky top-0 z-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-8 w-8" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-muted-foreground hidden md:inline">CMG</span>
        {segments.map((seg, i) => (
          <span key={i} className={`flex items-center gap-1.5 ${i < segments.length - 1 ? "hidden md:flex" : "flex"}`}>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 hidden md:block" />
            <span className={i === segments.length - 1 ? "font-medium text-foreground truncate" : "text-muted-foreground"}>
              {breadcrumbMap[seg] || seg}
            </span>
          </span>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9 w-64 h-9 bg-muted/50 border-0 text-sm" />
        </div>

        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={discipulandoUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir Discipulando Naciones en una nueva pestaña"
                className="shrink-0 inline-flex items-center justify-center h-9 px-1.5 rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {logoFailed ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                    <BookOpenText className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Discipulando</span>
                  </span>
                ) : (
                  <img
                    src={logoSrc}
                    key={logoSrc}
                    alt="Discipulando Naciones"
                    width={110}
                    height={32}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    onError={() => setLogoFailed(true)}
                    className="h-7 md:h-8 w-auto object-contain select-none dark:brightness-0 dark:invert"
                  />
                )}
              </a>
            </TooltipTrigger>
            <TooltipContent side="bottom">Discipulando Naciones</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Link to="/mensajes" className="relative p-2 rounded-md hover:bg-muted transition-colors" title="Mensajes">
          <Mail className="h-[18px] w-[18px] text-muted-foreground" />
          {unreadMsgs > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] bg-primary text-primary-foreground border-0">
              {unreadMsgs > 9 ? "9+" : unreadMsgs}
            </Badge>
          )}
        </Link>

        <NotificationDropdown />

        {/* User + role switcher */}
        <div className="pl-2 md:pl-3 border-l">
          {hasMultipleRoles ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium leading-none">{user?.email?.split("@")[0] || "Usuario"}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge className={`text-[10px] h-4 px-1.5 rounded-full font-medium ${ROLE_COLORS[activeRole || ""] || "bg-muted text-muted-foreground"}`}>
                        {roleLabel}
                      </Badge>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuLabel className="text-xs pb-1">Cambiar perfil activo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allRoles.map(role => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => setActiveRole(role)}
                    className="flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${ROLE_COLORS[role]?.includes("destructive") ? "bg-destructive" : ROLE_COLORS[role]?.includes("primary") ? "bg-primary" : "bg-blue-500"}`} />
                      <span className="text-sm">{ROLE_LABELS[role] || role}</span>
                    </div>
                    {activeRole === role && <Check className="h-4 w-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden lg:block">
                <p className="text-sm font-medium leading-none">{user?.email?.split("@")[0] || "Usuario"}</p>
                <p className="text-[11px] text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
