CREATE OR REPLACE FUNCTION public.create_persona_with_permission(_payload jsonb)
RETURNS public.personas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_persona public.personas;
  v_tipos text[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión para crear personas' USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_create_personas(v_uid) THEN
    RAISE EXCEPTION 'No tienes permiso personas:create para crear personas' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(array_agg(value), ARRAY[]::text[])
  INTO v_tipos
  FROM jsonb_array_elements_text(COALESCE(_payload->'tipos_persona', '[]'::jsonb)) AS value;

  INSERT INTO public.personas (
    nombres,
    apellidos,
    telefono,
    whatsapp,
    email,
    direccion,
    sexo,
    fecha_nacimiento,
    tipo_persona,
    tipos_persona,
    estado_iglesia,
    grupo_id,
    estado_civil,
    ocupacion,
    observaciones,
    invitado_por,
    seguimiento_por,
    tipo_documento,
    documento,
    nacionalidad,
    vinculacion,
    ministerio
  ) VALUES (
    NULLIF(BTRIM(_payload->>'nombres'), ''),
    NULLIF(BTRIM(_payload->>'apellidos'), ''),
    NULLIF(BTRIM(_payload->>'telefono'), ''),
    NULLIF(BTRIM(_payload->>'whatsapp'), ''),
    NULLIF(BTRIM(_payload->>'email'), ''),
    NULLIF(BTRIM(_payload->>'direccion'), ''),
    NULLIF(BTRIM(_payload->>'sexo'), ''),
    NULLIF(BTRIM(_payload->>'fecha_nacimiento'), '')::date,
    COALESCE(NULLIF(BTRIM(_payload->>'tipo_persona'), ''), 'Miembro')::public.tipo_persona,
    CASE WHEN COALESCE(array_length(v_tipos, 1), 0) > 0 THEN v_tipos ELSE ARRAY[COALESCE(NULLIF(BTRIM(_payload->>'tipo_persona'), ''), 'Miembro')] END,
    COALESCE(NULLIF(BTRIM(_payload->>'estado_iglesia'), ''), 'Activo')::public.estado_iglesia,
    NULLIF(BTRIM(_payload->>'grupo_id'), '')::uuid,
    NULLIF(BTRIM(_payload->>'estado_civil'), ''),
    NULLIF(BTRIM(_payload->>'ocupacion'), ''),
    NULLIF(BTRIM(_payload->>'observaciones'), ''),
    NULLIF(BTRIM(_payload->>'invitado_por'), ''),
    NULLIF(BTRIM(_payload->>'seguimiento_por'), ''),
    NULLIF(BTRIM(_payload->>'tipo_documento'), ''),
    NULLIF(BTRIM(_payload->>'documento'), ''),
    NULLIF(BTRIM(_payload->>'nacionalidad'), ''),
    NULLIF(BTRIM(_payload->>'vinculacion'), ''),
    NULLIF(BTRIM(_payload->>'ministerio'), '')
  )
  RETURNING * INTO v_persona;

  RETURN v_persona;
END;
$$;

REVOKE ALL ON FUNCTION public.create_persona_with_permission(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_persona_with_permission(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_persona_with_permission(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_persona_with_permission(jsonb) TO service_role;