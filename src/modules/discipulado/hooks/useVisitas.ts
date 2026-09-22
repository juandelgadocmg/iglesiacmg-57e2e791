import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DiscipuloVisita, DiscipuloActividad } from '../types';
import { toast } from 'sonner';

export function useVisitas() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registrarVisita = async (
    visita: Omit<DiscipuloVisita, 'id' | 'created_at' | 'updated_at'>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('discipulo_visitas')
        .insert(visita as any)
        .select()
        .single();
        
      if (err) throw err;
      return data;
    } catch (err: any) {
      console.error('Error registrando visita:', err);
      setError(err.message);
      toast.error(err.message || 'Error registrando visita');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const registrarLlamada = async (
    discipulo_id: string,
    lider_id: string,
    fecha: string,
    hora: string,
    descripcion: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('discipulo_actividades')
        .insert({
          discipulo_id,
          lider_id,
          tipo_actividad: 'Llamada',
          fecha,
          hora: hora || null,
          descripcion
        })
        .select()
        .single();
        
      if (err) throw err;
      return data;
    } catch (err: any) {
      console.error('Error registrando llamada:', err);
      setError(err.message);
      toast.error(err.message || 'Error registrando llamada');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const obtenerVisitasLider = async (liderId: string) => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('discipulo_visitas')
        .select('*')
        .eq('lider_id', liderId)
        .order('fecha', { ascending: false });
        
      if (err) throw err;
      return data as DiscipuloVisita[];
    } catch (err: any) {
      console.error('Error obteniendo visitas:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const obtenerLlamadasLider = async (liderId: string) => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('discipulo_actividades')
        .select('*')
        .eq('lider_id', liderId)
        .eq('tipo_actividad', 'Llamada')
        .order('fecha', { ascending: false });
        
      if (err) throw err;
      return data as DiscipuloActividad[];
    } catch (err: any) {
      console.error('Error obteniendo llamadas:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const obtenerVisitasDiscipulo = async (discipuloId: string) => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('discipulo_visitas')
        .select('*')
        .eq('discipulo_id', discipuloId)
        .order('fecha', { ascending: false });
        
      if (err) throw err;
      return data as DiscipuloVisita[];
    } catch (err: any) {
      console.error('Error obteniendo visitas del discípulo:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const obtenerActividadesDiscipulo = async (discipuloId: string) => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('discipulo_actividades')
        .select('*')
        .eq('discipulo_id', discipuloId)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false });
        
      if (err) throw err;
      return data as DiscipuloActividad[];
    } catch (err: any) {
      console.error('Error obteniendo actividades:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    registrarVisita,
    registrarLlamada,
    obtenerVisitasLider,
    obtenerLlamadasLider,
    obtenerVisitasDiscipulo,
    obtenerActividadesDiscipulo,
    loading,
    error
  };
}
