
CREATE TABLE IF NOT EXISTS public.sem_zoom_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  mode text NOT NULL DEFAULT 'manual' CHECK (mode IN ('api','manual')),
  host_email text,
  default_duration_minutes integer NOT NULL DEFAULT 90,
  account_id_masked text,
  last_validation_status text CHECK (last_validation_status IN ('ok','error','unknown')),
  last_validation_at timestamptz,
  last_validation_message text,
  validated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sem_zoom_config_single UNIQUE (singleton)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sem_zoom_config TO authenticated;
GRANT ALL ON public.sem_zoom_config TO service_role;

ALTER TABLE public.sem_zoom_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lect zoom config" ON public.sem_zoom_config
  FOR SELECT TO authenticated
  USING (public.sem_is_staff(auth.uid()));

CREATE POLICY "escrit zoom config" ON public.sem_zoom_config
  FOR ALL TO authenticated
  USING (public.sem_is_staff(auth.uid()))
  WITH CHECK (public.sem_is_staff(auth.uid()));

CREATE TRIGGER trg_sem_zoom_config_upd
  BEFORE UPDATE ON public.sem_zoom_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.sem_zoom_config (mode, last_validation_status)
VALUES ('manual', 'unknown')
ON CONFLICT (singleton) DO NOTHING;
