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

  -- 2. Registrar el evento en la tabla de historial vinculada
  INSERT INTO public.email_send_events (message_id, status, error_message)
  VALUES (p_message_id, p_status, p_error_message);

  -- 3. Si no existe el registro principal (p.ej. webhook de un mensaje no registrado), lo creamos
  IF NOT FOUND THEN
    -- Intentar buscar por recipient si message_id no cruza (opcional, pero ayuda a evitar duplicados si el ID de resend es distinto)
    UPDATE public.email_send_log
    SET status = p_status,
        error_message = COALESCE(p_error_message, error_message),
        message_id = p_message_id -- actualizamos con el ID nuevo
    WHERE recipient_email = p_recipient_email 
      AND status IN ('pending', 'sent') 
      AND created_at >= now() - interval '1 hour';
      
    IF NOT FOUND THEN
      INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, error_message)
      VALUES (p_message_id, COALESCE(p_template_name, 'transactional'), COALESCE(p_recipient_email, ''), p_status, p_error_message);
    END IF;
  END IF;
END;
$$;
