import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useDiscipuladoAdmin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [discipulos, setDiscipulos] = useState<any[]>([]);
  const [lideres, setLideres] = useState<any[]>([]);
  const [visitas, setVisitas] = useState<any[]>([]);
  const [progreso, setProgreso] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get all Leaders
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

      // 4. Get all Progreso (Optional, for advanced stats)
      const { data: progresoData, error: pError } = await supabase
        .from('progreso_discipulo')
        .select('*');
      
      if (pError) throw pError;
      setProgreso(progresoData || []);

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
    visitas,
    progreso,
    loadData
  };
}
