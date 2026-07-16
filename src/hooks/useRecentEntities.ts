import { useCallback, useEffect, useState } from "react";

export type RecentItem = {
  id: string;
  kind: "persona" | "grupo" | "reunion" | "evento" | "route";
  label: string;
  to: string;
  at: number;
};

const KEY = "doxa_recent_entities";
const MAX = 8;

function read(): RecentItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function useRecentEntities() {
  const [items, setItems] = useState<RecentItem[]>(() => read());

  useEffect(() => {
    const h = () => setItems(read());
    window.addEventListener("doxa:recents-changed", h as any);
    return () => window.removeEventListener("doxa:recents-changed", h as any);
  }, []);

  const push = useCallback((item: Omit<RecentItem, "at">) => {
    const cur = read().filter((r) => r.id !== item.id);
    const next = [{ ...item, at: Date.now() }, ...cur].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("doxa:recents-changed"));
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("doxa:recents-changed"));
  }, []);

  return { items, push, clear };
}
