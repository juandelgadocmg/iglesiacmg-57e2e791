CREATE INDEX IF NOT EXISTS idx_reportes_grupos_grupo_fecha
ON public.reportes_grupos (grupo_id, fecha);

CREATE OR REPLACE FUNCTION public.prevent_duplicate_reporte_grupo_fecha()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.reportes_grupos rg
    WHERE rg.grupo_id = NEW.grupo_id
      AND rg.fecha = NEW.fecha
      AND rg.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Ya existe un reporte para este grupo en esta fecha.' USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_reporte_grupo_fecha_trigger ON public.reportes_grupos;

CREATE TRIGGER prevent_duplicate_reporte_grupo_fecha_trigger
BEFORE INSERT OR UPDATE OF grupo_id, fecha ON public.reportes_grupos
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_reporte_grupo_fecha();