import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  QrCode, UserPlus, HandHeart, Mail, CalendarDays, ArrowRight,
  Cake, Users, Church, Bell, Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
      .slice(0, 5);
  }, [personas]);

  const eventosHoy = useMemo(() => {
    const t = format(today, "yyyy-MM-dd");
    return (eventos as any[])
      .filter((e) => (e.fecha || "").startsWith(t))
      .slice(0, 5);
  }, [eventos]);

  const eventosProximos = useMemo(() => {
    const t = format(today, "yyyy-MM-dd");
    return (eventos as any[])
      .filter((e) => (e.fecha || "") >= t)
      .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""))
      .slice(0, 4);
  }, [eventos]);

  const peticionesAbiertas = (peticiones as any[]).filter((p) => p.estado !== "cerrada").slice(0, 4);

  const quickActions = [
    can("personas:create") && { label: "Nueva persona", icon: UserPlus, to: "/personas?new=1" },
    { label: "Check-in QR", icon: QrCode, to: "/servicios?tab=checkin" },
    can("peticiones:create") && { label: "Nueva petición", icon: HandHeart, to: "/peticiones?new=1" },
    { label: "Nuevo mensaje", icon: Mail, to: "/mensajes?new=1" },
  ].filter(Boolean) as any[];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {todayStr}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {greeting()}, {nameCap}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {roleLabel && <Badge variant="secondary" className="mr-2">{roleLabel}</Badge>}
              Este es tu resumen del día en DOXA.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <StatBadge icon={CalendarDays} label="Eventos hoy" value={eventosHoy.length} loading={eventosLoading} />
            <StatBadge icon={HandHeart} label="Peticiones" value={peticionesAbiertas.length} />
            <StatBadge icon={Bell} label="Mensajes" value={unreadMsgs} />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((a) => (
          <button
            key={a.label}
            onClick={() => nav(a.to)}
            className="group flex items-center gap-3 p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all text-left"
          >
            <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <a.icon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-[13px] font-medium">{a.label}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bandeja - 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Tu bandeja" subtitle="Trabajo pendiente que requiere tu atención">
            {peticionesAbiertas.length === 0 && !eventosHoy.length ? (
              <EmptyLine text="Todo al día. Sin pendientes por ahora." />
            ) : (
              <ul className="divide-y">
                {peticionesAbiertas.map((p: any) => (
                  <li key={p.id}>
                    <Link to={`/peticiones`} className="flex items-center gap-3 py-3 hover:bg-muted/40 -mx-4 px-4 transition-colors">
                      <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                        <HandHeart className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{p.titulo || "Petición sin título"}</div>
                        <div className="text-[11.5px] text-muted-foreground truncate">
                          {p.persona_nombre || "Anónima"} · {p.estado || "abierta"}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Pastoral</Badge>
                    </Link>
                  </li>
                ))}
                {eventosHoy.map((e: any) => (
                  <li key={e.id}>
                    <Link to="/eventos" className="flex items-center gap-3 py-3 hover:bg-muted/40 -mx-4 px-4 transition-colors">
                      <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Church className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{e.nombre || e.titulo}</div>
                        <div className="text-[11.5px] text-muted-foreground truncate">Hoy · {e.hora || "—"}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Próximos eventos" action={<Link to="/eventos" className="text-xs text-primary hover:underline">Ver todos</Link>}>
            {eventosLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : eventosProximos.length === 0 ? (
              <EmptyLine text="No hay eventos programados." />
            ) : (
              <div className="grid gap-2">
                {eventosProximos.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/30 transition-colors">
                    <div className="w-11 text-center shrink-0">
                      <div className="text-[10px] uppercase text-muted-foreground">
                        {e.fecha ? format(new Date(e.fecha), "MMM", { locale: es }) : "—"}
                      </div>
                      <div className="text-lg font-bold leading-none">
                        {e.fecha ? format(new Date(e.fecha), "dd") : "?"}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{e.nombre || e.titulo}</div>
                      <div className="text-[11.5px] text-muted-foreground truncate">{e.lugar || "Sin lugar"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Lateral */}
        <div className="space-y-6">
          <SectionCard title="Cumpleaños" subtitle="Próximos 14 días">
            {personasLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : cumples.length === 0 ? (
              <EmptyLine text="Sin cumpleaños próximos." />
            ) : (
              <ul className="space-y-1">
                {cumples.map(({ p, days }) => (
                  <li key={p.id}>
                    <Link to={`/personas/${p.id}`} className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-muted transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700">
                          {(p.nombres || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-medium truncate">{p.nombres} {p.apellidos}</div>
                        <div className="text-[10.5px] text-muted-foreground">
                          {days === 0 ? "🎂 Hoy" : days === 1 ? "Mañana" : `En ${days} días`}
                        </div>
                      </div>
                      <Cake className="h-3.5 w-3.5 text-amber-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Recientes" subtitle="Últimos elementos que visitaste">
            {recents.length === 0 ? (
              <EmptyLine text="Aún no has abierto nada." />
            ) : (
              <ul className="space-y-1">
                {recents.slice(0, 6).map((r) => (
                  <li key={r.id}>
                    <Link to={r.to} className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-md hover:bg-muted transition-colors">
                      <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[12.5px] truncate flex-1">{r.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[13px] font-semibold">Consejo del día</div>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Presiona <kbd className="px-1.5 py-0.5 rounded border bg-background text-[10px]">⌘K</kbd> para buscar cualquier persona, grupo o acción en menos de un segundo.
                </p>
                <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-primary" onClick={() => nav("/personas")}>
                  Explorar personas <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatBadge({ icon: Icon, label, value, loading }: { icon: any; label: string; value: number; loading?: boolean }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-card/70 border">
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wider">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-xl font-bold">{loading ? "—" : value}</div>
    </div>
  );
}

function SectionCard({ title, subtitle, action, children }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[13px] font-semibold">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <div className="text-center py-6 text-[12px] text-muted-foreground">{text}</div>;
}
