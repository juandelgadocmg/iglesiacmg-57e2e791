import { useEffect, useState, useMemo } from "react";
import { useDiscipuladoAdmin } from "@/modules/discipulado/hooks/useDiscipuladoAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DiscipuloProcesoModal } from "@/modules/discipulado/components/DiscipuloProcesoModal";
import {
  Users,
  Search,
  Activity,
  History,
  TrendingUp,
  UserCheck,
  Building,
  RotateCw
} from "lucide-react";

export function DiscipuladoAdminView() {
  const { loadData, loading, discipulos, lideres, visitas, progreso } = useDiscipuladoAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDiscipulo, setSelectedDiscipulo] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Global Stats
  const stats = useMemo(() => {
    return {
      totalDiscipulos: discipulos.length,
      totalLideresActivos: new Set(discipulos.map(d => d.lider_id)).size,
      totalVisitas: visitas.length,
      totalCompletados: discipulos.filter(d => d.status === 'Completado').length,
      totalEnProceso: discipulos.filter(d => d.status === 'Activo').length,
    };
  }, [discipulos, visitas, progreso]);

  // Filtered List
  const filteredDiscipulos = useMemo(() => {
    if (!searchTerm.trim()) return discipulos;
    const term = searchTerm.toLowerCase();
    
    return discipulos.filter(d => {
      const lider = lideres.find(l => l.id === d.lider_id);
      return (
        d.full_name?.toLowerCase().includes(term) ||
        lider?.full_name?.toLowerCase().includes(term)
      );
    });
  }, [discipulos, lideres, searchTerm]);

  if (loading && discipulos.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold flex flex-col items-center justify-center min-h-[50vh]">
        <RotateCw className="w-8 h-8 animate-spin mb-4 text-red-500" />
        <p>Cargando datos globales del Discipulado...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b shadow-sm px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Admin Discipulado</h1>
          <p className="text-xs font-bold text-slate-500">Vista Global del Sistema</p>
        </div>
        <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="p-4 max-w-5xl mx-auto space-y-8 mt-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Users className="w-6 h-6 text-red-500 mb-2" />
              <span className="text-4xl font-black text-slate-800">{stats.totalDiscipulos}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Discípulos Totales</span>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <UserCheck className="w-6 h-6 text-red-500 mb-2" />
              <span className="text-4xl font-black text-slate-800">{stats.totalLideresActivos}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Líderes con Asignaciones</span>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <History className="w-6 h-6 text-red-500 mb-2" />
              <span className="text-4xl font-black text-slate-800">{stats.totalVisitas}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Visitas Registradas</span>
            </CardContent>
          </Card>
          <Card className="bg-red-600 border-0 shadow-sm text-white">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Activity className="w-6 h-6 text-red-200 mb-2" />
              <span className="text-4xl font-black text-white">{stats.totalCompletados}</span>
              <span className="text-xs font-bold text-red-200 uppercase tracking-wider mt-1">Consolidados</span>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda y Tabla */}
        <section className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Building className="w-5 h-5 text-slate-500" /> Directorio de Discipulado
            </h2>
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar discípulo o líder..."
                className="pl-9 bg-slate-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-y text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Discípulo</th>
                  <th className="px-4 py-3">Líder Asignado</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Última Visita</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDiscipulos.map((d) => {
                  const lider = lideres.find(l => l.id === d.lider_id);
                  const vDisc = visitas.filter(v => v.discipulo_id === d.id);
                  const ultima = vDisc.length > 0 ? vDisc[0] : null;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800">{d.full_name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {lider ? lider.full_name : <span className="text-red-400 italic">Sin Líder</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={d.status === 'Activo' ? 'bg-green-50 text-green-700 border-green-200' : ''}>
                          {d.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {ultima ? new Date(ultima.fecha).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 font-bold"
                          onClick={() => setSelectedDiscipulo(d)}
                        >
                          Ver Proceso
                        </Button>
                      </td>
                    </tr>
                  )
                })}
                {filteredDiscipulos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No se encontraron resultados para la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <DiscipuloProcesoModal
        open={!!selectedDiscipulo}
        onOpenChange={(open) => !open && setSelectedDiscipulo(null)}
        discipulo={selectedDiscipulo}
      />
    </div>
  );
}
