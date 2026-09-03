// supabase/functions/db-backup/index.ts
//
// Genera un único script SQL con:
//   1) CREATE TABLE IF NOT EXISTS para todas las tablas del esquema `public`
//      (tipos de datos reales tomados de information_schema, con sus PRIMARY KEY).
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

interface ColumnInfo {
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

  try {
    const tables = await sql<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `;

    if (tables.length === 0) {
      return jsonResponse(
        { error: "No se encontraron tablas en el esquema public." },
        404,
      );
    }

    const columns = await sql<ColumnInfo[]>`
      select table_name, column_name, ordinal_position, data_type, udt_name,
             is_nullable, character_maximum_length, numeric_precision, numeric_scale
      from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position
    `;

    const pkRows = await sql<{ table_name: string; column_name: string }[]>`
      select tc.table_name, kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema = 'public'
      order by tc.table_name, kcu.ordinal_position
    `;

    const columnsByTable = new Map<string, ColumnInfo[]>();
    for (const c of columns) {
      if (!columnsByTable.has(c.table_name)) columnsByTable.set(c.table_name, []);
      columnsByTable.get(c.table_name)!.push(c);
    }
    const pksByTable = new Map<string, string[]>();
    for (const p of pkRows) {
      if (!pksByTable.has(p.table_name)) pksByTable.set(p.table_name, []);
      pksByTable.get(p.table_name)!.push(p.column_name);
    }

    const out: string[] = [];
    out.push("-- ============================================================");
    out.push("-- MIGRACIÓN COMPLETA DE BASE DE DATOS");
    out.push(`-- Generado automáticamente el ${new Date().toISOString()}`);
    out.push("-- Compatible con PostgreSQL. Incluye estructura (CREATE TABLE)");
    out.push("-- y datos (INSERT INTO) de todas las tablas del esquema public.");
    out.push("-- ============================================================");
    out.push("");
    out.push("SET client_min_messages TO WARNING;");
    out.push("BEGIN;");
    out.push("");
    out.push("-- ------------------------------------------------------------");
    out.push("-- 1. ESTRUCTURA");
    out.push("-- ------------------------------------------------------------");
    out.push("");

    for (const t of tables) {
      const cols = columnsByTable.get(t.table_name) || [];
      if (cols.length === 0) continue;
      const pk = pksByTable.get(t.table_name) || [];

      const colDefs = cols.map((c) => {
        const type = columnSqlType(c);
        const notNull = c.is_nullable === "NO" ? " NOT NULL" : "";
        return `  ${escapeIdent(c.column_name)} ${type}${notNull}`;
      });
      if (pk.length > 0) {
        colDefs.push(`  PRIMARY KEY (${pk.map(escapeIdent).join(", ")})`);
      }

      out.push(`CREATE TABLE IF NOT EXISTS ${escapeIdent(t.table_name)} (`);
      out.push(colDefs.join(",\n"));
      out.push(");");
      out.push("");
    }

    out.push("-- ------------------------------------------------------------");
    out.push("-- 2. DATOS");
    out.push("-- ------------------------------------------------------------");
    out.push("-- Se desactivan temporalmente los triggers (incluidas las FK)");
    out.push("-- para poder insertar los datos sin depender del orden entre tablas.");
    out.push("");
    out.push("SET session_replication_role = 'replica';");
    out.push("");

    let totalRows = 0;

    for (const t of tables) {
      const cols = columnsByTable.get(t.table_name) || [];
      if (cols.length === 0) continue;

      const colNames = cols.map((c) => c.column_name);
      const identCols = colNames.map(escapeIdent).join(", ");
      const tableIdent = escapeIdent(t.table_name);

      let offset = 0;
      let tableRowCount = 0;
      let pendingRows: string[] = [];

      const flushPending = () => {
        if (pendingRows.length === 0) return;
        out.push(`INSERT INTO ${tableIdent} (${identCols}) VALUES`);
        out.push(pendingRows.join(",\n") + ";");
        out.push("");
        pendingRows = [];
      };

      // deno-lint-ignore no-constant-condition
      while (true) {
        const rows = await sql.unsafe(
          `SELECT * FROM ${tableIdent} ORDER BY ctid LIMIT ${BATCH_SIZE} OFFSET ${offset}`,
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
      out.push(`-- ${t.table_name}: ${tableRowCount} fila(s)`);
      out.push("");
    }

    out.push("SET session_replication_role = 'origin';");
    out.push("");
    out.push("COMMIT;");
    out.push("");
    out.push(
      `-- Fin del script. Tablas: ${tables.length} · Filas totales: ${totalRows}`,
    );

    const sqlScript = out.join("\n");

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
