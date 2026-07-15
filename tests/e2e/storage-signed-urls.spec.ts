/**
 * E2E — URLs firmadas (presigned) de Storage
 *
 * Verifica que:
 *  1. Un anon no puede generar una URL firmada para buckets privados.
 *  2. Una URL firmada expirada devuelve 400/401/403.
 *  3. Una URL firmada de un bucket NO permite leer archivos de otro bucket
 *     (cross-bucket path traversal).
 *  4. Modificar el path/query de una URL firmada la invalida.
 *
 * Requiere para las pruebas positivas un usuario con permiso sobre el bucket:
 *   E2E_STORAGE_EMAIL / E2E_STORAGE_PASSWORD  (opcionales — si faltan, se
 *   saltan; el resto de casos negativos siguen ejecutándose).
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

const PRIVATE_BUCKETS = ["sem-entregas", "mensajes-adjuntos", "soportes-tesoreria"];

test.describe("Storage · Signed URLs — casos negativos (anon)", () => {
  for (const bucket of PRIVATE_BUCKETS) {
    test(`anon NO puede crear URL firmada para ${bucket}`, async () => {
      const s = anon();
      const { data, error } = await s.storage.from(bucket).createSignedUrl("cualquier.pdf", 60);
      expect(error || !data?.signedUrl).toBeTruthy();
    });
  }
});

test.describe("Storage · Signed URLs — expiración y tampering", () => {
  const email = process.env.E2E_STORAGE_EMAIL;
  const password = process.env.E2E_STORAGE_PASSWORD;
  const bucket = process.env.E2E_STORAGE_BUCKET || "sem-entregas";
  const path = process.env.E2E_STORAGE_PATH; // ej: "userid/entrega.pdf"

  test.skip(
    !email || !password || !path,
    "Define E2E_STORAGE_EMAIL, E2E_STORAGE_PASSWORD y E2E_STORAGE_PATH para habilitar"
  );

  test("URL firmada expira: tras el TTL responde 4xx", async () => {
    const s = anon();
    await s.auth.signInWithPassword({ email: email!, password: password! });
    const { data, error } = await s.storage.from(bucket).createSignedUrl(path!, 1);
    expect(error).toBeFalsy();
    expect(data?.signedUrl).toBeTruthy();

    // Válida al instante
    const first = await fetch(data!.signedUrl);
    expect([200, 206]).toContain(first.status);

    // Esperar a que caduque + margen
    await new Promise((r) => setTimeout(r, 2500));
    const expired = await fetch(data!.signedUrl);
    expect(expired.status).toBeGreaterThanOrEqual(400);
    expect(expired.status).toBeLessThan(500);
  });

  test("Tamper del token invalida la URL firmada", async () => {
    const s = anon();
    await s.auth.signInWithPassword({ email: email!, password: password! });
    const { data } = await s.storage.from(bucket).createSignedUrl(path!, 60);
    expect(data?.signedUrl).toBeTruthy();

    const tampered = data!.signedUrl.replace(/token=([^&]+)/, (_m, t) => `token=${t.slice(0, -3)}AAA`);
    const r = await fetch(tampered);
    expect(r.status).toBeGreaterThanOrEqual(400);
  });

  test("La URL firmada no permite acceder a otro path del mismo bucket", async () => {
    const s = anon();
    await s.auth.signInWithPassword({ email: email!, password: password! });
    const { data } = await s.storage.from(bucket).createSignedUrl(path!, 60);
    expect(data?.signedUrl).toBeTruthy();

    // Reemplaza el path por otro dentro del mismo bucket — debe romper la firma
    const url = new URL(data!.signedUrl);
    url.pathname = url.pathname.replace(/[^/]+$/, "otro-archivo-que-no-existe.bin");
    const r = await fetch(url.toString());
    expect(r.status).toBeGreaterThanOrEqual(400);
  });

  test("La URL firmada no permite cambiar el bucket", async () => {
    const s = anon();
    await s.auth.signInWithPassword({ email: email!, password: password! });
    const { data } = await s.storage.from(bucket).createSignedUrl(path!, 60);
    expect(data?.signedUrl).toBeTruthy();

    // Cambiar el bucket en la ruta rompe la firma
    const swapped = data!.signedUrl.replace(
      `/object/sign/${bucket}/`,
      `/object/sign/${bucket === "sem-entregas" ? "mensajes-adjuntos" : "sem-entregas"}/`
    );
    const r = await fetch(swapped);
    expect(r.status).toBeGreaterThanOrEqual(400);
  });
});
