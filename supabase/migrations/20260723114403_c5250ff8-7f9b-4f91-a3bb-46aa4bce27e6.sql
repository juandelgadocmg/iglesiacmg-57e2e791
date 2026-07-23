
-- Enforce weekly deadlines (Bogotá time) for CDP planificaciones and reportes.
-- Planeaciones: martes 23:59 hora Bogotá.
-- Reportes:     jueves 23:59 hora Bogotá.
-- Los admin/pastor pueden saltarse el cierre. Ediciones permitidas.

CREATE OR REPLACE FUNCTION public.enforce_planificacion_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_bog timestamp;
  dow int;
  minutes_in_day int;
BEGIN
  -- Bypass para admin / pastor
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'pastor') THEN
    RETURN NEW;
  END IF;

  now_bog := (now() AT TIME ZONE 'America/Bogota');
  dow := EXTRACT(DOW FROM now_bog)::int;             -- 0=Dom .. 2=Mar .. 4=Jue
  minutes_in_day := EXTRACT(HOUR FROM now_bog)::int * 60 + EXTRACT(MINUTE FROM now_bog)::int;

  -- Se cierra a partir del miércoles 00:00 y hasta el domingo (0), lunes (1)
  -- Es decir: solo se permite crear si dow < 2 OR (dow = 2 AND minutes <= 23*60+59)
  IF dow > 2 OR (dow = 2 AND minutes_in_day > 23*60 + 59) THEN
    RAISE EXCEPTION 'Fecha límite vencida: las planeaciones se cierran el martes 11:59 PM (hora Bogotá).'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_reporte_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_bog timestamp;
  dow int;
  minutes_in_day int;
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'pastor') THEN
    RETURN NEW;
  END IF;

  now_bog := (now() AT TIME ZONE 'America/Bogota');
  dow := EXTRACT(DOW FROM now_bog)::int;             -- 4=Jue
  minutes_in_day := EXTRACT(HOUR FROM now_bog)::int * 60 + EXTRACT(MINUTE FROM now_bog)::int;

  -- Permitido si dow entre viernes(5), sábado(6), domingo(0), lunes(1), martes(2), miércoles(3), jueves(4) hasta 23:59
  -- Bloqueado solo el jueves después de 23:59 (imposible con minute<=59). En la práctica: cerramos al pasar jueves 23:59.
  -- Semana lunes->jueves 23:59 abierta. Como el reporte cubre la reunión de la semana en curso, cerramos si dow > 4.
  IF dow = 5 OR dow = 6 THEN
    RAISE EXCEPTION 'Fecha límite vencida: los reportes se cierran el jueves 11:59 PM (hora Bogotá).'
      USING ERRCODE = '22023';
  END IF;
  -- Nota: viernes(5) y sábado(6) bloqueados. Domingo en adelante corresponde a nueva semana.

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_planificacion_deadline ON public.planificaciones_grupo;
CREATE TRIGGER trg_enforce_planificacion_deadline
BEFORE INSERT ON public.planificaciones_grupo
FOR EACH ROW EXECUTE FUNCTION public.enforce_planificacion_deadline();

DROP TRIGGER IF EXISTS trg_enforce_reporte_deadline ON public.reportes_grupos;
CREATE TRIGGER trg_enforce_reporte_deadline
BEFORE INSERT ON public.reportes_grupos
FOR EACH ROW EXECUTE FUNCTION public.enforce_reporte_deadline();
