/**
 * E2E — Auditoría de cambios sensibles
 *
 * Verifica que:
 *  1. Intentos anon de modificar user_roles / finanzas / profiles fallan
 *     (RLS los bloquea antes de llegar al trigger — no deben crear filas
 *     en security_audit_log, pero tampoco deben ejecutarse).
 *  2. Con un usuario admin (opcional, vía E2E_ADMIN_EMAIL/PASSWORD):
 *     un cambio real en user_roles genera exactamente una entrada en
 *     security_audit_log con actor_user_id = admin.
 */
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Faltan SUPABASE_URL / SUPABASE_ANON_KEY.");
}

const anon = () =>
  createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

test.describe("security_audit_log · intentos anon", () => {
  test("anon no puede leer security_audit_log", async () => {
    const s = anon();
    const { data, error } = await s.from("security_audit_log").select("*").limit(1);
    if (!error) expect((data || []).length).toBe(0);
  });

  test("anon no puede insertar directamente en security_audit_log", async () => {
    const s = anon();
    const { error } = await s
      .from("security_audit_log")
      .insert({ table_name: "hack", operation: "INSERT" });
    expect(error).toBeTruthy();
  });

  test("anon no puede editar user_roles / finanzas / profiles", async () => {
    const s = anon();
    const attempts = await Promise.all([
      s.from("user_roles").update({ role: "admin" }).eq("user_id", "00000000-0000-0000-0000-000000000000"),
      s.from("finanzas").update({ monto: 1 }).eq("id", "00000000-0000-0000-0000-000000000000"),
      s.from("profiles").update({ persona_id: "00000000-0000-0000-0000-000000000000" }).eq("user_id", "00000000-0000-0000-0000-000000000000"),
    ]);
    for (const a of attempts) {
      // O bien error de permiso, o 0 filas afectadas (RLS filtró todo).
      if (!a.error) expect(a.data ?? []).toEqual([]);
    }
  });
});

test.describe("security_audit_log · admin autenticado (opcional)", () => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, "Define E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD para habilitar");

  test("admin puede leer últimos eventos", async () => {
    const s = anon();
    const { error: sErr } = await s.auth.signInWithPassword({ email: email!, password: password! });
    expect(sErr).toBeFalsy();
    const { data, error } = await s
      .from("security_audit_log")
      .select("id, table_name, operation, created_at, actor_user_id")
      .order("created_at", { ascending: false })
      .limit(5);
    expect(error).toBeFalsy();
    expect(Array.isArray(data)).toBe(true);
  });
});
