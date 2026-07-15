-- =====================================================================
-- Escaneo de funciones SECURITY DEFINER (informe detallado + whitelist)
--
-- 1. Lee la whitelist desde security_definer_whitelist.txt (una función por
--    línea; líneas '#' o vacías se ignoran).
-- 2. Para cada función SECURITY DEFINER de `public` imprime una línea con:
--       [OK|SKIP|FAIL]  nombre  (public=… authenticated=…)  motivo
-- 3. Falla el build (RAISE EXCEPTION) si alguna función marcada FAIL:
--       - es EXECUTE-able por PUBLIC o authenticated, Y
--       - NO tiene control interno (has_role / sem_is_staff /
--         sem_is_tesoreria / auth.uid() / RAISE EXCEPTION), Y
--       - NO está en la whitelist.
-- =====================================================================

\set QUIET on
\pset pager off

BEGIN;

CREATE TEMP TABLE _sd_whitelist (name text PRIMARY KEY) ON COMMIT DROP;

-- Copia la whitelist a la tabla temporal. Se ignoran comentarios y espacios.
\copy _sd_whitelist(name) FROM 'supabase/tests/rls/security_definer_whitelist.txt' WITH (FORMAT csv, DELIMITER E'\t', QUOTE E'\b')
DELETE FROM _sd_whitelist WHERE name IS NULL OR btrim(name) = '' OR left(btrim(name),1) = '#';
UPDATE _sd_whitelist SET name = btrim(name);

DO $$
DECLARE
  r RECORD;
  v_body text;
  v_public bool;
  v_auth bool;
  v_has_guard bool;
  v_whitelisted bool;
  v_status text;
  v_reason text;
  v_fails int := 0;
  v_total int := 0;
  v_ok int := 0;
  v_skip int := 0;
  v_report text := E'\n===== SECURITY DEFINER · Informe detallado =====\n';
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
    ORDER BY p.proname
  LOOP
    v_total := v_total + 1;
    v_body := lower(r.def);
    v_public := has_function_privilege('public', r.oid, 'EXECUTE');
    v_auth   := has_function_privilege('authenticated', r.oid, 'EXECUTE');
    v_has_guard := (v_body ~ 'has_role\('
                 OR v_body ~ 'sem_is_staff\('
                 OR v_body ~ 'sem_is_tesoreria\('
                 OR v_body ~ 'raise\s+exception'
                 OR v_body ~ 'auth\.uid\(\)');
    v_whitelisted := EXISTS (SELECT 1 FROM _sd_whitelist w WHERE w.name = r.proname);

    IF v_whitelisted THEN
      v_status := 'SKIP';
      v_reason := 'en whitelist';
      v_skip := v_skip + 1;
    ELSIF NOT (v_public OR v_auth) THEN
      v_status := 'OK';
      v_reason := 'no ejecutable por public/authenticated';
      v_ok := v_ok + 1;
    ELSIF v_has_guard THEN
      v_status := 'OK';
      v_reason := 'tiene control interno (has_role/auth.uid/RAISE)';
      v_ok := v_ok + 1;
    ELSE
      v_status := 'FAIL';
      v_reason := 'ejecutable sin control interno — posible ruta de escalación';
      v_fails := v_fails + 1;
    END IF;

    v_report := v_report || format(E'  [%s] %-45s public=%s auth=%s  %s\n',
      v_status, r.proname, v_public, v_auth, v_reason);
  END LOOP;

  v_report := v_report ||
    format(E'------------------------------------------------\n  Total: %s   OK: %s   SKIP: %s   FAIL: %s\n', v_total, v_ok, v_skip, v_fails);

  RAISE NOTICE '%', v_report;

  IF v_fails > 0 THEN
    RAISE EXCEPTION 'SECURITY DEFINER scan: % función(es) sin control de acceso. Ver informe arriba. Agrega has_role()/auth.uid()/RAISE EXCEPTION o añádelas a supabase/tests/rls/security_definer_whitelist.txt con justificación.', v_fails;
  END IF;
END;
$$;

COMMIT;
