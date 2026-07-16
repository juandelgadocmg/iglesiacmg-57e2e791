import { useEffect } from "react";

type Handler = (e: KeyboardEvent) => void;

/**
 * Registra atajos globales. Soporta combos "mod+k" (mod = ctrl/cmd) o "?" simples,
 * y secuencias tipo "g p" (dos teclas dentro de 800ms).
 */
export function useHotkeys(map: Record<string, Handler>) {
  useEffect(() => {
    let buffer = "";
    let bufferTimer: any = null;

    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };

    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // combos con mod
      for (const combo of Object.keys(map)) {
        if (!combo.includes("+")) continue;
        const parts = combo.toLowerCase().split("+");
        const wantMod = parts.includes("mod");
        const wantShift = parts.includes("shift");
        const wantKey = parts[parts.length - 1];
        if (wantMod === mod && wantShift === e.shiftKey && key === wantKey) {
          e.preventDefault();
          map[combo](e);
          return;
        }
      }

      if (isTyping(e.target)) return;

      // secuencias 2 teclas
      buffer += key;
      clearTimeout(bufferTimer);
      bufferTimer = setTimeout(() => (buffer = ""), 800);
      for (const combo of Object.keys(map)) {
        if (combo.includes("+")) continue;
        const norm = combo.replace(/\s+/g, "").toLowerCase();
        if (buffer.endsWith(norm)) {
          e.preventDefault();
          map[combo](e);
          buffer = "";
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      clearTimeout(bufferTimer);
    };
  }, [map]);
}
