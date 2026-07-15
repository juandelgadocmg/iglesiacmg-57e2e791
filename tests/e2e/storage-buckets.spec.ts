/**
 * E2E — Políticas de Storage
 *
 * Verifica, contra el proyecto Supabase real, que los buckets:
 *  - Públicos (avatars, banners, recursos-academicos) permitan LECTURA anon
 *    pero NO permitan escritura/borrado anon.
 *  - Privados (sem-entregas, mensajes-adjuntos, soportes-tesoreria) NO permitan
 *    ni lectura ni escritura anon.
 *  - Rechacen uploads con MIME falsificado / paths inválidos.
 *
 * Ejecutar:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... bunx playwright test tests/e2e/storage-buckets.spec.ts
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

const PUBLIC_BUCKETS = ["avatars", "banners", "recursos-academicos"];
const PRIVATE_BUCKETS = ["sem-entregas", "mensajes-adjuntos", "soportes-tesoreria"];

const pngBytes = () =>
  // 1×1 PNG transparente
  Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

test.describe("Storage · buckets públicos", () => {
  for (const bucket of PUBLIC_BUCKETS) {
    test(`${bucket}: anon puede listar (lectura pública) pero NO subir`, async () => {
      const s = anon();
      // Lectura permitida (aunque puede devolver 0 archivos, no debe dar error de permisos)
      const { error: listErr } = await s.storage.from(bucket).list("", { limit: 1 });
      if (listErr) {
        // Si falla, debe ser por bucket vacío / no encontrado, no por permiso
        expect(String(listErr.message).toLowerCase()).not.toContain("not authorized");
      }
      // Escritura anon debe fallar
      const { error: upErr } = await s.storage
        .from(bucket)
        .upload(`e2e-hack-${Date.now()}.png`, pngBytes(), { contentType: "image/png" });
      expect(upErr).toBeTruthy();
    });
  }
});

test.describe("Storage · buckets privados", () => {
  for (const bucket of PRIVATE_BUCKETS) {
    test(`${bucket}: anon NO puede leer`, async () => {
      const s = anon();
      const { data, error } = await s.storage.from(bucket).list("", { limit: 1 });
      // Debe fallar o devolver 0
      if (!error) expect((data || []).length).toBe(0);
    });

    test(`${bucket}: anon NO puede escribir`, async () => {
      const s = anon();
      const { error } = await s.storage
        .from(bucket)
        .upload(`e2e-hack-${Date.now()}.png`, pngBytes(), { contentType: "image/png" });
      expect(error).toBeTruthy();
    });

    test(`${bucket}: anon NO puede descargar por URL firmada (no puede crearla)`, async () => {
      const s = anon();
      const { error } = await s.storage.from(bucket).createSignedUrl("cualquier.pdf", 60);
      expect(error).toBeTruthy();
    });
  }
});

test.describe("Storage · payloads inválidos / MIME falsificado", () => {
  test("upload con path inválido (../) es rechazado", async () => {
    const s = anon();
    const { error } = await s.storage
      .from("avatars")
      .upload("../../etc/passwd", new Uint8Array([1, 2, 3]), { contentType: "text/plain" });
    expect(error).toBeTruthy();
  });

  test("upload de HTML con contentType de imagen es rechazado (anon sin permiso)", async () => {
    const s = anon();
    const html = new TextEncoder().encode("<script>alert('xss')</script>");
    const { error } = await s.storage
      .from("avatars")
      .upload(`fake-mime-${Date.now()}.png`, html, { contentType: "image/png" });
    // Anon no puede escribir, así que debe fallar por permisos
    expect(error).toBeTruthy();
  });

  test("URL pública de un objeto inexistente en bucket público responde 400/404", async () => {
    const s = anon();
    const { data } = s.storage.from("avatars").getPublicUrl("no-existe-xyz.png");
    const r = await fetch(data.publicUrl);
    expect([400, 404]).toContain(r.status);
  });
});
