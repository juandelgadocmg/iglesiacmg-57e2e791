-- ============================================================================
-- RPCs para Migración Completa de Usuarios, Perfiles, Roles, Permisos y Fichas
-- Extrae el 100% de las columnas de:
--   1. auth.users (incluyendo encrypted_password, tokens, salts, metadatos, estados)
--   2. auth.identities (proveedores email, google, etc.)
--   3. public.personas (ficha completa de nombres, apellidos, documento, contacto)
--   4. public.profiles (perfil de usuario, avatar, extensión Zadarma, grupo, red)
--   5. public.user_roles (roles asignados por usuario)
--   6. public.role_permissions (matriz de permisos por rol)
--   7. public.notification_preferences (preferencias de usuario)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.export_users_migration_json()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol de administrador';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'users_complete', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', u.id,
          'instance_id', u.instance_id,
          'aud', u.aud,
          'role', u.role,
          'email', u.email,
          'encrypted_password', u.encrypted_password,
          'email_confirmed_at', u.email_confirmed_at,
          'invited_at', u.invited_at,
          'confirmation_token', u.confirmation_token,
          'confirmation_sent_at', u.confirmation_sent_at,
          'recovery_token', u.recovery_token,
          'recovery_sent_at', u.recovery_sent_at,
          'email_change_token_new', u.email_change_token_new,
          'email_change', u.email_change,
          'email_change_sent_at', u.email_change_sent_at,
          'last_sign_in_at', u.last_sign_in_at,
          'raw_app_meta_data', u.raw_app_meta_data,
          'raw_user_meta_data', u.raw_user_meta_data,
          'is_super_admin', u.is_super_admin,
          'created_at', u.created_at,
          'updated_at', u.updated_at,
          'phone', u.phone,
          'phone_confirmed_at', u.phone_confirmed_at,
          'phone_change', u.phone_change,
          'phone_change_token', u.phone_change_token,
          'phone_change_sent_at', u.phone_change_sent_at,
          'email_change_token_current', u.email_change_token_current,
          'email_change_confirm_status', u.email_change_confirm_status,
          'banned_until', u.banned_until,
          'reauthentication_token', u.reauthentication_token,
          'reauthentication_sent_at', u.reauthentication_sent_at,
          'is_sso_user', u.is_sso_user,
          'deleted_at', u.deleted_at,
          'is_anonymous', u.is_anonymous,
          'estado_cuenta', CASE
            WHEN u.deleted_at IS NOT NULL THEN 'eliminado'
            WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'bloqueado'
            WHEN u.email_confirmed_at IS NULL THEN 'pendiente_confirmacion'
            ELSE 'activo'
          END,
          'profile', to_jsonb(p),
          'persona', to_jsonb(per),
          'roles', COALESCE((
            SELECT jsonb_agg(ur.role ORDER BY ur.role)
            FROM public.user_roles ur
            WHERE ur.user_id = u.id
          ), '[]'::jsonb),
          'identities', COALESCE((
            SELECT jsonb_agg(to_jsonb(i) - 'email')
            FROM auth.identities i
            WHERE i.user_id = u.id
          ), '[]'::jsonb),
          'notification_preferences', COALESCE((
            SELECT jsonb_agg(to_jsonb(np))
            FROM public.notification_preferences np
            WHERE np.user_id = u.id
          ), '[]'::jsonb)
        )
        ORDER BY u.created_at ASC
      )
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.user_id = u.id
      LEFT JOIN public.personas per ON per.id = p.persona_id
    ), '[]'::jsonb),
    'auth_users_raw', COALESCE((SELECT jsonb_agg(to_jsonb(u) - 'confirmed_at' ORDER BY u.created_at) FROM auth.users u), '[]'::jsonb),
    'auth_identities_raw', COALESCE((SELECT jsonb_agg(to_jsonb(i) - 'email' ORDER BY i.created_at) FROM auth.identities i), '[]'::jsonb),
    'public_profiles_raw', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.created_at) FROM public.profiles p), '[]'::jsonb),
    'public_user_roles_raw', COALESCE((SELECT jsonb_agg(to_jsonb(ur)) FROM public.user_roles ur), '[]'::jsonb),
    'public_role_permissions_raw', COALESCE((SELECT jsonb_agg(to_jsonb(rp)) FROM public.role_permissions rp), '[]'::jsonb),
    'public_personas_linked_raw', COALESCE((
      SELECT jsonb_agg(to_jsonb(per))
      FROM public.personas per
      WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.persona_id = per.id)
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_users_migration_json() TO authenticated, service_role;
