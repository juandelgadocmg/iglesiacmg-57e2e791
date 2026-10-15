import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CryptoJS from "crypto-js";
import { RegistrarVisitaModal } from "@/modules/discipulado/components/RegistrarVisitaModal";
import { RegistrarLlamadaModal } from "@/modules/discipulado/components/RegistrarLlamadaModal";
import { DiscipuloProcesoModal } from "@/modules/discipulado/components/DiscipuloProcesoModal";
import { DiscipuladoAdminView } from "@/modules/discipulado/components/DiscipuladoAdminView";
import { ImportarDiscipulosModal } from "@/modules/discipulado/components/ImportarDiscipulosModal";
import { AgregarDiscipuloModal } from "@/modules/discipulado/components/AgregarDiscipuloModal";
import { ListaDiscipulosModal } from "@/modules/discipulado/components/ListaDiscipulosModal";
import { LlamarDiscipuloModal } from "@/modules/discipulado/components/LlamarDiscipuloModal";
import { DoxaWebPhone } from "@/components/DoxaWebPhone";
import { ZadarmaWebRTC } from "@/components/ZadarmaWebRTC";
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
  UserCheck,
  UploadCloud,
  Trophy,
  UserPlus,
  Trash2,
  Settings
} from "lucide-react";

declare global {
  interface Window {
    zadarmaWidgetInstance: any;
    zadarmaWidgetFn: any;
  }
}

export default function DiscipuladoPage() {
  const { session } = useAuth();
  const { activeRole } = useActiveRole();
  const { obtenerVisitasLider, obtenerLlamadasLider } = useVisitas();

  const [lider, setLider] = useState<any>(null);
  const [discipulos, setDiscipulos] = useState<any[]>([]);
  const [visitas, setVisitas] = useState<any[]>([]);
  const [llamadas, setLlamadas] = useState<any[]>([]);
  const [progreso, setProgreso] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [casaDePazInfo, setCasaDePazInfo] = useState<{nombre: string, red: string} | null>(null);

  // Modals state
  const [isRegistrarVisitaOpen, setIsRegistrarVisitaOpen] = useState(false);
  const [isRegistrarLlamadaOpen, setIsRegistrarLlamadaOpen] = useState(false);
  const [isImportarOpen, setIsImportarOpen] = useState(false);
  const [isAgregarOpen, setIsAgregarOpen] = useState(false);
  const [selectedDiscipuloProceso, setSelectedDiscipuloProceso] = useState<any | null>(null);
  const [activeStatList, setActiveStatList] = useState<{title: string, list: any[]} | null>(null);
  const [discipuloParaLlamar, setDiscipuloParaLlamar] = useState<any | null>(null);
  
  // Zadarma WebRTC configuration
  const [zadarmaExtension, setZadarmaExtension] = useState<string>(() => {
    return localStorage.getItem('zadarma_extension') || '';
  });

  const loadData = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    // 1. Allocate a Zadarma Extension from the pool
    const { data: allocatedExtension } = await supabase.rpc('allocate_zadarma_extension', {
      p_user_id: session.user.id
    });
      
    if (allocatedExtension) {
      const extStr = allocatedExtension as string;
      setZadarmaExtension(extStr);
      localStorage.setItem('zadarma_extension', extStr);
    } else {
      console.warn("No available Zadarma extensions in the pool.");
      const fallbackExt = localStorage.getItem('zadarma_extension') || '337021-100';
      setZadarmaExtension(fallbackExt);
    }

    // 2. Get Lider record by ID
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
      
    // 3. Fallback in memory if no leader record exists but user is logged in
    if (!liderData && session.user.id) {
      const newLeader = {
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Líder',
        email: session.user.email
      };

      const { data: insertedLeader, error: insertError } = await supabase
        .from('leaders')
        .insert(newLeader)
        .select()
        .single();

      if (insertError) {
        console.error("Error creating leader record:", insertError);
        toast.error(`Error de sistema: No se pudo crear tu perfil de líder (${insertError.message}).`);
        liderData = newLeader as any;
      } else if (insertedLeader) {
        liderData = insertedLeader;
      }
    }
      
    // 4. Si aún no hay liderData y tiene un rol de liderazgo, forzar en memoria
    if (!liderData && ['lider_casa_paz', 'lider', 'pastor'].includes(activeRole || '')) {
      liderData = {
        id: session.user.id,
        full_name: 'Líder',
        email: session.user.email
      } as any;
    }
      
    if (liderData) {
      setLider(liderData);
      
      // Fetch Casa de Paz info (Todas las casas donde lidera)
      let casasData = [];
      if (liderData.casa_de_paz_id) {
        const { data: c1 } = await supabase.from('grupos').select('id, nombre, red').eq('id', liderData.casa_de_paz_id);
        if (c1) casasData.push(...c1);
      }
      const { data: c2 } = await supabase.from('leaders_grupos').select('grupo_id').eq('leader_id', liderData.id);
      if (c2 && c2.length > 0) {
        const c2Ids = c2.map(lg => lg.grupo_id);
        const { data: c2Casas } = await supabase.from('grupos').select('id, nombre, red').in('id', c2Ids);
        if (c2Casas) {
          c2Casas.forEach(casa => {
            if (!casasData.find(c => c.id === casa.id)) {
              casasData.push(casa);
            }
          });
        }
      }
      
      if (casasData && casasData.length > 0) {
        const nombres = casasData.map(c => c.nombre).join(' & ');
        const redes = Array.from(new Set(casasData.map(c => c.red).filter(Boolean))).join(' & ');
        setCasaDePazInfo({ nombre: nombres, red: redes });
      }
      
      // 2. Get Discipulos for this leader or their casas
      const casaIds = casasData ? casasData.map(c => c.id) : [];
      let discQuery = supabase.from('discipulos').select('*').order('full_name');
      
      if (casaIds.length > 0) {
        discQuery = discQuery.or(`lider_id.eq.${liderData.id},casa_de_paz_id.in.(${casaIds.join(',')})`);
      } else {
        discQuery = discQuery.eq('lider_id', liderData.id);
      }
      
      const { data: dData } = await discQuery;
      if (dData) setDiscipulos(dData);
      
      // 3. Get Visitas & Llamadas for this leader
      const vData = await obtenerVisitasLider(liderData.id);
      setVisitas(vData);

      const llData = await obtenerLlamadasLider(liderData.id);
      setLlamadas(llData);
      
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
    
    // Heartbeat for Zadarma Pool
    let interval: NodeJS.Timeout;
    if (session?.user?.id) {
      interval = setInterval(async () => {
        await supabase.rpc('allocate_zadarma_extension', {
          p_user_id: session.user.id
        });
      }, 60000); // every 1 minute
    }

    // Cleanup on unmount (release extension)
    return () => {
      if (interval) clearInterval(interval);
      if (session?.user?.id) {
        // We use a fire-and-forget call since we are unmounting
        supabase.rpc('release_zadarma_extension', {
          p_user_id: session.user.id
        }).then();
      }
    };
  }, [session, activeRole]);

  // Derived Stats
  // handleCallClick para abrir el teléfono virtual con el discípulo seleccionado
  const handleCallClick = (e: React.MouseEvent, discipulo: any) => {
    e.preventDefault();
    window.dispatchEvent(
      new CustomEvent("doxa-call-number", {
        detail: { discipulo, phone: discipulo.telefono },
      })
    );
  };

  const handleDeleteDiscipulo = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente a "${name}"? Esta acción no se puede deshacer.`)) {
      try {
        const { error: deleteError } = await supabase.from('discipulos').delete().eq('id', id);
        if (deleteError) throw deleteError;
        toast.success(`Discípulo "${name}" eliminado correctamente`);
        loadData();
      } catch (err: any) {
        console.error("Error al eliminar discípulo:", err);
        toast.error("Error al eliminar el discípulo");
      }
    }
  };
  const stats = useMemo(() => {
    const s = {
      asignados: { count: discipulos.length, list: discipulos },
      visitados: { 
        count: new Set(visitas.map(v => v.discipulo_id)).size, 
        list: discipulos.filter(d => visitas.some(v => v.discipulo_id === d.id)) 
      },
      llamados: {
        count: new Set(llamadas.map(v => v.discipulo_id)).size, 
        list: discipulos.filter(d => llamadas.some(v => v.discipulo_id === d.id))
      },
      ensenados: {
        count: visitas.filter(v => v.enseno).length,
        list: discipulos.filter(d => visitas.some(v => v.discipulo_id === d.id && v.enseno))
      },
      orados: {
        count: visitas.filter(v => v.oro).length,
        list: discipulos.filter(d => visitas.some(v => v.discipulo_id === d.id && v.oro))
      },
      npt: {
        count: progreso.filter(p => p.etapa_code === 'NPT' && p.completed).length,
        list: discipulos.filter(d => progreso.some(p => p.discipulo_id === d.id && p.etapa_code === 'NPT' && p.completed))
      },
      tresSemanas: {
        count: progreso.filter(p => p.etapa_code === 'TSDP' && p.completed).length,
        list: discipulos.filter(d => progreso.some(p => p.discipulo_id === d.id && p.etapa_code === 'TSDP' && p.completed))
      },
      retiro: {
        count: progreso.filter(p => p.etapa_code === 'RSI' && p.completed).length,
        list: discipulos.filter(d => progreso.some(p => p.discipulo_id === d.id && p.etapa_code === 'RSI' && p.completed))
      },
      recuperados: {
        count: discipulos.filter(d => d.status === 'Activo' && d.notes?.includes('Recuperado')).length,
        list: discipulos.filter(d => d.status === 'Activo' && d.notes?.includes('Recuperado'))
      },
      consolidados: {
        count: discipulos.filter(d => d.status === 'Completado').length,
        list: discipulos.filter(d => d.status === 'Completado')
      },
    };
    return s;
  }, [discipulos, visitas, llamadas, progreso]);

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


    return list.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()).slice(0, 5);
  }, [visitas, discipulos]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">Cargando Mi Discipulado...</div>;
  }

  // Si es admin, super_admin o pastor, mostrar la vista global
  if (activeRole === 'admin' || activeRole === 'super_admin' || activeRole === 'pastor') {
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
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b shadow-sm px-4 py-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Mi Discipulado</h1>
          {casaDePazInfo && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 text-[10px]">
                🏡 {casaDePazInfo.nombre}
              </Badge>
              {casaDePazInfo.red && (
                <Badge variant="outline" className="text-slate-600 border-slate-200 bg-white text-[10px]">
                  Red {casaDePazInfo.red}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setIsImportarOpen(true)}
            className="hidden sm:flex border-slate-300 text-slate-700 font-medium"
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsAgregarOpen(true)}
            className="border-slate-300 text-slate-700 font-medium bg-white"
          >
            <UserPlus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
          <Button 
            onClick={() => setIsRegistrarLlamadaOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-200"
          >
            <PhoneCall className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Llamada</span>
          </Button>
          <Button 
            onClick={() => setIsRegistrarVisitaOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-200"
          >
            <Home className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Visita</span>
          </Button>
        </div>

        {/* Marcador Telefónico y WhatsApp */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs font-bold text-slate-700 block">Llamadas a Discípulos</label>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">
                  Marcado Directo y WhatsApp Activos
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  (Listo en doxastack.com)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-8 mt-2">
        
        {/* MI COSECHA */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Mi Cosecha</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* ROW 1 */}
            <Card className="bg-white border-0 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95" onClick={() => setActiveStatList({ title: 'Discípulos', list: stats.asignados.list })}>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Users className="w-5 h-5 text-red-500 mb-1" />
                <span className="text-3xl font-black text-slate-800">{stats.asignados.count}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Discípulos</span>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95" onClick={() => setActiveStatList({ title: 'Visitados', list: stats.visitados.list })}>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Home className="w-5 h-5 text-red-500 mb-1" />
                <span className="text-3xl font-black text-slate-800">{stats.visitados.count}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Visitados</span>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95" onClick={() => setActiveStatList({ title: 'Llamados', list: stats.llamados.list })}>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <PhoneCall className="w-5 h-5 text-blue-500 mb-1" />
                <span className="text-3xl font-black text-slate-800">{stats.llamados.count}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Llamados</span>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95" onClick={() => setActiveStatList({ title: 'Enseñados', list: stats.ensenados.list })}>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <BookOpen className="w-5 h-5 text-red-500 mb-1" />
                <span className="text-3xl font-black text-slate-800">{stats.ensenados.count}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Enseñados</span>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95" onClick={() => setActiveStatList({ title: 'Casa Ungida', list: stats.orados.list })}>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Sparkles className="w-5 h-5 text-red-500 mb-1" />
                <span className="text-3xl font-black text-slate-800">{stats.orados.count}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase leading-tight">Casa Ungida</span>
              </CardContent>
            </Card>
            
            {/* ROW 2 */}
            <Card className="bg-slate-800 text-white border-0 shadow-sm cursor-pointer hover:bg-slate-700 transition-all active:scale-95" onClick={() => setActiveStatList({ title: 'Nací para Triunfar', list: stats.npt.list })}>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black">{stats.npt.count}</span>
                <span className="text-[10px] font-bold text-slate-300 uppercase leading-tight">Nací Para Triunfar</span>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 text-white border-0 shadow-sm cursor-pointer hover:bg-slate-700 transition-all active:scale-95" onClick={() => setActiveStatList({ title: '3 Semanas de Poder', list: stats.tresSemanas.list })}>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black">{stats.tresSemanas.count}</span>
                <span className="text-[10px] font-bold text-slate-300 uppercase text-center leading-tight">3 Semanas<br/>de Poder</span>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 text-white border-0 shadow-sm cursor-pointer hover:bg-slate-700 transition-all active:scale-95" onClick={() => setActiveStatList({ title: 'Retiro', list: stats.retiro.list })}>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black">{stats.retiro.count}</span>
                <span className="text-[10px] font-bold text-slate-300 uppercase leading-tight">Retiro</span>
              </CardContent>
            </Card>
            <Card className="bg-red-600 text-white border-0 shadow-sm cursor-pointer hover:bg-red-500 transition-all active:scale-95" onClick={() => setActiveStatList({ title: 'Consolidado', list: stats.consolidados.list })}>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black">{stats.consolidados.count}</span>
                <span className="text-[10px] font-bold text-red-200 uppercase leading-tight">Consolidado</span>
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
                            <div className="flex items-center gap-1.5">
                              <button 
                                type="button"
                                onClick={(e) => handleCallClick(e, d)}
                                className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-900 transition-colors px-2.5 py-1 rounded-full text-xs font-bold shadow-xs active:scale-95 cursor-pointer"
                                title="Llamar a este discípulo"
                              >
                                <PhoneCall className="w-3 h-3 text-blue-600" />
                                {d.telefono}
                              </button>
                              <a 
                                href={`https://wa.me/${d.telefono.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-50 text-green-600 hover:bg-green-500 hover:text-white transition-colors border border-green-200 hover:border-green-500 shadow-sm"
                                title="Escribir por WhatsApp"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" /><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" /></svg>
                              </a>
                            </div>
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
                    <div className="bg-slate-50 p-2 border-t flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 font-bold hover:text-red-700 hover:bg-red-50 flex-1 justify-center"
                        onClick={() => setSelectedDiscipuloProceso(d)}
                      >
                        Ver Proceso
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                        title="Eliminar Discípulo"
                        onClick={() => handleDeleteDiscipulo(d.id, d.full_name)}
                      >
                        <Trash2 className="w-4 h-4" />
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
        liderId={lider?.id}
        onSuccess={loadData}
      />
      
      <RegistrarLlamadaModal
        open={isRegistrarLlamadaOpen}
        onOpenChange={setIsRegistrarLlamadaOpen}
        discipulos={discipulos}
        liderId={lider?.id || session?.user?.id || ""}
        onSuccess={loadData}
      />
      
      {lider && (
        <ImportarDiscipulosModal
          isOpen={isImportarOpen}
          onClose={() => setIsImportarOpen(false)}
          liderId={lider.id}
          casaDePazId={lider.casa_de_paz_id}
          onSuccess={loadData}
        />
      )}

      {lider && (
        <AgregarDiscipuloModal
          isOpen={isAgregarOpen}
          onClose={() => setIsAgregarOpen(false)}
          liderId={lider.id}
          casaDePazId={lider.casa_de_paz_id}
          onSuccess={loadData}
        />
      )}
      
      {selectedDiscipuloProceso && (
        <DiscipuloProcesoModal
          open={!!selectedDiscipuloProceso}
          onOpenChange={(open) => !open && setSelectedDiscipuloProceso(null)}
          discipulo={selectedDiscipuloProceso}
          onProgressUpdated={loadData}
        />
      )}
      
      <ListaDiscipulosModal
        isOpen={!!activeStatList}
        onClose={() => setActiveStatList(null)}
        title={activeStatList?.title || ''}
        discipulos={activeStatList?.list || []}
      />

      <LlamarDiscipuloModal
        open={!!discipuloParaLlamar}
        onOpenChange={(open) => !open && setDiscipuloParaLlamar(null)}
        discipulo={discipuloParaLlamar}
        liderId={lider?.id}
        onSuccess={loadData}
      />

      <DoxaWebPhone
        sipExtension={zadarmaExtension}
        discipulos={discipulos}
        liderId={lider?.id}
        onCallLogged={loadData}
      />

      {zadarmaExtension && <ZadarmaWebRTC sipExtension={zadarmaExtension} />}
    </div>
  );
}
