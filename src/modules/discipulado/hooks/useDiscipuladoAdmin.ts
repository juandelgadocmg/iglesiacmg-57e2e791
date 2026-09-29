import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useDiscipuladoAdmin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [discipulos, setDiscipulos] = useState<any[]>([]);
  const [lideres, setLideres] = useState<any[]>([]);
  const [redes, setRedes] = useState<any[]>([]);
  const [casasDePaz, setCasasDePaz] = useState<any[]>([]);
  const [visitas, setVisitas] = useState<any[]>([]);
  const [llamadas, setLlamadas] = useState<any[]>([]);
  const [progreso, setProgreso] = useState<any[]>([]);
  const [leadersGrupos, setLeadersGrupos] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get all Grupos (Casas de Paz y Redes)
      const { data: gruposData, error: gError } = await supabase
        .from('grupos')
        .select('*')
        .eq('estado', 'Activo');
      
      if (gError) throw gError;
      
      const rawGrupos = gruposData || [];
      
      // Extract unique Redes
      const uniqueRedes = Array.from(new Set(rawGrupos.map(g => g.red).filter(Boolean)));
      const parsedRedes = uniqueRedes.map(r => ({ id: r, name: `Red ${r}` }));
      setRedes(parsedRedes);

      // Extract Casas de Paz
      const parsedCasas = rawGrupos.map(g => ({
        id: g.id,
        name: g.nombre || 'Sin nombre',
        red_id: g.red || null,
        lider_id: g.lider_id || null
      }));
      setCasasDePaz(parsedCasas);

      // 3. Get all Leaders
      const { data: lideresData, error: lError } = await supabase
        .from('leaders')
        .select('*')
        .order('full_name');
      
      if (lError) throw lError;
      setLideres(lideresData || []);

      // 2. Get all Discipulos
      const { data: discipulosData, error: dError } = await supabase
        .from('discipulos')
        .select('*')
        .order('full_name');
        
      if (dError) throw dError;
      setDiscipulos(discipulosData || []);

      // 3. Get all Visitas
      const { data: visitasData, error: vError } = await supabase
        .from('discipulo_visitas')
        .select('*')
        .order('fecha', { ascending: false });
        
      if (vError) throw vError;
      setVisitas(visitasData || []);

      // 4. Get all Llamadas
      const { data: llamadasData, error: llError } = await supabase
        .from('discipulo_actividades')
        .select('*')
        .eq('tipo_actividad', 'Llamada')
        .order('fecha', { ascending: false });
        
      if (llError) throw llError;
      setLlamadas(llamadasData || []);

      // 5. Get all Progreso (Optional, for advanced stats)
      const { data: progresoData, error: pError } = await supabase
        .from('progreso_discipulo')
        .select('*');
      
      if (pError) throw pError;
      setProgreso(progresoData || []);
      
      // 6. Get leaders_grupos junctions
      const { data: lgData } = await supabase.from('leaders_grupos').select('*');
      setLeadersGrupos(lgData || []);

    } catch (err: any) {
      console.error('Error fetching admin discipulado data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    discipulos,
    lideres,
    redes,
    casasDePaz,
    visitas,
    llamadas,
    progreso,
    leadersGrupos,
    loadData
  };
}
