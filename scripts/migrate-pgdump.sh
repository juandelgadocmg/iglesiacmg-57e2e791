#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE MIGRACIÓN COMPLETA CON PG_DUMP: LOVABLE CLOUD -> SUPABASE PROPIO
# ==============================================================================
# Requisitos:
#   - Tener instalado postgresql-client (pg_dump y psql v15+)
#   - Definir SOURCE_DB_URL (y opcionalmente TARGET_DB_URL)
# ==============================================================================

set -euo pipefail

if [ -z "${SOURCE_DB_URL:-}" ]; then
  echo "❌ Error: Debes definir la variable de entorno SOURCE_DB_URL"
  echo "Ejemplo:"
  echo '  export SOURCE_DB_URL="postgresql://postgres:[PASSWORD]@db.bxqichxpvnlofqsjdcdg.supabase.co:5432/postgres"'
  exit 1
fi

BACKUP_DIR="./supabase_backup"
mkdir -p "$BACKUP_DIR"

echo "=================================================================="
echo "1/3 Exportando ESQUEMA COMPLETO (Tablas, Tipos, Funciones, Triggers y Políticas RLS)..."
echo "=================================================================="
pg_dump "$SOURCE_DB_URL" \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_DIR/01_schema.sql"

echo "✅ Esquema guardado en $BACKUP_DIR/01_schema.sql"

echo "=================================================================="
echo "2/3 Exportando USUARIOS E IDENTIDADES (auth.users y auth.identities con hashes)..."
echo "=================================================================="
{
  echo "SET session_replication_role = 'replica';"
  pg_dump "$SOURCE_DB_URL" \
    --data-only \
    --no-owner \
    --no-privileges \
    --column-inserts \
    --on-conflict-do-nothing \
    --table="auth.users" \
    --table="auth.identities"
  echo "SET session_replication_role = 'origin';"
} > "$BACKUP_DIR/02_auth_users.sql"

echo "✅ Usuarios exportados en $BACKUP_DIR/02_auth_users.sql"

echo "=================================================================="
echo "3/3 Exportando TODOS LOS DATOS DE LAS TABLAS PÚBLICAS (public.*)..."
echo "=================================================================="
{
  echo "SET session_replication_role = 'replica';"
  pg_dump "$SOURCE_DB_URL" \
    --schema=public \
    --data-only \
    --no-owner \
    --no-privileges \
    --column-inserts \
    --on-conflict-do-nothing
  echo "SET session_replication_role = 'origin';"
} > "$BACKUP_DIR/03_public_data.sql"

echo "✅ Datos públicos exportados en $BACKUP_DIR/03_public_data.sql"

# Si se proporcionó TARGET_DB_URL, importar automáticamente en orden seguro
if [ -n "${TARGET_DB_URL:-}" ]; then
  echo "=================================================================="
  echo "🚀 Restaurando en el nuevo servidor de Supabase (TARGET_DB_URL)..."
  echo "=================================================================="
  psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$BACKUP_DIR/01_schema.sql"
  psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$BACKUP_DIR/02_auth_users.sql"
  psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$BACKUP_DIR/03_public_data.sql"
  echo "🎉 ¡Migración completada exitosamente!"
else
  echo ""
  echo "🎉 Exportación finalizada en el directorio $BACKUP_DIR/"
  echo "Para importar en tu nuevo Supabase ejecuta:"
  echo '  psql "$TARGET_DB_URL" -f ./supabase_backup/01_schema.sql'
  echo '  psql "$TARGET_DB_URL" -f ./supabase_backup/02_auth_users.sql'
  echo '  psql "$TARGET_DB_URL" -f ./supabase_backup/03_public_data.sql'
fi

