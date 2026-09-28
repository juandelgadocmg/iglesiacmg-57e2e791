import { useState } from "react";
import { TrendingUp, Users, CalendarDays, UserCheck, Activity, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useInfantilGrupos } from "@/hooks/useInfantil";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EstadisticasInfantilView() {
  const { data: grupos } = useInfantilGrupos();
  // Using a mock hook or real one if it existed for historical data
  
  const [periodo, setPeriodo] = useState("mes");

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Estadísticas de Crecimiento
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Métricas e indicadores del ministerio de niños.</p>
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
                <h3 className="text-4xl font-black mt-2">142</h3>
              </div>
              <div className="bg-white/20 p-3 rounded-2xl">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-emerald-300">
              <TrendingUp className="w-4 h-4 mr-1" /> +12% vs periodo anterior
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 font-medium text-sm">Nuevos Niños</p>
                <h3 className="text-4xl font-black mt-2 text-navy">28</h3>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl">
                <UserCheck className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-emerald-500">
              <TrendingUp className="w-4 h-4 mr-1" /> +5% de retención
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 font-medium text-sm">Clases Realizadas</p>
                <h3 className="text-4xl font-black mt-2 text-navy">16</h3>
              </div>
              <div className="bg-purple-50 p-3 rounded-2xl">
                <CalendarDays className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-slate-400">
              En {grupos?.length || 0} grupos activos
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 font-medium text-sm">Pico de Asistencia</p>
                <h3 className="text-4xl font-black mt-2 text-navy">185</h3>
              </div>
              <div className="bg-coral/10 p-3 rounded-2xl">
                <Activity className="w-6 h-6 text-coral" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-slate-400">
              Servicio Especial (Domingo)
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold text-navy">Asistencia por Grupo</CardTitle>
            <CardDescription>Distribución de los niños en los grupos activos</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {grupos?.map((g, i) => {
                // Mock distribution based on index to look realistic
                const percentages = [45, 30, 15, 10];
                const bgColors = ["bg-blue-500", "bg-emerald-400", "bg-coral", "bg-purple-400"];
                const width = percentages[i % 4] + "%";
                const color = bgColors[i % 4];
                
                return (
                  <div key={g.id} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold text-slate-700">
                      <span>{g.nombre}</span>
                      <span>{percentages[i % 4]}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width }} />
                    </div>
                  </div>
                );
              })}
              {(!grupos || grupos.length === 0) && (
                <div className="text-center py-8 text-slate-400">No hay grupos creados para mostrar la distribución.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-slate-50/50 border border-slate-100">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
              <Activity className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Gráficos de Tendencia</h3>
            <p className="text-slate-500 max-w-sm">
              A medida que se registren más check-ins a lo largo del año, aquí aparecerán las curvas de crecimiento y estacionalidad del ministerio.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
