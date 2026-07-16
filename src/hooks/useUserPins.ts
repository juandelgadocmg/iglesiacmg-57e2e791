import { useCallback, useEffect, useState } from "react";

export type PinnedItem = {
  id: string;
  kind: "route" | "persona" | "grupo" | "reunion" | "evento";
  label: string;
  to: string;
  icon?: string;
};

const KEY = "doxa_user_pins";

function read(): PinnedItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function useUserPins() {
  const [pins, setPins] = useState<PinnedItem[]>(() => read());

  useEffect(() => {
    const handler = () => setPins(read());
    window.addEventListener("storage", handler);
    window.addEventListener("doxa:pins-changed", handler as any);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("doxa:pins-changed", handler as any);
    };
  }, []);

  const persist = (next: PinnedItem[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setPins(next);
    window.dispatchEvent(new Event("doxa:pins-changed"));
  };

  const toggle = useCallback((item: PinnedItem) => {
    const cur = read();
    const idx = cur.findIndex((p) => p.id === item.id);
    if (idx >= 0) persist(cur.filter((_, i) => i !== idx));
    else persist([item, ...cur].slice(0, 12));
  }, []);

  const isPinned = useCallback((id: string) => pins.some((p) => p.id === id), [pins]);

  return { pins, toggle, isPinned };
}
