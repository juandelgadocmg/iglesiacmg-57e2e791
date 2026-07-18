import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const APP_URL = process.env.E2E_APP_URL || "http://localhost:8080";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EMAIL = process.env.E2E_CONSOLIDADOR_LIDER_EMAIL;
const PASSWORD = process.env.E2E_CONSOLIDADOR_LIDER_PASSWORD;

const hasConsolidadorLeaderCredentials = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && EMAIL && PASSWORD);

const client = () =>
  createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const storageKey = () => {
  const ref = new URL(SUPABASE_URL!).hostname.split(".")[0];
  return `sb-${ref}-auth-token`;
};

test.describe("Personas · Consolidador Líder", () => {
  test.skip(
    !hasConsolidadorLeaderCredentials,
    "Define E2E_CONSOLIDADOR_LIDER_EMAIL/E2E_CONSOLIDADOR_LIDER_PASSWORD para validar creación real"
  );

  test("abre inmediatamente el modal desde /personas?new=1 y permite crear una persona", async ({ page }) => {
    const supabase = client();
    const { data: auth, error } = await supabase.auth.signInWithPassword({ email: EMAIL!, password: PASSWORD! });
    expect(error).toBeFalsy();
    expect(auth.session).toBeTruthy();

    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ key, session }) => window.localStorage.setItem(key, JSON.stringify(session)),
      { key: storageKey(), session: auth.session }
    );

    await page.goto(`${APP_URL}/personas?new=1`, { waitUntil: "domcontentloaded" });

    const dialog = page.getByRole("dialog", { name: /registrar nueva persona/i });
    await expect(dialog).toBeVisible();

    const suffix = Date.now().toString().slice(-6);
    const firstName = `E2E Consolidador ${suffix}`;
    const lastName = "Líder";

    await dialog.getByLabel("Nombres *").fill(firstName);
    await dialog.getByLabel("Apellidos *").fill(lastName);
    await dialog.getByLabel("Número de documento *").fill(`E2E-${suffix}`);
    await dialog.getByLabel("Fecha de nacimiento *").fill("1990-01-01");
    await dialog.getByLabel("Teléfono *").fill("3000000000");
    await dialog.getByLabel("Dirección *").fill("Registro automático E2E");
    await dialog.getByText("Visitante", { exact: true }).click();
    await dialog.getByLabel("Acepto la política de tratamiento de datos personales *").click();
    await dialog.getByRole("button", { name: /guardar persona/i }).click();

    await expect(page.getByText(new RegExp(`Persona creada: ${firstName} ${lastName}`, "i"))).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(firstName)).toBeVisible();
  });

  test("el backend permite crear personas al rol Consolidador Líder", async () => {
    const supabase = client();
    const { data: auth, error: signInError } = await supabase.auth.signInWithPassword({ email: EMAIL!, password: PASSWORD! });
    expect(signInError).toBeFalsy();
    expect(auth.user?.id).toBeTruthy();

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", auth.user!.id);
    expect(rolesError).toBeFalsy();
    expect((roles || []).map((row) => row.role)).toContain("consolidador_lider");

    const suffix = Date.now().toString().slice(-6);
    const { data, error } = await supabase
      .from("personas")
      .insert({
        nombres: `E2E Backend ${suffix}`,
        apellidos: "Consolidador Líder",
        documento: `E2E-BE-${suffix}`,
        telefono: "3000000000",
        direccion: "Registro automático E2E backend",
        fecha_nacimiento: "1990-01-01",
        tipo_persona: "Visitante",
        estado_iglesia: "Activo",
      })
      .select("id")
      .single();

    expect(error).toBeFalsy();
    expect(data?.id).toBeTruthy();
  });
});