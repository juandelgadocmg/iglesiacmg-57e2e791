/**
 * DOXA Design System — Tokens
 * Espejo TypeScript de los tokens declarados en `src/index.css`.
 * Úsalos SOLO desde componentes del design-system; en pantallas siempre
 * consume clases utilitarias (`bg-surface-1`, `text-fg-muted`, etc.).
 */

export const space = {
  0: "0px", 1: "4px", 2: "8px", 3: "12px", 4: "16px",
  6: "24px", 8: "32px", 10: "40px", 12: "48px", 16: "64px",
  20: "80px", 24: "96px",
} as const;

export const radius = {
  xs: "4px", sm: "6px", md: "8px", lg: "12px",
  xl: "16px", "2xl": "20px", pill: "9999px",
} as const;

export const type = {
  xs: ["12px", "16px"],
  sm: ["13px", "18px"],
  base: ["14px", "20px"],
  md: ["15px", "22px"],
  lg: ["17px", "24px"],
  xl: ["20px", "28px"],
  "2xl": ["24px", "32px"],
  "3xl": ["30px", "38px"],
  "4xl": ["38px", "46px"],
  display: ["48px", "56px"],
} as const;

export const elevation = {
  0: "none",
  1: "var(--shadow-xs)",
  2: "var(--shadow-sm)",
  3: "var(--shadow-md)",
  4: "var(--shadow-lg)",
  5: "var(--shadow-xl)",
} as const;

export const motion = {
  fast: "120ms",
  base: "180ms",
  slow: "240ms",
  page: "320ms",
  ease: {
    standard: "cubic-bezier(.2,.8,.2,1)",
    emphasized: "cubic-bezier(.16,1,.3,1)",
    exit: "cubic-bezier(.4,0,1,1)",
  },
} as const;

export const chart = {
  colors: [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-6))",
    "hsl(var(--chart-7))",
    "hsl(var(--chart-8))",
  ],
} as const;

export const tokens = { space, radius, type, elevation, motion, chart };
export default tokens;
