import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  reporter: [["list"]],
  workers: 1,
  retries: 0,
  use: {
    // No usamos navegador para estas pruebas; solo hacemos requests HTTP.
    headless: true,
  },
});
