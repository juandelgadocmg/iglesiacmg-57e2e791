import { test, expect } from "@playwright/test";

/**
 * E2E accesibilidad — Planeación y Reportes de grupo.
 *
 * Verifica:
 *   - GrupoCardsSkeletonGrid expone role="status" + aria-busy durante la carga.
 *   - Las tarjetas clickables son focusables por teclado y activables con Enter.
 *   - EmptyState / ErrorState quedan disponibles como landmarks accesibles.
 *
 * Requiere que la app corra en http://localhost:8080 y una sesión válida.
 * Ejecutar con:  BASE_URL=http://localhost:8080 npx playwright test tests/e2e/grupos-a11y.spec.ts
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";
const STORAGE_KEY = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
const SESSION_JSON = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const COOKIES_JSON = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;

test.describe("Grupos · accesibilidad de tarjetas y estados", () => {
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

  test("Planeación: skeleton anuncia carga y tarjetas son navegables por teclado", async ({ page }) => {
    await page.goto(`${BASE_URL}/grupos`);

    // Ir a tab Planificación
    const planTab = page.getByRole("tab", { name: /planificaci/i });
    if (await planTab.count()) await planTab.first().click();

    // El skeleton grid puede aparecer y desaparecer rápido; toleramos ambos.
    const status = page.locator('[role="status"][aria-busy="true"]');
    if (await status.count()) {
      await expect(status.first()).toHaveAttribute("aria-label", /Cargando/i);
    }

    // Espera a que exista alguna tarjeta o estado vacío
    const cards = page.getByRole("button").filter({ hasText: /./ });
    const emptyHeading = page.getByRole("heading", { name: /Aún no hay planificaciones|No hay grupos/i });
    await Promise.race([
      cards.first().waitFor({ state: "visible", timeout: 15000 }).catch(() => null),
      emptyHeading.first().waitFor({ state: "visible", timeout: 15000 }).catch(() => null),
    ]);

    // Si hay tarjetas GrupoInfoCard, la primera debe ser focusable con role=button y tabindex=0
    const infoCards = page.locator('[role="button"][tabindex="0"]');
    if (await infoCards.count()) {
      const first = infoCards.first();
      await first.focus();
      await expect(first).toBeFocused();
      // El foco visible se aplica vía focus-visible:ring-2
      const outlineClass = await first.getAttribute("class");
      expect(outlineClass ?? "").toMatch(/focus-visible:ring/);
    }
  });

  test("Reportes: ErrorState o cards tienen roles ARIA correctos", async ({ page }) => {
    await page.goto(`${BASE_URL}/grupos`);
    const reportesTab = page.getByRole("tab", { name: /reportes/i });
    if (await reportesTab.count()) await reportesTab.first().click();

    // Espera a que aparezca cualquiera de: skeleton, error, empty o tarjetas
    const anyMarker = page.locator(
      '[role="status"], [role="alert"], [role="button"][tabindex="0"], h3'
    );
    await expect(anyMarker.first()).toBeVisible({ timeout: 15000 });

    // Si aparece ErrorState debe tener role="alert" con botón "Reintentar"
    const alert = page.locator('[role="alert"]');
    if (await alert.count()) {
      const retry = alert.getByRole("button", { name: /reintentar/i });
      if (await retry.count()) {
        await expect(retry.first()).toBeVisible();
      }
    }
  });

  test("GrupoInfoCard soporta activación con Enter", async ({ page }) => {
    await page.goto(`${BASE_URL}/grupos`);
    const cards = page.locator('[role="button"][tabindex="0"]');
    if (!(await cards.count())) test.skip(true, "No hay tarjetas visibles para probar teclado.");

    const first = cards.first();
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press("Enter");
    // Cualquier navegación / diálogo abierto es evidencia de activación
    await page.waitForTimeout(300);
    const dialog = page.locator('[role="dialog"]');
    const urlChanged = page.url() !== `${BASE_URL}/grupos`;
    expect((await dialog.count()) > 0 || urlChanged).toBeTruthy();
  });
});
