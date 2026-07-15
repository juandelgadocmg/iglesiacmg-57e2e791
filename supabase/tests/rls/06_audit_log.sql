-- 06 — La tabla security_audit_log:
--   * anon, authenticated y roles no-admin: 0 filas
--   * admin: puede leer
--   * NADIE puede insertar directo (solo triggers via SECURITY DEFINER)
BEGIN;
\i supabase/tests/rls/_helpers.sql

-- 1) authenticated normal
SELECT pg_temp.become_authenticated('66666666-6666-6666-6666-666666666666'::uuid);
SELECT pg_temp.assert_row_count('SELECT id FROM public.security_audit_log', 0,
  'audit log: user normal no ve nada');
SELECT pg_temp.assert_denied(
  $q$INSERT INTO public.security_audit_log (table_name, operation) VALUES ('x','INSERT')$q$,
  'audit log: INSERT directo bloqueado (user normal)'
);

-- 2) admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('77777777-7777-7777-7777-777777777777'::uuid, 'admin'::public.app_role)
ON CONFLICT DO NOTHING;
SELECT pg_temp.become_authenticated('77777777-7777-7777-7777-777777777777'::uuid);
SELECT pg_temp.assert_max_rows('SELECT id FROM public.security_audit_log LIMIT 1', 1,
  'audit log: admin puede leer');
-- Ni siquiera admin puede insertar directamente (no hay policy INSERT)
SELECT pg_temp.assert_denied(
  $q$INSERT INTO public.security_audit_log (table_name, operation) VALUES ('x','INSERT')$q$,
  'audit log: INSERT directo bloqueado (admin)'
);

ROLLBACK;
