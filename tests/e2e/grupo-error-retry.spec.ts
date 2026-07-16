import { test, expect } from "@playwright/test";

/**
 * E2E — Detalle de grupo: error de carga + botón Reintentar.
 *
 * Estrategia:
 *   1. Interceptar la petición REST del detalle del grupo y forzar HTTP 500.
 *   2. Verificar que aparece un `role="alert"` (ErrorState) con el botón Reintentar.
 *   3. Restaurar el mock, hacer click en Reintentar y comprobar que la vista
 *      recupera contenido y devuelve el foco al contenedor.
 *
 * Ejecutar con:
 *   BASE_URL=http://localhost:8080 GRUPO_ID=<uuid> npx playwright test tests/e2e/grupo-error-retry.spec.ts
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";
const GRUPO_ID = process.env.GRUPO_ID; // opcional; sin él el test se omite
const STORAGE_KEY = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
const SESSION_JSON = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const COOKIES_JSON = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;

test.describe("Detalle de grupo · error de carga con reintento accesible", () => {
  test.skip(!GRUPO_ID, "Falta GRUPO_ID env var — no hay grupo real para probar");

  test.beforeEach(async ({ context, page }) => {
    if (COOKIES_JSON) {
      const cookies = JSON.parse(COOKIES_JSON).map((c: any) => ({ ...c, url: BASE_URL }));
      await context.addCookies(cookies);
    }
    await page.goto(BASE_URL);
    if (STORAGE_KEY && SESSION_JSON) {
      await page.evaluate(
        ([k, v]) => window.localStorage.setItem(k as string, v as string),
        [STORAGE_KEY, SESSION_JSON]
      );
    }
  });

  test("Muestra ErrorState y Reintentar restaura contenido + foco", async ({ page }) => {
    let failNext = true;

    await page.route(/\/rest\/v1\/grupos\?.*id=eq\./, async (route) => {
      if (failNext) {
        failNext = false;
        return route.fulfill({ status: 500, body: JSON.stringify({ message: "boom" }) });
      }
      return route.continue();
    });

    await page.goto(`${BASE_URL}/grupos/${GRUPO_ID}`);

    // 1. Error accesible
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 10_000 });
    await expect(alert).toContainText(/No pudimos cargar/i);

    const retry = page.getByRole("button", { name: /Reintentar/i });
    await expect(retry).toBeVisible();

    // 2. Foco visible por teclado en el botón
    await retry.focus();
    await expect(retry).toBeFocused();

    // 3. Reintentar: al hacer click, el mock ya no falla → aparece el detalle
    await retry.click();

    // Cabecera del detalle (tabs) debe aparecer
    await expect(page.getByRole("tablist")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});
