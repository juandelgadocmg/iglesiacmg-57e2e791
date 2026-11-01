-- =============================================================================
-- FIX: CORRECCIÓN DE ZONA HORARIA EN CHECK-IN / CHECK-OUT INFANTIL
-- Descripción:
--   Evita que a partir de las 7:00 p.m. (hora Colombia / UTC-5) el sistema
--   asigne erróneamente la fecha del día siguiente por conversión a UTC.
--   Asegura que 'fecha' siempre coincida con la fecha local de Colombia ('America/Bogota').
-- =============================================================================

-- 1. Función para asegurar que la fecha de check-in sea siempre la fecha local en Colombia
CREATE OR REPLACE FUNCTION public.fn_infantil_asistencia_set_fecha_local()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si hora_entrada está presente, derivar la fecha directamente en zona horaria America/Bogota
  IF NEW.hora_entrada IS NOT NULL THEN
    NEW.fecha := (NEW.hora_entrada AT TIME ZONE 'America/Bogota')::date;
  ELSIF NEW.fecha IS NULL THEN
    NEW.fecha := (now() AT TIME ZONE 'America/Bogota')::date;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Trigger antes de insertar en infantil_asistencia_checkin
DROP TRIGGER IF EXISTS trg_infantil_asistencia_set_fecha_local ON public.infantil_asistencia_checkin;
CREATE TRIGGER trg_infantil_asistencia_set_fecha_local
BEFORE INSERT OR UPDATE OF hora_entrada ON public.infantil_asistencia_checkin
FOR EACH ROW
EXECUTE FUNCTION public.fn_infantil_asistencia_set_fecha_local();

-- 3. Auto-corrección de registros existentes desfasados por la regla UTC después de las 7:00 p.m.
UPDATE public.infantil_asistencia_checkin
SET fecha = (hora_entrada AT TIME ZONE 'America/Bogota')::date
WHERE hora_entrada IS NOT NULL
  AND fecha != (hora_entrada AT TIME ZONE 'America/Bogota')::date;

