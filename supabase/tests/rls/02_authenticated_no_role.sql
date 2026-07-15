-- 02 — Usuario autenticado sin roles asignados
-- Debe ver únicamente su propio perfil y NO datos ajenos.
BEGIN;
\i supabase/tests/rls/_helpers.sql

-- UID ficticio: no está en profiles ni en user_roles => sin permisos elevados.
SELECT pg_temp.become_authenticated('11111111-1111-1111-1111-111111111111'::uuid);

-- profiles: la nueva policy solo permite ver el propio o si es staff.
-- Como este usuario no existe, verá 0.
SELECT pg_temp.assert_row_count('SELECT user_id FROM public.profiles', 0,
  'auth sin rol: profiles ajenos ocultos');

-- No puede promocionarse a admin
SELECT pg_temp.assert_denied(
  $q$INSERT INTO public.user_roles (user_id, role) VALUES ('11111111-1111-1111-1111-111111111111','admin')$q$,
  'auth sin rol: INSERT user_roles bloqueado'
);

-- No puede leer finanzas
SELECT pg_temp.assert_row_count('SELECT id FROM public.finanzas', 0,
  'auth sin rol: finanzas ocultas');

-- No puede leer el registro de auditoría
SELECT pg_temp.assert_row_count('SELECT id FROM public.security_audit_log', 0,
  'auth sin rol: audit log oculto');

-- No puede leer configuración de otros usuarios en prog_disponibilidad
SELECT pg_temp.assert_row_count('SELECT id FROM public.prog_disponibilidad', 0,
  'auth sin rol: disponibilidad ajena oculta');

-- No puede leer asignaciones ministeriales
SELECT pg_temp.assert_row_count('SELECT id FROM public.prog_asignaciones', 0,
  'auth sin rol: asignaciones ocultas');

ROLLBACK;
