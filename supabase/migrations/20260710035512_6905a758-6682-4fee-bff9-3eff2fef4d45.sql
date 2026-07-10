DELETE FROM public.msg_threads WHERE subject IN ('probe','probe2','probe3','probe4','probe5');
DROP FUNCTION IF EXISTS public._debug_auth_uid();