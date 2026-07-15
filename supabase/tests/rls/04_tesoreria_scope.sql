-- 04 — Tesorería: puede leer finanzas pero no roles ni auditoría
BEGIN;
\i supabase/tests/rls/_helpers.sql

INSERT INTO public.user_roles (user_id, role)
VALUES ('33333333-3333-3333-3333-333333333333'::uuid, 'tesoreria'::public.app_role)
ON CONFLICT DO NOTHING;

SELECT pg_temp.become_authenticated('33333333-3333-3333-3333-333333333333'::uuid);

-- Puede leer finanzas
SELECT pg_temp.assert_max_rows('SELECT id FROM public.finanzas LIMIT 1', 1, 'tesoreria SELECT finanzas ok');

-- NO puede leer el registro de auditoría (solo admin)
SELECT pg_temp.assert_row_count('SELECT id FROM public.security_audit_log', 0,
  'tesoreria: audit log oculto');

-- NO puede promocionar a nadie
SELECT pg_temp.assert_denied(
  $q$INSERT INTO public.user_roles (user_id, role) VALUES ('44444444-4444-4444-4444-444444444444','admin')$q$,
  'tesoreria: INSERT user_roles admin bloqueado'
);

ROLLBACK;
