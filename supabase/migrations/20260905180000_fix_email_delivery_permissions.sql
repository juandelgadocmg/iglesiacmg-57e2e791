-- Migration: Grant admin permissions for email logging & create helper functions for transactional emails

-- 1. Policies for admins on email_send_log
DO $$ BEGIN
  CREATE POLICY "Admins can read send log"
    ON public.email_send_log FOR SELECT
    USING (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Policies for admins on email_send_state
DO $$ BEGIN
  CREATE POLICY "Admins can read send state"
    ON public.email_send_state FOR SELECT
    USING (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Helper RPC to enqueue a transactional email cleanly
CREATE OR REPLACE FUNCTION public.send_transactional_email(
  p_to TEXT,
  p_subject TEXT,
  p_html TEXT,
  p_label TEXT DEFAULT 'transactional'
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE
  v_payload JSONB;
  v_msg_id BIGINT;
BEGIN
  IF p_to IS NULL OR trim(p_to) = '' THEN
    RAISE EXCEPTION 'El correo electrónico del destinatario es obligatorio';
  END IF;

  v_payload := jsonb_build_object(
    'to', trim(p_to),
    'subject', p_subject,
    'html', p_html,
    'label', COALESCE(p_label, 'transactional'),
    'queued_at', now(),
    'message_id', 'msg_' || gen_random_uuid()::text
  );

  v_msg_id := public.enqueue_email('transactional_emails', v_payload);

  -- Insert initial pending log entry
  INSERT INTO public.email_send_log (
    message_id,
    template_name,
    recipient_email,
    status,
    metadata
  ) VALUES (
    v_payload->>'message_id',
    COALESCE(p_label, 'transactional'),
    trim(p_to),
    'pending',
    jsonb_build_object('subject', p_subject)
  );

  RETURN v_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_transactional_email(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 4. RPC for admins to view email send logs safely
CREATE OR REPLACE FUNCTION public.get_email_send_logs(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  message_id TEXT,
  template_name TEXT,
  recipient_email TEXT,
  status TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Acceso denegado. Se requieren permisos de administrador.';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.message_id,
    l.template_name,
    l.recipient_email,
    l.status,
    l.error_message,
    l.metadata,
    l.created_at
  FROM public.email_send_log l
  ORDER BY l.created_at DESC
  LIMIT LEAST(p_limit, 200);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_send_logs(INT) TO authenticated;
