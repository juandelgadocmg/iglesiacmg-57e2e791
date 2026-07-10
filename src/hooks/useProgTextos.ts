import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProgTextoRow = {
  id: string;
  ministerio_id: string;
  evento_id: string;
  campo: string;
  valor: string;
};

const KEY = (ministerio_id: string) => ["prog_evento_textos", ministerio_id];

/**
 * Persistencia de campos de texto libre del Programador ISO por ministerio:
 *   - `uniforme`
 *   - `observacion`
 *   - `estacion:<key normalizada de la estación>`
 *
 * Devuelve un mapa `evento_id -> Record<campo, valor>` y un `setValor` con
 * debounce por celda que actualiza a la base de datos y refresca el caché.
 */
export function useProgTextos(ministerio_id: string | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY(ministerio_id || "_"),
    enabled: !!ministerio_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prog_evento_textos")
        .select("id, ministerio_id, evento_id, campo, valor")
        .eq("ministerio_id", ministerio_id as string);
      if (error) throw error;
      return (data || []) as ProgTextoRow[];
    },
  });

  const byEvento = useMemo(() => {
    const m = new Map<string, Record<string, string>>();
    (query.data || []).forEach((r) => {
      const cur = m.get(r.evento_id) || {};
      cur[r.campo] = r.valor;
      m.set(r.evento_id, cur);
    });
    return m;
  }, [query.data]);

  // Estado local optimista + debounce por celda
  const [local, setLocal] = useState<Map<string, Record<string, string>>>(new Map());
  useEffect(() => {
    setLocal(byEvento);
  }, [byEvento]);

  const timers = useRef(new Map<string, any>());

  const setValor = useCallback(
    (evento_id: string, campo: string, valor: string) => {
      if (!ministerio_id) return;
      // update local
      setLocal((prev) => {
        const next = new Map(prev);
        const cur = { ...(next.get(evento_id) || {}) };
        cur[campo] = valor;
        next.set(evento_id, cur);
        return next;
      });
      const k = `${evento_id}::${campo}`;
      const t = timers.current.get(k);
      if (t) clearTimeout(t);
      timers.current.set(
        k,
        setTimeout(async () => {
          const { data: userRes } = await supabase.auth.getUser();
          const uid = userRes?.user?.id || null;
          await supabase.from("prog_evento_textos").upsert(
            {
              ministerio_id,
              evento_id,
              campo,
              valor,
              updated_by: uid,
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: "ministerio_id,evento_id,campo" }
          );
          qc.invalidateQueries({ queryKey: KEY(ministerio_id) });
        }, 500)
      );
    },
    [ministerio_id, qc]
  );

  const get = useCallback(
    (evento_id: string, campo: string): string => local.get(evento_id)?.[campo] || "",
    [local]
  );

  return { data: local, isLoading: query.isLoading, get, setValor };
}
