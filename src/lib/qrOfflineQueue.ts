// Offline queue for QR check-in retries.
// Persists failed attempts in localStorage and syncs when the browser regains
// connectivity (or when flush is explicitly invoked).
import { supabase } from "@/integrations/supabase/client";

const KEY = "doxa.qr.offline.queue.v1";

export interface QueuedScan {
  id: string;
  servicioId: string;
  token: string;
  createdAt: number; // epoch ms
  attempts: number;
}

function read(): QueuedScan[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedScan[]) : [];
  } catch {
    return [];
  }
}

function write(items: QueuedScan[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("qr-offline-queue-changed", { detail: items.length }));
  } catch {
    /* noop */
  }
}

export function enqueueScan(servicioId: string, token: string): QueuedScan {
  const items = read();
  const item: QueuedScan = {
    id: crypto.randomUUID(),
    servicioId,
    token,
    createdAt: Date.now(),
    attempts: 0,
  };
  // Avoid enqueuing duplicates for same token within 30s
  const dup = items.find(
    (i) => i.servicioId === servicioId && i.token === token && Date.now() - i.createdAt < 30_000
  );
  if (dup) return dup;
  items.push(item);
  write(items);
  return item;
}

export function getQueueSize(): number {
  return read().length;
}

let flushing = false;
export async function flushQueue(): Promise<{ ok: number; failed: number }> {
  if (flushing || !navigator.onLine) return { ok: 0, failed: 0 };
  flushing = true;
  const items = read();
  let ok = 0;
  let failed = 0;
  const remaining: QueuedScan[] = [];

  for (const item of items) {
    // Drop items older than 6h
    if (Date.now() - item.createdAt > 6 * 60 * 60 * 1000) continue;
    try {
      const { data, error } = await supabase.rpc("checkin_qr", {
        _servicio_id: item.servicioId,
        _token: item.token,
      });
      if (error) throw error;
      const payload = data as any;
      if (payload?.ok) ok += 1;
      else {
        // Terminal errors we should not keep retrying
        const terminal = ["not_found", "qr_inactive", "unauthenticated", "no_persona"];
        if (terminal.includes(payload?.code)) failed += 1;
        else {
          item.attempts += 1;
          if (item.attempts < 5) remaining.push(item);
          else failed += 1;
        }
      }
    } catch {
      item.attempts += 1;
      if (item.attempts < 5) remaining.push(item);
      else failed += 1;
    }
  }

  write(remaining);
  flushing = false;
  return { ok, failed };
}

// Auto-flush on connectivity restore. Call once at app boot.
let installed = false;
export function installOfflineQueueAutoFlush() {
  if (installed) return;
  installed = true;
  const tryFlush = () => {
    void flushQueue();
  };
  window.addEventListener("online", tryFlush);
  // periodic best-effort while online
  setInterval(() => {
    if (navigator.onLine && read().length > 0) tryFlush();
  }, 60_000);
}
