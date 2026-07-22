import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveRole, ROLE_LABELS } from "@/hooks/useActiveRole";
import { useDashboardStats, usePersonas } from "@/hooks/useDatabase";
import { useCursos, useAllMatriculas, useCertificados } from "@/hooks/useAcademia";
import { usePeticiones } from "@/hooks/usePeticiones";
import { useReportesGrupos } from "@/hooks/useReportesGrupos";
import { useActiveBanners } from "@/hooks/useBanners";
import { useActiveVideos } from "@/hooks/useVideosIglesia";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { useTemaSemanaVigente } from "@/hooks/useTemaSemana";
import MetricCard from "@/components/shared/MetricCard";
import StatusBadge from "@/components/shared/StatusBadge";
import EventCalendar from "@/components/events/EventCalendar";
import DashboardAlertCards from "@/components/dashboard/DashboardAlertCards";
import DashboardBirthdayGrid from "@/components/dashboard/DashboardBirthdayGrid";
import DashboardBannerCarousel from "@/components/dashboard/DashboardBannerCarousel";
import DashboardVideoSection from "@/components/dashboard/DashboardVideoSection";
import DashboardTemaSemana from "@/components/dashboard/DashboardTemaSemana";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Church, UserPlus, CalendarDays, TrendingUp,
  GraduationCap, Award, Activity, HandHeart, CheckCircle2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO, differenceInDays, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();
  const { data: personas } = usePersonas();
  const { data: cursos } = useCursos();
  const { data: matriculas } = useAllMatriculas();
  const { data: certificados } = useCertificados();
  const { data: peticiones } = usePeticiones();
  const { data: reportes } = useReportesGrupos();
  const { data: banners } = useActiveBanners();
  const { data: videos } = useActiveVideos();
  const { data: config } = useConfiguracion();
  const { data: temaVigente, isLoading: temaLoading, error: temaError, refetch: temaRefetch } = useTemaSemanaVigente();

  const totalMiembros = stats?.totalPersonas || 0;
  const nuevos = stats?.nuevosEsteMes || 0;

  const peticionStats = useMemo(() => {
    if (!peticiones) return { pendientes: 0, enOracion: 0, respondidas: 0 };
    return {
      pendientes: peticiones.filter((p: any) => p.estado === "Pendiente").length,
      enOracion: peticiones.filter((p: any) => p.estado === "En oración").length,
      respondidas: peticiones.filter((p: any) => p.estado === "Respondida").length,
    };
  }, [peticiones]);

  const growthSeries = useMemo(() => {
    if (!personas) return { data: [] as { month: string; count: number }[], series: [] as number[], mom: null as null | { value: string; positive: boolean } };
    const now = new Date();
    const data: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const m = d.getMonth(); const y = d.getFullYear();
      const count = (personas as any[]).filter(p => {
        try { const created = parseISO(p.created_at); return created.getMonth() === m && created.getFullYear() === y; } catch { return false; }
      }).length;
      data.push({ month: format(d, "MMM", { locale: es }), count });
    }
    const series = data.map(d => d.count);
    const current = series[series.length - 1] ?? 0;
    const prev = series[series.length - 2] ?? 0;
    const diff = current - prev;
    const pct = prev === 0 ? (current > 0 ? 100 : 0) : Math.round((diff / prev) * 100);
    const mom = { value: `${diff >= 0 ? "+" : ""}${pct}%`, positive: diff >= 0 };
    return { data, series, mom };
  }, [personas]);
  const growthTrend = growthSeries.data;

  const calendarEvents = useMemo(() => {
    if (!stats?.eventos) return [];
    return stats.eventos.map((e: any) => ({
      id: e.id, nombre: e.nombre, fecha_inicio: e.fecha_inicio, fecha_fin: e.fecha_fin,
      color: e.color, tipo: e.tipo, estado: e.estado,
    }));
  }, [stats]);

  const upcomingEvents = useMemo(() => {
    if (!stats?.eventos) return [];
    return stats.eventos.map((e: any) => {
      const days = differenceInDays(parseISO(e.fecha_inicio), new Date());
      const inscritos = e.inscripciones?.[0]?.count || 0;
      return { ...e, daysLeft: Math.max(0, days), inscritos, progress: e.cupos ? Math.round((inscritos / e.cupos) * 100) : 0 };
    });
  }, [stats]);

  const birthdays = useMemo(() => {
    if (!personas) return [];
    const now = new Date();
    const today = { month: now.getMonth(), day: now.getDate() };

    return (personas as any[])
      .filter(p => {
        if (!p.fecha_nacimiento) return false;
        try {
          const bday = parseISO(p.fecha_nacimiento);
          return bday.getMonth() === today.month && bday.getDate() === today.day;
        } catch { return false; }
      })
      .map(p => ({
        nombre: `${p.nombres} ${p.apellidos}`,
        fecha: format(parseISO(p.fecha_nacimiento), "dd 'de' MMMM", { locale: es }),
        initials: `${p.nombres?.[0] || ""}${p.apellidos?.[0] || ""}`,
        sexo: p.sexo,
        foto_url: p.foto_url,
      }));
  }, [personas]);

  const alertData = useMemo(() => {
    const pendingReportes = reportes?.filter((r: any) => r.estado === "Pendiente").length || 0;
    return { pendingReportes };
  }, [reportes]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuario";
  const { activeRole, roleLabel } = useActiveRole();
  const greetingRole = roleLabel || "Usuario";

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-16 w-72" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting}, {greetingRole} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium">
          <Activity className="h-3.5 w-3.5" /> Sistema operativo
        </div>
      </div>

      {/* Banner Carousel */}
      {banners && banners.length > 0 && (
        <DashboardBannerCarousel banners={banners} />
      )}

      {/* KPIs — Bento with sparklines + MoM */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Miembros"
          value={totalMiembros}
          icon={Users}
          variant="default"
          sparkline={growthSeries.series}
          trend={growthSeries.mom || (nuevos > 0 ? { value: `+${nuevos} este mes`, positive: true } : undefined)}
        />
        <MetricCard
          title="Peticiones Activas"
          value={peticionStats.pendientes + peticionStats.enOracion}
          icon={HandHeart}
          variant="accent"
          subtitle={`${peticionStats.pendientes} pendientes · ${peticionStats.enOracion} en oración`}
        />
        <MetricCard
          title="Respondidas"
          value={peticionStats.respondidas}
          icon={CheckCircle2}
          variant="success"
          subtitle="Peticiones cerradas"
        />
        <MetricCard
          title="Cursos Activos"
          value={cursos?.filter(c => c.estado === "Activo").length || 0}
          icon={GraduationCap}
          variant="info"
          subtitle={`${matriculas?.length || 0} matrículas`}
        />
      </div>


      {/* Row 2: Calendar + Alert Cards + Tema */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="mb-3">
            <div className="flex items-center gap-2 px-1">
              <div className="p-2 rounded-full bg-info text-info-foreground">
                <CalendarDays className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-foreground">Calendario de Actividades</h2>
            </div>
          </div>
          <EventCalendar events={calendarEvents} onEventClick={() => navigate("/eventos")} />
        </div>

        <div className="space-y-4">
          <DashboardAlertCards pendingReportes={alertData.pendingReportes} />
          <DashboardTemaSemana
            titulo={temaVigente?.titulo ?? config?.tema_semana_titulo}
            descripcion={temaVigente?.descripcion ?? config?.tema_semana_descripcion}
            url={temaVigente?.url ?? config?.tema_semana_url}
            pdfUrl={temaVigente?.pdf_url ?? (config as any)?.tema_semana_pdf_url}
            fechaFin={temaVigente?.fecha_fin ?? null}
            isLoading={temaLoading}
            error={temaError}
            onRetry={() => temaRefetch()}
          />


        </div>
      </div>

      {/* Row 3: Videos Section */}
      {videos && videos.length > 0 && (
        <DashboardVideoSection videos={videos} />
      )}

      {/* Row 4: Growth + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" /> Crecimiento de Membresía (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {growthTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={growthTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }} />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.15} strokeWidth={2} name="Nuevos" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><GraduationCap className="h-3.5 w-3.5" /> Cursos activos</div>
                <span className="text-sm font-bold text-foreground">{cursos?.filter(c => c.estado === "Activo").length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Alumnos matriculados</div>
                <span className="text-sm font-bold text-foreground">{matriculas?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Award className="h-3.5 w-3.5" /> Certificados emitidos</div>
                <span className="text-sm font-bold text-foreground">{certificados?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><HandHeart className="h-3.5 w-3.5" /> Peticiones en oración</div>
                <span className="text-sm font-bold text-foreground">{peticionStats.enOracion}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Church className="h-4 w-4 text-primary" /> Próximos Servicios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(stats?.servicios || []).filter((s: any) => s.estado === "Programado").slice(0, 3).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-xs font-medium text-foreground">{s.nombre}</p>
                    <p className="text-[10px] text-muted-foreground">{s.fecha} · {s.hora}</p>
                  </div>
                  <StatusBadge status={s.estado} />
                </div>
              ))}
              {(stats?.servicios || []).filter((s: any) => s.estado === "Programado").length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Sin servicios programados</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 5: Upcoming Events + Birthdays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-info" /> Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.map((e: any) => (
              <div key={e.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.nombre}</p>
                    <p className="text-[10px] text-muted-foreground">{e.lugar} · {e.fecha_inicio}</p>
                  </div>
                  <span className="text-[10px] font-medium bg-info/10 text-info px-2 py-0.5 rounded-full whitespace-nowrap">
                    {e.daysLeft === 0 ? "Hoy" : `${e.daysLeft}d`}
                  </span>
                </div>
                {e.cupos && (
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{e.inscritos} / {e.cupos} inscritos</span>
                      <span>{e.progress}%</span>
                    </div>
                    <Progress value={e.progress} className="h-1.5" />
                  </div>
                )}
              </div>
            ))}
            {upcomingEvents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Sin eventos próximos</p>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <DashboardBirthdayGrid birthdays={birthdays} />
        </div>
      </div>
    </div>
  );
}
