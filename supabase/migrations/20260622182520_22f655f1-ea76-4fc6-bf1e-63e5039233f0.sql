
ALTER TABLE public.sem_inscripciones
  ADD COLUMN IF NOT EXISTS periodo_ingreso_id uuid REFERENCES public.sem_periodos(id),
  ADD COLUMN IF NOT EXISTS anio_ingreso integer;

-- Backfill: para cada persona+programa, usar la inscripción más antigua
WITH primeros AS (
  SELECT DISTINCT ON (i.persona_id, i.programa_id)
    i.persona_id, i.programa_id, i.periodo_id AS periodo_ingreso_id, p.fecha_inicio
  FROM public.sem_inscripciones i
  JOIN public.sem_periodos p ON p.id = i.periodo_id
  ORDER BY i.persona_id, i.programa_id, p.fecha_inicio ASC NULLS LAST, i.created_at ASC
)
UPDATE public.sem_inscripciones i
SET periodo_ingreso_id = pr.periodo_ingreso_id,
    anio_ingreso = EXTRACT(YEAR FROM pr.fecha_inicio)::int
FROM primeros pr
WHERE i.persona_id = pr.persona_id
  AND i.programa_id = pr.programa_id
  AND (i.periodo_ingreso_id IS NULL OR i.anio_ingreso IS NULL);

-- Trigger: preservar periodo/año de ingreso original
CREATE OR REPLACE FUNCTION public.sem_set_periodo_ingreso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_periodo uuid;
  v_prev_anio integer;
  v_fecha date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- ¿Existe ya una inscripción previa de este estudiante en el mismo programa?
    SELECT i.periodo_ingreso_id, i.anio_ingreso
      INTO v_prev_periodo, v_prev_anio
    FROM public.sem_inscripciones i
    JOIN public.sem_periodos p ON p.id = i.periodo_id
    WHERE i.persona_id = NEW.persona_id
      AND i.programa_id = NEW.programa_id
    ORDER BY p.fecha_inicio ASC NULLS LAST, i.created_at ASC
    LIMIT 1;

    IF v_prev_periodo IS NOT NULL THEN
      NEW.periodo_ingreso_id := v_prev_periodo;
      NEW.anio_ingreso := v_prev_anio;
    ELSE
      NEW.periodo_ingreso_id := COALESCE(NEW.periodo_ingreso_id, NEW.periodo_id);
      SELECT EXTRACT(YEAR FROM fecha_inicio)::int INTO v_fecha
        FROM public.sem_periodos WHERE id = NEW.periodo_ingreso_id;
      NEW.anio_ingreso := COALESCE(NEW.anio_ingreso, v_fecha);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Inmutable
    NEW.periodo_ingreso_id := OLD.periodo_ingreso_id;
    NEW.anio_ingreso := OLD.anio_ingreso;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sem_set_periodo_ingreso ON public.sem_inscripciones;
CREATE TRIGGER trg_sem_set_periodo_ingreso
BEFORE INSERT OR UPDATE ON public.sem_inscripciones
FOR EACH ROW EXECUTE FUNCTION public.sem_set_periodo_ingreso();
