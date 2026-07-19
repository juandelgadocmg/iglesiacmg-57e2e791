# CMG Admin — Portable Style Kit (para Discipulando Naciones)

Paquete portable con **toda la línea visual de CMG Admin** (DOXA Design System) lista
para pegar en Discipulando Naciones **conservando tu paleta de colores actual**.

Qué incluye:

```
design-export/
├── README.md                ← este archivo
├── MIGRATION.md             ← pasos concretos para instalar
├── index.css                ← tokens + utilities (color = placeholder)
├── tailwind.config.snippet.ts   ← extend {} listo para fusionar
├── fonts.html               ← <link> de Sora + Manrope
└── components/
    ├── ModuleHero.tsx       ← hero por módulo con gradiente + patrón
    ├── AppSidebar.tsx       ← sidebar Linear-style (colapsable)
    ├── AppTopBar.tsx        ← header con breadcrumbs + command bar trigger
    └── primitives/          ← Button, Card, KpiCard, Badge, Chip, EmptyState
```

**Regla clave:** copia `index.css` tal cual salvo los bloques `/* PALETA */`
donde debes pegar tus HSL actuales de Discipulando Naciones.
Todo lo demás (surfaces, sombras, radios, tipografía, sidebar, KPI, focus ring,
scrollbar, motion, print) queda idéntico a CMG Admin y se re-tinta solo con tu paleta.
