-- Allow anonymous users to view upcoming open events
CREATE POLICY "Allow public read access to open events" ON public.eventos FOR SELECT USING (
  tipo = 'Evento Abierto' AND estado IN ('Próximo', 'En curso')
);

-- RPC function for public registration
CREATE OR REPLACE FUNCTION public.register_public_event(
  p_evento_id UUID,
  p_nombre TEXT,
  p_apellidos TEXT,
  p_email TEXT,
  p_telefono TEXT,
  p_documento TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_persona_id UUID;
  v_inscripcion_id UUID;
  v_evento_record RECORD;
BEGIN
  -- Verify event exists, is open and is upcoming
  SELECT * INTO v_evento_record FROM public.eventos 
  WHERE id = p_evento_id AND tipo = 'Evento Abierto' AND estado IN ('Próximo', 'En curso');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El evento no existe, no está abierto al público o ya finalizó.';
  END IF;

  -- Try to find existing persona by email, telefono or documento
  SELECT id INTO v_persona_id FROM public.personas 
  WHERE (email = p_email AND email IS NOT NULL AND email != '') 
     OR (telefono = p_telefono AND telefono IS NOT NULL AND telefono != '')
     OR (documento_identidad = p_documento AND documento_identidad IS NOT NULL AND documento_identidad != '')
  LIMIT 1;

  -- If no persona, create one
  IF v_persona_id IS NULL THEN
    INSERT INTO public.personas (nombres, apellidos, email, telefono, documento_identidad, tipo_persona)
    VALUES (p_nombre, p_apellidos, p_email, p_telefono, p_documento, 'Visitante')
    RETURNING id INTO v_persona_id;
  ELSE
    -- Optionally update contact info if it was missing? We skip to avoid overwriting.
  END IF;

  -- Check if already registered
  SELECT id INTO v_inscripcion_id FROM public.inscripciones
  WHERE evento_id = p_evento_id AND persona_id = v_persona_id;

  IF v_inscripcion_id IS NOT NULL THEN
    RAISE EXCEPTION 'Ya te encuentras registrado en este evento.';
  END IF;

  -- Register
  INSERT INTO public.inscripciones (evento_id, persona_id, estado_pago, confirmado)
  VALUES (p_evento_id, v_persona_id, 'Pendiente', true)
  RETURNING id INTO v_inscripcion_id;

  RETURN jsonb_build_object('success', true, 'inscripcion_id', v_inscripcion_id, 'persona_id', v_persona_id);
END;
$$;
