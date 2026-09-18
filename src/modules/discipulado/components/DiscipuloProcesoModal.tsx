import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, History, Home, PhoneCall, AlertTriangle } from "lucide-react";
import { useVisitas } from "../hooks/useVisitas";
import { supabase } from "@/integrations/supabase/client";

interface DiscipuloProcesoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discipulo: any;
  onProgressUpdated?: () => void;
}

export function DiscipuloProcesoModal({
  open,
  onOpenChange,
  discipulo,
  onProgressUpdated,
}: DiscipuloProcesoModalProps) {
  const { obtenerVisitasDiscipulo, obtenerActividadesDiscipulo, loading } = useVisitas();
  
  const [visitas, setVisitas] = useState<any[]>([]);
  const [actividades, setActividades] = useState<any[]>([]);
  const [progreso, setProgreso] = useState<any[]>([]);
  const [etapas, setEtapas] = useState<any[]>([]);
  
  useEffect(() => {
    if (open && discipulo?.id) {
      loadData();
    }
  }, [open, discipulo]);

  const loadData = async () => {
    if (!discipulo) return;
    
    // Load Visitas & Actividades
    const v = await obtenerVisitasDiscipulo(discipulo.id);
    const a = await obtenerActividadesDiscipulo(discipulo.id);
    setVisitas(v);
    setActividades(a);

    // Load all Etapas
    const { data: eData } = await supabase
      .from('etapas_discipulado')
      .select('*')
      .order('order_num');
      
    if (eData && eData.length > 0) {
      setEtapas(eData);
    } else {
      // Fallback in case table is empty
      setEtapas([
        { code: 'NPT', label: 'Nací para Triunfar', order_num: 1 },
        { code: 'TSDP', label: 'Tres Semanas de Poder', order_num: 2 },
        { code: 'RSI', label: 'Retiro Sanidad Interior', order_num: 3 }
      ]);
    }

    // Load Progreso Etapas for this discipulo
    const { data: p } = await supabase
      .from('progreso_discipulo')
      .select('*, etapas_discipulado(*)')
      .eq('discipulo_id', discipulo.id);
    if (p) setProgreso(p);
  };

  if (!discipulo) return null;

  const totalVisitas = visitas.length;
  const totalEnsenanzas = visitas.filter(v => v.enseno).length;
  const totalOraciones = visitas.filter(v => v.oro).length;

  // Próximo seguimiento: based on future date
  const futurosSeguimientos = visitas
    .filter(v => v.proximo_seguimiento && new Date(v.proximo_seguimiento) >= new Date())
    .sort((a, b) => new Date(a.proximo_seguimiento).getTime() - new Date(b.proximo_seguimiento).getTime());
  
  const proximoSeguimiento = futurosSeguimientos.length > 0 ? futurosSeguimientos[0] : null;

  const toggleProgreso = async (etapaCode: string, existingProgreso: any) => {
    try {
      const newStatus = existingProgreso ? !existingProgreso.completed : true;
      const timestamp = newStatus ? new Date().toISOString() : null;

      if (existingProgreso?.id) {
        // Update existing
        const { error } = await supabase
          .from('progreso_discipulo')
          .update({
            completed: newStatus,
            completed_at: timestamp
          })
          .eq('id', existingProgreso.id);
          
        if (error) throw error;
        
        setProgreso(prev => prev.map(item => 
          item.id === existingProgreso.id 
            ? { ...item, completed: newStatus, completed_at: timestamp } 
            : item
        ));
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('progreso_discipulo')
          .insert({
            discipulo_id: discipulo.id,
            etapa_code: etapaCode,
            completed: newStatus,
            completed_at: timestamp
          })
          .select('*, etapas_discipulado(*)')
          .single();

        if (error) throw error;
        if (data) {
          setProgreso(prev => [...prev, data]);
        }
      }
      
      if (onProgressUpdated) {
        onProgressUpdated();
      }
    } catch (err: any) {
      console.error("Error updating progress:", err);
    }
  };

  // Combine all stages with their current progress
  const mergedProgreso = etapas.map(etapa => {
    const p = progreso.find(p => p.etapa_code === etapa.code);
    return {
      etapa,
      progreso: p
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-11/12 max-h-[90vh] overflow-y-auto sm:w-full rounded-xl bg-slate-50">
        <DialogHeader>
          <DialogTitle className="flex flex-col text-slate-800">
            <span className="text-2xl font-black text-red-700 uppercase tracking-tight">{discipulo.full_name}</span>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="bg-white">{discipulo.status}</Badge>
              {discipulo.telefono && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <PhoneCall className="w-3 h-3" /> {discipulo.telefono}
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 my-4">
          <div className="bg-white p-3 rounded-lg border flex flex-col items-center justify-center shadow-sm">
            <span className="text-sm font-bold text-slate-500 uppercase">Visitar</span>
            <span className="text-2xl font-black text-red-600">{totalVisitas}</span>
          </div>
          <div className="bg-white p-3 rounded-lg border flex flex-col items-center justify-center shadow-sm">
            <span className="text-sm font-bold text-slate-500 uppercase">Enseñar</span>
            <span className="text-2xl font-black text-red-600">{totalEnsenanzas}</span>
          </div>
          <div className="bg-white p-3 rounded-lg border flex flex-col items-center justify-center shadow-sm">
            <span className="text-sm font-bold text-slate-500 uppercase">Orar</span>
            <span className="text-2xl font-black text-red-600">{totalOraciones}</span>
          </div>
        </div>

        {proximoSeguimiento && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 uppercase">Próximo Seguimiento</p>
              <p className="text-amber-900 font-medium">{new Date(proximoSeguimiento.proximo_seguimiento).toLocaleDateString()}</p>
              {proximoSeguimiento.compromiso && <p className="text-sm text-amber-700 mt-1">Tarea: {proximoSeguimiento.compromiso}</p>}
            </div>
          </div>
        )}

        <Tabs defaultValue="progreso" className="mt-2">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="progreso" className="font-bold">Progreso</TabsTrigger>
            <TabsTrigger value="historial" className="font-bold">Historial</TabsTrigger>
          </TabsList>
          
          <TabsContent value="progreso" className="space-y-4 mt-4">
            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-lg text-slate-800 mb-4 border-b pb-2">Etapas de Consolidación</h3>
              <div className="space-y-3">
                {mergedProgreso.length > 0 ? mergedProgreso.map(({ etapa, progreso: p }) => {
                  const isCompleted = p?.completed || false;
                  return (
                    <div 
                      key={etapa.code} 
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => toggleProgreso(etapa.code, p)}
                    >
                      <div className="flex items-center gap-3">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                        )}
                        <span className={`font-medium ${isCompleted ? 'text-slate-800' : 'text-slate-500'}`}>
                          {etapa.label}
                        </span>
                      </div>
                      {isCompleted && p?.completed_at && (
                        <span className="text-xs text-slate-400">
                          {new Date(p.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  );
                }) : (
                  <p className="text-slate-500 text-sm text-center py-4">No hay progreso registrado aún.</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="historial" className="mt-4">
            <div className="bg-white border rounded-xl p-4 shadow-sm h-72 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center p-8"><span className="text-slate-400">Cargando...</span></div>
              ) : actividades.length > 0 ? (
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                  {actividades.map((act) => {
                    // Try to find the related visit for details
                    const visitaDetails = act.tipo_actividad === 'Visita' ? visitas.find(v => v.id === act.referencia_id) : null;
                    
                    return (
                      <div key={act.id} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 bg-red-100 border-2 border-red-500 rounded-full w-4 h-4" />
                        <p className="text-xs font-bold text-red-500 uppercase">
                          {new Date(act.fecha).toLocaleDateString()} {act.hora?.substring(0,5)}
                        </p>
                        <p className="font-bold text-slate-800 mt-1">{act.descripcion}</p>
                        
                        {visitaDetails && (
                          <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                            <div className="flex gap-2">
                              {visitaDetails.oro && <Badge variant="outline" className="bg-white text-xs">Oró</Badge>}
                              {visitaDetails.enseno && <Badge variant="outline" className="bg-white text-xs">Enseñó</Badge>}
                              {visitaDetails.ungio_casa === 'Sí' && <Badge variant="outline" className="bg-white text-xs">Ungió Casa</Badge>}
                            </div>
                            {visitaDetails.observaciones && (
                              <p className="mt-2 italic">"{visitaDetails.observaciones}"</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <History className="w-10 h-10 mb-2 opacity-20" />
                  <p>No hay historial de actividades.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
