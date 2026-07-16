
-- Enum
DO $$ BEGIN
  CREATE TYPE public.cert_template_tipo AS ENUM ('lideres_cdp','bautismo','seminario_diploma','academia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- cert_templates
CREATE TABLE IF NOT EXISTS public.cert_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.cert_template_tipo NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  asset_id text,
  asset_url text NOT NULL,
  asset_filename text,
  asset_size bigint,
  storage_bucket text,
  storage_path text,
  version integer NOT NULL DEFAULT 1,
  activo boolean NOT NULL DEFAULT true,
  es_default boolean NOT NULL DEFAULT false,
  preview_url text,
  created_by uuid REFERENCES auth.users(id),
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cert_templates TO authenticated;
GRANT ALL ON public.cert_templates TO service_role;
ALTER TABLE public.cert_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cert_templates_select_authenticated" ON public.cert_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "cert_templates_write_admin" ON public.cert_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role)
      OR public.has_role(auth.uid(),'super_admin'::public.app_role)
      OR public.has_role(auth.uid(),'pastor'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role)
      OR public.has_role(auth.uid(),'super_admin'::public.app_role)
      OR public.has_role(auth.uid(),'pastor'::public.app_role));

CREATE UNIQUE INDEX IF NOT EXISTS cert_templates_default_por_tipo
  ON public.cert_templates(tipo) WHERE es_default = true;
CREATE INDEX IF NOT EXISTS cert_templates_tipo_activo_idx
  ON public.cert_templates(tipo, activo);

CREATE TRIGGER cert_templates_touch
  BEFORE UPDATE ON public.cert_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- cert_export_log
CREATE TABLE IF NOT EXISTS public.cert_export_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.cert_template_tipo NOT NULL,
  template_id uuid REFERENCES public.cert_templates(id) ON DELETE SET NULL,
  template_version integer,
  template_asset_id text,
  template_asset_url text,
  persona_id uuid REFERENCES public.personas(id) ON DELETE SET NULL,
  contexto jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  browser_cache_hit boolean NOT NULL DEFAULT false,
  actor_user_id uuid REFERENCES auth.users(id),
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.cert_export_log TO authenticated;
GRANT ALL ON public.cert_export_log TO service_role;
ALTER TABLE public.cert_export_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cert_export_log_insert_authenticated" ON public.cert_export_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

CREATE POLICY "cert_export_log_select_admin" ON public.cert_export_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role)
      OR public.has_role(auth.uid(),'super_admin'::public.app_role)
      OR public.has_role(auth.uid(),'pastor'::public.app_role)
      OR actor_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS cert_export_log_tipo_idx ON public.cert_export_log(tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS cert_export_log_persona_idx ON public.cert_export_log(persona_id);
CREATE INDEX IF NOT EXISTS cert_export_log_template_idx ON public.cert_export_log(template_id);

-- Seed initial plantillas (current CDN assets)
INSERT INTO public.cert_templates (tipo, nombre, descripcion, asset_id, asset_url, asset_filename, version, activo, es_default, preview_url)
VALUES
  ('lideres_cdp', 'Certificado Líderes CDP - Oficial CMG', 'Plantilla oficial vigente para líderes de Casas de Paz', 'bdc95107-b3df-4433-a5ec-bbbd077f0b30',
   '/__l5e/assets-v1/bdc95107-b3df-4433-a5ec-bbbd077f0b30/cert-lideres-cdp.png', 'cert-lideres-cdp.png', 1, true, true,
   '/__l5e/assets-v1/bdc95107-b3df-4433-a5ec-bbbd077f0b30/cert-lideres-cdp.png')
ON CONFLICT DO NOTHING;

-- Storage RLS for cert-templates bucket
CREATE POLICY "cert_templates_bucket_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cert-templates');

CREATE POLICY "cert_templates_bucket_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cert-templates' AND (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'super_admin'::public.app_role)
    OR public.has_role(auth.uid(),'pastor'::public.app_role)
  ));

CREATE POLICY "cert_templates_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cert-templates' AND (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'super_admin'::public.app_role)
  ));
