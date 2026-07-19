// Fusiona esto dentro de theme.extend en tu tailwind.config.ts
export const cmgAdminExtend = {
  fontFamily: {
    sans: ["Manrope", "system-ui", "-apple-system", "sans-serif"],
    display: ["Sora", "system-ui", "sans-serif"],
    heading: ["Sora", "system-ui", "sans-serif"],
  },
  borderRadius: {
    xs: "4px", sm: "6px", md: "8px", lg: "12px",
    xl: "16px", "2xl": "20px", pill: "9999px",
  },
  boxShadow: {
    "elev-1": "var(--shadow-xs)",
    "elev-2": "var(--shadow-sm)",
    "elev-3": "var(--shadow-md)",
    "elev-4": "var(--shadow-lg)",
    "elev-5": "var(--shadow-xl)",
    focus: "var(--shadow-glow)",
  },
  colors: {
    // Todos apuntan a variables CSS — así conservas tu paleta.
    surface: {
      0: "hsl(var(--surface-0))",
      1: "hsl(var(--surface-1))",
      2: "hsl(var(--surface-2))",
      3: "hsl(var(--surface-3))",
      4: "hsl(var(--surface-4))",
    },
    fg: {
      DEFAULT: "hsl(var(--fg-default))",
      muted: "hsl(var(--fg-muted))",
      subtle: "hsl(var(--fg-subtle))",
      onBrand: "hsl(var(--fg-on-brand))",
    },
    success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
    warning: { DEFAULT: "hsl(var(--warning))", foreground: "hsl(var(--warning-foreground))" },
    info:    { DEFAULT: "hsl(var(--info))",    foreground: "hsl(var(--info-foreground))" },
  },
};
