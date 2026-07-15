-- Helpers reutilizables entre pruebas RLS
-- Cargar con: \i supabase/tests/rls/_helpers.sql

-- assert_denied(query text)
-- Falla si la query NO lanza un error de permiso / RLS.
CREATE OR REPLACE FUNCTION pg_temp.assert_denied(_query text, _label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE _query;
  RAISE EXCEPTION 'FAIL: % debía ser bloqueada por RLS pero fue permitida', _label;
EXCEPTION
  WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE '  ok: % bloqueada (%)', _label, SQLERRM;
  WHEN OTHERS THEN
    -- RLS también puede devolver simplemente 0 filas para SELECT.
    -- En INSERT/UPDATE/DELETE, PostgREST devuelve 403; en SQL devuelve error 42501.
    IF SQLSTATE IN ('42501','23514') THEN
      RAISE NOTICE '  ok: % bloqueada', _label;
    ELSE
      RAISE;
    END IF;
END;
$$;

-- assert_row_count(query text, expected int, label text)
CREATE OR REPLACE FUNCTION pg_temp.assert_row_count(_query text, _expected int, _label text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_count int;
BEGIN
  EXECUTE 'SELECT count(*) FROM (' || _query || ') s' INTO v_count;
  IF v_count <> _expected THEN
    RAISE EXCEPTION 'FAIL: % esperaba % filas, obtuvo %', _label, _expected, v_count;
  END IF;
  RAISE NOTICE '  ok: % (% filas)', _label, v_count;
END;
$$;

-- assert_max_rows(query text, max int, label text) — para tablas que pueden estar vacías
CREATE OR REPLACE FUNCTION pg_temp.assert_max_rows(_query text, _max int, _label text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_count int;
BEGIN
  EXECUTE 'SELECT count(*) FROM (' || _query || ') s' INTO v_count;
  IF v_count > _max THEN
    RAISE EXCEPTION 'FAIL: % esperaba máx % filas, obtuvo %', _label, _max, v_count;
  END IF;
  RAISE NOTICE '  ok: % (% <= %)', _label, v_count, _max;
END;
$$;

-- Simular usuario autenticado con un uid concreto
CREATE OR REPLACE FUNCTION pg_temp.become_authenticated(_uid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format(
    'SET LOCAL "request.jwt.claims" = %L',
    jsonb_build_object('sub', _uid::text, 'role', 'authenticated', 'aud', 'authenticated')::text
  );
  SET LOCAL ROLE authenticated;
END;
$$;

-- Simular anon
CREATE OR REPLACE FUNCTION pg_temp.become_anon()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  SET LOCAL "request.jwt.claims" = '{"role":"anon","aud":"authenticated"}';
  SET LOCAL ROLE anon;
END;
$$;
