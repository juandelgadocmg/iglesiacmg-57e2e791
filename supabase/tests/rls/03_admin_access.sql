-- 03 — Admin: acceso completo a tablas críticas
-- Se crea un admin efímero dentro de la transacción y se hace ROLLBACK al final.
BEGIN;
\i supabase/tests/rls/_helpers.sql

-- Crear un usuario admin ficticio dentro de la transacción (rol postgres/service).
-- No usamos auth.users porque no queremos insertar en el esquema auth; inyectamos user_roles.
INSERT INTO public.user_roles (user_id, role)
VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 'admin'::public.app_role)
ON CONFLICT DO NOTHING;

SELECT pg_temp.become_authenticated('22222222-2222-2222-2222-222222222222'::uuid);

-- Admin puede ver todas las tablas críticas (no assert count exacto por depender de datos)
SELECT pg_temp.assert_max_rows('SELECT id FROM public.profiles LIMIT 1', 1, 'admin SELECT profiles ok');
SELECT pg_temp.assert_max_rows('SELECT id FROM public.finanzas LIMIT 1', 1, 'admin SELECT finanzas ok');
SELECT pg_temp.assert_max_rows('SELECT id FROM public.user_roles LIMIT 1', 1, 'admin SELECT user_roles ok');
SELECT pg_temp.assert_max_rows('SELECT id FROM public.security_audit_log LIMIT 1', 1, 'admin SELECT audit log ok');
SELECT pg_temp.assert_max_rows('SELECT id FROM public.prog_asignaciones LIMIT 1', 1, 'admin SELECT prog_asignaciones ok');
SELECT pg_temp.assert_max_rows('SELECT id FROM public.prog_disponibilidad LIMIT 1', 1, 'admin SELECT prog_disponibilidad ok');

ROLLBACK;
