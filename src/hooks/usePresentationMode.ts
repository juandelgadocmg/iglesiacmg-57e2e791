import { useCallback, useEffect, useState } from "react";

/**
 * Per-scope presentation mode (large fonts, roomy layout) for reunion / big-screen use.
 * Persisted in localStorage. Toggling adds/removes `data-presentation="true"`
 * on <body> so page-scoped CSS rules can react.
 */
export type PresentationScope = "mensajes" | "eventos";

const keyOf = (scope: PresentationScope) => `doxa:presentation:${scope}`;
const BODY_ATTR = "data-presentation";
const active = new Set<PresentationScope>();

function applyBody() {
  if (typeof document === "undefined") return;
  if (active.size > 0) document.body.setAttribute(BODY_ATTR, "true");
  else document.body.removeAttribute(BODY_ATTR);
}

export function usePresentationMode(scope: PresentationScope) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(keyOf(scope)) === "1";
    } catch {
      return false;
    }
  });

  // Reflect state into the global active set + <body> attribute
  useEffect(() => {
    if (enabled) active.add(scope);
    else active.delete(scope);
    applyBody();
    return () => {
      active.delete(scope);
      applyBody();
    };
  }, [enabled, scope]);

  const toggle = useCallback(() => {
    setEnabled((v) => {
      const next = !v;
      try {
        localStorage.setItem(keyOf(scope), next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [scope]);

  // Keyboard shortcut: Shift+P toggles presentation mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        (e.key === "P" || e.key === "p")
      ) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return { enabled, toggle };
}
