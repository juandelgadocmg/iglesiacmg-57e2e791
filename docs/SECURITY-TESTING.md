# Pruebas y monitoreo de seguridad

Este proyecto tiene tres capas de seguridad automatizada, todas ejecutables desde CI:

## 1. Auditoría en base de datos

La tabla `public.security_audit_log` registra automáticamente cada cambio en datos
sensibles mediante triggers `AFTER INSERT/UPDATE/DELETE`:

| Tabla auditada           | Qué se registra                                                 |
| ------------------------ | --------------------------------------------------------------- |
| `user_roles`             | Cualquier alta, baja o cambio de rol                             |
| `profiles`               | Cambios en `persona_id` o `display_name`                         |
| `finanzas`               | Todos los movimientos financieros                                |
| `configuracion_iglesia`  | Cambios y eliminaciones de configuración                         |
| `sem_calificaciones`     | Registro y modificación de notas                                 |

Cada fila queda con: `actor_user_id`, `actor_email`, `operation`, `changed`
(diff campo a campo), `old_row`, `new_row`, `created_at`. Solo los roles
`admin` y `super_admin` pueden leerla; nadie puede insertar directamente
(las escrituras solo ocurren desde los triggers `SECURITY DEFINER`).

Para consultar los últimos eventos:

```sql
SELECT created_at, actor_email, table_name, operation, changed
FROM public.security_audit_log
ORDER BY created_at DESC
LIMIT 50;
```

## 2. Pruebas RLS por rol + scanner SECURITY DEFINER (SQL)

En `supabase/tests/rls/` hay una suite que simula cada rol (anon, autenticado
sin rol, admin, tesorería, estudiante de seminario) y verifica que las policies
bloqueen o permitan el acceso correspondiente. Se ejecuta con `psql` dentro de
transacciones que hacen `ROLLBACK`, por lo que **no** deja datos ni cambios.

El paso `07_security_definer_scan.sql` recorre todas las funciones
`SECURITY DEFINER` del schema `public` y falla el build si alguna es
ejecutable por `PUBLIC`/`authenticated` **sin** una barrera interna
(`has_role()`, `sem_is_staff()`, `sem_is_tesoreria()`, `auth.uid()` o
`RAISE EXCEPTION`). Las funciones utilitarias intencionalmente abiertas
(triggers, `update_updated_at_column`, workers de cron) están en una lista
blanca dentro del mismo archivo.

```bash
export SUPABASE_DB_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres"
bun run test:rls
```

## 3. E2E · intentos de acceso no autorizado + Storage (Playwright)

Tres suites en `tests/e2e/`:

| Archivo                       | Qué verifica                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `security-access.spec.ts`     | Anon no puede leer/escribir tablas críticas (15 tablas + inserts sensibles)  |
| `storage-buckets.spec.ts`     | Buckets públicos vs privados: lectura/escritura anon, paths inválidos, MIME  |
| `audit-log.spec.ts`           | `security_audit_log` bloqueado a anon; verificación opcional con admin real  |

```bash
export SUPABASE_URL="https://<ref>.supabase.co"
export SUPABASE_ANON_KEY="eyJ..."
# Opcional: credenciales de un usuario de bajo privilegio para probar
# intentos de escalación autenticada.
export E2E_LOW_PRIV_EMAIL="pruebas.lowpriv@example.com"
export E2E_LOW_PRIV_PASSWORD="********"
bun run test:e2e
```

Ambas suites juntas:

```bash
bun run test:security
```

## 4. CI en GitHub Actions

`.github/workflows/security.yml` corre en cada push/PR:

1. **Pruebas RLS** vía `psql`.
2. **`supabase db lint`** — detecta RLS faltante, políticas laxas, buckets
   públicos con listado abierto, y funciones `SECURITY DEFINER` ejecutables
   por autenticados. Falla el build ante hallazgos nuevos con nivel warning.
3. **E2E de acceso no autorizado** vía Playwright.

### Secrets requeridos en GitHub

| Secret                     | Uso                                                        |
| -------------------------- | ---------------------------------------------------------- |
| `SUPABASE_DB_URL`          | Cadena Postgres para el job de pruebas RLS                 |
| `SUPABASE_URL`             | URL del proyecto (para E2E)                                |
| `SUPABASE_ANON_KEY`        | Anon key pública (para E2E)                                |
| `SUPABASE_ACCESS_TOKEN`    | Token personal de Supabase CLI (opcional, para `db lint`)  |
| `SUPABASE_PROJECT_ID`      | Ref del proyecto (opcional, para `db lint`)                |
| `SUPABASE_DB_PASSWORD`     | Password de la BD (opcional, para `db lint`)               |
| `E2E_LOW_PRIV_EMAIL`       | Usuario de prueba sin privilegios (opcional)               |
| `E2E_LOW_PRIV_PASSWORD`    | Contraseña del usuario de prueba (opcional)                |

Los secrets `SUPABASE_ACCESS_TOKEN` / `SUPABASE_PROJECT_ID` /
`SUPABASE_DB_PASSWORD` solo son necesarios si quieres que el paso de
`db lint` corra contra el proyecto real. Sin ellos, el job emite un
warning y se salta esa validación (las otras dos siguen ejecutándose).

## Añadir una nueva prueba RLS

1. Crea `supabase/tests/rls/07_<nombre>.sql` siguiendo el patrón:

    ```sql
    BEGIN;
    \i supabase/tests/rls/_helpers.sql
    SELECT pg_temp.become_authenticated('<uuid>'::uuid);
    -- ... asserts
    ROLLBACK;
    ```

2. Añádelo al orquestador `supabase/tests/rls/run_all.sql`.

## Añadir una nueva tabla auditada

1. Crea una migración con:

    ```sql
    DROP TRIGGER IF EXISTS trg_audit_<tabla> ON public.<tabla>;
    CREATE TRIGGER trg_audit_<tabla>
      AFTER INSERT OR UPDATE OR DELETE ON public.<tabla>
      FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change();
    ```

2. Añade un caso al test RLS correspondiente.
