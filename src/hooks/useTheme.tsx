import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeCtx {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (m: ThemeMode) => void;
}

const LS_KEY = "doxa:theme";
const Ctx = createContext<ThemeCtx | null>(null);

function systemPrefers(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#0b1626" : "#ffffff");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(LS_KEY) as ThemeMode) || "system";
  });
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => systemPrefers());

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(mql.matches ? "dark" : "light");
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  const resolved: ResolvedTheme = mode === "system" ? systemTheme : mode;

  useEffect(() => {
    apply(resolved);
  }, [resolved]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    try {
      if (m === "system") localStorage.removeItem(LS_KEY);
      else localStorage.setItem(LS_KEY, m);
    } catch {}
  };

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) {
    // Fallback so components don't crash if provider missing
    return { mode: "system" as ThemeMode, resolved: systemPrefers(), setMode: () => {} };
  }
  return c;
}
