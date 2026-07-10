CREATE OR REPLACE FUNCTION public._debug_auth_uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT auth.uid() $$;
GRANT EXECUTE ON FUNCTION public._debug_auth_uid() TO authenticated, anon;