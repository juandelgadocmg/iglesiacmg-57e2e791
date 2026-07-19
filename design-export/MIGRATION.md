# Migración — CMG Admin → Discipulando Naciones

## 1. Fuentes
Pega el contenido de `fonts.html` dentro del `<head>` de `index.html`.

## 2. Tokens + utilities
Reemplaza `src/index.css` por `design-export/index.css`.
Busca los bloques `/* PALETA — reemplazar con Discipulando Naciones */`
y pega tus valores HSL actuales (solo los tokens marcados).
El resto (superficies, sombras, sidebar, KPI, motion) NO se toca.

## 3. Tailwind
Abre `tailwind.config.ts` y fusiona `theme.extend` con
`design-export/tailwind.config.snippet.ts`. Si ya usas shadcn no hay conflicto:
solo añade `fontFamily`, `boxShadow` y `borderRadius`.

## 4. Componentes de layout
Copia:
- `components/AppSidebar.tsx` → `src/components/layout/AppSidebar.tsx`
- `components/AppTopBar.tsx`  → `src/components/layout/AppTopBar.tsx`
- `components/ModuleHero.tsx` → `src/components/shell/ModuleHero.tsx`

Ajusta los imports de rutas/hook de auth a los de tu proyecto.
La estética (alturas 14/64/236px, `sidebar-link`, chip breadcrumbs,
gradientes de hero) se hereda automáticamente vía tokens.

## 5. Primitivos
Copia `components/primitives/*` a `src/design-system/primitives/`.
Reemplaza tus botones/tarjetas actuales de a poco por estos
para heredar sombras `shadow-elev-*`, radios `rounded-xl` y focus ring premium.

## 6. Verificación visual
- El fondo debe verse suave (`bg-surface-0`), no blanco puro.
- Sidebar con label en mayúsculas + indicador vertical de acento.
- Hero de módulo con gradiente diagonal y patrón SVG sutil.
- Botones con sombra `elev-2` y hover que sube 1px.
- Focus ring en 2px con halo del color de tu paleta.

Si algo se ve "plano", casi siempre falta pegar un token de superficie o de sombra.
