-- =============================================================================
-- MIGRACIÓN COMPLETA DE USUARIOS, AUTENTICACIÓN, PERFILES, ROLES Y PERMISOS
-- Sistema: Iglesia CMG / DOXA (Supabase / PostgreSQL)
-- =============================================================================
--
-- MAPA DE TABLAS DE IDENTIDAD Y ACCESO DEL SISTEMA:
--   1. auth.users                      -> Credenciales, hashes bcrypt (con salt), tokens,
--                                         estados (activo/bloqueado/eliminado), fechas y metadatos.
--   2. auth.identities                 -> Proveedores OAuth / Email vinculados a cada usuario.
--   3. public.personas                 -> Datos personales (nombres, apellidos, documento,
--                                         teléfono, whatsapp, dirección, estado_iglesia).
--   4. public.profiles                 -> Perfil del usuario en la app (display_name, avatar_url,
--                                         persona_id, grupo_id, red, zadarma_extension).
--   5. public.user_roles               -> Tabla intermedia N:M de roles por usuario (enum app_role).
--   6. public.role_permissions         -> Matriz de permisos granulares por rol (action_key, allowed).
--   7. public.notification_preferences -> Preferencias individuales de notificación por usuario.
-- =============================================================================


-- =============================================================================
-- PARTE 1: ESQUEMA DESTINO (TIPOS ENUM Y TABLAS DE USUARIOS/ROLES/PERFILES)
-- Ejecuta este bloque primero en la instancia destino si aún no existen las tablas
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin',
    'pastor',
    'lider',
    'secretaria',
    'tesoreria',
    'maestro',
    'consulta',
    'super_admin',
    'consolidador_lider',
    'consolidador',
    'lider_intercesion',
    'lider_red',
    'lider_casa_paz',
    'seminario_admin',
    'seminario_docente',
    'seminario_estudiante',
    'coordinador_infantil',
    'recepcion_infantil'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Asegurar que todos los valores del ENUM existan en la instancia destino
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'consolidador_lider';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'consolidador';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lider_intercesion';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lider_red';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lider_casa_paz';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seminario_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seminario_docente';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seminario_estudiante';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordinador_infantil';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'recepcion_infantil';

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  grupo_id UUID,
  persona_id UUID,
  red TEXT,
  zadarma_extension TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  action_key TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, action_key)
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pref_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, pref_key)
);

COMMIT;


-- =============================================================================
-- FORMATO 1A: GENERADOR AUTOMÁTICO DE SENTENCIAS "INSERT INTO" CON DATOS REALES
-- Ejecuta esta consulta en el SQL Editor de tu instancia ORIGEN para obtener el
-- script completo de INSERT INTO con todos los datos reales listos para ejecutar.
-- (Nota: Excluye automáticamente las columnas GENERATED ALWAYS como
--  auth.users.confirmed_at y auth.identities.email para evitar errores al insertar).
-- =============================================================================

SELECT string_agg(bloque, E'\n\n') AS script_sql_insert_completo
FROM (
  -- Cabecera transaccional
  SELECT 0 AS orden,
    E'BEGIN;\nSET session_replication_role = ''replica'';' AS bloque

  UNION ALL

  -- 1. INSERT INTO auth.users (Todas las 34 columnas editables, incluyendo encrypted_password con su salt bcrypt, tokens y metadatos)
  SELECT 1 AS orden,
    COALESCE(
      (
        SELECT
          '-- 1. Tabla: auth.users' || E'\n' ||
          'INSERT INTO auth.users (' ||
          '"id", "instance_id", "aud", "role", "email", "encrypted_password", ' ||
          '"email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", ' ||
          '"recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", ' ||
          '"email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", ' ||
          '"is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", ' ||
          '"phone_change", "phone_change_token", "phone_change_sent_at", ' ||
          '"email_change_token_current", "email_change_confirm_status", "banned_until", ' ||
          '"reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous"' ||
          ') VALUES' || E'\n' ||
          string_agg(
            format(
              '  (%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L::jsonb, %L::jsonb, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
              u.id,
              COALESCE(u.instance_id, '00000000-0000-0000-0000-000000000000'::uuid),
              u.aud,
              u.role,
              u.email,
              u.encrypted_password,
              u.email_confirmed_at,
              u.invited_at,
              u.confirmation_token,
              u.confirmation_sent_at,
              u.recovery_token,
              u.recovery_sent_at,
              u.email_change_token_new,
              u.email_change,
              u.email_change_sent_at,
              u.last_sign_in_at,
              COALESCE(u.raw_app_meta_data, '{}'::jsonb)::text,
              COALESCE(u.raw_user_meta_data, '{}'::jsonb)::text,
              u.is_super_admin,
              u.created_at,
              u.updated_at,
              u.phone,
              u.phone_confirmed_at,
              u.phone_change,
              u.phone_change_token,
              u.phone_change_sent_at,
              u.email_change_token_current,
              u.email_change_confirm_status,
              u.banned_until,
              u.reauthentication_token,
              u.reauthentication_sent_at,
              COALESCE(u.is_sso_user, false),
              u.deleted_at,
              COALESCE(u.is_anonymous, false)
            ),
            E',\n'
            ORDER BY u.created_at ASC
          ) || E'\n' ||
          'ON CONFLICT ("id") DO UPDATE SET ' ||
          '"email" = EXCLUDED."email", ' ||
          '"encrypted_password" = EXCLUDED."encrypted_password", ' ||
          '"email_confirmed_at" = EXCLUDED."email_confirmed_at", ' ||
          '"confirmation_token" = EXCLUDED."confirmation_token", ' ||
          '"recovery_token" = EXCLUDED."recovery_token", ' ||
          '"last_sign_in_at" = EXCLUDED."last_sign_in_at", ' ||
          '"raw_app_meta_data" = EXCLUDED."raw_app_meta_data", ' ||
          '"raw_user_meta_data" = EXCLUDED."raw_user_meta_data", ' ||
          '"is_super_admin" = EXCLUDED."is_super_admin", ' ||
          '"updated_at" = EXCLUDED."updated_at", ' ||
          '"phone" = EXCLUDED."phone", ' ||
          '"phone_confirmed_at" = EXCLUDED."phone_confirmed_at", ' ||
          '"banned_until" = EXCLUDED."banned_until", ' ||
          '"deleted_at" = EXCLUDED."deleted_at", ' ||
          '"is_sso_user" = EXCLUDED."is_sso_user", ' ||
          '"is_anonymous" = EXCLUDED."is_anonymous";'
        FROM auth.users u
      ),
      '-- Sin registros en auth.users'
    ) AS bloque

  UNION ALL

  -- 2. INSERT INTO auth.identities (Identidades de proveedores sin la columna generada "email")
  SELECT 2 AS orden,
    COALESCE(
      (
        SELECT
          '-- 2. Tabla: auth.identities' || E'\n' ||
          'INSERT INTO auth.identities ("id", "provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at") VALUES' || E'\n' ||
          string_agg(
            format(
              '  (%L, %L, %L, %L::jsonb, %L, %L, %L, %L)',
              i.id,
              i.provider_id,
              i.user_id,
              COALESCE(i.identity_data, '{}'::jsonb)::text,
              i.provider,
              i.last_sign_in_at,
              i.created_at,
              i.updated_at
            ),
            E',\n'
            ORDER BY i.created_at ASC
          ) || E'\n' ||
          'ON CONFLICT ("id") DO UPDATE SET ' ||
          '"identity_data" = EXCLUDED."identity_data", ' ||
          '"last_sign_in_at" = EXCLUDED."last_sign_in_at", ' ||
          '"updated_at" = EXCLUDED."updated_at";'
        FROM auth.identities i
      ),
      '-- Sin registros en auth.identities'
    ) AS bloque

  UNION ALL

  -- 3. INSERT INTO public.personas (Fichas personales vinculadas a usuarios con nombres, apellidos, documento, teléfono, estado)
  SELECT 3 AS orden,
    COALESCE(
      (
        SELECT
          '-- 3. Tabla: public.personas (vinculadas a perfiles de usuario)' || E'\n' ||
          'INSERT INTO public.personas (' ||
          '"id", "nombres", "apellidos", "tipo_documento", "documento", "fecha_nacimiento", "sexo", ' ||
          '"telefono", "whatsapp", "email", "direccion", "estado_civil", "ocupacion", "nacionalidad", ' ||
          '"fecha_conversion", "fecha_bautismo", "fecha_ingreso", "estado_iglesia", "tipo_persona", ' ||
          '"tipos_persona", "grupo_id", "ministerio", "lider_responsable", "invitado_por", ' ||
          '"seguimiento_por", "vinculacion", "qr_code", "observaciones", "foto_url", "created_at", "updated_at"' ||
          ') VALUES' || E'\n' ||
          string_agg(
            format(
              '  (%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L::public.estado_iglesia, %L::public.tipo_persona, %L::text[], %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
              per.id, per.nombres, per.apellidos, per.tipo_documento, per.documento,
              per.fecha_nacimiento, per.sexo, per.telefono, per.whatsapp, per.email,
              per.direccion, per.estado_civil, per.ocupacion, per.nacionalidad,
              per.fecha_conversion, per.fecha_bautismo, per.fecha_ingreso,
              per.estado_iglesia, per.tipo_persona, per.tipos_persona, per.grupo_id,
              per.ministerio, per.lider_responsable, per.invitado_por, per.seguimiento_por,
              per.vinculacion, per.qr_code, per.observaciones, per.foto_url,
              per.created_at, per.updated_at
            ),
            E',\n'
            ORDER BY per.created_at ASC
          ) || E'\n' ||
          'ON CONFLICT ("id") DO UPDATE SET ' ||
          '"nombres" = EXCLUDED."nombres", ' ||
          '"apellidos" = EXCLUDED."apellidos", ' ||
          '"documento" = EXCLUDED."documento", ' ||
          '"telefono" = EXCLUDED."telefono", ' ||
          '"whatsapp" = EXCLUDED."whatsapp", ' ||
          '"email" = EXCLUDED."email", ' ||
          '"estado_iglesia" = EXCLUDED."estado_iglesia", ' ||
          '"tipo_persona" = EXCLUDED."tipo_persona", ' ||
          '"updated_at" = EXCLUDED."updated_at";'
        FROM public.personas per
        WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.persona_id = per.id)
      ),
      '-- Sin fichas de personas vinculadas en public.personas'
    ) AS bloque

  UNION ALL

  -- 4. INSERT INTO public.profiles (Perfiles de aplicación)
  SELECT 4 AS orden,
    COALESCE(
      (
        SELECT
          '-- 4. Tabla: public.profiles' || E'\n' ||
          'INSERT INTO public.profiles ("id", "user_id", "display_name", "avatar_url", "grupo_id", "persona_id", "red", "zadarma_extension", "created_at", "updated_at") VALUES' || E'\n' ||
          string_agg(
            format(
              '  (%L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
              p.id, p.user_id, p.display_name, p.avatar_url, p.grupo_id,
              p.persona_id, p.red, p.zadarma_extension, p.created_at, p.updated_at
            ),
            E',\n'
            ORDER BY p.created_at ASC
          ) || E'\n' ||
          'ON CONFLICT ("user_id") DO UPDATE SET ' ||
          '"display_name" = EXCLUDED."display_name", ' ||
          '"avatar_url" = EXCLUDED."avatar_url", ' ||
          '"grupo_id" = EXCLUDED."grupo_id", ' ||
          '"persona_id" = EXCLUDED."persona_id", ' ||
          '"red" = EXCLUDED."red", ' ||
          '"zadarma_extension" = EXCLUDED."zadarma_extension", ' ||
          '"updated_at" = EXCLUDED."updated_at";'
        FROM public.profiles p
      ),
      '-- Sin registros en public.profiles'
    ) AS bloque

  UNION ALL

  -- 5. INSERT INTO public.user_roles (Roles asignados a cada usuario)
  SELECT 5 AS orden,
    COALESCE(
      (
        SELECT
          '-- 5. Tabla: public.user_roles' || E'\n' ||
          'INSERT INTO public.user_roles ("id", "user_id", "role") VALUES' || E'\n' ||
          string_agg(
            format('  (%L, %L, %L::public.app_role)', ur.id, ur.user_id, ur.role),
            E',\n'
          ) || E'\n' ||
          'ON CONFLICT ("user_id", "role") DO NOTHING;'
        FROM public.user_roles ur
      ),
      '-- Sin registros en public.user_roles'
    ) AS bloque

  UNION ALL

  -- 6. INSERT INTO public.role_permissions (Permisos de cada rol)
  SELECT 6 AS orden,
    COALESCE(
      (
        SELECT
          '-- 6. Tabla: public.role_permissions' || E'\n' ||
          'INSERT INTO public.role_permissions ("id", "role", "action_key", "allowed", "created_at", "updated_at") VALUES' || E'\n' ||
          string_agg(
            format(
              '  (%L, %L::public.app_role, %L, %L, %L, %L)',
              rp.id, rp.role, rp.action_key, rp.allowed, rp.created_at, rp.updated_at
            ),
            E',\n'
          ) || E'\n' ||
          'ON CONFLICT ("id") DO UPDATE SET ' ||
          '"allowed" = EXCLUDED."allowed", ' ||
          '"updated_at" = EXCLUDED."updated_at";'
        FROM public.role_permissions rp
      ),
      '-- Sin registros en public.role_permissions'
    ) AS bloque

  UNION ALL

  -- 7. INSERT INTO public.notification_preferences (Preferencias de notificación por usuario)
  SELECT 7 AS orden,
    COALESCE(
      (
        SELECT
          '-- 7. Tabla: public.notification_preferences' || E'\n' ||
          'INSERT INTO public.notification_preferences ("id", "user_id", "pref_key", "enabled", "updated_at") VALUES' || E'\n' ||
          string_agg(
            format(
              '  (%L, %L, %L, %L, %L)',
              np.id, np.user_id, np.pref_key, np.enabled, np.updated_at
            ),
            E',\n'
          ) || E'\n' ||
          'ON CONFLICT ("id") DO UPDATE SET ' ||
          '"enabled" = EXCLUDED."enabled", ' ||
          '"updated_at" = EXCLUDED."updated_at";'
        FROM public.notification_preferences np
      ),
      '-- Sin registros en public.notification_preferences'
    ) AS bloque

  UNION ALL

  SELECT 8 AS orden,
    E'SET session_replication_role = ''origin'';\nCOMMIT;' AS bloque
) AS secciones
WHERE bloque IS NOT NULL;


-- =============================================================================
-- FORMATO 2A: CONSULTA PARA VOLCAR EL RESULTADO COMO JSON ESTRUCTURADO COMPLETO
-- Incluye todas las columnas sensibles (encrypted_password, tokens, salts,
-- raw_app_meta_data, raw_user_meta_data), perfil, persona, roles e identidades
-- sin truncar absolutamente ningún campo.
-- =============================================================================

SELECT jsonb_pretty(
  jsonb_build_object(
    'exported_at', now(),
    'total_users', (SELECT count(*) FROM auth.users),
    'users', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          -- 1. Identificadores y Autenticación (auth.users)
          'id', u.id,
          'instance_id', u.instance_id,
          'aud', u.aud,
          'auth_role', u.role,
          'email', u.email,
          'encrypted_password', u.encrypted_password, -- Hash bcrypt completo (incluye algoritmo, costo y salt de 22 chars)
          'password_hash_algorithm', CASE
            WHEN u.encrypted_password LIKE '$2a$%' OR u.encrypted_password LIKE '$2b$%' OR u.encrypted_password LIKE '$2y$%' THEN 'bcrypt'
            WHEN u.encrypted_password LIKE '$argon2%' THEN 'argon2'
            ELSE 'custom_or_oauth'
          END,
          'extracted_salt', CASE
            WHEN u.encrypted_password ~ '^\$2[aby]\$[0-9]{2}\$' THEN substring(u.encrypted_password FROM 1 FOR 29)
            ELSE NULL
          END,
          -- 2. Tokens de seguridad y recuperación
          'confirmation_token', u.confirmation_token,
          'confirmation_sent_at', u.confirmation_sent_at,
          'recovery_token', u.recovery_token,
          'recovery_sent_at', u.recovery_sent_at,
          'email_change_token_new', u.email_change_token_new,
          'email_change', u.email_change,
          'email_change_sent_at', u.email_change_sent_at,
          'email_change_token_current', u.email_change_token_current,
          'email_change_confirm_status', u.email_change_confirm_status,
          'phone', u.phone,
          'phone_confirmed_at', u.phone_confirmed_at,
          'phone_change', u.phone_change,
          'phone_change_token', u.phone_change_token,
          'phone_change_sent_at', u.phone_change_sent_at,
          'reauthentication_token', u.reauthentication_token,
          'reauthentication_sent_at', u.reauthentication_sent_at,
          -- 3. Estados (activo / bloqueado / eliminado / SSO / super_admin)
          'is_super_admin', u.is_super_admin,
          'is_sso_user', u.is_sso_user,
          'is_anonymous', u.is_anonymous,
          'banned_until', u.banned_until,
          'deleted_at', u.deleted_at,
          'status', CASE
            WHEN u.deleted_at IS NOT NULL THEN 'deleted'
            WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'banned_locked'
            WHEN u.email_confirmed_at IS NULL THEN 'unconfirmed'
            ELSE 'active'
          END,
          -- 4. Fechas de creación, actualización, confirmación y último acceso
          'email_confirmed_at', u.email_confirmed_at,
          'invited_at', u.invited_at,
          'last_sign_in_at', u.last_sign_in_at,
          'created_at', u.created_at,
          'updated_at', u.updated_at,
          -- 5. Metadatos de aplicación y usuario
          'raw_app_meta_data', u.raw_app_meta_data,
          'raw_user_meta_data', u.raw_user_meta_data,
          -- 6. Perfil en public.profiles
          'profile', jsonb_build_object(
            'profile_id', p.id,
            'display_name', p.display_name,
            'avatar_url', p.avatar_url,
            'grupo_id', p.grupo_id,
            'persona_id', p.persona_id,
            'red', p.red,
            'zadarma_extension', p.zadarma_extension,
            'created_at', p.created_at,
            'updated_at', p.updated_at
          ),
          -- 7. Datos personales en public.personas (nombres, apellidos, documento, teléfono)
          'persona', CASE
            WHEN per.id IS NOT NULL THEN to_jsonb(per)
            ELSE NULL
          END,
          -- 8. Roles y permisos efectivos del usuario
          'roles', COALESCE((
            SELECT jsonb_agg(ur.role ORDER BY ur.role)
            FROM public.user_roles ur
            WHERE ur.user_id = u.id
          ), '[]'::jsonb),
          'permissions', COALESCE((
            SELECT jsonb_agg(
               DISTINCT jsonb_build_object(
                'role', rp.role,
                'action_key', rp.action_key,
                'allowed', rp.allowed
              )
            )
            FROM public.user_roles ur
            JOIN public.role_permissions rp ON rp.role = ur.role
            WHERE ur.user_id = u.id
          ), '[]'::jsonb),
          -- 9. Identidades OAuth / Email en auth.identities
          'identities', COALESCE((
            SELECT jsonb_agg(to_jsonb(i) - 'email' ORDER BY i.created_at)
            FROM auth.identities i
            WHERE i.user_id = u.id
          ), '[]'::jsonb),
          -- 10. Preferencias de notificación
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
    'role_permissions_catalog', COALESCE((
      SELECT jsonb_agg(to_jsonb(rp) ORDER BY rp.role, rp.action_key)
      FROM public.role_permissions rp
    ), '[]'::jsonb)
  )
) AS usuarios_json_estructurado;


-- =============================================================================
-- FORMATO 2B: CONSULTA PLANA PARA EXPORTAR A CSV DELIMITADO (SIN TRUNCAR)
-- Puedes ejecutar esta consulta directamente en el SQL Editor y pulsar
-- "Download CSV", o envolverla con COPY (...) TO STDOUT WITH CSV HEADER en psql.
-- =============================================================================

SELECT
  -- Identificadores
  u.id AS user_uuid,
  u.instance_id,
  p.id AS profile_uuid,
  p.persona_id AS persona_uuid,
  -- Nombres, Apellidos y Perfil
  COALESCE(per.nombres, split_part(COALESCE(p.display_name, u.raw_user_meta_data->>'display_name', ''), ' ', 1)) AS nombres,
  COALESCE(per.apellidos, nullif(regexp_replace(COALESCE(p.display_name, u.raw_user_meta_data->>'display_name', ''), '^\S+\s*', ''), '')) AS apellidos,
  COALESCE(p.display_name, u.raw_user_meta_data->>'display_name', u.email) AS display_name,
  per.tipo_documento,
  per.documento,
  -- Emails y Teléfonos
  u.email AS auth_email,
  per.email AS persona_email,
  COALESCE(u.phone, per.telefono) AS telefono,
  per.whatsapp,
  per.direccion,
  -- Hashes de contraseña, Salt y Tokens completos (sin truncar)
  u.encrypted_password,
  CASE
    WHEN u.encrypted_password ~ '^\$2[aby]\$[0-9]{2}\$' THEN substring(u.encrypted_password FROM 1 FOR 29)
    ELSE ''
  END AS bcrypt_salt,
  u.confirmation_token,
  u.recovery_token,
  u.email_change_token_new,
  u.email_change_token_current,
  u.phone_change_token,
  u.reauthentication_token,
  -- Roles y Permisos
  u.aud,
  u.role AS pg_auth_role,
  COALESCE(u.is_super_admin, false) AS is_super_admin,
  COALESCE((
    SELECT string_agg(ur.role::text, '|' ORDER BY ur.role)
    FROM public.user_roles ur
    WHERE ur.user_id = u.id
  ), '') AS app_roles,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object('role', rp.role, 'action_key', rp.action_key, 'allowed', rp.allowed)
      ORDER BY rp.role, rp.action_key
    )::text
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = u.id
  ), '[]') AS effective_permissions_json,
  -- Estados (activo / bloqueado / eliminado)
  CASE
    WHEN u.deleted_at IS NOT NULL THEN 'eliminado'
    WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'bloqueado'
    WHEN u.email_confirmed_at IS NULL THEN 'pendiente_confirmacion'
    ELSE 'activo'
  END AS estado_cuenta_auth,
  COALESCE(per.estado_iglesia::text, 'Activo') AS estado_iglesia,
  COALESCE(per.tipo_persona::text, 'Miembro') AS tipo_persona,
  COALESCE(u.is_sso_user, false) AS is_sso_user,
  COALESCE(u.is_anonymous, false) AS is_anonymous,
  u.banned_until,
  u.deleted_at,
  -- Fechas de creación, actualización, confirmación y último acceso
  u.created_at AS user_created_at,
  u.updated_at AS user_updated_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  u.phone_confirmed_at,
  u.invited_at,
  u.confirmation_sent_at,
  u.recovery_sent_at,
  p.created_at AS profile_created_at,
  p.updated_at AS profile_updated_at,
  -- Campos personalizados y Metadatos JSON sin truncar
  p.avatar_url,
  p.grupo_id,
  p.red,
  p.zadarma_extension,
  COALESCE(u.raw_app_meta_data, '{}'::jsonb)::text AS raw_app_meta_data_json,
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)::text AS raw_user_meta_data_json,
  COALESCE((
    SELECT jsonb_agg(to_jsonb(i) - 'email' ORDER BY i.created_at)::text
    FROM auth.identities i
    WHERE i.user_id = u.id
  ), '[]') AS identities_json
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.personas per ON per.id = p.persona_id
ORDER BY u.created_at ASC;
