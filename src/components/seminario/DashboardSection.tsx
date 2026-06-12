import { useMemo } from "react";
import { useDashboardKpis, useProgramas } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BookOpen, AlertCircle, Calendar, Award, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardSection() {
  const { data: programas } = useProgramas();
  const { data: kpis } = useDashboardKpis();

  const stats = useMemo(() => {
    const insc = kpis?.inscripciones || [];
    const activas = insc.filter((i: any) => i.estado === "activa").length;
    const completadas = insc.filter((i: any) => i.estado === "completado").length;
    const promedio = insc.length
      ? insc.reduce((a: number, b: any) => a + Number(b.promedio_acumulado || 0), 0) / insc.length
      : 0;
    const moraTotal = (kpis?.moraPendientes || []).reduce((a: number, b: any) => a + Number(b.monto || 0), 0);
    const porPrograma: Record<string, number> = {};
    insc.forEach((i: any) => { porPrograma[i.programa_id] = (porPrograma[i.programa_id] || 0) + 1; });
    const progBars = Object.entries(porPrograma).map(([pid, c]) => ({
      nombre: (programas as any[] || []).find(p => p.id === pid)?.codigo || pid.slice(0, 6),
      estudiantes: c,
    }));
    return { activas, completadas, promedio, moraTotal, progBars };
  }, [kpis, programas]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Dashboard Seminario</h2>
        <p className="text-xs text-muted-foreground">KPIs y resumen académico en tiempo real</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={GraduationCap} label="Estudiantes activos" value={stats.activas} color="text-blue-600" />
        <Kpi icon={Award} label="Programas completados" value={stats.completadas} color="text-emerald-600" />
        <Kpi icon={TrendingUp} label="Promedio general" value={stats.promedio.toFixed(2)} color="text-purple-600" />
        <Kpi icon={AlertCircle} label="Mora pendiente" value={`$${stats.moraTotal.toLocaleString()}`} color="text-destructive" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /><p className="font-semibold text-sm">Estudiantes por programa</p></div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.progBars}>
                  <XAxis dataKey="nombre" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="estudiantes" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /><p className="font-semibold text-sm">Próximas evaluaciones</p></div>
            {(kpis?.proxEvaluaciones || []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin evaluaciones próximas</p>
            ) : (
              <div className="space-y-1 max-h-56 overflow-auto">
                {(kpis?.proxEvaluaciones || []).map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2 p-2 border rounded text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="flex-1 truncate">Evaluación {e.id.slice(0, 6)}</span>
                    <Badge variant="outline">{e.fecha}</Badge>
                    {!e.publicada && <Badge variant="secondary" className="text-[9px]">Borrador</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                  <span className="flex-1">Diploma {c.id.slice(0, 8)}</span>
                  <Badge variant="outline">{c.fecha_emision}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
