import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  QrCode, UserPlus, HandHeart, Mail, CalendarDays, ArrowRight,
  Cake, Users, Church, Bell, Sparkles, Clock, MapPin, Zap, TrendingUp,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useActiveRole } from "@/hooks/useActiveRole";
import { useCan } from "@/hooks/useCan";
import { usePersonas } from "@/hooks/useDatabase";
import { useProgEventos } from "@/hooks/usePrograma";
import { usePeticiones } from "@/hooks/usePeticiones";
import { useUnreadCount } from "@/hooks/useMensajes";
import { useRecentEntities } from "@/hooks/useRecentEntities";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import DashboardTemaSemana from "@/components/dashboard/DashboardTemaSemana";
import { cn } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function HoyPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { roleLabel } = useActiveRole();
  const can = useCan();
  const { data: personas = [], isLoading: personasLoading } = usePersonas();
  const { data: eventos = [], isLoading: eventosLoading } = useProgEventos();
  const { data: peticiones = [] } = usePeticiones();
  const { data: unreadMsgs = 0 } = useUnreadCount();
  const { items: recents } = useRecentEntities();
  const { data: config } = useConfiguracion();

  const name = user?.email?.split("@")[0].split(/[._-]/)[0] || "Usuario";
  const nameCap = name.charAt(0).toUpperCase() + name.slice(1);
  const today = new Date();
  const todayStr = format(today, "EEEE d 'de' MMMM", { locale: es });

  const cumples = useMemo(() => {
    return (personas as any[])
      .filter((p) => p.fecha_nacimiento)
      .map((p) => {
        const d = new Date(p.fecha_nacimiento);
        const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        return { p, next, days: Math.round((+next - +today) / 86400000) };
      })
      .filter((x) => x.days <= 14)
      .sort((a, b) => a.days - b.days)
      .slice(0, 6);
  }, [personas]);

  const eventosHoy = useMemo(() => {
    const t = format(today, "yyyy-MM-dd");
    return (eventos as any[]).filter((e) => (e.fecha || "").startsWith(t)).slice(0, 5);
  }, [eventos]);

  const eventosProximos = useMemo(() => {
    const t = format(today, "yyyy-MM-dd");
    return (eventos as any[])
      .filter((e) => (e.fecha || "") >= t)
      .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""))
      .slice(0, 5);
  }, [eventos]);

  const proximoEvento = eventosProximos[0];
  const peticionesAbiertas = (peticiones as any[]).filter((p) => p.estado !== "cerrada").slice(0, 5);

  const quickActions = [
    can("personas:create") && { label: "Nueva persona", icon: UserPlus, to: "/personas?new=1", tone: "from-primary/20 to-primary/5" },
    { label: "Check-in QR", icon: QrCode, to: "/servicios?tab=checkin", tone: "from-emerald-500/20 to-emerald-500/5" },
    can("peticiones:create") && { label: "Nueva petición", icon: HandHeart, to: "/peticiones?new=1", tone: "from-rose-500/20 to-rose-500/5" },
    { label: "Nuevo mensaje", icon: Mail, to: "/mensajes?new=1", tone: "from-amber-500/20 to-amber-500/5" },
  ].filter(Boolean) as any[];

  const totalPersonas = (personas as any[]).length;

  return (
    <div className="max-w-[1400px] mx-auto p-1">
      {/* ============ BENTO GRID ============ */}
      <div className="grid grid-cols-6 gap-3 md:gap-4 auto-rows-[minmax(120px,auto)]">
        {/* HERO — col-span-6 */}
        <div className="col-span-6 relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-card to-card p-6 md:p-8">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-widest mb-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {todayStr}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-none">
                {greeting()}, <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{nameCap}</span>
              </h1>
              <div className="flex items-center gap-2 mt-3">
                {roleLabel && <Badge variant="secondary" className="rounded-full">{roleLabel}</Badge>}
                <span className="text-sm text-muted-foreground">Panel de comando</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 md:gap-3 min-w-[280px]">
              <KpiRing icon={Users} label="Personas" value={totalPersonas} loading={personasLoading} tone="text-primary" />
              <KpiRing icon={CalendarDays} label="Hoy" value={eventosHoy.length} loading={eventosLoading} tone="text-emerald-600" />
              <KpiRing icon={HandHeart} label="Petic." value={peticionesAbiertas.length} tone="text-rose-600" />
              <KpiRing icon={Bell} label="Msgs" value={unreadMsgs} tone="text-amber-600" />
            </div>
          </div>
        </div>

        {/* PRÓXIMA REUNIÓN — col-span-4 row-span-2 */}
        <BentoCard className="col-span-6 md:col-span-4 md:row-span-2 relative overflow-hidden bg-gradient-to-br from-primary/10 via-card to-card">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Próximo evento</div>
                  <div className="text-[13px] font-medium">Lo que viene</div>
                </div>
              </div>
              <Link to="/eventos" className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                Ver todos <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {eventosLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !proximoEvento ? (
              <EmptyBlock icon={CalendarDays} text="Sin eventos programados." />
            ) : (
              <>
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                    {proximoEvento.nombre || (proximoEvento as any).titulo}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                      {proximoEvento.fecha ? format(new Date(proximoEvento.fecha), "EEEE d MMM", { locale: es }) : "—"}
                    </span>
                    {(proximoEvento as any).hora && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {(proximoEvento as any).hora}
                      </span>
                    )}
                    {(proximoEvento as any).lugar && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {(proximoEvento as any).lugar}
                      </span>
                    )}
                  </div>
                </div>

                {eventosProximos.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Después</div>
                    <div className="space-y-1.5">
                      {eventosProximos.slice(1, 4).map((e: any) => (
                        <Link key={e.id} to="/eventos" className="flex items-center gap-2.5 p-1.5 -mx-1 rounded-md hover:bg-muted/50 transition-colors">
                          <div className="w-9 text-center shrink-0">
                            <div className="text-[9px] uppercase text-muted-foreground leading-none">
                              {e.fecha ? format(new Date(e.fecha), "MMM", { locale: es }) : "—"}
                            </div>
                            <div className="text-sm font-bold leading-tight mt-0.5">
                              {e.fecha ? format(new Date(e.fecha), "dd") : "?"}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12.5px] font-medium truncate">{e.nombre || e.titulo}</div>
                            <div className="text-[10.5px] text-muted-foreground truncate">{e.hora || e.lugar || ""}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </BentoCard>

        {/* PETICIONES — col-span-2 */}
        <BentoCard className="col-span-3 md:col-span-2 bg-gradient-to-br from-rose-500/5 to-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-600 flex items-center justify-center">
              <HandHeart className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Bandeja</div>
              <div className="text-[13px] font-semibold">Peticiones</div>
            </div>
          </div>
          {peticionesAbiertas.length === 0 ? (
            <EmptyBlock text="Sin pendientes." />
          ) : (
            <ul className="space-y-1.5">
              {peticionesAbiertas.slice(0, 4).map((p: any) => (
                <li key={p.id}>
                  <Link to="/peticiones" className="block py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="text-[12.5px] font-medium truncate">{p.titulo || "Sin título"}</div>
                    <div className="text-[10.5px] text-muted-foreground truncate">{p.persona_nombre || "Anónima"}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </BentoCard>

        {/* MENSAJES — col-span-2 */}
        <BentoCard className="col-span-3 md:col-span-2 bg-gradient-to-br from-amber-500/5 to-card">
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Inbox</div>
                <div className="text-[13px] font-semibold">Mensajes</div>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-4xl font-bold tabular-nums">{unreadMsgs}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">sin leer</p>
              <Button variant="ghost" size="sm" className="h-7 px-0 mt-2 text-[11.5px] text-primary hover:bg-transparent" onClick={() => nav("/mensajes")}>
                Abrir bandeja <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </BentoCard>

        {/* CUMPLEAÑOS — col-span-3 */}
        <BentoCard className="col-span-6 md:col-span-3 bg-gradient-to-br from-amber-500/8 via-card to-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-600 flex items-center justify-center">
                <Cake className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Próximos 14 días</div>
                <div className="text-[13px] font-semibold">Cumpleaños</div>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px]">{cumples.length}</Badge>
          </div>
          {personasLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : cumples.length === 0 ? (
            <EmptyBlock text="Sin cumpleaños próximos." />
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {cumples.map(({ p, days }) => (
                <Link key={p.id} to={`/personas/${p.id}`} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                      {(p.nombres || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-medium truncate">{p.nombres}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {days === 0 ? "🎂 Hoy" : days === 1 ? "Mañana" : `${days}d`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </BentoCard>

        {/* RECIENTES — col-span-3 */}
        <BentoCard className="col-span-6 md:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Actividad</div>
                <div className="text-[13px] font-semibold">Recientes</div>
              </div>
            </div>
          </div>
          {recents.length === 0 ? (
            <EmptyBlock text="Aún no has visitado nada." />
          ) : (
            <ul className="space-y-1">
              {recents.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link to={r.to} className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors">
                    <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[12px] truncate flex-1">{r.label}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </BentoCard>

        {/* TEMA DE LA SEMANA (Casas de Paz) — col-span-6 */}
        <div className="col-span-6">
          <DashboardTemaSemana
            titulo={config?.tema_semana_titulo}
            descripcion={config?.tema_semana_descripcion}
            url={config?.tema_semana_url}
            pdfUrl={(config as any)?.tema_semana_pdf_url}
          />
        </div>

        {/* QUICK ACTIONS — col-span-6 */}
        <div className="col-span-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => nav(a.to)}
              className={cn(
                "group relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl border bg-gradient-to-br transition-all text-left",
                a.tone,
                "hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40"
              )}
            >
              <span className="w-10 h-10 rounded-xl bg-card border shadow-sm text-primary flex items-center justify-center shrink-0">
                <a.icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-[13px] font-semibold">{a.label}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </div>

        {/* CONSEJO — col-span-6 */}
        <div className="col-span-6 rounded-3xl border bg-gradient-to-r from-primary/8 via-primary/5 to-transparent p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold">Consejo del día</div>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              Presiona <kbd className="px-1.5 py-0.5 rounded border bg-card text-[10.5px] font-mono">⌘K</kbd> para saltar a cualquier persona, grupo o acción en menos de un segundo.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => nav("/personas")} className="hidden md:flex gap-1.5">
            Explorar <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- primitives ---------- */

function BentoCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-3xl border bg-card p-5 overflow-hidden", className)}>
      {children}
    </div>
  );
}

function KpiRing({ icon: Icon, label, value, loading, tone }: { icon: any; label: string; value: number; loading?: boolean; tone?: string }) {
  return (
    <div className="px-2 py-2.5 rounded-2xl bg-card/80 backdrop-blur border shadow-sm text-center">
      <div className={cn("flex items-center justify-center mb-0.5", tone || "text-primary")}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-lg md:text-xl font-bold tabular-nums leading-none">{loading ? "—" : value}</div>
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function EmptyBlock({ icon: Icon, text }: { icon?: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground/30 mb-2" />}
      <p className="text-[11.5px] text-muted-foreground">{text}</p>
    </div>
  );
}
