ALTER TABLE public.tesoreria_consignacion_historial
  ALTER COLUMN registro_id DROP NOT NULL;

ALTER TABLE public.tesoreria_consignacion_historial
  DROP CONSTRAINT IF EXISTS tesoreria_consignacion_historial_registro_id_fkey;

ALTER TABLE public.tesoreria_consignacion_historial
  ADD CONSTRAINT tesoreria_consignacion_historial_registro_id_fkey
  FOREIGN KEY (registro_id)
  REFERENCES public.tesoreria_ofrendas_cdp(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;