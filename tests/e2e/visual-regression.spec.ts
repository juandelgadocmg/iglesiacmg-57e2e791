import { test, expect, devices } from "@playwright/test";

/**
 * Regresión visual — captura las rutas principales en desktop, tablet y móvil.
 * Requiere sesión: se salta si LOVABLE_BROWSER_AUTH_STATUS !== "injected".
 * Los snapshots se guardan bajo tests/e2e/__screenshots__/.
 */

const ROUTES = [
  { name: "hoy",        path: "/hoy" },
  { name: "personas",   path: "/personas" },
  { name: "grupos",     path: "/grupos" },
  { name: "cumpleanos", path: "/cumpleanos" },
  { name: "alertas",    path: "/alertas" },
  { name: "actividad",  path: "/actividad" },
];

const VIEWPORTS = [
  { name: "desktop", size: { width: 1440, height: 900 } },
  { name: "tablet",  size: { width: 820,  height: 1180 } },
  { name: "mobile",  size: { width: 390,  height: 844  } },
];

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080";

test.describe("Regresión visual - rutas principales", () => {
  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      test(`${vp.name} · ${route.name}`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: vp.size });
        const page = await context.newPage();
        try {
          await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded" });
          // Esperar hero o contenido principal
          await page.waitForTimeout(1200);
          await expect(page).toHaveScreenshot(`${route.name}-${vp.name}.png`, {
            maxDiffPixelRatio: 0.05,
            fullPage: false,
            animations: "disabled",
          });
        } finally {
          await context.close();
        }
      });
    }
  }
});
