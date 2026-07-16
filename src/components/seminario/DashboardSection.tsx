import { useMemo } from "react";
import { useDashboardKpis, useProgramas } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BookOpen, AlertCircle, Calendar, Award, TrendingUp, Users, UserCheck, ClipboardCheck, Activity, LayoutDashboard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import SectionHero from "@/components/shell/SectionHero";

export default function DashboardSection() {
  const { data: programas } = useProgramas();
  const { data: kpis, isLoading } = useDashboardKpis();

  const stats = useMemo(() => {
    const insc = kpis?.inscripciones || [];
    const ims = kpis?.inscripcionMaterias || [];
    const asist = kpis?.asistencias || [];
    const ofertas = kpis?.ofertas || [];

    const activas = insc.filter((i: any) => i.estado === "activa").length;
    const completadas = insc.filter((i: any) => i.estado === "completado").length;
    const promedio = insc.length
      ? insc.reduce((a: number, b: any) => a + Number(b.promedio_acumulado || 0), 0) / insc.length
      : 0;
    const moraTotal = (kpis?.moraPendientes || []).reduce((a: number, b: any) => a + Number(b.monto || 0), 0);

    const aprobadas = ims.filter((m: any) => m.estado === "aprobada").length;
    const reprobadas = ims.filter((m: any) => m.estado === "reprobada").length;
    const cursando = ims.filter((m: any) => m.estado === "cursando").length;
    const tasaAprob = (aprobadas + reprobadas) > 0 ? Math.round((aprobadas / (aprobadas + reprobadas)) * 100) : 0;

    const presentes = asist.filter((a: any) => a.estado === "presente").length;
    const tasaAsist = asist.length ? Math.round((presentes / asist.length) * 100) : 0;

    const docentesSet = new Set(ofertas.map((o: any) => o.docente_nombre).filter(Boolean));

    // Estudiantes por programa
    const porPrograma: Record<string, number> = {};
    insc.forEach((i: any) => { porPrograma[i.programa_id] = (porPrograma[i.programa_id] || 0) + 1; });
    const progBars = Object.entries(porPrograma).map(([pid, c]) => ({
      nombre: (programas as any[] || []).find(p => p.id === pid)?.codigo || pid.slice(0, 6),
      estudiantes: c,
    }));

    // Distribución de notas
    const buckets = [
      { rango: "0–2.9", min: 0, max: 2.99, count: 0, fill: "#dc2626" },
      { rango: "3.0–3.4", min: 3.0, max: 3.49, count: 0, fill: "#f97316" },
      { rango: "3.5–3.9", min: 3.5, max: 3.99, count: 0, fill: "#eab308" },
      { rango: "4.0–4.4", min: 4.0, max: 4.49, count: 0, fill: "#22c55e" },
      { rango: "4.5–5.0", min: 4.5, max: 5.0, count: 0, fill: "#15803d" },
    ];
    ims.forEach((m: any) => {
      const n = Number(m.nota_final);
      if (m.nota_final == null || isNaN(n)) return;
      const b = buckets.find(b => n >= b.min && n <= b.max);
      if (b) b.count++;
    });

    // Top docentes por # estudiantes
    const docMap: Record<string, number> = {};
    const ofertaToDoc: Record<string, string> = {};
    ofertas.forEach((o: any) => { if (o.docente_nombre) ofertaToDoc[o.id] = o.docente_nombre; });
    ims.forEach((m: any) => {
      const d = ofertaToDoc[m.oferta_id];
      if (d) docMap[d] = (docMap[d] || 0) + 1;
    });
    const topDocentes = Object.entries(docMap)
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);

    // Estado matrículas para pie
    const estadosIm = [
      { name: "Cursando", value: cursando, fill: "#3b82f6" },
      { name: "Aprobadas", value: aprobadas, fill: "#16a34a" },
      { name: "Reprobadas", value: reprobadas, fill: "#dc2626" },
    ].filter(x => x.value > 0);

    return {
      activas, completadas, promedio, moraTotal,
      aprobadas, reprobadas, cursando, tasaAprob, tasaAsist,
      docentes: docentesSet.size, ofertas: ofertas.length,
      progBars, buckets, topDocentes, estadosIm,
    };
  }, [kpis, programas]);

  if (isLoading) return <div className="text-sm text-muted-foreground p-6 text-center">Cargando métricas…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Dashboard Seminario</h2>
        <p className="text-xs text-muted-foreground">KPIs y resumen académico en tiempo real</p>
      </div>

      {/* KPIs primarios */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={GraduationCap} label="Estudiantes activos" value={stats.activas} color="text-blue-600" />
        <Kpi icon={Award} label="Programas completados" value={stats.completadas} color="text-emerald-600" />
        <Kpi icon={TrendingUp} label="Promedio general" value={stats.promedio.toFixed(2)} color="text-purple-600" />
        <Kpi icon={AlertCircle} label="Mora pendiente" value={`$${stats.moraTotal.toLocaleString("es-CO")}`} color="text-destructive" />
      </div>

      {/* KPIs secundarios */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Users} label="Docentes activos" value={stats.docentes} color="text-indigo-600" />
        <Kpi icon={BookOpen} label="Materias en oferta" value={stats.ofertas} color="text-cyan-600" />
        <Kpi icon={ClipboardCheck} label="% Aprobación" value={`${stats.tasaAprob}%`} color={stats.tasaAprob >= 70 ? "text-emerald-600" : stats.tasaAprob >= 50 ? "text-amber-600" : "text-destructive"} />
        <Kpi icon={UserCheck} label="% Asistencia" value={`${stats.tasaAsist}%`} color={stats.tasaAsist >= 80 ? "text-emerald-600" : "text-amber-600"} />
      </div>

      {/* Gráficos */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /><p className="font-semibold text-sm">Estudiantes por programa</p></div>
            <div className="h-56">
              {stats.progBars.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Sin datos</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.progBars}>
                    <XAxis dataKey="nombre" fontSize={10} />
                    <YAxis fontSize={10} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="estudiantes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /><p className="font-semibold text-sm">Distribución de notas finales</p></div>
            <div className="h-56">
              {stats.buckets.every(b => b.count === 0) ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Sin notas registradas</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.buckets}>
                    <XAxis dataKey="rango" fontSize={10} />
                    <YAxis fontSize={10} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.buckets.map((b, i) => <Cell key={i} fill={b.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /><p className="font-semibold text-sm">Estado de matrículas</p></div>
            <div className="h-56">
              {stats.estadosIm.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Sin matrículas</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.estadosIm} dataKey="value" nameKey="name" outerRadius={75} label={(e: any) => `${e.name}: ${e.value}`}>
                      {stats.estadosIm.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><p className="font-semibold text-sm">Top docentes por carga</p></div>
            {stats.topDocentes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sin asignaciones</p>
            ) : (
              <div className="space-y-1">
                {stats.topDocentes.map((d) => (
                  <div key={d.nombre} className="flex items-center gap-2 p-2 border rounded text-xs">
                    <Users className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="flex-1 truncate">{d.nombre}</span>
                    <Badge variant="outline">{d.count} estudiantes</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Próximas evaluaciones + Últimos diplomas */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /><p className="font-semibold text-sm">Próximas evaluaciones</p></div>
            {(kpis?.proxEvaluaciones || []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin evaluaciones próximas</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-auto">
                {(kpis?.proxEvaluaciones || []).map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2 p-2 border rounded text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{e.nombre}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {e.sem_ofertas?.sem_materias?.codigo} · {e.sem_ofertas?.sem_materias?.nombre} · {e.tipo}
                      </p>
                    </div>
                    <Badge variant="outline">{e.fecha}</Badge>
                    {!e.publicada && <Badge variant="secondary" className="text-[9px]">Borrador</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /><p className="font-semibold text-sm">Últimos diplomas emitidos</p></div>
            {(kpis?.ultimosCertificados || []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin emisiones aún</p>
            ) : (
              <div className="space-y-1">
                {(kpis?.ultimosCertificados || []).map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 p-2 border rounded text-xs">
                    <Award className="h-3 w-3 text-amber-500" />
                    <span className="flex-1 truncate">{c.personas?.nombres} {c.personas?.apellidos}</span>
                    <Badge variant="outline">{c.fecha_emision}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, color }: any) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={`h-8 w-8 ${color}`} />
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground">{label}</p>
          <p className="text-xl font-bold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
