# Pruebas RLS por rol

Suite de pruebas SQL que valida que las Row-Level Security policies bloquean o permiten el acceso
esperado para cada rol de la aplicación (anon, authenticated sin rol, admin, super_admin, pastor,
tesoreria, seminario_estudiante, etc.).

## Cómo funciona

Cada archivo `*.sql` usa el patrón:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
-- ... queries que deben fallar o devolver 0 filas
ROLLBACK;
```

Esto es equivalente a lo que hace PostgREST cuando un usuario autenticado llega al Data API:
Postgres evalúa `auth.uid()` a partir de `request.jwt.claims->>'sub'` y aplica las policies.

Las pruebas se ejecutan con `psql`, dentro de una transacción que hace `ROLLBACK` — ninguna prueba
deja datos ni cambios en la BD.

## Ejecutar localmente

```bash
export SUPABASE_DB_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres"
bun run test:rls
```

O directamente:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls/run_all.sql
```

## Ejecutar en CI

El workflow `.github/workflows/security.yml` corre estas pruebas en cada push/PR. Requiere el
secret de GitHub Actions `SUPABASE_DB_URL` con la cadena de conexión de la base de datos.
