#!/usr/bin/env bash
# ==============================================================================
# IMPORTACIÓN A TU SUPABASE PROPIO (destino de la migración)
# ==============================================================================
# Requisito previo: haber descargado "migracion_completa.sql" desde la app
# (Configuración → Migración Completa → Opción 1: Descargar SQL).
#
# Uso:
#   export TARGET_DB_URL="postgresql://postgres.[TU_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
#   ./scripts/import-to-supabase.sh ./migracion_completa.sql
# ==============================================================================

set -euo pipefail

SQL_FILE="${1:-./migracion_completa.sql}"

if [ -z "${TARGET_DB_URL:-}" ]; then
  echo "❌ Error: define TARGET_DB_URL con el Connection String (URI) de tu NUEVO Supabase."
  echo "   Lo encuentras en tu nuevo proyecto: Project Settings → Database → Connection string → URI"
  echo '   Ejemplo: export TARGET_DB_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"'
  exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Error: no se encontró el archivo $SQL_FILE"
  echo "   Descárgalo primero desde la app: Configuración → Migración Completa → Descargar migracion_completa.sql"
  exit 1
fi

echo "=================================================================="
echo "Importando $SQL_FILE en tu nuevo Supabase..."
echo "=================================================================="

# ON_ERROR_STOP=1 detiene la importación ante el primer error real.
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"

echo "=================================================================="
echo "✅ Importación completada."
echo "=================================================================="
echo "Verificación rápida (conteo de tablas y filas principales):"
psql "$TARGET_DB_URL" -c "SELECT count(*) AS tablas FROM information_schema.tables WHERE table_schema = 'public';"
psql "$TARGET_DB_URL" -c "SELECT count(*) AS usuarios FROM auth.users;"
