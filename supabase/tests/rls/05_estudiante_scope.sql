-- 05 — Estudiante de seminario: solo puede ver su propia información
BEGIN;
\i supabase/tests/rls/_helpers.sql

INSERT INTO public.user_roles (user_id, role)
VALUES ('55555555-5555-5555-5555-555555555555'::uuid, 'seminario_estudiante'::public.app_role)
ON CONFLICT DO NOTHING;

SELECT pg_temp.become_authenticated('55555555-5555-5555-5555-555555555555'::uuid);

-- Ya no debe existir el fallback por documento/email en sem_persona_id_for_user;
-- el usuario ficticio no está vinculado a ninguna persona => todas las tablas
-- de seminario deben devolver 0 filas.
SELECT pg_temp.assert_row_count('SELECT id FROM public.sem_inscripciones', 0,
  'estudiante sin vínculo: sem_inscripciones = 0');
SELECT pg_temp.assert_row_count('SELECT id FROM public.sem_calificaciones', 0,
  'estudiante sin vínculo: sem_calificaciones = 0');
SELECT pg_temp.assert_row_count('SELECT id FROM public.sem_pagos_inscripcion', 0,
  'estudiante sin vínculo: sem_pagos_inscripcion = 0');
SELECT pg_temp.assert_row_count('SELECT id FROM public.sem_entregas', 0,
  'estudiante sin vínculo: sem_entregas = 0');

-- No puede leer finanzas de la iglesia
SELECT pg_temp.assert_row_count('SELECT id FROM public.finanzas', 0,
  'estudiante: finanzas ocultas');

-- No puede leer auditoría
SELECT pg_temp.assert_row_count('SELECT id FROM public.security_audit_log', 0,
  'estudiante: audit log oculto');

ROLLBACK;
