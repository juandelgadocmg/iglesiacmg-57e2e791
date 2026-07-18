-- 08 — Personas: solo roles con personas:create pueden crear registros
BEGIN;
\i supabase/tests/rls/_helpers.sql

-- Usuario autenticado sin roles: bloqueado por RLS.
SELECT pg_temp.become_authenticated('81111111-1111-1111-1111-111111111111'::uuid);
SELECT pg_temp.assert_denied(
  $q$INSERT INTO public.personas (nombres, apellidos) VALUES ('RLS', 'Sin permiso') RETURNING id$q$,
  'auth sin rol: INSERT personas bloqueado'
);

RESET ROLE;

-- Consolidador Líder: permitido por personas:create.
INSERT INTO public.user_roles (user_id, role)
VALUES ('82222222-2222-2222-2222-222222222222'::uuid, 'consolidador_lider'::public.app_role)
ON CONFLICT DO NOTHING;

SELECT pg_temp.become_authenticated('82222222-2222-2222-2222-222222222222'::uuid);

DO $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.personas (nombres, apellidos, documento, telefono, direccion, fecha_nacimiento, tipo_persona, estado_iglesia)
  VALUES ('RLS', 'Consolidador Líder', 'RLS-CL', '3000000000', 'Prueba RLS', '1990-01-01', 'Visitante', 'Activo')
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: consolidador_lider debía poder crear personas';
  END IF;

  RAISE NOTICE '  ok: consolidador_lider puede INSERT personas (%)', v_id;
END $$;

RESET ROLE;

-- Consolidador: también permitido para crear desde el perfil de consolidación.
INSERT INTO public.user_roles (user_id, role)
VALUES ('83333333-3333-3333-3333-333333333333'::uuid, 'consolidador'::public.app_role)
ON CONFLICT DO NOTHING;

SELECT pg_temp.become_authenticated('83333333-3333-3333-3333-333333333333'::uuid);

DO $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.personas (nombres, apellidos, documento, telefono, direccion, fecha_nacimiento, tipo_persona, estado_iglesia)
  VALUES ('RLS', 'Consolidador', 'RLS-C', '3000000001', 'Prueba RLS', '1991-01-01', 'Visitante', 'Activo')
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: consolidador debía poder crear personas';
  END IF;

  RAISE NOTICE '  ok: consolidador puede INSERT personas (%)', v_id;
END $$;

ROLLBACK;