-- Fix persona creation permissions and RLS policies for all authenticated roles

-- 1. Update public.can_create_personas to allow any authenticated user to create personas
CREATE OR REPLACE FUNCTION public.can_create_personas(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _uid IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.can_create_personas(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_create_personas(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_create_personas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_personas(uuid) TO service_role;

-- 2. Update INSERT, SELECT, and UPDATE policies on public.personas table
DROP POLICY IF EXISTS "Only personas:create roles can insert personas" ON public.personas;
DROP POLICY IF EXISTS "Role-scoped insert personas" ON public.personas;
DROP POLICY IF EXISTS "Authenticated can insert personas" ON public.personas;

CREATE POLICY "Authenticated can insert personas"
ON public.personas
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Role-scoped read personas" ON public.personas;
DROP POLICY IF EXISTS "Authenticated can view personas" ON public.personas;

CREATE POLICY "Authenticated can view personas"
ON public.personas
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Role-scoped update personas" ON public.personas;
DROP POLICY IF EXISTS "Authenticated can update personas" ON public.personas;

CREATE POLICY "Authenticated can update personas"
ON public.personas
FOR UPDATE
TO authenticated
USING (true);

-- 3. Update public.create_persona_with_permission RPC function to handle all payload fields and date conversions robustly
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
  v_fecha_nac text;
  v_fecha_nac_date date;
  v_fecha_ing text;
  v_fecha_ing_date date;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión para crear personas' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(array_agg(value), ARRAY[]::text[])
  INTO v_tipos
  FROM jsonb_array_elements_text(COALESCE(_payload->'tipos_persona', '[]'::jsonb)) AS value;

  -- Parse fecha_nacimiento safely
  v_fecha_nac := NULLIF(BTRIM(_payload->>'fecha_nacimiento'), '');
  IF v_fecha_nac IS NOT NULL THEN
    BEGIN
      v_fecha_nac_date := v_fecha_nac::date;
    EXCEPTION WHEN OTHERS THEN
      v_fecha_nac_date := NULL;
    END;
  END IF;

  -- Parse fecha_ingreso safely
  v_fecha_ing := NULLIF(BTRIM(_payload->>'fecha_ingreso'), '');
  IF v_fecha_ing IS NOT NULL THEN
    BEGIN
      v_fecha_ing_date := v_fecha_ing::date;
    EXCEPTION WHEN OTHERS THEN
      v_fecha_ing_date := NULL;
    END;
  END IF;

  INSERT INTO public.personas (
    nombres,
    apellidos,
    telefono,
    whatsapp,
    email,
    direccion,
    sexo,
    fecha_nacimiento,
    fecha_ingreso,
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
    ministerio,
    foto_url,
    clasificacion_cdp,
    red
  ) VALUES (
    NULLIF(BTRIM(_payload->>'nombres'), ''),
    NULLIF(BTRIM(_payload->>'apellidos'), ''),
    NULLIF(BTRIM(_payload->>'telefono'), ''),
    NULLIF(BTRIM(_payload->>'whatsapp'), ''),
    NULLIF(BTRIM(_payload->>'email'), ''),
    NULLIF(BTRIM(_payload->>'direccion'), ''),
    NULLIF(BTRIM(_payload->>'sexo'), ''),
    v_fecha_nac_date,
    v_fecha_ing_date,
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
    NULLIF(BTRIM(_payload->>'ministerio'), ''),
    NULLIF(BTRIM(_payload->>'foto_url'), ''),
    NULLIF(BTRIM(_payload->>'clasificacion_cdp'), ''),
    NULLIF(BTRIM(_payload->>'red'), '')
  )
  RETURNING * INTO v_persona;

  RETURN v_persona;
END;
$$;

REVOKE ALL ON FUNCTION public.create_persona_with_permission(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_persona_with_permission(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_persona_with_permission(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_persona_with_permission(jsonb) TO service_role;
