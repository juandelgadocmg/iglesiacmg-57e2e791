-- Add Semana de Poder 2 and Semana de Poder 3 to procesos_crecimiento table if not present

DO $$
DECLARE
  v_order_sdp1 INT;
BEGIN
  SELECT orden INTO v_order_sdp1 FROM public.procesos_crecimiento WHERE nombre ILIKE '%Semana de Poder 1%' LIMIT 1;
  
  IF v_order_sdp1 IS NOT NULL THEN
    -- Shift orders of steps following Semana de Poder 1 to make space
    UPDATE public.procesos_crecimiento SET orden = orden + 2 WHERE orden > v_order_sdp1 AND nombre NOT ILIKE '%Semana de Poder 2%' AND nombre NOT ILIKE '%Semana de Poder 3%';
    
    IF NOT EXISTS (SELECT 1 FROM public.procesos_crecimiento WHERE nombre ILIKE '%Semana de Poder 2%') THEN
      INSERT INTO public.procesos_crecimiento (nombre, orden) VALUES ('Semana de Poder 2', v_order_sdp1 + 1);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.procesos_crecimiento WHERE nombre ILIKE '%Semana de Poder 3%') THEN
      INSERT INTO public.procesos_crecimiento (nombre, orden) VALUES ('Semana de Poder 3', v_order_sdp1 + 2);
    END IF;
  END IF;
END $$;
