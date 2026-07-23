
REVOKE EXECUTE ON FUNCTION public.checkin_qr(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.servicio_qr_activate(uuid, integer) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.servicio_qr_close(uuid) FROM public, anon;
