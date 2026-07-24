// Offline queue for QR check-in retries.
// Persists failed attempts in localStorage and syncs when the browser regains
// connectivity (or when flush is explicitly invoked). Uses an idempotency key
// per (user, token, 30s window) to prevent duplicates when re-syncing.
import { supabase } from "@/integrations/supabase/client";

const KEY = "doxa.qr.offline.queue.v1";
const DEDUP_KEY = "doxa.qr.offline.dedup.v1";
const RESULTS_KEY = "doxa.qr.offline.results.v1";

export interface QueuedScan {
  id: string;
  servicioId: string;
  token: string;
  createdAt: number; // epoch ms
  attempts: number;
  idempotencyKey: string; // sha of user+token+30s bucket
}

export interface ScanResult {
  id: string;
  token: string;
  servicioId: string;
  finishedAt: number;
  status: "ok" | "already" | "throttled" | "failed" | "duplicate";
  message?: string;
}

function read(): QueuedScan[] {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function write(items: QueuedScan[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("qr-offline-queue-changed", { detail: items.length }));
  } catch { /* noop */ }
}
function readDedup(): Record<string, number> {
  try { const raw = localStorage.getItem(DEDUP_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function writeDedup(map: Record<string, number>) {
  // prune > 6h
  const now = Date.now();
  Object.keys(map).forEach((k) => { if (now - map[k] > 6 * 60 * 60 * 1000) delete map[k]; });
  try { localStorage.setItem(DEDUP_KEY, JSON.stringify(map)); } catch { /* noop */ }
}
function pushResult(r: ScanResult) {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    const arr: ScanResult[] = raw ? JSON.parse(raw) : [];
    arr.unshift(r);
    localStorage.setItem(RESULTS_KEY, JSON.stringify(arr.slice(0, 50)));
    window.dispatchEvent(new CustomEvent("qr-offline-result", { detail: r }));
  } catch { /* noop */ }
}
export function getRecentResults(): ScanResult[] {
  try { const raw = localStorage.getItem(RESULTS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

async function computeIdemKey(servicioId: string, token: string): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const uid = data?.user?.id || "anon";
  const bucket = Math.floor(Date.now() / 30_000); // 30s window
  const raw = `${uid}:${servicioId}:${token}:${bucket}`;
  try {
    const buf = new TextEncoder().encode(raw);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
  } catch {
    return raw;
  }
}

export async function enqueueScan(servicioId: string, token: string): Promise<QueuedScan | null> {
  const idempotencyKey = await computeIdemKey(servicioId, token);
  const dedup = readDedup();
  if (dedup[idempotencyKey]) {
    pushResult({ id: crypto.randomUUID(), token, servicioId, finishedAt: Date.now(), status: "duplicate", message: "Ya encolado en esta ventana" });
    return null;
  }
  const items = read();
  const item: QueuedScan = {
    id: crypto.randomUUID(),
    servicioId, token,
    createdAt: Date.now(),
    attempts: 0,
    idempotencyKey,
  };
  items.push(item);
  dedup[idempotencyKey] = Date.now();
  write(items);
  writeDedup(dedup);
  return item;
}

export function getQueueSize(): number { return read().length; }

let flushing = false;
export async function flushQueue(): Promise<{ ok: number; failed: number; duplicates: number }> {
  if (flushing || !navigator.onLine) return { ok: 0, failed: 0, duplicates: 0 };
  flushing = true;
  const items = read();
  const seen = new Set<string>();
  let ok = 0, failed = 0, duplicates = 0;
  const remaining: QueuedScan[] = [];

  for (const item of items) {
    if (Date.now() - item.createdAt > 6 * 60 * 60 * 1000) {
      pushResult({ id: item.id, token: item.token, servicioId: item.servicioId, finishedAt: Date.now(), status: "failed", message: "Expirado (>6h)" });
      continue;
    }
    // In-flight dedup by idempotency key
    if (seen.has(item.idempotencyKey)) {
      duplicates++;
      pushResult({ id: item.id, token: item.token, servicioId: item.servicioId, finishedAt: Date.now(), status: "duplicate", message: "Duplicado en cola" });
      continue;
    }
    seen.add(item.idempotencyKey);
    try {
      const { data, error } = await supabase.rpc("checkin_qr", {
        _servicio_id: item.servicioId,
        _token: item.token,
      });
      if (error) throw error;
      const payload = data as any;
      if (payload?.ok) {
        ok++;
        pushResult({ id: item.id, token: item.token, servicioId: item.servicioId, finishedAt: Date.now(), status: "ok", message: payload?.message });
      } else {
        const terminal = ["not_found", "qr_inactive", "unauthenticated", "no_persona"];
        const status: ScanResult["status"] = payload?.code === "already" ? "already" : payload?.code === "throttled" ? "throttled" : "failed";
        if (terminal.includes(payload?.code) || status === "already" || status === "throttled") {
          if (status === "failed") failed++;
          pushResult({ id: item.id, token: item.token, servicioId: item.servicioId, finishedAt: Date.now(), status, message: payload?.message });
        } else {
          item.attempts += 1;
          if (item.attempts < 5) remaining.push(item);
          else { failed++; pushResult({ id: item.id, token: item.token, servicioId: item.servicioId, finishedAt: Date.now(), status: "failed", message: "Reintentos agotados" }); }
        }
      }
    } catch (e: any) {
      item.attempts += 1;
      if (item.attempts < 5) remaining.push(item);
      else { failed++; pushResult({ id: item.id, token: item.token, servicioId: item.servicioId, finishedAt: Date.now(), status: "failed", message: e?.message || "Error de red" }); }
    }
  }

  write(remaining);
  flushing = false;
  return { ok, failed, duplicates };
}

let installed = false;
export function installOfflineQueueAutoFlush() {
  if (installed) return;
  installed = true;
  const tryFlush = () => { void flushQueue(); };
  window.addEventListener("online", tryFlush);
  setInterval(() => {
    if (navigator.onLine && read().length > 0) tryFlush();
  }, 60_000);
}
