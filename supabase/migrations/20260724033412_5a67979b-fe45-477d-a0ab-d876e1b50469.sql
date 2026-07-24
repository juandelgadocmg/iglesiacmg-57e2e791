-- Versioning + snapshot on planilla_historial
ALTER TABLE public.planilla_historial
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_id uuid NULL REFERENCES public.planilla_historial(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS snapshot jsonb NULL,
  ADD COLUMN IF NOT EXISTS motivo text NULL;

CREATE INDEX IF NOT EXISTS idx_planilla_historial_parent ON public.planilla_historial(parent_id);

-- Signature audit log
CREATE TABLE IF NOT EXISTS public.firma_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id uuid NOT NULL,
  persona_id uuid NOT NULL,
  asistencia_id uuid NULL,
  accion text NOT NULL CHECK (accion IN ('created','replaced','cleared')),
  firma_preview text NULL,
  firmada_por uuid NULL,
  firmada_por_email text NULL,
  user_agent text NULL,
  ip inet NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.firma_audit TO authenticated;
GRANT ALL ON public.firma_audit TO service_role;

ALTER TABLE public.firma_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firma_audit_select_auth" ON public.firma_audit
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "firma_audit_insert_auth" ON public.firma_audit
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_firma_audit_servicio ON public.firma_audit(servicio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_firma_audit_persona ON public.firma_audit(persona_id, created_at DESC);

-- Trigger function to log signature changes on asistencia
CREATE OR REPLACE FUNCTION public.log_firma_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_action text;
  v_old text;
  v_new text;
BEGIN
  v_old := COALESCE(OLD.firma_data_url, '');
  v_new := COALESCE(NEW.firma_data_url, '');

  IF TG_OP = 'INSERT' THEN
    IF v_new = '' THEN RETURN NEW; END IF;
    v_action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF v_old = v_new THEN RETURN NEW; END IF;
    IF v_new = '' THEN v_action := 'cleared';
    ELSIF v_old = '' THEN v_action := 'created';
    ELSE v_action := 'replaced';
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.firma_audit(
    servicio_id, persona_id, asistencia_id, accion, firma_preview,
    firmada_por, firmada_por_email, user_agent, ip
  ) VALUES (
    NEW.servicio_id, NEW.persona_id, NEW.id, v_action,
    CASE WHEN v_new <> '' THEN LEFT(v_new, 120) ELSE NULL END,
    NEW.firma_capturada_por, v_email,
    NULLIF(current_setting('request.headers', true)::jsonb ->> 'user-agent', ''),
    NULLIF(current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', '')::inet
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- never block asistencia writes on audit failure
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_firma_change ON public.asistencia;
CREATE TRIGGER trg_log_firma_change
  AFTER INSERT OR UPDATE OF firma_data_url ON public.asistencia
  FOR EACH ROW EXECUTE FUNCTION public.log_firma_change();