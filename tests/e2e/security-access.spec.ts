/**
 * E2E — Acceso no autorizado desde el frontend
 *
 * Simula un atacante que usa el cliente Supabase con la anon key (la misma
 * que envía el navegador) e intenta leer/escribir tablas protegidas sin
 * iniciar sesión. Cada consulta debe devolver 0 filas o un error PGRST.
 *
 * Ejecutar:
 *   bun add -D @playwright/test
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... bunx playwright test tests/e2e
 *
 * En CI: el workflow security.yml pasa los mismos valores como secretos.
 */
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Faltan SUPABASE_URL / SUPABASE_ANON_KEY. Expórtalos antes de ejecutar."
  );
}

const anonClient = () =>
  createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const PROTECTED_READ_TABLES = [
  "profiles",
  "personas",
  "finanzas",
  "user_roles",
  "security_audit_log",
  "sem_inscripciones",
  "sem_calificaciones",
  "sem_pagos_inscripcion",
  "sem_entregas",
  "prog_asignaciones",
  "prog_disponibilidad",
  "msg_threads",
  "msg_messages",
  "peticiones_oracion",
  "citas_consejeria",
];

test.describe("RLS · anon (sin sesión) no debe ver datos privados", () => {
  for (const table of PROTECTED_READ_TABLES) {
    test(`SELECT ${table} devuelve 0 filas o error`, async () => {
      const supabase = anonClient();
      const { data, error } = await supabase.from(table).select("*").limit(5);
      // Aceptamos dos comportamientos correctos:
      //  a) La query se ejecuta pero RLS filtra a 0 filas.
      //  b) La query falla con permission denied.
      if (error) {
        expect(error.code || error.message).toBeTruthy();
      } else {
        expect(Array.isArray(data)).toBe(true);
        expect(data!.length).toBe(0);
      }
    });
  }
});

test.describe("RLS · anon no debe poder escribir tablas críticas", () => {
  test("INSERT en user_roles (intento de auto-promoción) es bloqueado", async () => {
    const supabase = anonClient();
    const { error } = await supabase.from("user_roles").insert({
      user_id: "00000000-0000-0000-0000-000000000001",
      role: "admin",
    });
    expect(error).toBeTruthy();
  });

  test("INSERT en finanzas es bloqueado", async () => {
    const supabase = anonClient();
    const { error } = await supabase.from("finanzas").insert({
      concepto: "e2e-hack",
      monto: 1,
      tipo: "ingreso",
    });
    expect(error).toBeTruthy();
  });

  test("INSERT en security_audit_log es bloqueado", async () => {
    const supabase = anonClient();
    const { error } = await supabase.from("security_audit_log").insert({
      table_name: "x",
      operation: "INSERT",
    });
    expect(error).toBeTruthy();
  });
});

test.describe("RLS · usuario autenticado de bajo privilegio", () => {
  const email = process.env.E2E_LOW_PRIV_EMAIL;
  const password = process.env.E2E_LOW_PRIV_PASSWORD;

  test.skip(
    !email || !password,
    "Define E2E_LOW_PRIV_EMAIL/E2E_LOW_PRIV_PASSWORD para habilitar estas pruebas"
  );

  test("no puede escalar a admin", async () => {
    const supabase = anonClient();
    const { data: auth, error: signErr } =
      await supabase.auth.signInWithPassword({ email: email!, password: password! });
    expect(signErr).toBeFalsy();
    expect(auth.user?.id).toBeTruthy();

    const { error } = await supabase.from("user_roles").insert({
      user_id: auth.user!.id,
      role: "admin",
    });
    expect(error).toBeTruthy();
  });

  test("no puede leer security_audit_log", async () => {
    const supabase = anonClient();
    await supabase.auth.signInWithPassword({ email: email!, password: password! });
    const { data, error } = await supabase
      .from("security_audit_log")
      .select("id")
      .limit(1);
    // 0 filas o error, cualquiera de los dos es correcto.
    if (!error) expect(data!.length).toBe(0);
  });
});
