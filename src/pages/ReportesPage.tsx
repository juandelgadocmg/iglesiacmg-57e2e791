import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDatabase";
import { useCursos, useCertificados, useAllMatriculas } from "@/hooks/useAcademia";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Users, DollarSign, TrendingUp, TrendingDown, GraduationCap, Award, CalendarDays,
  Heart, Download, FileText, FileSpreadsheet, HandHeart, UsersRound, Church, ArrowUpRight,
  Layers, ChevronRight, Search, Sparkles,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { exportFinancialSummaryPDF, exportToExcel } from "@/lib/exportUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ModuleHero from "@/components/shell/ModuleHero";

type Domain = "todos" | "finanzas" | "personas" | "grupos" | "academia" | "asistencia" | "eventos";

const DOMAINS: { id: Domain; label: string; icon: any; color: string }[] = [
  { id: "todos", label: "Todos los reportes", icon: Layers, color: "text-foreground" },
  { id: "finanzas", label: "Finanzas", icon: DollarSign, color: "text-emerald-600" },
  { id: "personas", label: "Personas", icon: Users, color: "text-blue-600" },
  { id: "grupos", label: "Grupos y Redes", icon: UsersRound, color: "text-violet-600" },
  { id: "academia", label: "Academia", icon: GraduationCap, color: "text-amber-600" },
  { id: "asistencia", label: "Asistencia", icon: Church, color: "text-rose-600" },
  { id: "eventos", label: "Eventos", icon: CalendarDays, color: "text-cyan-600" },
];

interface ReportCard {
  id: string;
  domain: Exclude<Domain, "todos">;
  title: string;
  description: string;
  to: string;
  metric?: { value: string; label: string; trend?: string };
  icon: any;
}

export default function ReportesPage() {
  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: cursos } = useCursos();
  const { data: certificados } = useCertificados();
  const { data: matriculas } = useAllMatriculas();

  const [domain, setDomain] = useState<Domain>("todos");
  const [q, setQ] = useState("");

  const fmt = (n: number) => `$${(n || 0).toLocaleString("es")}`;
  const balance = (stats?.ingresosMes || 0) - (stats?.gastosMes || 0);

  const finanzasChart = useMemo(() => [
    { name: "Ingresos", valor: stats?.ingresosMes || 0 },
    { name: "Gastos", valor: stats?.gastosMes || 0 },
  ], [stats]);

  const academiaChart = useMemo(
    () => (cursos || []).slice(0, 6).map((c) => ({
      nombre: c.nombre.length > 15 ? c.nombre.slice(0, 15) + "…" : c.nombre,
      alumnos: (c as any).matriculas?.[0]?.count || 0,
    })),
    [cursos]
  );

  const matriculasEstado = useMemo(() => {
    if (!matriculas) return [];
    const counts: Record<string, number> = {};
    matriculas.forEach((m) => (counts[m.estado] = (counts[m.estado] || 0) + 1));
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [matriculas]);

  const reports: ReportCard[] = useMemo(() => [
    {
      id: "fin-balance", domain: "finanzas", title: "Balance mensual",
      description: "Ingresos vs egresos del mes, tendencia y saldo neto",
      to: "/finanzas?tab=reportes", icon: TrendingUp,
      metric: { value: fmt(balance), label: "Balance del mes", trend: balance >= 0 ? "positivo" : "negativo" },
    },
    {
      id: "fin-ingresos", domain: "finanzas", title: "Ingresos por categoría",
      description: "Desglose de diezmos, ofrendas y otras entradas",
      to: "/finanzas?tab=reportes", icon: DollarSign,
      metric: { value: fmt(stats?.ingresosMes || 0), label: "Ingresos mes" },
    },
    {
      id: "fin-donaciones", domain: "finanzas", title: "Donaciones y padrinos",
      description: "Contribuciones recibidas, donantes recurrentes",
      to: "/finanzas?tab=donaciones", icon: Heart,
    },
    {
      id: "per-nuevos", domain: "personas", title: "Personas nuevas",
      description: "Ingresos del mes, canal de entrada y seguimiento",
      to: "/personas?view=nuevas", icon: Users,
      metric: { value: `${stats?.nuevosEsteMes || 0}`, label: "Nuevos este mes" },
    },
    {
      id: "per-crecimiento", domain: "personas", title: "Procesos de crecimiento",
      description: "Estado de los 25 procesos espirituales por persona",
      to: "/personas", icon: TrendingUp,
    },
    {
      id: "gru-redes", domain: "grupos", title: "Dashboard de Redes",
      description: "Miembros, casas de paz, asistencia y ofrenda por red",
      to: "/grupos?tab=dashboard", icon: UsersRound,
    },
    {
      id: "gru-cdp", domain: "grupos", title: "Tesorería CDP",
      description: "Reconciliación semanal de ofrendas de casas de paz",
      to: "/grupos?tab=tesoreria-cdp", icon: DollarSign,
    },
    {
      id: "gru-plan", domain: "grupos", title: "Planificación semanal",
      description: "Hojas de planeación de líderes de casa de paz",
      to: "/grupos?tab=planificacion", icon: FileText,
    },
    {
      id: "aca-cursos", domain: "academia", title: "Cursos y matrículas",
      description: "Alumnos por curso, estado y avance",
      to: "/academia", icon: GraduationCap,
      metric: { value: `${matriculas?.length || 0}`, label: "Matrículas activas" },
    },
    {
      id: "aca-cert", domain: "academia", title: "Certificados emitidos",
      description: "Diplomas y constancias generadas",
      to: "/certificados", icon: Award,
      metric: { value: `${certificados?.length || 0}`, label: "Certificados totales" },
    },
    {
      id: "asi-reuniones", domain: "asistencia", title: "Asistencia a Reuniones",
      description: "Tendencia semanal por sede y tipo de reunión",
      to: "/servicios", icon: Church,
    },
    {
      id: "asi-grupos", domain: "asistencia", title: "Asistencia por grupo",
      description: "Presentes, ausentes y motivos de ausencia",
      to: "/grupos?tab=reportes", icon: UsersRound,
    },
    {
      id: "eve-proximos", domain: "eventos", title: "Próximos eventos",
      description: "Agenda, inscripciones y capacidad restante",
      to: "/eventos", icon: CalendarDays,
      metric: { value: `${stats?.eventos?.length || 0}`, label: "En agenda" },
    },
  ], [stats, certificados, matriculas, balance]);

  const filtered = reports.filter((r) =>
    (domain === "todos" || r.domain === domain) &&
    (!q || r.title.toLowerCase().includes(q.toLowerCase()) || r.description.toLowerCase().includes(q.toLowerCase()))
  );

  const handleExportPDF = () => {
    exportFinancialSummaryPDF({
      ingresosMes: stats?.ingresosMes || 0, gastosMes: stats?.gastosMes || 0,
      totalPersonas: stats?.totalPersonas || 0, nuevosEsteMes: stats?.nuevosEsteMes || 0,
      certificadosTotal: certificados?.length || 0,
      cursosActivos: cursos?.filter((c) => c.estado === "Activo").length || 0,
      alumnosMatriculados: matriculas?.length || 0,
      proximosEventos: stats?.eventos?.length || 0,
    });
    toast.success("Reporte PDF generado");
  };
  const handleExportExcel = () => {
    exportToExcel({
      title: "Reporte General",
      columns: [{ header: "Concepto", key: "concepto" }, { header: "Valor", key: "valor" }],
      data: [
        { concepto: "Ingresos del mes", valor: stats?.ingresosMes || 0 },
        { concepto: "Gastos del mes", valor: stats?.gastosMes || 0 },
        { concepto: "Balance", valor: balance },
        { concepto: "Total personas", valor: stats?.totalPersonas || 0 },
        { concepto: "Nuevos este mes", valor: stats?.nuevosEsteMes || 0 },
        { concepto: "Certificados emitidos", valor: certificados?.length || 0 },
        { concepto: "Cursos activos", valor: cursos?.filter((c) => c.estado === "Activo").length || 0 },
        { concepto: "Alumnos matriculados", valor: matriculas?.length || 0 },
      ],
      filename: "reporte-general",
    });
    toast.success("Reporte Excel generado");
  };

  if (loadingStats) {
    return (
      <div className="animate-fade-in space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in -m-3 md:-m-6 flex min-h-[calc(100vh-3.5rem)]">
      {/* Rail izquierdo — dominios */}
      <aside className="w-60 shrink-0 border-r bg-card/40 flex flex-col h-[calc(100vh-3.5rem)] sticky top-14">
        <div className="p-4 border-b">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Biblioteca</p>
          <h2 className="text-sm font-semibold mt-0.5">Reportes DOXA</h2>
        </div>
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar reporte…" className="pl-8 h-8 text-[13px]" />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {DOMAINS.map((d) => {
            const count = d.id === "todos" ? reports.length : reports.filter((r) => r.domain === d.id).length;
            const active = domain === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setDomain(d.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-4 py-2 text-[13px] hover:bg-muted/60",
                  active && "bg-primary/10 text-primary font-medium"
                )}
              >
                <d.icon className={cn("h-4 w-4", active ? "text-primary" : d.color)} />
                <span className="flex-1 text-left">{d.label}</span>
                <span className="text-[10.5px] text-muted-foreground">{count}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Área principal */}
      <div className="flex-1 min-w-0 p-3 md:p-6 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              {DOMAINS.find((d) => d.id === domain)?.label}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {filtered.length} reportes disponibles · Datos actualizados en tiempo real
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Download className="h-3.5 w-3.5" /> Exportar resumen
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF}><FileText className="h-4 w-4 mr-2" />PDF ejecutivo</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Snapshot ejecutivo — visible solo en "Todos" */}
        {domain === "todos" && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SnapshotTile icon={Users} label="Personas activas" value={String(stats?.totalPersonas || 0)} sub={`+${stats?.nuevosEsteMes || 0} este mes`} tone="blue" />
            <SnapshotTile icon={TrendingUp} label="Ingresos mes" value={fmt(stats?.ingresosMes || 0)} sub={`Balance ${fmt(balance)}`} tone="green" />
            <SnapshotTile icon={GraduationCap} label="Matrículas activas" value={String(matriculas?.length || 0)} sub={`${cursos?.filter((c) => c.estado === "Activo").length || 0} cursos activos`} tone="amber" />
            <SnapshotTile icon={Award} label="Certificados" value={String(certificados?.length || 0)} sub="Emitidos total" tone="violet" />
          </section>
        )}

        {/* Grid de reportes */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <Link
              key={r.id}
              to={r.to}
              className="group rounded-xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <r.icon className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </div>
              <div>
                <h3 className="font-semibold text-[14px] group-hover:text-primary transition-colors">{r.title}</h3>
                <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
              </div>
              {r.metric && (
                <div className="pt-2 border-t flex items-end justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground">{r.metric.label}</p>
                    <p className="text-lg font-bold tracking-tight">{r.metric.value}</p>
                  </div>
                  <span className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-medium">
                    {DOMAINS.find((d) => d.id === r.domain)?.label}
                  </span>
                </div>
              )}
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Ningún reporte coincide con esta búsqueda</p>
            </div>
          )}
        </section>

        {/* Visualizaciones inline solo si dominio ≠ todos y es finanzas/academia */}
        {(domain === "finanzas" || domain === "todos") && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Finanzas del mes">
              <BarChart data={finanzasChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>
            {academiaChart.length > 0 && (
              <ChartCard title="Alumnos por curso">
                <BarChart data={academiaChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={120} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="alumnos" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ChartCard>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function SnapshotTile({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub: string; tone: "blue" | "green" | "amber" | "violet" }) {
  const toneMap = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
    green: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    violet: "text-violet-600 bg-violet-50 dark:bg-violet-950/30",
  };
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", toneMap[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold tracking-tight mt-0.5">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: any }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold text-sm mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={240}>{children}</ResponsiveContainer>
    </div>
  );
}
