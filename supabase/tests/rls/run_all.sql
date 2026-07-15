-- =====================================================================
-- Pruebas RLS — orquestador
-- Ejecutar con: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls/run_all.sql
-- Todos los archivos se envuelven en BEGIN/ROLLBACK: no dejan datos.
-- =====================================================================

\set QUIET on
\pset pager off
\timing off

\echo '==> [1/6] anon: no puede leer tablas críticas'
\i supabase/tests/rls/01_anon_blocked.sql

\echo '==> [2/6] authenticated sin rol: no puede leer datos ajenos'
\i supabase/tests/rls/02_authenticated_no_role.sql

\echo '==> [3/6] admin: acceso completo a tablas críticas'
\i supabase/tests/rls/03_admin_access.sql

\echo '==> [4/6] tesoreria: acceso a finanzas, no a academia'
\i supabase/tests/rls/04_tesoreria_scope.sql

\echo '==> [5/6] seminario_estudiante: solo su información'
\i supabase/tests/rls/05_estudiante_scope.sql

\echo '==> [6/6] auditoría: security_audit_log solo lectura por admin'
\i supabase/tests/rls/06_audit_log.sql

\echo ''
\echo '===================================================='
\echo '  Todas las pruebas RLS pasaron correctamente.'
\echo '===================================================='
