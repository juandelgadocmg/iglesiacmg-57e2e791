import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadCloud, Activity, PhoneCall, Home } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import { format, subDays, parseISO, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

interface DiscipuladoDashboardProps {
  discipulos: any[];
  visitas: any[];
  llamadas: any[];
  progreso: any[];
  casasDePaz: any[];
  lideres: any[];
  redes: any[];
}

const STATUS_COLORS: Record<string, string> = {
  'Activo': '#10b981', // green-500
  'Completado': '#3b82f6', // blue-500
  'En pausa': '#f59e0b', // amber-500
  'default': '#94a3b8' // slate-400
};

export function DiscipuladoDashboard({
  discipulos,
  visitas,
  llamadas,
  progreso,
  casasDePaz,
  lideres,
  redes
}: DiscipuladoDashboardProps) {

  const [redFilter, setRedFilter] = React.useState<string>('Todas');
  const [casaFilter, setCasaFilter] = React.useState<string>('Todas');

  // Derive Red mapping
  const redByCasa = useMemo(() => {
    const map: Record<string, string> = {};
    casasDePaz?.forEach(c => {
      if (c.red_id) {
        const r = redes?.find(red => red.id === c.red_id);
        map[c.id] = r ? r.name : 'Sin Red';
      } else {
        map[c.id] = 'Sin Red';
      }
    });
    return map;
  }, [casasDePaz, redes]);

  const uniqueRedes = useMemo(() => {
    const rNames = Array.from(new Set(Object.values(redByCasa)));
    return rNames.filter(r => r !== 'Sin Red').sort();
  }, [redByCasa]);

  const uniqueCasas = useMemo(() => {
    let casas = casasDePaz || [];
    if (redFilter !== 'Todas') {
      casas = casas.filter(c => redByCasa[c.id] === redFilter);
    }
    const names = Array.from(new Set(casas.map(c => c.name)));
    return names.filter(n => n && n !== 'Sin nombre').sort();
  }, [casasDePaz, redFilter, redByCasa]);

  // Filter Discipulos
  const filteredDiscipulos = useMemo(() => {
    return discipulos.filter(d => {
      let cId = d.casa_de_paz_id;
      if (!cId && d.lider_id) {
        const lid = lideres.find(l => l.id === d.lider_id);
        cId = lid?.casa_de_paz_id;
      }
      if (!cId) {
        const casaLider = casasDePaz.find(c => c.lider_id === d.lider_id);
        cId = casaLider?.id;
      }
      
      const rName = cId ? (redByCasa[cId] || 'Sin Red') : 'Sin Red';
      const cObj = cId ? casasDePaz.find(c => c.id === cId) : null;
      const cName = cObj ? cObj.name : 'Sin casa';

      if (redFilter !== 'Todas' && rName !== redFilter) return false;
      if (casaFilter !== 'Todas' && cName !== casaFilter) return false;
      
      return true;
    });
  }, [discipulos, redFilter, casaFilter, lideres, casasDePaz, redByCasa]);

  // Filter Visitas y Llamadas basadas en discipulos filtrados
  const filteredDiscipulosIds = useMemo(() => new Set(filteredDiscipulos.map(d => d.id)), [filteredDiscipulos]);
  
  const filteredVisitas = useMemo(() => visitas.filter(v => filteredDiscipulosIds.has(v.discipulo_id)), [visitas, filteredDiscipulosIds]);
  const filteredLlamadas = useMemo(() => llamadas.filter(l => filteredDiscipulosIds.has(l.discipulo_id)), [llamadas, filteredDiscipulosIds]);

  // 1. Chart Data: Activity over the last 30 days
  const activityData = useMemo(() => {
    const data: any[] = [];
    const today = new Date();
    
    // Create an array of the last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayVisitas = filteredVisitas.filter(v => v.fecha === dateStr).length;
      const dayLlamadas = filteredLlamadas.filter(l => l.fecha === dateStr).length;
      
      data.push({
        name: format(date, 'd MMM', { locale: es }),
        dateStr,
        visitas: dayVisitas,
        llamadas: dayLlamadas
      });
    }
    return data;
  }, [filteredVisitas, filteredLlamadas]);

  // 2. Chart Data: Discipulos Status
  const statusData = useMemo(() => {
    const counts = filteredDiscipulos.reduce((acc, d) => {
      const status = d.status || 'Activo';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key],
      color: STATUS_COLORS[key] || STATUS_COLORS['default']
    }));
  }, [filteredDiscipulos]);

  // 3. Export to Excel function
  const exportToExcel = () => {
    const redSummary: Record<string, any> = {};

    let exportData = filteredDiscipulos.map(d => {
      // Find related entities
      let casa = casasDePaz.find(c => c.id === d.casa_de_paz_id);
      let lider = lideres.find(l => l.id === d.lider_id);
      if (!lider && casa) {
        lider = lideres.find(l => l.id === casa.lider_id || l.casa_de_paz_id === casa.id);
      }
      
      // Intentar obtener la casa del discípulo, sino fallback a la del líder
      if (!casa && lider && lider.casa_de_paz_id) {
         casa = casasDePaz.find(c => c.id === lider.casa_de_paz_id);
      }
      
      const red = casa ? redes.find(r => r.id === casa.red_id) : null;
      
      const dVisitas = visitas.filter(v => v.discipulo_id === d.id);
      const dLlamadas = llamadas.filter(l => l.discipulo_id === d.id);
      
      const lastVisita = dVisitas.length > 0 ? dVisitas[0].fecha : 'N/A';
      const lastLlamada = dLlamadas.length > 0 ? dLlamadas[0].fecha : 'N/A';
      const redName = red ? red.name : 'Sin Red';

      // Aggregating for Summary
      if (!redSummary[redName]) {
        redSummary[redName] = { 
          'Red': redName, 
          'Total Discípulos': 0, 
          'Consolidados (Completados)': 0,
          'Total Visitas': 0,
          'Total Llamadas': 0
        };
      }
      redSummary[redName]['Total Discípulos'] += 1;
      if (d.status === 'Completado') redSummary[redName]['Consolidados (Completados)'] += 1;
      redSummary[redName]['Total Visitas'] += dVisitas.length;
      redSummary[redName]['Total Llamadas'] += dLlamadas.length;

      return {
        'Red': redName,
        'Nombre del Discípulo': d.full_name,
        'Estado': d.status || 'Activo',
        'Líder Asignado': lider ? lider.full_name : 'Sin asignar',
        'Casa de Paz': casa ? casa.name : 'Sin casa',
        'Total Visitas': dVisitas.length,
        'Última Visita': lastVisita,
        'Total Llamadas': dLlamadas.length,
        'Última Llamada': lastLlamada,
        'Fecha de Registro': d.created_at ? format(parseISO(d.created_at), 'yyyy-MM-dd') : 'N/A'
      };
    });

    // Sort exportData by Red, then Casa de Paz, then Name
    exportData.sort((a, b) => {
      if (a.Red !== b.Red) return a.Red.localeCompare(b.Red);
      if (a['Casa de Paz'] !== b['Casa de Paz']) return a['Casa de Paz'].localeCompare(b['Casa de Paz']);
      return a['Nombre del Discípulo'].localeCompare(b['Nombre del Discípulo']);
    });

    const summaryData = Object.values(redSummary).sort((a: any, b: any) => a.Red.localeCompare(b.Red));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Discípulos");
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen por Red");
    
    XLSX.writeFile(workbook, `Reporte_Discipulado_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-lg font-black text-slate-800">Panel de Rendimiento</h2>
          <p className="text-xs text-slate-500 font-medium">Analiza la actividad de discipulado de tu iglesia.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <select 
            className="h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm"
            value={redFilter}
            onChange={(e) => {
              setRedFilter(e.target.value);
              setCasaFilter('Todas');
            }}
          >
            <option value="Todas">Todas las Redes</option>
            <option value="Sin Red">Sin Red</option>
            {uniqueRedes.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          
          <select 
            className="h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm"
            value={casaFilter}
            onChange={(e) => setCasaFilter(e.target.value)}
          >
            <option value="Todas">Todas las Casas</option>
            <option value="Sin casa">Sin casa</option>
            {uniqueCasas.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <Button 
            onClick={exportToExcel}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <DownloadCloud className="w-4 h-4" /> Exportar Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gráfica de Línea: Visitas vs Llamadas */}
        <Card className="col-span-1 md:col-span-2 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              Actividad Reciente (30 días)
            </CardTitle>
            <CardDescription>Comparativa de visitas y llamadas registradas en el mes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickMargin={10}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line 
                    type="monotone" 
                    name="Visitas"
                    dataKey="visitas" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    name="Llamadas"
                    dataKey="llamadas" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfica de Torta: Estados */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-500" />
              Estado de Discípulos
            </CardTitle>
            <CardDescription>Distribución actual de los discípulos.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
