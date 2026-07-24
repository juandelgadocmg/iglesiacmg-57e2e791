/**
 * Client-side history of recently shared deep links.
 * Stored in localStorage so it persists per device and syncs across tabs.
 */
export type ShareScope = "mensajes" | "eventos";

export type RecentShare = {
  scope: ShareScope;
  label: string;
  url: string;
  ts: number;
};

const KEY = "doxa:recent-shares:v1";
const MAX = 20;
const CHANGE_EVENT = "doxa:recent-shares:change";

function read(): RecentShare[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValid) : [];
  } catch {
    return [];
  }
}

function isValid(x: any): x is RecentShare {
  return (
    x &&
    typeof x.url === "string" &&
    typeof x.label === "string" &&
    typeof x.ts === "number" &&
    (x.scope === "mensajes" || x.scope === "eventos")
  );
}

function write(list: RecentShare[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* quota or private mode — silently ignore */
  }
}

export function listShares(scope?: ShareScope): RecentShare[] {
  const all = read().sort((a, b) => b.ts - a.ts);
  return scope ? all.filter((s) => s.scope === scope) : all;
}

export function addShare(entry: Omit<RecentShare, "ts"> & { ts?: number }) {
  if (!entry?.url) return;
  const list = read();
  const filtered = list.filter((s) => s.url !== entry.url);
  filtered.unshift({ ...entry, ts: entry.ts ?? Date.now() });
  write(filtered);
}

export function removeShare(url: string) {
  write(read().filter((s) => s.url !== url));
}

export function clearShares(scope?: ShareScope) {
  if (!scope) {
    write([]);
    return;
  }
  write(read().filter((s) => s.scope !== scope));
}

export function subscribeShares(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(CHANGE_EVENT, handler as EventListener);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler as EventListener);
    window.removeEventListener("storage", handler);
  };
}
