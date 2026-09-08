import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RegistrarVisitaModal } from "@/modules/discipulado/components/RegistrarVisitaModal";
import { DiscipuloProcesoModal } from "@/modules/discipulado/components/DiscipuloProcesoModal";
import { DiscipuladoAdminView } from "@/modules/discipulado/components/DiscipuladoAdminView";
import { useVisitas } from "@/modules/discipulado/hooks/useVisitas";
import { useActiveRole } from "@/hooks/useActiveRole";
import {
  Users,
  Home,
  BookOpen,
  Sparkles,
  Flame,
  CheckCircle2,
  AlertTriangle,
  History,
  PhoneCall,
  UserCheck
} from "lucide-react";

export default function DiscipuladoPage() {
  const { session } = useAuth();
  const { activeRole } = useActiveRole();
  const { obtenerVisitasLider } = useVisitas();

  const [lider, setLider] = useState<any>(null);
  const [discipulos, setDiscipulos] = useState<any[]>([]);
  const [visitas, setVisitas] = useState<any[]>([]);
  const [progreso, setProgreso] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isRegistrarVisitaOpen, setIsRegistrarVisitaOpen] = useState(false);
  const [selectedDiscipuloProceso, setSelectedDiscipuloProceso] = useState<any | null>(null);

  const loadData = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    
    // 1. Get Lider record by ID
    let { data: liderData } = await supabase
      .from('leaders')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    // 2. If not found by ID, try by email
    if (!liderData && session.user.email) {
      const { data: liderDataByEmail } = await supabase
        .from('leaders')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();
        
      if (liderDataByEmail) {
        liderData = liderDataByEmail;
      }
    }
      
    // 3. Auto-create if not found but user is logged in
    if (!liderData && session.user.id) {
      try {
        const { data: newLider } = await supabase
          .from('leaders')
          .insert({
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Líder (Auto-generado)',
            email: session.user.email,
          })
          .select('*')
          .single();
          
        if (newLider) {
          liderData = newLider;
        }
      } catch (err) {
        console.error("No se pudo auto-crear el registro de líder", err);
        liderData = {
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Líder',
          email: session.user.email
        };
      }
    }
      
    // 4. Si aún no hay liderData y tiene un rol de liderazgo, forzar en memoria
    if (!liderData && ['lider_casa_paz', 'lider', 'pastor'].includes(activeRole || '')) {
      liderData = {
        id: session.user.id,
        full_name: 'Líder',
        email: session.user.email
      };
    }
      
    if (liderData) {
      setLider(liderData);
      
      // 2. Get Discipulos for this leader
      const { data: dData } = await supabase
        .from('discipulos')
        .select('*')
        .eq('lider_id', liderData.id)
        .order('full_name');
        
      if (dData) setDiscipulos(dData);
      
      // 3. Get Visitas for this leader
      const vData = await obtenerVisitasLider(liderData.id);
      setVisitas(vData);
      
      // 4. Get all progress for these discipulos to calculate "Consolidados", "Retiro", etc.
      if (dData && dData.length > 0) {
        const discipuloIds = dData.map(d => d.id);
        const { data: pData } = await supabase
          .from('progreso_discipulo')
          .select('*')
          .in('discipulo_id', discipuloIds);
        if (pData) setProgreso(pData);
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [session]);

  // Derived Stats
  const stats = useMemo(() => {
    const s = {
      asignados: discipulos.length,
      visitados: new Set(visitas.map(v => v.discipulo_id)).size,
      ensenados: visitas.filter(v => v.enseno).length,
      orados: visitas.filter(v => v.oro).length,
      tresSemanas: progreso.filter(p => p.etapa_code === 'TSDP' && p.completed).length,
      retiro: progreso.filter(p => p.etapa_code === 'RSI' && p.completed).length,
      recuperados: discipulos.filter(d => d.status === 'Activo' && d.notes?.includes('Recuperado')).length, // Aproximación
      consolidados: discipulos.filter(d => d.status === 'Completado').length,
    };
    return s;
  }, [discipulos, visitas, progreso]);

  // Pendientes
  const pendientes = useMemo(() => {
    const list: any[] = [];
    visitas.forEach(v => {
      if (v.proximo_seguimiento && new Date(v.proximo_seguimiento) <= new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)) {
        // Find discipulo
        const disc = discipulos.find(d => d.id === v.discipulo_id);
        if (disc) {
          const isOverdue = new Date(v.proximo_seguimiento) < new Date(new Date().toDateString());
          list.push({
            id: `pend-${v.id}`,
            discipulo: disc,
            fecha: v.proximo_seguimiento,
            tarea: v.compromiso || 'Visita/Seguimiento pendiente',
            prioridad: isOverdue ? 'Alta' : 'Media'
          });
        }
      }
    });
    // Add generic pending for active disciples with no visits in last 30 days
    discipulos.forEach(d => {
      const lastVisit = visitas.find(v => v.discipulo_id === d.id);
      if (!lastVisit || (new Date().getTime() - new Date(lastVisit.fecha).getTime()) > 30 * 24 * 60 * 60 * 1000) {
        if (!list.find(l => l.discipulo.id === d.id)) {
           list.push({
              id: `pend-stale-${d.id}`,
              discipulo: d,
              fecha: new Date().toISOString(),
              tarea: 'Hace más de 30 días sin visita',
              prioridad: 'Alta'
           });
        }
      }
    });

    return list.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()).slice(0, 5);
  }, [visitas, discipulos]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">Cargando Mi Discipulado...</div>;
  }

  // Si es admin o super_admin, mostrar la vista global
  if (activeRole === 'admin' || activeRole === 'super_admin') {
    return <DiscipuladoAdminView />;
  }

  if (!lider) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl m-4 border border-red-200">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No eres Líder Asignado</h2>
        <p className="text-slate-600 mt-2">Para utilizar este módulo, debes tener un registro como líder de Discipulado en el sistema.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Header Sticky con la acción principal */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b shadow-sm px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Mi Discipulado</h1>
        <Button 
          onClick={() => setIsRegistrarVisitaOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-200"
        >
          <Home className="w-4 h-4 mr-2" />
          Registrar Visita
        </Button>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-8 mt-2">
        
        {/* MI COSECHA */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Mi Cosecha</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Users className="w-5 h-5 text-red-500 mb-1" />
                <span className="text-3xl font-black text-slate-800">{stats.asignados}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Discípulos</span>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Home className="w-5 h-5 text-red-500 mb-1" />
                <span className="text-3xl font-black text-slate-800">{stats.visitados}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Visitados</span>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <BookOpen className="w-5 h-5 text-red-500 mb-1" />
                <span className="text-3xl font-black text-slate-800">{stats.ensenados}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Enseñados</span>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Sparkles className="w-5 h-5 text-red-500 mb-1" />
                <span className="text-3xl font-black text-slate-800">{stats.orados}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Orados</span>
              </CardContent>
            </Card>
            
            {/* Secundarios */}
            <Card className="bg-slate-800 border-0 shadow-sm text-white col-span-1">
              <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black">{stats.tresSemanas}</span>
                <span className="text-[10px] font-bold text-slate-300 uppercase leading-tight mt-1">3 Semanas<br/>de Poder</span>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-0 shadow-sm text-white col-span-1">
              <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black">{stats.retiro}</span>
                <span className="text-[10px] font-bold text-slate-300 uppercase leading-tight mt-1">En Retiro</span>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-0 shadow-sm text-white col-span-1">
              <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black">{stats.recuperados}</span>
                <span className="text-[10px] font-bold text-slate-300 uppercase leading-tight mt-1">Recuperados</span>
              </CardContent>
            </Card>
            <Card className="bg-red-600 border-0 shadow-sm text-white col-span-1">
              <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black">{stats.consolidados}</span>
                <span className="text-[10px] font-bold text-red-200 uppercase leading-tight mt-1">Consolidados</span>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* MIS PENDIENTES */}
        {pendientes.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Mis Pendientes
            </h2>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="divide-y">
                {pendientes.map((p) => (
                  <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <div className={`w-3 h-3 mt-1.5 rounded-full ${p.prioridad === 'Alta' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                      <div>
                        <p className="font-bold text-slate-800">{p.discipulo.full_name}</p>
                        <p className="text-sm text-slate-500">{p.tarea}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-600 font-bold" onClick={() => {
                        setSelectedDiscipuloProceso(p.discipulo);
                    }}>
                      Ver
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* MIS DISCIPULOS */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Mis Discípulos
          </h2>
          <div className="space-y-3">
            {discipulos.map(d => {
              const dVisitas = visitas.filter(v => v.discipulo_id === d.id);
              const ultimaVisita = dVisitas.length > 0 ? dVisitas[0] : null;
              
              return (
                <Card key={d.id} className="bg-white border-slate-200 shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4 flex items-start justify-between">
                      <div>
                        <h3 className="font-black text-slate-800 text-lg">{d.full_name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className={d.status === 'Activo' ? 'border-green-200 bg-green-50 text-green-700' : ''}>
                            {d.status}
                          </Badge>
                          {d.telefono && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-slate-600 bg-slate-100">
                              <PhoneCall className="w-3 h-3" /> {d.telefono}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="mt-3 text-sm text-slate-500 flex flex-col gap-1">
                          <p>
                            <span className="font-semibold">Última visita:</span> {ultimaVisita ? new Date(ultimaVisita.fecha).toLocaleDateString() : 'Ninguna'}
                          </p>
                          <p>
                            <span className="font-semibold">Progreso VEO:</span> {dVisitas.length} visitas
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2 border-t flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 font-bold hover:text-red-700 hover:bg-red-50 w-full justify-center"
                        onClick={() => setSelectedDiscipuloProceso(d)}
                      >
                        Ver Proceso
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            
            {discipulos.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No tienes discípulos asignados.</p>
              </div>
            )}
          </div>
        </section>

        {/* ÚLTIMAS VISITAS */}
        {visitas.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <History className="w-4 h-4" /> Últimas Visitas
            </h2>
            <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
              {visitas.slice(0, 5).map(v => {
                const disc = discipulos.find(d => d.id === v.discipulo_id);
                return (
                  <div key={v.id} className="border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800">{disc?.full_name}</p>
                        <p className="text-xs text-red-500 font-bold uppercase">{new Date(v.fecha).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className="bg-slate-50">
                        {v.lugar}
                      </Badge>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {v.oro && <Badge variant="secondary" className="text-[10px]">Oró</Badge>}
                      {v.enseno && <Badge variant="secondary" className="text-[10px]">Enseñó</Badge>}
                      {v.ungio_casa === 'Sí' && <Badge variant="secondary" className="text-[10px]">Ungió</Badge>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

      </div>

      {/* Modals */}
      <RegistrarVisitaModal
        open={isRegistrarVisitaOpen}
        onOpenChange={setIsRegistrarVisitaOpen}
        discipulos={discipulos}
        liderId={lider.id}
        onSuccess={loadData}
      />
      
      <DiscipuloProcesoModal
        open={!!selectedDiscipuloProceso}
        onOpenChange={(open) => !open && setSelectedDiscipuloProceso(null)}
        discipulo={selectedDiscipuloProceso}
      />

    </div>
  );
}
