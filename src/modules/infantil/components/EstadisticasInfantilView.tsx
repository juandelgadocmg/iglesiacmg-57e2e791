import { useState, useMemo } from "react";
import { TrendingUp, Users, CalendarDays, UserCheck, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  useInfantilGrupos,
  useInfantilClases,
  useInfantilAsistenciasHistoricas,
} from "@/hooks/useInfantil";
import { useNinos } from "../hooks/useNinos";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EstadisticasInfantilView() {
  const { data: grupos = [] } = useInfantilGrupos();
  const { data: clases = [] } = useInfantilClases();
  const { data: asistencias = [], isLoading: loadingAsistencias } = useInfantilAsistenciasHistoricas();
  const { ninos = [] } = useNinos();

  const [periodo, setPeriodo] = useState("mes");

  const stats = useMemo(() => {
    const now = new Date();
    const daysMap: Record<string, number> = {
      semana: 7,
      mes: 30,
      trimestre: 90,
      ano: 365,
    };
    const days = daysMap[periodo] || 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const prevCutoff = new Date(cutoff.getTime() - days * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoff.toISOString().split("T")[0];
    const prevCutoffIso = prevCutoff.toISOString().split("T")[0];

    const asistenciasPeriodo = (asistencias as any[]).filter((a) => {
      const f = (a.fecha || "").slice(0, 10);
      return f >= cutoffIso;
    });

    const asistenciasPrevias = (asistencias as any[]).filter((a) => {
      const f = (a.fecha || "").slice(0, 10);
      return f >= prevCutoffIso && f < cutoffIso;
    });

    // Agrupar asistencias por fecha en el periodo actual
    const porFecha = new Map<string, number>();
    for (const a of asistenciasPeriodo) {
      const f = (a.fecha || "").slice(0, 10);
      if (!f) continue;
      porFecha.set(f, (porFecha.get(f) || 0) + 1);
    }

    const fechasUnicas = Array.from(porFecha.keys()).sort((a, b) => b.localeCompare(a));
    const totalCheckins = asistenciasPeriodo.length;
    const promedioAsistencia =
      fechasUnicas.length > 0 ? Math.round(totalCheckins / fechasUnicas.length) : 0;

    // Promedio del periodo previo
    const porFechaPrev = new Map<string, number>();
    for (const a of asistenciasPrevias) {
      const f = (a.fecha || "").slice(0, 10);
      if (!f) continue;
      porFechaPrev.set(f, (porFechaPrev.get(f) || 0) + 1);
    }
    const prevPromedio =
      porFechaPrev.size > 0
        ? Math.round(asistenciasPrevias.length / porFechaPrev.size)
        : 0;

    const variacionPromedio =
      prevPromedio > 0
        ? Math.round(((promedioAsistencia - prevPromedio) / prevPromedio) * 100)
        : null;

    // Pico de asistencia en una fecha
    let picoAsistencia = 0;
    let fechaPico = "";
    porFecha.forEach((cnt, f) => {
      if (cnt > picoAsistencia) {
        picoAsistencia = cnt;
        fechaPico = f;
      }
    });

    // Nuevos niños registrados en el periodo
    const nuevosNinos = (ninos as any[]).filter((n) => {
      if (!n.created_at) return false;
      const created = new Date(n.created_at);
      return !isNaN(created.getTime()) && created >= cutoff;
    }).length;

    // Clases realizadas en el periodo
    const clasesPeriodo = (clases as any[]).filter((c) => {
      const f = (c.fecha || "").slice(0, 10);
      return f >= cutoffIso;
    }).length;

    // Distribución real por grupo (basada en asistencias del periodo o total histórico del grupo)
    const fuenteGrupo = asistenciasPeriodo.length > 0 ? asistenciasPeriodo : (asistencias as any[]);
    const conteoPorGrupo = new Map<string, number>();
    for (const a of fuenteGrupo) {
      if (a.grupo_id) {
        conteoPorGrupo.set(a.grupo_id, (conteoPorGrupo.get(a.grupo_id) || 0) + 1);
      }
    }
    const totalConGrupo = Array.from(conteoPorGrupo.values()).reduce((acc, v) => acc + v, 0);

    const distribucionGrupos = (grupos as any[]).map((g) => {
      const count = conteoPorGrupo.get(g.id) || 0;
      const pct = totalConGrupo > 0 ? Math.round((count / totalConGrupo) * 100) : 0;
      return {
        id: g.id,
        nombre: g.nombre,
        count,
        pct,
      };
    });

    const serieReciente = fechasUnicas.slice(0, 8).map((f) => ({
      fecha: f,
      cantidad: porFecha.get(f) || 0,
    }));

    return {
      promedioAsistencia,
      totalCheckins,
      variacionPromedio,
      nuevosNinos,
      totalNinos: ninos.length,
      clasesPeriodo,
      totalClases: clases.length,
      picoAsistencia,
      fechaPico,
      distribucionGrupos,
      serieReciente,
    };
  }, [asistencias, ninos, clases, grupos, periodo]);

  const bgColors = ["bg-blue-500", "bg-emerald-400", "bg-coral", "bg-purple-400"];

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Estadísticas de Crecimiento
          </h2>
          <p className="text-slate-500 mt-1 font-medium">
            Métricas e indicadores reales calculados a partir de los registros del Ministerio Infantil.
          </p>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[180px] bg-white h-11 rounded-xl shadow-sm border-slate-200 font-medium text-navy">
            <SelectValue placeholder="Seleccionar periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semana">Última Semana</SelectItem>
            <SelectItem value="mes">Último Mes</SelectItem>
            <SelectItem value="trimestre">Último Trimestre</SelectItem>
            <SelectItem value="ano">Este Año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg shadow-blue-100/50 bg-gradient-to-br from-blue-500 to-navy text-white rounded-3xl overflow-hidden relative">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 font-medium text-sm">Promedio Asistencia</p>
                <h3 className="text-4xl font-black mt-2">{stats.promedioAsistencia}</h3>
              </div>
              <div className="bg-white/20 p-3 rounded-2xl">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-emerald-300">
              <TrendingUp className="w-4 h-4 mr-1" />
              {stats.variacionPromedio !== null
                ? `${stats.variacionPromedio >= 0 ? "+" : ""}${stats.variacionPromedio}% vs periodo anterior`
                : `${stats.totalCheckins} asistencias en el periodo`}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 font-medium text-sm">Nuevos Niños</p>
                <h3 className="text-4xl font-black mt-2 text-navy">{stats.nuevosNinos}</h3>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl">
                <UserCheck className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-emerald-600">
              Total registrados: {stats.totalNinos} niños
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 font-medium text-sm">Clases Realizadas</p>
                <h3 className="text-4xl font-black mt-2 text-navy">{stats.clasesPeriodo}</h3>
              </div>
              <div className="bg-purple-50 p-3 rounded-2xl">
                <CalendarDays className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-slate-400">
              En {grupos.length} grupos activos ({stats.totalClases} históricas)
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 font-medium text-sm">Pico de Asistencia</p>
                <h3 className="text-4xl font-black mt-2 text-navy">{stats.picoAsistencia}</h3>
              </div>
              <div className="bg-coral/10 p-3 rounded-2xl">
                <Activity className="w-6 h-6 text-coral" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-slate-400">
              {stats.fechaPico ? `Fecha: ${stats.fechaPico}` : "Sin registros en el periodo"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold text-navy">Asistencia por Grupo</CardTitle>
            <CardDescription>Distribución real de asistencias registradas por grupo infantil</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {stats.distribucionGrupos.map((g, i) => {
                const color = bgColors[i % bgColors.length];
                return (
                  <div key={g.id} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold text-slate-700">
                      <span>{g.nombre}</span>
                      <span>
                        {g.count} asistencias ({g.pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color} transition-all`}
                        style={{ width: `${g.pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.distribucionGrupos.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  No hay grupos creados para mostrar la distribución.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold text-navy">Histórico por Fecha de Servicio</CardTitle>
            <CardDescription>Check-ins reales registrados por fecha en el periodo seleccionado</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {loadingAsistencias ? (
              <div className="text-center py-12 text-slate-400">Cargando histórico...</div>
            ) : stats.serieReciente.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12">
                <div className="bg-slate-50 p-4 rounded-full shadow-sm mb-3">
                  <Activity className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-slate-500 text-sm max-w-sm">
                  No hay check-ins registrados en este periodo. A medida que se registre asistencia en Recepción o Asistencia, verás aquí la evolución por fecha.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.serieReciente.map((item) => {
                  const pct =
                    stats.picoAsistencia > 0
                      ? Math.round((item.cantidad / stats.picoAsistencia) * 100)
                      : 0;
                  return (
                    <div key={item.fecha} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{item.fecha}</span>
                        <span>{item.cantidad} niños</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-navy transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
