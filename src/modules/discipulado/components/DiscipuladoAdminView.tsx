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
  RotateCw,
  Folder,
  MapPin,
  Shield,
  ChevronRight,
  FolderOpen
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function DiscipuladoAdminView() {
  const { loadData, loading, discipulos, lideres, redes, casasDePaz, visitas, progreso } = useDiscipuladoAdmin();
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

  // Filtered Hierarchy
  const hierarchy = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const tree: any[] = [];
    
    const allRedes = [...redes, { id: 'no-red', name: 'Sin Red asignada' }];
    const allCasas = [...casasDePaz, { id: 'no-casa', name: 'Sin Casa asignada', red_id: 'no-red' }];
    
    allRedes.forEach(red => {
      const redCasas = allCasas.filter(c => c.red_id === red.id || (red.id === 'no-red' && !c.red_id));
      
      const parsedCasas = redCasas.map(casa => {
        const rawLideres = lideres.filter(l => l.casa_de_paz_id === casa.id || (casa.id === 'no-casa' && !l.casa_de_paz_id));
        const allLids = [...rawLideres];
        
        if (casa.id === 'no-casa') {
           allLids.push({ id: 'no-lider', full_name: 'Discípulos sin líder' });
        }

        const casaLideres = allLids.map(l => {
          let lDiscs = discipulos.filter(d => d.lider_id === l.id || (l.id === 'no-lider' && !d.lider_id));
          
          if (term && !l.full_name?.toLowerCase().includes(term)) {
             lDiscs = lDiscs.filter(d => d.full_name?.toLowerCase().includes(term));
          }
          return { ...l, discipulos: lDiscs };
        }).filter(l => l.discipulos.length > 0 || (!term && l.id !== 'no-lider') || (term && l.full_name?.toLowerCase().includes(term)));
        
        return { ...casa, lideres: casaLideres };
      }).filter(c => c.lideres.length > 0 || (!term && c.id !== 'no-casa') || (term && c.name?.toLowerCase().includes(term)));
      
      if (parsedCasas.length > 0) {
        // If it's "no-red" and there's absolutely no data inside that matched, don't show it unless we have raw empty categories (only on no-search).
        if (red.id === 'no-red' && parsedCasas.length === 1 && parsedCasas[0].id === 'no-casa' && parsedCasas[0].lideres.length === 1 && parsedCasas[0].lideres[0].id === 'no-lider' && parsedCasas[0].lideres[0].discipulos.length === 0) {
           return;
        }
        tree.push({ ...red, casas: parsedCasas });
      }
    });
    
    return tree;
  }, [redes, casasDePaz, lideres, discipulos, searchTerm]);

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

          <div className="mt-4">
            {hierarchy.length === 0 ? (
               <div className="p-8 text-center text-slate-500">
                 No se encontraron resultados para la búsqueda.
               </div>
            ) : (
              <Accordion type="multiple" className="space-y-4">
                {hierarchy.map((red) => (
                  <AccordionItem value={red.id} key={red.id} className="border bg-slate-50/50 rounded-xl overflow-hidden shadow-sm">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="w-5 h-5 text-red-600" />
                        <span className="font-black text-slate-800 uppercase tracking-tight">{red.name}</span>
                        <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-700">{red.casas.length} Casas</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-0 pb-4 px-4">
                      
                      <Accordion type="multiple" className="space-y-3 mt-3 pl-4 border-l-2 border-slate-200 ml-2">
                        {red.casas.map((casa: any) => (
                          <AccordionItem value={casa.id} key={casa.id} className="border bg-white rounded-lg overflow-hidden shadow-sm">
                            <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-slate-50">
                              <div className="flex items-center gap-3">
                                <MapPin className="w-4 h-4 text-slate-500" />
                                <span className="font-bold text-slate-700">{casa.name}</span>
                                <Badge variant="secondary" className="ml-2 text-[10px]">{casa.lideres.length} Líderes</Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 pb-3 px-4">
                              
                              <Accordion type="multiple" className="space-y-2 mt-2 pl-4 border-l border-slate-100 ml-1">
                                {casa.lideres.map((lider: any) => (
                                  <AccordionItem value={lider.id} key={lider.id} className="border border-slate-100 bg-slate-50/30 rounded-md overflow-hidden">
                                    <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50">
                                      <div className="flex items-center gap-2">
                                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="font-semibold text-slate-600 text-sm">{lider.full_name}</span>
                                        <Badge variant="outline" className="ml-2 text-[10px] bg-white">{lider.discipulos.length} Discípulos</Badge>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-0">
                                      {lider.discipulos.length === 0 ? (
                                        <div className="p-3 text-xs text-slate-400 text-center bg-white border-t border-slate-100">Sin discípulos asignados</div>
                                      ) : (
                                        <div className="overflow-x-auto bg-white border-t border-slate-100">
                                          <table className="w-full text-xs text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                                              <tr>
                                                <th className="px-3 py-2">Discípulo</th>
                                                <th className="px-3 py-2">Estado</th>
                                                <th className="px-3 py-2">Última Visita</th>
                                                <th className="px-3 py-2 text-right">Acciones</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                              {lider.discipulos.map((d: any) => {
                                                const vDisc = visitas.filter(v => v.discipulo_id === d.id);
                                                const ultima = vDisc.length > 0 ? vDisc[0] : null;
                                                return (
                                                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-3 py-2 font-medium text-slate-800">{d.full_name}</td>
                                                    <td className="px-3 py-2">
                                                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${d.status === 'Activo' ? 'bg-green-50 text-green-700 border-green-200' : ''}`}>
                                                        {d.status}
                                                      </Badge>
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-500">
                                                      {ultima ? new Date(ultima.fecha).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                      <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-6 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 font-bold px-2"
                                                        onClick={() => setSelectedDiscipulo(d)}
                                                      >
                                                        Ver Proceso
                                                      </Button>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>

                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>

                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
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
