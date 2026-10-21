#!/usr/bin/env node
/**
 * ============================================================================
 * SCRIPT DE MIGRACIÓN COMPLETA: LOVABLE CLOUD -> SUPABASE PROPIO (Node.js + pg)
 * ============================================================================
 * Extrae de la base de datos origen (Lovable Cloud):
 *   1. Esquema completo (ENUMs, Secuencias, Tablas, Funciones, Triggers, Vistas y Políticas RLS)
 *   2. Usuarios e Identidades (auth.users y auth.identities con hashes bcrypt intactos)
 *   3. Todos los datos de las tablas públicas (public.*) y buckets de Storage
 *
 * Y genera los archivos SQL listos en ./supabase_backup/ (y opcionalmente los
 * aplica directamente en tu nuevo servidor Supabase si defines TARGET_DB_URL).
 *
 * Uso:
 *   npm install pg dotenv
 *   SOURCE_DB_URL="postgresql://..." node scripts/migrate-from-lovable.mjs
 *
 *   # Para exportar Y restaurar automáticamente en el nuevo Supabase:
 *   SOURCE_DB_URL="postgresql://..." TARGET_DB_URL="postgresql://..." node scripts/migrate-from-lovable.mjs
 * ============================================================================
 */

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const SOURCE_DB_URL = process.env.SOURCE_DB_URL;
const TARGET_DB_URL = process.env.TARGET_DB_URL;
const OUTPUT_DIR = path.resolve(process.cwd(), "supabase_backup");

if (!SOURCE_DB_URL) {
  console.error("\x1b[31m[ERROR] Falta la variable de entorno SOURCE_DB_URL.\x1b[0m");
  console.error(
    'Ejemplo:\n  SOURCE_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" node scripts/migrate-from-lovable.mjs'
  );
  process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * Escapa un valor JS a literal SQL seguro para PostgreSQL
 */
function toSqlLiteral(val, udtName = "", dataType = "") {
  if (val === null || val === undefined) return "NULL";

  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return Number.isFinite(val) ? String(val) : "NULL";

  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }

  // JSON / JSONB
  if (udtName === "json" || udtName === "jsonb" || dataType === "json" || dataType === "jsonb") {
    const jsonStr = typeof val === "string" ? val : JSON.stringify(val);
    return `'${jsonStr.replace(/'/g, "''")}'::${udtName || "jsonb"}`;
  }

  // Arrays de PostgreSQL (udt_name empieza con '_' en information_schema, ej. '_text', '_uuid')
  if (Array.isArray(val)) {
    const baseType = udtName.startsWith("_") ? udtName.slice(1) : "text";
    if (val.length === 0) {
      return `'{}'::${baseType}[]`;
    }
    const items = val.map((item) => {
      if (item === null || item === undefined) return "NULL";
      if (typeof item === "object") {
        return `'${JSON.stringify(item).replace(/'/g, "''")}'`;
      }
      return `'${String(item).replace(/'/g, "''")}'`;
    });
    return `ARRAY[${items.join(", ")}]::${baseType}[]`;
  }

  if (typeof val === "object") {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }

  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Obtiene las columnas insertables de una tabla (excluyendo columnas GENERATED ALWAYS)
 */
async function getInsertableColumns(client, schemaName, tableName) {
  const { rows } = await client.query(
    `
    SELECT
      c.column_name,
      c.data_type,
      c.udt_name,
      c.is_generated,
      a.attgenerated
    FROM information_schema.columns c
    JOIN pg_catalog.pg_namespace n ON n.nspname = c.table_schema
    JOIN pg_catalog.pg_class cl ON cl.relnamespace = n.oid AND cl.relname = c.table_name
    JOIN pg_catalog.pg_attribute a ON a.attrelid = cl.oid AND a.attname = c.column_name
    WHERE c.table_schema = $1
      AND c.table_name = $2
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY c.ordinal_position;
    `,
    [schemaName, tableName]
  );

  // Excluir columnas generadas automáticamente (ej. auth.users.confirmed_at, auth.identities.email)
  return rows.filter(
    (col) => col.is_generated !== "ALWAYS" && (!col.attgenerated || col.attgenerated === "")
  );
}

/**
 * 1. EXPORTAR ESQUEMA COMPLETO (Tipos ENUM, Tablas, Funciones, Vistas, Políticas RLS y Triggers)
 */
async function exportSchema(client) {
  console.log("⏳ [1/3] Extrayendo esquema completo (ENUMs, Tablas, Funciones, Triggers y Políticas RLS)...");
  const lines = [];

  lines.push("-- ============================================================================");
  lines.push("-- 01_SCHEMA.SQL - ESTRUCTURA COMPLETA DEL PROYECTO");
  lines.push(`-- Generado el: ${new Date().toISOString()}`);
  lines.push("-- ============================================================================\n");
  lines.push("SET statement_timeout = 0;");
  lines.push("SET client_encoding = 'UTF8';");
  lines.push("SET standard_conforming_strings = on;");
  lines.push("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";");
  lines.push("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";\n");

  // 1.1 Tipos ENUM personalizados en public
  const { rows: enums } = await client.query(`
    SELECT
      t.typname AS enum_name,
      array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname;
  `);

  if (enums.length > 0) {
    lines.push("-- ----------------------------------------------------------------------------");
    lines.push("-- 1. TIPOS ENUM PERSONALIZADOS");
    lines.push("-- ----------------------------------------------------------------------------");
    for (const en of enums) {
      const vals = en.enum_values.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(", ");
      lines.push(`DO $$ BEGIN
  CREATE TYPE public.${ pg.Client.prototype.escapeIdentifier ? client.escapeIdentifier(en.enum_name) : `"${en.enum_name}"` } AS ENUM (${vals});
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;\n`);
    }
  }

  // 1.2 Secuencias en public
  const { rows: sequences } = await client.query(`
    SELECT sequence_name, start_value, minimum_value, maximum_value, increment
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
    ORDER BY sequence_name;
  `);

  if (sequences.length > 0) {
    lines.push("-- ----------------------------------------------------------------------------");
    lines.push("-- 2. SECUENCIAS");
    lines.push("-- ----------------------------------------------------------------------------");
    for (const seq of sequences) {
      lines.push(
        `CREATE SEQUENCE IF NOT EXISTS public."${seq.sequence_name}" INCREMENT ${seq.increment} MINVALUE ${seq.minimum_value} MAXVALUE ${seq.maximum_value} START ${seq.start_value};`
      );
    }
    lines.push("");
  }

  // 1.3 Tablas públicas (columnas y tipos exactos desde pg_attribute)
  const { rows: tables } = await client.query(`
    SELECT c.relname AS table_name, c.oid AS table_oid, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `);

  lines.push("-- ----------------------------------------------------------------------------");
  lines.push("-- 3. TABLAS PÚBLICAS");
  lines.push("-- ----------------------------------------------------------------------------");

  for (const tbl of tables) {
    const { rows: cols } = await client.query(
      `
      SELECT
        a.attname AS column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS formatted_type,
        a.attnotnull AS not_null,
        a.attgenerated AS generated_kind,
        pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS column_default
      FROM pg_catalog.pg_attribute a
      LEFT JOIN pg_catalog.pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid, d.adnum)
      WHERE a.attrelid = $1
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum;
      `,
      [tbl.table_oid]
    );

    const colDefs = cols.map((col) => {
      let def = `  "${col.column_name}" ${col.formatted_type}`;
      if (col.generated_kind === "s" && col.column_default) {
        def += ` GENERATED ALWAYS AS (${col.column_default}) STORED`;
      } else if (col.column_default !== null && col.column_default !== undefined) {
        def += ` DEFAULT ${col.column_default}`;
      }
      if (col.not_null) {
        def += " NOT NULL";
      }
      return def;
    });

    lines.push(`CREATE TABLE IF NOT EXISTS public."${tbl.table_name}" (\n${colDefs.join(",\n")}\n);\n`);
  }

  // 1.4 Primary Keys, Unique Constraints y Check Constraints (antes de Foreign Keys)
  const { rows: pksAndUniques } = await client.query(`
    SELECT
      cl.relname AS table_name,
      con.conname AS constraint_name,
      con.contype AS constraint_type,
      pg_get_constraintdef(con.oid, true) AS constraint_def
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname = 'public'
      AND con.contype IN ('p', 'u', 'c')
    ORDER BY
      CASE con.contype WHEN 'p' THEN 1 WHEN 'u' THEN 2 ELSE 3 END,
      cl.relname,
      con.conname;
  `);

  if (pksAndUniques.length > 0) {
    lines.push("-- ----------------------------------------------------------------------------");
    lines.push("-- 4. PRIMARY KEYS, UNIQUE Y CHECK CONSTRAINTS");
    lines.push("-- ----------------------------------------------------------------------------");
    for (const c of pksAndUniques) {
      lines.push(`DO $$ BEGIN
  ALTER TABLE public."${c.table_name}" ADD CONSTRAINT "${c.constraint_name}" ${c.constraint_def};
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;`);
    }
    lines.push("");
  }

  // 1.5 Foreign Keys
  const { rows: fks } = await client.query(`
    SELECT
      cl.relname AS table_name,
      con.conname AS constraint_name,
      pg_get_constraintdef(con.oid, true) AS constraint_def
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname = 'public'
      AND con.contype = 'f'
    ORDER BY cl.relname, con.conname;
  `);

  if (fks.length > 0) {
    lines.push("-- ----------------------------------------------------------------------------");
    lines.push("-- 5. FOREIGN KEYS");
    lines.push("-- ----------------------------------------------------------------------------");
    for (const fk of fks) {
      lines.push(`DO $$ BEGIN
  ALTER TABLE public."${fk.table_name}" ADD CONSTRAINT "${fk.constraint_name}" ${fk.constraint_def};
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`);
    }
    lines.push("");
  }

  // 1.6 Índices secundarios en public
  const { rows: indexes } = await client.query(`
    SELECT indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname NOT IN (
        SELECT conname FROM pg_constraint con
        JOIN pg_namespace n ON n.oid = con.connamespace
        WHERE n.nspname = 'public'
      )
    ORDER BY tablename, indexname;
  `);

  if (indexes.length > 0) {
    lines.push("-- ----------------------------------------------------------------------------");
    lines.push("-- 6. ÍNDICES");
    lines.push("-- ----------------------------------------------------------------------------");
    for (const idx of indexes) {
      const safeIdx = idx.indexdef.replace(/^CREATE INDEX /i, "CREATE INDEX IF NOT EXISTS ").replace(
        /^CREATE UNIQUE INDEX /i,
        "CREATE UNIQUE INDEX IF NOT EXISTS "
      );
      lines.push(`${safeIdx};`);
    }
    lines.push("");
  }

  // 1.7 Vistas en public
  const { rows: views } = await client.query(`
    SELECT table_name, view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  if (views.length > 0) {
    lines.push("-- ----------------------------------------------------------------------------");
    lines.push("-- 7. VISTAS");
    lines.push("-- ----------------------------------------------------------------------------");
    for (const v of views) {
      lines.push(`CREATE OR REPLACE VIEW public."${v.table_name}" AS\n${v.view_definition};\n`);
    }
  }

  // 1.8 Funciones y Procedimientos (RPCs, Trigger functions, Helpers RLS)
  const { rows: funcs } = await client.query(`
    SELECT
      p.proname AS func_name,
      pg_get_functiondef(p.oid) AS func_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND d.objid IS NULL
    ORDER BY p.proname;
  `);

  if (funcs.length > 0) {
    lines.push("-- ----------------------------------------------------------------------------");
    lines.push("-- 8. FUNCIONES Y PROCEDIMIENTOS (RPCs Y TRIGGERS)");
    lines.push("-- ----------------------------------------------------------------------------");
    for (const fn of funcs) {
      lines.push(`${fn.func_def};\n`);
    }
  }

  // 1.9 Triggers (en public y en auth.users como on_auth_user_created)
  const { rows: triggers } = await client.query(`
    SELECT
      n.nspname AS table_schema,
      c.relname AS table_name,
      t.tgname AS trigger_name,
      pg_get_triggerdef(t.oid, true) AS trigger_def
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND (
        n.nspname = 'public'
        OR (n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_created')
      )
    ORDER BY n.nspname, c.relname, t.tgname;
  `);

  if (triggers.length > 0) {
    lines.push("-- ----------------------------------------------------------------------------");
    lines.push("-- 9. TRIGGERS");
    lines.push("-- ----------------------------------------------------------------------------");
    for (const tg of triggers) {
      lines.push(`DROP TRIGGER IF EXISTS "${tg.trigger_name}" ON "${tg.table_schema}"."${tg.table_name}";`);
      lines.push(`${tg.trigger_def};\n`);
    }
  }

  // 1.10 Row Level Security (RLS) y Políticas
  lines.push("-- ----------------------------------------------------------------------------");
  lines.push("-- 10. ROW LEVEL SECURITY (RLS) Y POLÍTICAS");
  lines.push("-- ----------------------------------------------------------------------------");

  for (const tbl of tables) {
    if (tbl.relrowsecurity) {
      lines.push(`ALTER TABLE public."${tbl.table_name}" ENABLE ROW LEVEL SECURITY;`);
    }
    if (tbl.relforcerowsecurity) {
      lines.push(`ALTER TABLE public."${tbl.table_name}" FORCE ROW LEVEL SECURITY;`);
    }
  }
  lines.push("");

  const { rows: policies } = await client.query(`
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
    ORDER BY schemaname, tablename, policyname;
  `);

  for (const pol of policies) {
    const roleList = Array.isArray(pol.roles)
      ? pol.roles.join(", ")
      : String(pol.roles).replace(/^\{|\}$/g, "");
    let stmt = `DROP POLICY IF EXISTS "${pol.policyname}" ON "${pol.schemaname}"."${pol.tablename}";\n`;
    stmt += `CREATE POLICY "${pol.policyname}" ON "${pol.schemaname}"."${pol.tablename}"\n`;
    stmt += `  AS ${pol.permissive}\n`;
    stmt += `  FOR ${pol.cmd}\n`;
    stmt += `  TO ${roleList}`;
    if (pol.qual) {
      stmt += `\n  USING (${pol.qual})`;
    }
    if (pol.with_check) {
      stmt += `\n  WITH CHECK (${pol.with_check})`;
    }
    stmt += ";\n";
    lines.push(stmt);
  }

  // 1.11 Permisos estándar de Supabase para roles anon, authenticated y service_role
  lines.push("-- ----------------------------------------------------------------------------");
  lines.push("-- 11. GRANTS PARA ROLES DE SUPABASE (anon, authenticated, service_role)");
  lines.push("-- ----------------------------------------------------------------------------");
  lines.push("GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;");
  lines.push("GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;");
  lines.push("GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;");
  lines.push("GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;\n");

  const schemaSql = lines.join("\n");
  const filePath = path.join(OUTPUT_DIR, "01_schema.sql");
  fs.writeFileSync(filePath, schemaSql, "utf8");
  console.log(`✅ Esquema exportado en: ${filePath}`);
  return schemaSql;
}

/**
 * 2. EXPORTAR USUARIOS E IDENTIDADES (auth.users y auth.identities con hashes de contraseña)
 */
async function exportAuthUsers(client) {
  console.log("⏳ [2/3] Extrayendo usuarios e identidades (auth.users y auth.identities)...");
  const lines = [];

  lines.push("-- ============================================================================");
  lines.push("-- 02_AUTH_USERS.SQL - USUARIOS E IDENTIDADES DE SUPABASE AUTH");
  lines.push(`-- Generado el: ${new Date().toISOString()}`);
  lines.push("-- Conserva encrypted_password (hashes bcrypt originales) e identidades OAuth");
  lines.push("-- ============================================================================\n");
  lines.push("SET session_replication_role = 'replica';\n");

  for (const tableName of ["users", "identities"]) {
    const cols = await getInsertableColumns(client, "auth", tableName);
    if (cols.length === 0) continue;

    const colNamesSql = cols.map((c) => `"${c.column_name}"`).join(", ");
    const { rows } = await client.query(`SELECT ${colNamesSql} FROM auth."${tableName}" ORDER BY created_at ASC NULLS LAST;`);

    lines.push(`-- Tabla: auth.${tableName} (${rows.length} registros)`);
    for (const row of rows) {
      const vals = cols.map((c) => toSqlLiteral(row[c.column_name], c.udt_name, c.data_type));
      lines.push(
        `INSERT INTO auth."${tableName}" (${colNamesSql}) VALUES (${vals.join(", ")}) ON CONFLICT DO NOTHING;`
      );
    }
    lines.push("");
  }

  lines.push("SET session_replication_role = 'origin';\n");

  const authSql = lines.join("\n");
  const filePath = path.join(OUTPUT_DIR, "02_auth_users.sql");
  fs.writeFileSync(filePath, authSql, "utf8");
  console.log(`✅ Usuarios e identidades exportados en: ${filePath}`);
  return authSql;
}

/**
 * 3. EXPORTAR TODOS LOS DATOS DE LAS TABLAS PÚBLICAS Y BUCKETS DE STORAGE
 */
async function exportPublicData(client) {
  console.log("⏳ [3/3] Extrayendo todos los datos de las tablas públicas (public.*)...");
  const lines = [];

  lines.push("-- ============================================================================");
  lines.push("-- 03_PUBLIC_DATA.SQL - DATOS COMPLETOS DE TABLAS PÚBLICAS Y STORAGE BUCKETS");
  lines.push(`-- Generado el: ${new Date().toISOString()}`);
  lines.push("-- ============================================================================\n");
  lines.push("SET session_replication_role = 'replica';\n");

  // 3.1 Buckets de Storage (si existen)
  try {
    const bucketCols = await getInsertableColumns(client, "storage", "buckets");
    if (bucketCols.length > 0) {
      const colNamesSql = bucketCols.map((c) => `"${c.column_name}"`).join(", ");
      const { rows: buckets } = await client.query(`SELECT ${colNamesSql} FROM storage.buckets;`);
      if (buckets.length > 0) {
        lines.push(`-- Storage Buckets (${buckets.length} registros)`);
        for (const b of buckets) {
          const vals = bucketCols.map((c) => toSqlLiteral(b[c.column_name], c.udt_name, c.data_type));
          lines.push(
            `INSERT INTO storage.buckets (${colNamesSql}) VALUES (${vals.join(", ")}) ON CONFLICT (id) DO NOTHING;`
          );
        }
        lines.push("");
      }
    }
  } catch {
    // Ignorar si el esquema storage no está accesible
  }

  // 3.2 Datos de todas las tablas en public
  const { rows: tables } = await client.query(`
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `);

  let totalRows = 0;

  for (const tbl of tables) {
    const cols = await getInsertableColumns(client, "public", tbl.table_name);
    if (cols.length === 0) continue;

    const colNamesSql = cols.map((c) => `"${c.column_name}"`).join(", ");
    const { rows } = await client.query(`SELECT ${colNamesSql} FROM public."${tbl.table_name}";`);

    lines.push(`-- Tabla: public.${tbl.table_name} (${rows.length} registros)`);
    for (const row of rows) {
      const vals = cols.map((c) => toSqlLiteral(row[c.column_name], c.udt_name, c.data_type));
      lines.push(
        `INSERT INTO public."${tbl.table_name}" (${colNamesSql}) VALUES (${vals.join(", ")}) ON CONFLICT DO NOTHING;`
      );
      totalRows++;
    }
    lines.push("");
  }

  // 3.3 Actualizar el valor actual de todas las secuencias en public
  const { rows: sequences } = await client.query(`
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public';
  `);

  if (sequences.length > 0) {
    lines.push("-- Actualizar contadores de secuencias");
    for (const seq of sequences) {
      const { rows: seqVal } = await client.query(
        `SELECT last_value, is_called FROM public."${seq.sequence_name}";`
      );
      if (seqVal[0]) {
        lines.push(
          `SELECT pg_catalog.setval('public."${seq.sequence_name}"', ${seqVal[0].last_value}, ${seqVal[0].is_called});`
        );
      }
    }
    lines.push("");
  }

  lines.push("SET session_replication_role = 'origin';\n");

  const dataSql = lines.join("\n");
  const filePath = path.join(OUTPUT_DIR, "03_public_data.sql");
  fs.writeFileSync(filePath, dataSql, "utf8");
  console.log(`✅ Datos públicos exportados (${totalRows} filas en ${tables.length} tablas) en: ${filePath}`);
  return dataSql;
}

async function main() {
  const sourceClient = new Client({
    connectionString: SOURCE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("🔌 Conectando a la base de datos origen (Lovable Cloud)...");
    await sourceClient.connect();
    console.log("✅ Conexión exitosa al origen.\n");

    const schemaSql = await exportSchema(sourceClient);
    const authSql = await exportAuthUsers(sourceClient);
    const dataSql = await exportPublicData(sourceClient);

    // Generar también un archivo único consolidado en orden exacto de ejecución
    const fullBundlePath = path.join(OUTPUT_DIR, "full_migration_bundle.sql");
    fs.writeFileSync(fullBundlePath, `${schemaSql}\n\n${authSql}\n\n${dataSql}`, "utf8");
    console.log(`\n📦 Paquete consolidado generado en: ${fullBundlePath}`);

    // Si el usuario definió TARGET_DB_URL, aplicar automáticamente al nuevo Supabase
    if (TARGET_DB_URL) {
      console.log("\n🚀 Detectado TARGET_DB_URL. Conectando al nuevo servidor de Supabase para restaurar...");
      const targetClient = new Client({
        connectionString: TARGET_DB_URL,
        ssl: { rejectUnauthorized: false },
      });
      await targetClient.connect();
      try {
        console.log("⏳ [1/3] Aplicando esquema (01_schema.sql)...");
        await targetClient.query(schemaSql);
        console.log("⏳ [2/3] Importando usuarios e identidades (02_auth_users.sql)...");
        await targetClient.query(authSql);
        console.log("⏳ [3/3] Importando datos de tablas públicas (03_public_data.sql)...");
        await targetClient.query(dataSql);
        console.log("🎉 ¡Migración aplicada exitosamente en el servidor de destino!");
      } finally {
        await targetClient.end();
      }
    } else {
      console.log("\nℹ️  Para aplicar estos archivos en tu nuevo Supabase, ejecuta TARGET_DB_URL=... o usa psql.");
    }
  } catch (err) {
    console.error("\x1b[31m❌ Error durante la migración:\x1b[0m", err);
    process.exitCode = 1;
  } finally {
    await sourceClient.end();
  }
}

main();

