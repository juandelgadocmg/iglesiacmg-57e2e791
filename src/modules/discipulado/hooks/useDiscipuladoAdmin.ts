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
      const fetchAllPages = async (queryFactory: () => any) => {
        let allData: any[] = [];
        let start = 0;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await queryFactory().range(start, start + 999);
          if (error) throw error;
          if (data) {
            allData = [...allData, ...data];
            if (data.length === 1000) {
              start += 1000;
            } else {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }
        return allData;
      };

      // 1. Get all Grupos (Casas de Paz y Redes)
      const rawGrupos = await fetchAllPages(() => supabase.from('grupos').select('*').eq('estado', 'Activo'));
      
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
      const lideresData = await fetchAllPages(() => supabase.from('leaders').select('*').order('full_name'));
      setLideres(lideresData || []);

      // 2. Get all Discipulos
      const discipulosData = await fetchAllPages(() => supabase.from('discipulos').select('*').order('full_name'));
      setDiscipulos(discipulosData || []);

      // 3. Get all Visitas
      const visitasData = await fetchAllPages(() => supabase.from('discipulo_visitas').select('*').order('fecha', { ascending: false }));
      setVisitas(visitasData || []);

      // 4. Get all Llamadas
      const llamadasData = await fetchAllPages(() => supabase.from('discipulo_actividades').select('*').eq('tipo_actividad', 'Llamada').order('fecha', { ascending: false }));
      setLlamadas(llamadasData || []);

      // 5. Get all Progreso (Optional, for advanced stats)
      const progresoData = await fetchAllPages(() => supabase.from('progreso_discipulo').select('*'));
      setProgreso(progresoData || []);
      
      // 6. Get leaders_grupos junctions
      const lgData = await fetchAllPages(() => supabase.from('leaders_grupos').select('*'));
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
