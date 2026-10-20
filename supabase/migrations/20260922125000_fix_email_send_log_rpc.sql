-- Migration: Fix email_send_log duplicate records and webhook updates

CREATE TABLE IF NOT EXISTS public.email_send_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Policy para email_send_events
ALTER TABLE public.email_send_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can read send events"
    ON public.email_send_events FOR SELECT
    USING (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.update_email_send_log_status(
  p_message_id text,
  p_status text,
  p_template_name text DEFAULT NULL,
  p_recipient_email text DEFAULT NULL,
  p_error_message text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_message_id IS NULL THEN
    INSERT INTO public.email_send_log (template_name, recipient_email, status, error_message)
    VALUES (COALESCE(p_template_name, 'transactional'), COALESCE(p_recipient_email, ''), p_status, p_error_message);
    RETURN;
  END IF;

  -- 1. Intentar actualizar el registro principal existente usando message_id
  UPDATE public.email_send_log
  SET status = p_status,
      error_message = COALESCE(p_error_message, error_message)
      -- No sobrescribimos created_at para mantener la fecha original de encolado
  WHERE message_id = p_message_id;

  -- 2. Si no existe el registro principal por message_id, buscar el 'pending' reciente del mismo destinatario
  IF NOT FOUND THEN
    UPDATE public.email_send_log
    SET status = p_status,
        error_message = COALESCE(p_error_message, error_message),
        message_id = p_message_id
    WHERE id = (
      SELECT id
      FROM public.email_send_log
      WHERE lower(recipient_email) = lower(COALESCE(p_recipient_email, ''))
        AND status IN ('pending', 'sent')
        AND created_at >= now() - interval '24 hours'
      ORDER BY (status = 'pending') DESC, created_at DESC
      LIMIT 1
    );

    IF NOT FOUND THEN
      INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, error_message)
      VALUES (p_message_id, COALESCE(p_template_name, 'transactional'), COALESCE(p_recipient_email, ''), p_status, p_error_message);
    END IF;
  END IF;

  -- 3. Eliminar cualquier fila duplicada en estado 'pending' que haya quedado para el mismo message_id o destinatario
  IF p_status <> 'pending' THEN
    DELETE FROM public.email_send_log
    WHERE status = 'pending'
      AND (
        message_id = p_message_id
        OR (
          p_recipient_email IS NOT NULL
          AND lower(recipient_email) = lower(p_recipient_email)
          AND created_at >= now() - interval '24 hours'
        )
      );
  END IF;

  -- 4. Registrar el evento en la tabla de historial vinculada
  INSERT INTO public.email_send_events (message_id, status, error_message)
  VALUES (p_message_id, p_status, p_error_message);
END;
$$;
