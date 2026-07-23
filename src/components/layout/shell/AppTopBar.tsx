import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Search, ChevronRight, ChevronDown, Check, Mail, Building2, BookOpenText, QrCode } from "lucide-react";
import ScanQrDialog from "@/components/attendance/ScanQrDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDiscipulando } from "@/hooks/useDiscipulando";
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
import InstallPWAButton from "@/components/pwa/InstallPWAButton";
import HotkeysHelpDialog from "./HotkeysHelpDialog";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useNavigate } from "react-router-dom";

const BREADCRUMB: Record<string, string> = {
  hoy: "Hoy", dashboard: "Dashboard", personas: "Personas", grupos: "Grupos",
  servicios: "Reuniones", eventos: "Eventos", academia: "Academia", seminario: "Seminario",
  certificados: "Certificados", finanzas: "Finanzas", mensajes: "Mensajes",
  peticiones: "Peticiones", reportes: "Reportes", chat: "Asistente DOXA IA",
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
  const [scanOpen, setScanOpen] = useState(false);
  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  const sedes: string[] = (config as any)?.sedes || ["Principal"];
  const [sede, setSede] = useState<string>(sedes[0] || "Principal");
  const { logo: logoSrc, open: openDiscipulando } = useDiscipulando();
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => { setLogoFailed(false); }, [logoSrc]);

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
      <header className="h-14 flex items-center gap-1.5 md:gap-3 px-2 md:px-5 border-b bg-background/80 backdrop-blur sticky top-0 z-20 w-full max-w-full overflow-hidden">
        <Button variant="ghost" size="icon" className="md:hidden h-11 w-11 shrink-0" onClick={onMenuClick} aria-label="Abrir menú de navegación">
          <Menu className="h-6 w-6" />
        </Button>


        {/* Breadcrumbs */}
        <div className="hidden md:flex items-center gap-1.5 text-[13px] min-w-0 shrink">
          {segments.length === 0 && <span className="font-medium">DOXA</span>}
          {segments.map((s, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
              <span className={i === segments.length - 1 ? "font-medium truncate" : "text-muted-foreground truncate"}>
                {BREADCRUMB[s] || s}
              </span>
            </span>
          ))}
        </div>

        {/* Center — command bar trigger */}
        <div className="flex-1 flex justify-center min-w-0">
          <button
            onClick={() => setCmdOpen(true)}
            aria-label="Abrir búsqueda global"
            className="group flex items-center gap-2 h-9 w-full max-w-md min-w-0 rounded-lg border bg-muted/50 hover:bg-muted transition-colors px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0 text-[13px] text-muted-foreground truncate">
              <span className="hidden sm:inline">Buscar personas, ejecutar acciones…</span>
              <span className="sm:hidden">Buscar…</span>
            </span>
            <kbd className="hidden md:inline-flex items-center rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">⌘K</kbd>
          </button>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          {/* Sede */}
          {sedes.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden md:inline-flex h-8 gap-1.5 px-2 text-[12.5px]">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">{sede}</span>
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

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => openDiscipulando()}
                  aria-label="Abrir Discipulando Naciones en una nueva pestaña"
                  className="hidden lg:inline-flex shrink-0 items-center justify-center h-8 px-1.5 rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {logoFailed ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                      <BookOpenText className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden xl:inline">Discipulando</span>
                    </span>
                  ) : (
                    <img
                      src={logoSrc}
                      key={logoSrc}
                      alt="Discipulando Naciones"
                      width={100}
                      height={28}
                      loading="lazy"
                      decoding="async"
                      onError={() => setLogoFailed(true)}
                      className="h-6 md:h-7 w-auto max-w-[110px] object-contain select-none dark:brightness-0 dark:invert"
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Discipulando Naciones</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="hidden lg:inline-flex"><QuickCreateMenu /></div>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  className="p-2 rounded-md hover:bg-muted inline-flex"
                  aria-label="Escanear QR de asistencia"
                >
                  <QrCode className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Escanear QR</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="hidden xl:inline-flex"><InstallPWAButton /></div>


          <Link to="/mensajes" className="relative p-2 rounded-md hover:bg-muted hidden lg:inline-flex" title="Mensajes" aria-label={`Mensajes${unread > 0 ? ` (${unread} sin leer)` : ""}`}>
            <Mail className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
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
                <button className="flex items-center gap-2 hover:bg-muted rounded-md px-1.5 py-1 transition-colors" aria-label={`Cambiar rol activo (actual: ${roleLabel})`}>
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden xl:flex items-center gap-1">
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
      <ScanQrDialog open={scanOpen} onOpenChange={setScanOpen} />
    </>
  );
}
