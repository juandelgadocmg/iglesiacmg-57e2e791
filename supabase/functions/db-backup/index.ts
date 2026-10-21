// supabase/functions/db-backup/index.ts
//
// Genera un único script SQL con:
//   1) CREATE SCHEMA IF NOT EXISTS auth; y CREATE TABLE IF NOT EXISTS para todas las
//      tablas de los esquemas `public` y `auth` (users, identities, etc.).
//   2) INSERT INTO con todos los registros actuales de cada tabla, con
//      escape de comillas, casting explícito de JSON/JSONB y arreglos, y
//      valores NULL / numéricos / booleanos sin comillas.
//
// Sólo usuarios con rol "admin" o "super_admin" pueden invocar esta función.
// Requiere el connection string interno `SUPABASE_DB_URL` (inyectado
// automáticamente por Supabase en las Edge Functions) para poder leer
// `information_schema` y consultar todas las filas sin el límite de 1000
// filas por request de PostgREST.

import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 2000; // filas leídas por página desde la base de datos
const ROWS_PER_INSERT = 500; // filas agrupadas por sentencia INSERT

interface TableInfo {
  table_schema: string;
  table_name: string;
}

interface ColumnInfo {
  table_schema: string;
  table_name: string;
  column_name: string;
  ordinal_position: number;
  data_type: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function escapeTableIdent(schema: string, name: string): string {
  return `"${schema.replace(/"/g, '""')}"."${name.replace(/"/g, '""')}"`;
}

function escapeStringLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

// Mapea el nombre interno de tipo de PostgreSQL (udt_name) a una
// declaración SQL válida para un CREATE TABLE.
function baseUdtSqlType(
  udtName: string,
  charMaxLen: number | null,
  numPrecision: number | null,
  numScale: number | null,
): string {
  switch (udtName) {
    case "uuid":
      return "UUID";
    case "text":
      return "TEXT";
    case "varchar":
      return charMaxLen ? `VARCHAR(${charMaxLen})` : "VARCHAR";
    case "bpchar":
      return charMaxLen ? `CHAR(${charMaxLen})` : "CHAR";
    case "int2":
      return "SMALLINT";
    case "int4":
      return "INTEGER";
    case "int8":
      return "BIGINT";
    case "float4":
      return "REAL";
    case "float8":
      return "DOUBLE PRECISION";
    case "numeric":
      return numPrecision
        ? `NUMERIC(${numPrecision}${numScale !== null ? `,${numScale}` : ""})`
        : "NUMERIC";
    case "bool":
      return "BOOLEAN";
    case "timestamp":
      return "TIMESTAMP";
    case "timestamptz":
      return "TIMESTAMP WITH TIME ZONE";
    case "date":
      return "DATE";
    case "time":
      return "TIME";
    case "timetz":
      return "TIME WITH TIME ZONE";
    case "jsonb":
      return "JSONB";
    case "json":
      return "JSON";
    case "bytea":
      return "BYTEA";
    case "inet":
      return "INET";
    case "interval":
      return "INTERVAL";
    default:
      return udtName.toUpperCase();
  }
}

function columnSqlType(col: ColumnInfo): string {
  if (col.data_type === "ARRAY") {
    const baseUdt = col.udt_name.startsWith("_")
      ? col.udt_name.slice(1)
      : col.udt_name;
    return `${
      baseUdtSqlType(
        baseUdt,
        col.character_maximum_length,
        col.numeric_precision,
        col.numeric_scale,
      )
    }[]`;
  }
  return baseUdtSqlType(
    col.udt_name,
    col.character_maximum_length,
    col.numeric_precision,
    col.numeric_scale,
  );
}

// Formatea un elemento individual dentro de un arreglo de PostgreSQL
// (literal '{...}'), escapando comillas y barras invertidas.
function formatArrayElement(el: unknown): string {
  if (el === null || el === undefined) return "NULL";
  if (typeof el === "boolean") return el ? "true" : "false";
  if (typeof el === "number" || typeof el === "bigint") return String(el);
  const raw = el instanceof Date
    ? el.toISOString()
    : typeof el === "object"
    ? JSON.stringify(el)
    : String(el);
  const escaped = raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

// Formatea el valor de una celda según el tipo real de columna (no según
// el tipo runtime de JS), para garantizar el casting correcto en el SQL
// generado: NULL sin comillas, números/booleanos sin comillas, JSON/JSONB
// con casting explícito, arreglos con casting explícito, y el resto
// (texto, fechas, UUID) entre comillas simples con el escape de comillas
// internas.
function formatValue(value: unknown, col: ColumnInfo): string {
  if (value === null || value === undefined) return "NULL";

  if (col.data_type === "ARRAY") {
    const arr = Array.isArray(value) ? value : [];
    const literal = `{${arr.map(formatArrayElement).join(",")}}`;
    return `${escapeStringLiteral(literal)}::${columnSqlType(col)}`;
  }

  if (col.udt_name === "jsonb" || col.udt_name === "json") {
    const json = JSON.stringify(value);
    return `${escapeStringLiteral(json)}::${col.udt_name}`;
  }

  if (col.udt_name === "bool") {
    return value ? "true" : "false";
  }

  const numericUdt = ["int2", "int4", "int8", "float4", "float8", "numeric"];
  if (numericUdt.includes(col.udt_name)) {
    return String(value);
  }

  if (col.udt_name === "bytea") {
    const hex = value instanceof Uint8Array
      ? Array.from(value).map((b) => b.toString(16).padStart(2, "0")).join("")
      : String(value).replace(/^\\x/, "");
    return `'\\x${hex}'`;
  }

  if (value instanceof Date) {
    return escapeStringLiteral(value.toISOString());
  }

  return escapeStringLiteral(String(value));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const dbUrl = Deno.env.get("SUPABASE_DB_URL") || Deno.env.get("DATABASE_URL");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse(
      { error: "Configuración incompleta del servidor (faltan variables de entorno)" },
      500,
    );
  }

  // --- Autenticación y autorización: sólo admin / super_admin ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "No autorizado" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | null = null;
  try {
    const { data: claimsData } = await (callerClient.auth as any).getClaims?.(token) || {};
    if (claimsData?.claims?.sub) {
      userId = claimsData.claims.sub as string;
    }
  } catch {
    // fallback a getUser
  }

  if (!userId) {
    const { data: { user: caller } } = await callerClient.auth.getUser();
    userId = caller?.id || null;
  }

  if (!userId) {
    return jsonResponse({ error: "No autorizado" }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerRoles } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const isAdmin = (callerRoles || []).some(
    (r: { role: string }) => r.role === "admin" || r.role === "super_admin",
  );
  if (!isAdmin) {
    return jsonResponse(
      { error: "Acceso denegado. Se requiere rol de administrador." },
      403,
    );
  }

  if (!dbUrl) {
    return jsonResponse(
      { error: "Falta la variable de entorno SUPABASE_DB_URL en la Edge Function." },
      500,
    );
  }

  // --- Conexión directa a Postgres para introspección y lectura completa ---
  const sql = postgres(dbUrl, { prepare: false });

  let bodyPayload: { targetDbUrl?: string } = {};
  try {
    const text = await req.text();
    if (text) bodyPayload = JSON.parse(text);
  } catch {
    // Sin body JSON
  }

  try {
    const out: string[] = [];
    out.push("-- ============================================================");
    out.push("-- MIGRACIÓN COMPLETA DE LOVABLE CLOUD A SUPABASE INDEPENDIENTE");
    out.push(`-- Generado automáticamente el ${new Date().toISOString()}`);
    out.push("-- Incluye: ENUMs, Secuencias, Tablas, Constraints, Índices,");
    out.push("-- Vistas, Funciones RPC, Triggers, Políticas RLS,");
    out.push("-- Usuarios (auth.users + auth.identities con hashes de clave)");
    out.push("-- y todos los datos de las tablas públicas.");
    out.push("-- ============================================================");
    out.push("");
    out.push("SET statement_timeout = 0;");
    out.push("SET client_min_messages TO WARNING;");
    out.push("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";");
    out.push("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";");
    out.push("");

    // -------------------------------------------------------------------------
    // 1. TIPOS ENUM PERSONALIZADOS EN PUBLIC
    // -------------------------------------------------------------------------
    const enums = await sql<{ enum_name: string; enum_values: string[] }[]>`
      SELECT
        t.typname AS enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname
    `;

    if (enums.length > 0) {
      out.push("-- ------------------------------------------------------------");
      out.push("-- 1. TIPOS ENUM PERSONALIZADOS");
      out.push("-- ------------------------------------------------------------");
      for (const en of enums) {
        const vals = (en.enum_values || []).map((v) => escapeStringLiteral(String(v))).join(", ");
        out.push(`DO $$ BEGIN
  CREATE TYPE public.${escapeIdent(en.enum_name)} AS ENUM (${vals});
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`);
      }
      out.push("");
    }

    // -------------------------------------------------------------------------
    // 2. SECUENCIAS EN PUBLIC
    // -------------------------------------------------------------------------
    const sequences = await sql<{
      sequence_name: string;
      start_value: string;
      minimum_value: string;
      maximum_value: string;
      increment: string;
    }[]>`
      SELECT sequence_name, start_value, minimum_value, maximum_value, increment
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name
    `;

    if (sequences.length > 0) {
      out.push("-- ------------------------------------------------------------");
      out.push("-- 2. SECUENCIAS");
      out.push("-- ------------------------------------------------------------");
      for (const seq of sequences) {
        out.push(
          `CREATE SEQUENCE IF NOT EXISTS public.${escapeIdent(seq.sequence_name)} INCREMENT ${seq.increment} MINVALUE ${seq.minimum_value} MAXVALUE ${seq.maximum_value} START ${seq.start_value};`,
        );
      }
      out.push("");
    }

    // -------------------------------------------------------------------------
    // 3. ESTRUCTURA DE TABLAS PÚBLICAS
    // -------------------------------------------------------------------------
    const publicTables = await sql<{
      table_name: string;
      table_oid: number;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }[]>`
      SELECT c.relname AS table_name, c.oid::int AS table_oid, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname
    `;

    out.push("-- ------------------------------------------------------------");
    out.push("-- 3. TABLAS PÚBLICAS");
    out.push("-- ------------------------------------------------------------");

    for (const tbl of publicTables) {
      const attrCols = await sql<{
        column_name: string;
        formatted_type: string;
        not_null: boolean;
        generated_kind: string;
        column_default: string | null;
      }[]>`
        SELECT
          a.attname AS column_name,
          pg_catalog.format_type(a.atttypid, a.atttypmod) AS formatted_type,
          a.attnotnull AS not_null,
          a.attgenerated AS generated_kind,
          pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS column_default
        FROM pg_catalog.pg_attribute a
        LEFT JOIN pg_catalog.pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid, d.adnum)
        WHERE a.attrelid = ${tbl.table_oid}
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY a.attnum
      `;

      const colDefs = attrCols.map((col) => {
        let def = `  ${escapeIdent(col.column_name)} ${col.formatted_type}`;
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

      out.push(`CREATE TABLE IF NOT EXISTS public.${escapeIdent(tbl.table_name)} (`);
      out.push(colDefs.join(",\n"));
      out.push(");");
      out.push("");
    }

    // -------------------------------------------------------------------------
    // 4. CONSTRAINTS (PRIMARY KEY, UNIQUE, CHECK, FOREIGN KEY) E ÍNDICES
    // -------------------------------------------------------------------------
    const constraints = await sql<{
      table_name: string;
      constraint_name: string;
      contype: string;
      constraint_def: string;
    }[]>`
      SELECT
        cl.relname AS table_name,
        con.conname AS constraint_name,
        con.contype AS contype,
        pg_get_constraintdef(con.oid, true) AS constraint_def
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = cl.relnamespace
      WHERE n.nspname = 'public'
        AND con.contype IN ('p', 'u', 'c', 'f')
      ORDER BY
        CASE con.contype WHEN 'p' THEN 1 WHEN 'u' THEN 2 WHEN 'c' THEN 3 ELSE 4 END,
        cl.relname,
        con.conname
    `;

    if (constraints.length > 0) {
      out.push("-- ------------------------------------------------------------");
      out.push("-- 4. CONSTRAINTS (PK, UNIQUE, CHECK, FK)");
      out.push("-- ------------------------------------------------------------");
      for (const c of constraints) {
        out.push(`DO $$ BEGIN
  ALTER TABLE public.${escapeIdent(c.table_name)} ADD CONSTRAINT ${escapeIdent(c.constraint_name)} ${c.constraint_def};
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $$;`);
      }
      out.push("");
    }

    const indexes = await sql<{ indexdef: string }[]>`
      SELECT indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname NOT IN (
          SELECT conname FROM pg_constraint con
          JOIN pg_namespace n ON n.oid = con.connamespace
          WHERE n.nspname = 'public'
        )
      ORDER BY tablename, indexname
    `;

    if (indexes.length > 0) {
      out.push("-- ------------------------------------------------------------");
      out.push("-- 5. ÍNDICES");
      out.push("-- ------------------------------------------------------------");
      for (const idx of indexes) {
        const safeIdx = idx.indexdef
          .replace(/^CREATE INDEX /i, "CREATE INDEX IF NOT EXISTS ")
          .replace(/^CREATE UNIQUE INDEX /i, "CREATE UNIQUE INDEX IF NOT EXISTS ");
        out.push(`${safeIdx};`);
      }
      out.push("");
    }

    // -------------------------------------------------------------------------
    // 5. VISTAS, FUNCIONES RPC Y TRIGGERS
    // -------------------------------------------------------------------------
    const views = await sql<{ table_name: string; view_definition: string }[]>`
      SELECT table_name, view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    if (views.length > 0) {
      out.push("-- ------------------------------------------------------------");
      out.push("-- 6. VISTAS");
      out.push("-- ------------------------------------------------------------");
      for (const v of views) {
        out.push(`CREATE OR REPLACE VIEW public.${escapeIdent(v.table_name)} AS\n${v.view_definition};\n`);
      }
    }

    const funcs = await sql<{ func_name: string; func_def: string }[]>`
      SELECT
        p.proname AS func_name,
        pg_get_functiondef(p.oid) AS func_def
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
      WHERE n.nspname = 'public'
        AND p.prokind IN ('f', 'p')
        AND d.objid IS NULL
      ORDER BY p.proname
    `;

    if (funcs.length > 0) {
      out.push("-- ------------------------------------------------------------");
      out.push("-- 7. FUNCIONES Y PROCEDIMIENTOS (RPCs Y TRIGGERS)");
      out.push("-- ------------------------------------------------------------");
      for (const fn of funcs) {
        out.push(`${fn.func_def};\n`);
      }
    }

    const triggers = await sql<{
      table_schema: string;
      table_name: string;
      trigger_name: string;
      trigger_def: string;
    }[]>`
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
      ORDER BY n.nspname, c.relname, t.tgname
    `;

    if (triggers.length > 0) {
      out.push("-- ------------------------------------------------------------");
      out.push("-- 8. TRIGGERS");
      out.push("-- ------------------------------------------------------------");
      for (const tg of triggers) {
        out.push(`DROP TRIGGER IF EXISTS ${escapeIdent(tg.trigger_name)} ON ${escapeTableIdent(tg.table_schema, tg.table_name)};`);
        out.push(`${tg.trigger_def};\n`);
      }
    }

    // -------------------------------------------------------------------------
    // 6. POLÍTICAS RLS (ROW LEVEL SECURITY) Y PERMISOS
    // -------------------------------------------------------------------------
    out.push("-- ------------------------------------------------------------");
    out.push("-- 9. ROW LEVEL SECURITY (RLS) Y POLÍTICAS");
    out.push("-- ------------------------------------------------------------");
    for (const tbl of publicTables) {
      if (tbl.relrowsecurity) {
        out.push(`ALTER TABLE public.${escapeIdent(tbl.table_name)} ENABLE ROW LEVEL SECURITY;`);
      }
      if (tbl.relforcerowsecurity) {
        out.push(`ALTER TABLE public.${escapeIdent(tbl.table_name)} FORCE ROW LEVEL SECURITY;`);
      }
    }
    out.push("");

    const policies = await sql<{
      schemaname: string;
      tablename: string;
      policyname: string;
      permissive: string;
      roles: string[] | string;
      cmd: string;
      qual: string | null;
      with_check: string | null;
    }[]>`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname IN ('public', 'storage')
      ORDER BY schemaname, tablename, policyname
    `;

    for (const pol of policies) {
      const roleList = Array.isArray(pol.roles)
        ? pol.roles.join(", ")
        : String(pol.roles).replace(/^\{|\}$/g, "");
      let stmt = `DROP POLICY IF EXISTS ${escapeIdent(pol.policyname)} ON ${escapeTableIdent(pol.schemaname, pol.tablename)};\n`;
      stmt += `CREATE POLICY ${escapeIdent(pol.policyname)} ON ${escapeTableIdent(pol.schemaname, pol.tablename)}\n`;
      stmt += `  AS ${pol.permissive}\n`;
      stmt += `  FOR ${pol.cmd}\n`;
      stmt += `  TO ${roleList}`;
      if (pol.qual) stmt += `\n  USING (${pol.qual})`;
      if (pol.with_check) stmt += `\n  WITH CHECK (${pol.with_check})`;
      stmt += ";\n";
      out.push(stmt);
    }

    out.push("GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;");
    out.push("GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;");
    out.push("GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;");
    out.push("GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;\n");

    // -------------------------------------------------------------------------
    // 7. DATOS: USUARIOS AUTH (auth.users, auth.identities) Y TABLAS PÚBLICAS
    // -------------------------------------------------------------------------
    const tables = await sql<TableInfo[]>`
      select table_schema, table_name
      from information_schema.tables
      where (
        table_schema = 'public' 
        or (table_schema = 'auth' and table_name in ('users', 'identities'))
        or (table_schema = 'storage' and table_name in ('buckets'))
      ) and table_type = 'BASE TABLE'
      order by
        case
          when table_schema = 'auth' and table_name = 'users' then 0
          when table_schema = 'auth' then 1
          when table_schema = 'storage' then 2
          else 3
        end,
        table_name
    `;

    // Excluir columnas GENERATED ALWAYS (como auth.users.confirmed_at y auth.identities.email)
    const columns = await sql<(ColumnInfo & { is_generated?: string; attgenerated?: string })[]>`
      select c.table_schema, c.table_name, c.column_name, c.ordinal_position, c.data_type, c.udt_name,
             c.is_nullable, c.character_maximum_length, c.numeric_precision, c.numeric_scale,
             c.is_generated, a.attgenerated
      from information_schema.columns c
      join pg_catalog.pg_namespace n on n.nspname = c.table_schema
      join pg_catalog.pg_class cl on cl.relnamespace = n.oid and cl.relname = c.table_name
      join pg_catalog.pg_attribute a on a.attrelid = cl.oid and a.attname = c.column_name
      where (
        c.table_schema = 'public' 
        or (c.table_schema = 'auth' and c.table_name in ('users', 'identities'))
        or (c.table_schema = 'storage' and c.table_name in ('buckets'))
      )
        and a.attnum > 0
        and not a.attisdropped
        and coalesce(c.is_generated, 'NEVER') <> 'ALWAYS'
        and coalesce(a.attgenerated, '') = ''
      order by c.table_schema, c.table_name, c.ordinal_position
    `;

    const columnsByTable = new Map<string, ColumnInfo[]>();
    for (const c of columns) {
      const key = `${c.table_schema}.${c.table_name}`;
      if (!columnsByTable.has(key)) columnsByTable.set(key, []);
      columnsByTable.get(key)!.push(c);
    }

    out.push("-- ------------------------------------------------------------");
    out.push("-- 10. DATOS (AUTH.USERS, AUTH.IDENTITIES, STORAGE Y PUBLIC)");
    out.push("-- ------------------------------------------------------------");
    out.push("SET session_replication_role = 'replica';");
    out.push("");

    let totalRows = 0;

    for (const t of tables) {
      const key = `${t.table_schema}.${t.table_name}`;
      const cols = columnsByTable.get(key) || [];
      if (cols.length === 0) continue;

      const colNames = cols.map((c) => c.column_name);
      const identCols = colNames.map(escapeIdent).join(", ");
      const tableIdent = escapeTableIdent(t.table_schema, t.table_name);

      let offset = 0;
      let tableRowCount = 0;
      let pendingRows: string[] = [];

      const flushPending = () => {
        if (pendingRows.length === 0) return;
        out.push(`INSERT INTO ${tableIdent} (${identCols}) VALUES`);
        out.push(pendingRows.join(",\n") + "\nON CONFLICT DO NOTHING;");
        out.push("");
        pendingRows = [];
      };

      // deno-lint-ignore no-constant-condition
      while (true) {
        const rows = await sql.unsafe(
          `SELECT ${identCols} FROM ${tableIdent} ORDER BY ctid LIMIT ${BATCH_SIZE} OFFSET ${offset}`,
        );
        if (rows.length === 0) break;

        for (const row of rows as unknown as Record<string, unknown>[]) {
          const vals = cols.map((c) => formatValue(row[c.column_name], c));
          pendingRows.push(`(${vals.join(", ")})`);
          if (pendingRows.length >= ROWS_PER_INSERT) flushPending();
        }

        tableRowCount += rows.length;
        offset += BATCH_SIZE;
        if (rows.length < BATCH_SIZE) break;
      }

      flushPending();
      totalRows += tableRowCount;
      out.push(`-- ${t.table_schema}.${t.table_name}: ${tableRowCount} fila(s)`);
      out.push("");
    }

    out.push("SET session_replication_role = 'origin';");
    out.push("");
    out.push(
      `-- Fin del script. Tablas: ${tables.length} · Filas totales: ${totalRows}`,
    );

    const sqlScript = out.join("\n");

    // Si el usuario envió `targetDbUrl`, ejecutar la migración directamente contra su nuevo Supabase
    if (bodyPayload?.targetDbUrl && bodyPayload.targetDbUrl.trim().startsWith("postgres")) {
      const targetSql = postgres(bodyPayload.targetDbUrl.trim(), { prepare: false, ssl: "require" });
      try {
        await targetSql.unsafe(sqlScript);
      } finally {
        await targetSql.end({ timeout: 5 });
      }
      return jsonResponse(
        {
          success: true,
          tables: tables.length,
          rows: totalRows,
          message: "Migración aplicada directamente en tu nuevo servidor de Supabase.",
        },
        200,
      );
    }

    return new Response(sqlScript, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="migracion_completa.sql"',
      },
    });
  } catch (err) {
    console.error("db-backup error:", err);
    const message = err instanceof Error ? err.message : "Error generando el backup";
    return jsonResponse({ error: message }, 500);
  } finally {
    await sql.end({ timeout: 5 });
  }
});
