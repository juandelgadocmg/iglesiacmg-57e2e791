-- 01 — Anon no puede leer tablas críticas
BEGIN;
\i supabase/tests/rls/_helpers.sql
SELECT pg_temp.become_anon();

-- SELECT: RLS filtra a 0 filas para tablas restringidas
SELECT pg_temp.assert_row_count('SELECT id FROM public.profiles', 0, 'anon SELECT profiles = 0');
SELECT pg_temp.assert_row_count('SELECT id FROM public.personas', 0, 'anon SELECT personas = 0');
SELECT pg_temp.assert_row_count('SELECT id FROM public.finanzas', 0, 'anon SELECT finanzas = 0');
SELECT pg_temp.assert_row_count('SELECT id FROM public.user_roles', 0, 'anon SELECT user_roles = 0');
SELECT pg_temp.assert_row_count('SELECT id FROM public.security_audit_log', 0, 'anon SELECT audit_log = 0');
SELECT pg_temp.assert_row_count('SELECT id FROM public.sem_inscripciones', 0, 'anon SELECT sem_inscripciones = 0');
SELECT pg_temp.assert_row_count('SELECT id FROM public.prog_asignaciones', 0, 'anon SELECT prog_asignaciones = 0');
SELECT pg_temp.assert_row_count('SELECT id FROM public.prog_disponibilidad', 0, 'anon SELECT prog_disponibilidad = 0');
SELECT pg_temp.assert_row_count('SELECT id FROM public.msg_threads', 0, 'anon SELECT msg_threads = 0');

-- INSERT debe ser bloqueado
SELECT pg_temp.assert_denied(
  $q$INSERT INTO public.finanzas (concepto, monto, tipo) VALUES ('x', 1, 'ingreso')$q$,
  'anon INSERT finanzas'
);
SELECT pg_temp.assert_denied(
  $q$INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-0000-0000-000000000001','admin')$q$,
  'anon INSERT user_roles (auto-promoción)'
);

ROLLBACK;
