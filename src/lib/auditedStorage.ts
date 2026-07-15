/**
 * Audited Storage helper.
 *
 * Envuelve las operaciones básicas de Supabase Storage (upload, update, remove,
 * createSignedUrl) y registra un evento en `security_audit_log` mediante la
 * función RPC `log_storage_event`. Si el registro falla no bloquea la operación
 * (best-effort auditoría del lado cliente).
 *
 * Uso:
 *   import { auditedStorage } from "@/lib/auditedStorage";
 *   await auditedStorage.upload("avatars", `${uid}/foto.png`, file);
 */
import { supabase } from "@/integrations/supabase/client";
import type { FileOptions } from "@supabase/storage-js";

type StorageOp = "UPLOAD" | "UPDATE" | "DELETE" | "SIGNED_URL";

async function record(bucket: string, path: string, op: StorageOp, details: Record<string, unknown> = {}) {
  try {
    await (supabase as any).rpc("log_storage_event", {
      _bucket: bucket,
      _path: path,
      _operation: op,
      _details: details,
    });
  } catch (err) {
    // Silencioso: la auditoría no debe bloquear la subida.
    console.warn("[auditedStorage] log_storage_event falló:", err);
  }
}

export const auditedStorage = {
  async upload(bucket: string, path: string, file: File | Blob | ArrayBuffer | Uint8Array, options?: FileOptions) {
    const res = await supabase.storage.from(bucket).upload(path, file as any, options);
    if (!res.error) {
      const size = file instanceof Blob ? file.size : (file as ArrayBuffer).byteLength ?? null;
      void record(bucket, path, "UPLOAD", { size, contentType: options?.contentType ?? null });
    }
    return res;
  },
  async update(bucket: string, path: string, file: File | Blob | ArrayBuffer | Uint8Array, options?: FileOptions) {
    const res = await supabase.storage.from(bucket).update(path, file as any, options);
    if (!res.error) void record(bucket, path, "UPDATE", { contentType: options?.contentType ?? null });
    return res;
  },
  async remove(bucket: string, paths: string[]) {
    const res = await supabase.storage.from(bucket).remove(paths);
    if (!res.error) for (const p of paths) void record(bucket, p, "DELETE");
    return res;
  },
  async createSignedUrl(bucket: string, path: string, expiresInSeconds: number) {
    const res = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (!res.error) void record(bucket, path, "SIGNED_URL", { expires_in: expiresInSeconds });
    return res;
  },
};
