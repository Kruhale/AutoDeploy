# Styles architecture — ITCSS

AutoDeploy's styles follow [ITCSS](https://itcss.io/) (Inverted Triangle CSS), which organizes selectors into layers from lowest to highest specificity. The single orchestrator is `src/styles.scss`, which loads the layers in strict order.

## The 7 layers

```
00-settings     · project variables: Sass breakpoint vars
                  ($breakpoint-*) and ALL CSS Custom Properties
                  (:root { --amarillo-normal: ... } + .tema-claro).
01-tools        · reusable mixins, functions and keyframes/animations.
02-generic      · CSS reset.
03-elements     · base styles on HTML tags (button, input, a, …).
04-layout       · page structure (header, main, footer, grid).
05-components   · concrete BEM blocks (cards, sections, pages).
06-utilities    · .u-* helpers (last layer, they win by cascade order).
```

Any new file is added to `styles.scss` inside its section, never before or after layers that are already imported.

## Sass variables vs CSS Custom Properties

**This distinction underpins the ITCSS load order, so it is worth being clear about**:

| | Sass variables (`$var`) | Custom Properties (`var(--var)`) |
|---|--------------------------|-----------------------------------|
| Syntax | `$breakpoint-md: 768px;` | `--amarillo-normal: hsl(47, 86%, 56%);` |
| When they resolve | **At compile time** (Sass build) | **At runtime** (every browser repaint) |
| Do they emit CSS? | Not by themselves | Yes, they ship in the bundle as `:root { --x: y; }` |
| Does import order matter? | **Yes**. Using them before declaring them breaks the build. | **No**. The browser resolves `var()` against the document's final cascade, regardless of the order it arrived in the CSS. |
| Can they change at runtime? | No (they are substituted text) | Yes (`document.documentElement.style.setProperty(...)`, themes, media queries) |
| Correct ITCSS layer | **Settings (00)** — `_css-variables.scss` | **Settings (00)** — `_variables.scss` |

**Project convention**: both categories live in `00-settings`, but in separate files. `_css-variables.scss` contains only the Sass breakpoint vars, because the mixins in `01-tools/_mixins.scss` need them at compile time. `_variables.scss` holds the single source of truth of the design system: all CSS Custom Properties (colors, backgrounds, text, borders, typography, spacing, radii, shadows, transitions, z-index, layout) under `:root {}`, plus the light-mode overrides under `.tema-claro {}`. Any reusable value in the project comes from there.

A useful technical clarification: for `var()` the import order does not matter (the browser resolves the cascade at runtime), but conceptually the variables are the system's **Settings**, so that is where it makes sense to keep them all centralized. Import order does matter for the Sass vars: that is why `_css-variables.scss` loads before `_mixins.scss`.

## Where each thing goes

| If what you are writing is… | Layer | Example |
|------------------------------|------|---------|
| A Sass breakpoint var (`$breakpoint-md: 768px`) | `00-settings` | `_css-variables.scss` |
| A Custom Property visible to the browser (`--amarillo-normal`, `--spacing-size-l`, `--radius-m`...) | `00-settings` | `_variables.scss` |
| A mixin with `@content` or parameters | `01-tools` | `_mixins.scss` |
| A function (`@function`) that returns a value | `01-tools` | `_funciones.scss` |
| A keyframe or a global animation class | `01-tools` | `_animaciones.scss` (`.animar`, `.revelar`, `.spinner`, `.aparecer`) |
| A reset or a global `box-sizing: border-box;` | `02-generic` | `_reset.scss` |
| Base styles on `button`, `input`, `a`… without a class | `03-elements` | `_buttons.scss`, `_forms.scss` |
| Page structure: header, sidebar, main grid | `04-layout` | `_layout.scss` |
| A component or section with its BEM block (`.tarjeta-X`, `.pagina-X`) | `05-components` | `_pagina-login.scss`, `_tarjeta-servidor.scss` |
| A cross-cutting helper like `.u-oculto`, `.u-flex-centro` | `06-utilities` | `_visibilidad.scss`, `_flex.scss`, `_display.scss`, `_z-index.scss`, `_saltar-contenido.scss` |

## Available mixins (`01-tools/_mixins.scss`)

| Mixin | What it is for | Usage example |
|---|---|---|
| `@include movil-pequeno` | Media query `max-width: $breakpoint-sm` (576px) | `@include movil-pequeno { ... }` |
| `@include movil` | Media query `max-width: $breakpoint-md` (768px) | `@include movil { padding: 1rem; }` |
| `@include tablet` | Media query `max-width: $breakpoint-lg` (992px) | `@include tablet { ... }` |
| `@include escritorio` | Media query `min-width: $breakpoint-lg` | `@include escritorio { ... }` |
| `@include escritorio-grande` | Media query `min-width: $breakpoint-xl` (1200px) | |
| `@include entre($a, $b)` | Custom range | `@include entre(720px, 960px) { ... }` |
| `@include solo-tactil` | `(hover: none) and (pointer: coarse)` | Touch devices (phone/tablet without a mouse) |
| `@include solo-puntero-fino` | `(hover: hover) and (pointer: fine)` | Only when a precise pointer (mouse) is present |
| `@include movimiento-reducido` | `prefers-reduced-motion: reduce` | Disables animations for motion-sensitive users |
| `@include contraste-alto` | `prefers-contrast: more` | Reinforce borders/text |
| `@include esquema-claro` / `oscuro` | `prefers-color-scheme: ...` | Fallback when no theme switcher is present |
| `@include contenedor-pequeno/mediano/grande` | Container queries | Requires `container-type: inline-size` on the ancestor |
| `@include flex-centro` | `display:flex; align-items:center; justify-content:center;` | The most used mixin in the project |
| `@include flex-entre` | Flex with `space-between` | |
| `@include flex-columna` | Column flex | |
| `@include flex-envoltura` | Flex with `flex-wrap: wrap` | |
| `@include grid-auto($min, $hueco)` | Responsive `auto-fit + minmax` grid | `@include grid-auto(16rem)` |
| `@include contenedor($ancho)` | Max width + centered margins | `@include contenedor(64rem)` |
| `@include transicion($props...)` | Transition with the unified timing function | `@include transicion(opacity, transform)` |
| `@include foco-visible` | `:focus-visible` with the standard yellow outline | Inside a selector |
| `@include truncar($lineas)` | Multi-line ellipsis | `@include truncar(2)` |
| `@include centrado-absoluto` | `position:absolute; top:50%; left:50%; translate(-50%,-50%)` | |
| `@include visualmente-oculto` | sr-only pattern (visually hidden, accessible) | For invisible labels |
| `@include disabled` | `opacity:0.5; cursor:not-allowed; pointer-events:none;` | In `&:disabled { @include disabled; }` |
| `@include tarjeta-base` | Card with the project's padding/border/radius | |
| `@include tarjeta-interactiva` | Card + hover + focus-within | `.mi-tarjeta { @include tarjeta-interactiva; }` |
| `@include glass($fondo)` | Backdrop-filter blur (glass effect) | |
| `@include enlace-subrayado` | Animated underline on hover/focus | |

## Available functions (`01-tools/_funciones.scss`)

Functions return a **value**: unlike mixins, they do not inject CSS rules but are used as a literal inside a declaration.

| Function | Returns | Example |
|---|---|---|
| `rem($px)` | Pixels → `rem` (base 16) | `padding: rem(24);` → `1.5rem` |
| `em($px, $contexto: 16)` | Pixels → `em` relative to a context | `padding: em(12, 14);` |
| `tomar($mapa, $clave)` | Safe Sass map access (errors if missing) | `color: tomar($colores, primario);` |
| `fluido($min, $max, $vp-min, $vp-max)` | Linear `clamp()` between two viewports | `font-size: fluido(2.5rem, 4.5rem);` |
| `token-color($nombre)` | `var(--$nombre)` | `color: token-color(texto-claro);` |
| `token-espacio($nivel)` | `var(--spacing-size-$nivel)` | `padding: token-espacio(2xl);` |
| `token-radio($nivel)` | `var(--radius-$nivel)` | `border-radius: token-radio(l);` |
| `token-sombra($nivel)` | `var(--shadow-$nivel)` | `box-shadow: token-sombra(md);` |
| `token-z($capa)` | `var(--z-$capa)` | `z-index: token-z(modal);` |
| `token-duracion($vel)` | `var(--duration-$vel)` | `transition-duration: token-duracion(base);` |
| `contraste-sobre($color)` | Black or dark depending on background luminosity | `color: contraste-sobre($fondo);` |

## When to create a mixin vs a function vs a utility

- **Mixin** (`@mixin`): when you reuse a **block of CSS declarations** (or need `@content`). E.g. media queries (`@include movil { ... }`), patterns (`@include flex-centro`), effects (`@include glass`).
- **Function** (`@function`): when you reuse a **computation or derived value**. E.g. unit conversion (`rem(24)`), generating a fluid `clamp()` (`fluido(2.5rem, 4.5rem)`).
- **Utility** (`.u-*` in `06-utilities/`): when you reuse a rule directly from HTML. E.g. `<a class="u-saltar-contenido">`, `<section class="u-flex-centro">`.

A simple rule of thumb:

> If you use it in SCSS and it needs `@content` or several properties → mixin.
> If you use it in SCSS and it returns a single value → function.
> If you use it in HTML without touching the component → utility.

## Required states per component type

Every interactive component must define its states explicitly. Screen readers and keyboard navigation depend on this.

| Component | Minimum states | Notes |
|---|---|---|
| Button (`button`, `<a class="boton">`) | `:hover`, `:active`, `:focus-visible`, `:disabled` | `:focus-visible` for the outline, not `:focus` (which also fires on mouse) |
| Input / textarea / select | `:focus`, `:focus-visible`, `:disabled`, `:invalid:not(:focus)` | Show the red border on `:invalid` only when the field is NOT focused |
| Clickable card / row | `:hover`, `:active`, `:focus-within` | `:focus-within` because focus lands on child elements (links/buttons), not on the card |
| Navigation item | `:hover`, `:focus-visible`, `[aria-current="page"]` | `aria-current` is applied by the router at runtime |
| Link | `:hover`, `:focus-visible` | + `&::after` with animated underline for prominent links |
| Modal / overlay | `:focus-within`, JS focus trap | + `aria-modal="true"` and `role="dialog"` in the HTML |

## Responsive: strategies used in the project

The project **deliberately combines several approaches**, applying each one where it fits best:

1. **Mobile-first with mixins** (the majority): `@include movil { ... }` when the breakpoint matches one of the system's (576/768/992/1200/1400). Centralized in `_mixins.scss`.
2. **Direct `@media` with a Sass var** (justified exception): when the block sits at root level (not nested under a selector, e.g. `_banner-cookies.scss`) or uses a one-off breakpoint outside the system (`960px`, `720px`, `60rem`, `56.25rem`, `36rem`).
3. **Fluid typography with `fluido()`** (`01-tools/_funciones.scss`): generates a `clamp()` that scales between two viewports without breakpoints. Used in the hero (`_seccion-bienvenida.scss`) and main headings.
4. **Manual `clamp()`** (occasional): when the value is very specific and not reused, keeping a direct `clamp(...)` is clearer than wrapping it in `fluido()`.
5. **Container queries with `@container`**: in `_tarjeta-servidor.scss`, `_tarjeta-estadistica.scss`, `_seccion-precios.scss` (plan card) and `_galeria-capturas.scss`. The component adapts to its container's width (sidebar, grid, detail panel, modal), not the viewport's. Requires `container-type: inline-size; container-name: ...;` on the root block.
6. **Responsive images with `<picture>`/`srcset`/`sizes`/`loading="lazy"`**: on informative images with multiple variants, and above the fold with declared `width`/`height` to avoid layout shift.

## Accessibility: applied WCAG checklist

The project targets **WCAG 2.1 level AA**. Mechanisms in place:

- **Semantic HTML**: `<header>`, `<main>`, `<nav>`, `<aside>`, `<footer>`, `<section aria-labelledby>`, `<article>`. Every wrapper without semantic meaning is replaced by the appropriate HTML element, never by generic containers.
- **Labeled landmarks**: every `<nav>` and `<section>` without a visible heading carries `aria-label` or `aria-labelledby`.
- **Skip link**: `.u-saltar-contenido` as the first focus on page load; jumps to `<main id="contenido-principal" tabindex="-1">`.
- **`aria-current="page"`**: on each sidebar and bottom-bar item when it matches the active route (`routerLinkActive` + `[attr.aria-current]`).
- **Visible focus**: `:focus-visible` on all interactive elements with a 2px yellow outline and 2px offset. Never removed without an alternative.
- **`prefers-reduced-motion`**: `@include movimiento-reducido` in `_animaciones.scss` disables `.animar`, `.animar-hijos`, `.revelar`, `.aparecer` and caps `*` at 0.01ms.
- **`prefers-color-scheme`**: the `ThemeService` automatically applies the system theme on first launch and syncs with OS changes as long as the user has not chosen manually.
- **Contrast**: palette designed for WCAG AA (main text over background ≥ 4.5:1). Verified with WebAIM Contrast Checker / Stark.
- **Images**: meaningful `alt` on informative images; `alt=""` + `aria-hidden="true"` on decorative ones.
- **Icons**: decorative FontAwesome and SVG icons carry `aria-hidden="true"`; icons that act on their own get an `aria-label` on the parent `<button>`/`<a>`.
- **Forms**: every `<input>` with its `<label>` (associated by wrapping or `for/id`), `:invalid` with visual feedback, `<fieldset>` + `<legend>` when the group is semantically related.

## BEM conventions

- **Sass nesting with `&`** in the `05-components` blocks. The root block contains its elements as `&__elemento` and its modifiers as `&--modificador`:

  ```scss
  .tarjeta-servidor {
    /* block properties */

    &__cabecera { /* ... */ }
    &__nombre   { /* ... */ }

    &--destacada { /* ... */ }
  }
  ```

- **Canonical order** inside the root block: properties → elements `&__x` → modifiers `&--x` → states `:hover/:focus-visible/:active/:focus-within` → container/media queries.
- **Class names in Spanish**, consistent with the rest of the codebase's identifiers.
- **`.u-` prefix** for utilities (`.u-flex-centro`, `.u-saltar-contenido`).
- **Zero forced declarations in the cascade**: if a utility does not beat a component, the ITCSS layer order is wrong and gets fixed there, not by patching individual rules. Reduced-motion accessibility is solved with `@media (prefers-reduced-motion: no-preference)` (the rules are simply never generated), not with forced overrides.
- **No deep nesting** (>3 levels); every BEM element nests directly under the root block.
- **Mobile first** with `@mixin movil`, `@mixin tablet`, `@mixin escritorio` from `01-tools/_mixins.scss`.

## Interactive states: full example

```scss
@use "../01-tools/mixins" as *;

.tarjeta-servidor {
  container-type: inline-size;
  @include tarjeta-base;
  @include transicion(transform, box-shadow, border-color);

  &__cabecera { /* ... */ }
  &__metricas { /* ... */ }

  &--destacada { border-color: var(--amarillo-normal); }

  &:hover {
    transform: translateY(-0.125rem);
    box-shadow: var(--shadow-hover-amarillo);
    border-color: var(--amarillo-normal-hover);
  }

  &:active {
    transform: translateY(0);
    box-shadow: var(--shadow-sm);
  }

  &:focus-within {
    outline: 2px solid var(--amarillo-normal);
    outline-offset: 2px;
  }

  @include contenedor-pequeno {
    &__ip { display: none; }
  }

  @include contenedor-grande {
    &__metricas { display: grid; grid-template-columns: repeat(2, 1fr); }
  }
}
```

## Pages: standard pattern

Every Angular page follows this pattern:

1. The component lives in `src/app/pages/<page>/<page>.{ts,html,scss}`.
2. Its local `.scss` is **empty** or nearly so (a comment pointing to the global partial).
3. The actual styles live in `src/styles/05-components/_pagina-<page>.scss` with the BEM block `.pagina-<page>__*`.
4. That partial is imported in `styles.scss` inside the `// 05 · Components` section.

### No exceptions

All pages follow the "empty local scss + global partial in 05-components/" pattern. The last remaining exception (`pages/cuenta/cuenta.scss`, ~1800 lines with `:host`) was migrated to `05-components/_pagina-cuenta.scss` on 2026-05-22: the `:host { display: block; }` block became `app-cuenta { display: block; }`, which targets the component's host element without needing local ViewEncapsulation.

## How to add a new page

1. Create `src/styles/05-components/_pagina-foo.scss` with a `.pagina-foo` BEM block, nesting with `&__elemento` and `&--modificador`.
2. If you need mixins or functions, add `@use "../01-tools/mixins" as *;` and/or `@use "../01-tools/funciones" as *;` at the top.
3. Add `@use "styles/05-components/pagina-foo";` in `styles.scss`.
4. Create `src/app/pages/foo/foo.scss` with just a comment `// Styles live in styles/05-components/_pagina-foo.scss`.
5. In `@Component`, point `styleUrl: "./foo.scss"` so Angular does not complain.

## How to add a shared component

1. Create `src/styles/05-components/_<name>.scss` with the nested BEM block.
2. Add the `@use` in the components section of `styles.scss`.
3. The Angular component can use the classes directly; they are already global.

## How to add a utility

1. Decide whether it fits in visibilidad / texto / espaciados / flex / display / z-index / saltar-contenido, or create a new file in `06-utilities/`.
2. If it is a new file, register it in `styles.scss` under `// 06 · Utilities`.
3. Use the `.u-` prefix and a descriptive Spanish name, matching the project's naming convention.
