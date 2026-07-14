# Visual Design and CSS Architecture — AutoDeploy

This document describes the visual design system and CSS architecture of the project. Each section covers an architectural decision, explains the reasoning behind it, and links to the actual code.

> **Live application**: https://autodeploy.kruhale.com
> **Repository**: https://github.com/Kruhale/AutoDeploy
> **Figma**: https://www.figma.com/design/sNOYtZb7Oclv3pFLv5xY4Z/AutoDeployService?node-id=338-18&t=MWyZEmhlbzjXqj2D-1

## Table of contents

1. [CSS architecture and visual communication](#1-css-architecture-and-visual-communication)
2. [Semantic HTML and structure](#2-semantic-html-and-structure)
3. [UI component system](#3-ui-component-system)
4. [Responsive design](#4-responsive-design)
5. [Media optimization](#5-media-optimization)
6. [Theming system](#6-theming-system)
7. [Full application and deployment](#7-full-application-and-deployment)

---

## 1. CSS architecture and visual communication

### 1.1 Visual communication principles

| Principle | How AutoDeploy applies it |
|---|---|
| **Hierarchy** | Full typographic scale (`--font-size-xs` to `--font-size-5xl`) + font weights (`400/500/600/700/800/900`). Hero headings use `fluido(2.5rem, 4.5rem)` so they stand out while scaling with the viewport. Body text stays at `1rem` (`--font-size-base`) and metadata at `0.6875rem` (`--font-size-sm`). |
| **Contrast** | Deliberately dark palette with a yellow accent (`--amarillo-normal: hsl(47, 86%, 56%)`) over `hsl(30, 5%, 7-16%)` backgrounds. Primary text contrast `--texto-claro` (`hsl(40, 33%, 91%)`) over `--fondo-tarjeta` (`hsl(32, 4%, 16%)`) verified with WebAIM (>4.5:1, WCAG AA). |
| **Alignment** | Page layouts with CSS Grid (`grid-template-columns: minmax(0, 1fr)` and `auto-fit + minmax`). Components with Flexbox via `@include flex-centro/entre/columna`. No loose floats. |
| **Proximity** | 15-step spacing system (`--spacing-size-xxs` to `--spacing-size-8xl`). Rules: 8-12px between closely related elements, 16-24px between related elements, 32-48px between sections, 64px+ between major blocks. |
| **Repetition** | Design tokens centralized in `00-settings/_variables.scss` — every color, typography, spacing, shadow, radius and duration value comes from a single source. Change `--amarillo-normal` and the whole app follows. |

### 1.2 CSS methodology: ITCSS + BEM

#### ITCSS — Inverted Triangle CSS

7 layers loaded in order of increasing specificity. The single orchestrator is `src/styles.scss`:

```
00-settings    · project variables: Sass breakpoint vars
                 (_css-variables.scss) and all CSS Custom Properties
                 (_variables.scss with :root and .tema-claro).
01-tools       · reusable mixins, functions, animations.
02-generic     · CSS reset.
03-elements    · base styles on HTML tags (button, input, ...).
04-layout      · page structure (header, main, footer, grids).
05-components  · concrete BEM blocks (40+ partials).
06-utilities   · .u-* helpers (last layer, wins by source order).
```

> **Project convention**: `00-settings/_variables.scss` is the single source of truth for the design system. All browser-visible tokens (colors, backgrounds, text, borders, typography, spacing, radii, shadows, transitions, z-index, layout) live there under `:root {}`, with light-mode overrides under `.tema-claro {}`. Sass breakpoint vars stay separate in `_css-variables.scss` because mixins consume them at compile time. Full details in `autodeploy/src/styles/README.md`.

#### BEM — Block Element Modifier

Every component is a BEM block with elements (`&__elemento`) and modifiers (`&--modificador`) nested with `&`:

```scss
.tarjeta-servidor {
  /* block properties */

  &__cabecera { /* element */ }
  &__nombre   { /* element */ }
  &--destacada { /* modifier */ }

  &:hover { /* state */ }
  &:focus-within { /* state */ }
}
```

This convention guarantees collision-free CSS resolution even though styles are global. No decorative `<div>` is used in HTML; semantic elements (`<section>`, `<article>`, `<aside>`, `<hr>`, `<nav>`) take its place.

### 1.3 ITCSS file organization

```
src/styles/
├── 00-settings/
│   ├── _fonts.scss          ← @import Outfit + JetBrains Mono
│   ├── _css-variables.scss  ← Sass vars: $breakpoint-sm/md/lg/xl/2xl
│   └── _variables.scss      ← :root { --x } + .tema-claro { --x }
├── 01-tools/
│   ├── _mixins.scss         ← 31 mixins
│   ├── _funciones.scss      ← 11 functions
│   └── _animaciones.scss    ← keyframes + .animar/.revelar/.spinner
├── 02-generic/
│   └── _reset.scss          ← reset + theme transition
├── 03-elements/
│   ├── _buttons.scss        ← .boton--primario/secundario/ghost/peligro
│   └── _forms.scss          ← .campo, .toggle, .interruptor
├── 04-layout/
│   └── _layout.scss         ← .disposicion-app
├── 05-components/           ← 40+ BEM partials
│   ├── _seccion-bienvenida.scss
│   ├── _barra-lateral.scss
│   ├── _panel-principal.scss
│   ├── _tarjeta-servidor.scss
│   ├── _tarjeta-estadistica.scss
│   ├── _pagina-login.scss
│   ├── _pagina-billing.scss
│   └── ...
├── 06-utilities/
│   ├── _visibilidad.scss
│   ├── _texto.scss
│   ├── _espaciados.scss
│   ├── _flex.scss
│   ├── _display.scss
│   ├── _z-index.scss
│   └── _saltar-contenido.scss ← skip link
└── README.md                ← full architecture guide
```

### 1.4 Design token system

Tokens live in `00-settings/_variables.scss` as Custom Properties under `:root {}` with overrides in `.tema-claro {}`.

**Documented families**:

| Family | Variables | Decision |
|---|---|---|
| Backgrounds | `--fondo-normal`, `--fondo-oscuro`, `--fondo-tarjeta`, `--fondo-negro`, `--fondo-negro-medio`, `--fondo-cta-claro`, `--fondo-cabecera`, `--negro-cta` | Grayscale with a warm tint (HSL 28-34°) so it pairs with the yellow accent. |
| Accent | `--amarillo-normal`, `--amarillo-normal-hover` | The product's visual identity. Single primary accent; everything else is a state color. |
| Text | `--texto-claro`, `--texto-medio`, `--texto-apagado` | 3 levels. Contrast verified WCAG AA over `--fondo-tarjeta`. |
| Borders | `--borde-normal`, `--borde-suave` | Use transparency so they blend into any background. |
| States | `--verde-normal`, `--rojo-normal`, `--rojo-critico`, `--naranja-normal`, `--azul-normal`, `--cyan-normal`, `--teal-normal` | Semantic colors (success/error/warning/info). |
| Transparencies | `--amarillo-transparente-008/030`, `--cyan-transparente-008`, `--negro-transparente-020/040` | Soft hovers and overlays. |
| Typography | `--font-primary` (Outfit), `--font-secondary`, `--font-mono` (JetBrains Mono), `--font-size-xs..5xl` (11 levels), `--font-weight-normal..black` (6 weights), `--line-height-tight/normal/relaxed` | Outfit for its on-screen legibility and weight support up to black. JetBrains Mono for terminals/snippets. |
| Spacing | `--spacing-size-xxs..8xl` (15 levels) | Multiples of 4px and 8px to keep a harmonic grid. |
| Border-radius | `--radius-xs..4xl`, `--radius-full` | Components default to radius `m` (0.5rem), `l` for cards, `full` for badges. |
| Shadows | `--shadow-sm/md/lg`, `--shadow-glow-amarillo`, `--shadow-hover-amarillo`, `--shadow-hover-cyan` | Light glow shadow for warm hovers; sm/md/lg for progressive elevation. |
| Z-index | `--z-sidebar (50)`, `--z-header (100)`, `--z-dropdown (200)`, `--z-modal (300)`, `--z-toast (400)` | Explicit scale: never magic numbers in components. |
| Duration | `--duration-fast (150ms)`, `--duration-base (200ms)`, `--duration-slow (300ms)` | Every transition in the project goes through one of the three. |

### 1.5 Mixins and functions

`01-tools/_mixins.scss` defines **31 mixins** organized by category. The most used:

- **Responsive viewport**: `@include movil`, `tablet`, `escritorio`, `entre($a, $b)`.
- **Container queries**: `@include contenedor-pequeno/mediano/grande`.
- **User preferences**: `@include movimiento-reducido`, `solo-tactil`, `solo-puntero-fino`, `contraste-alto`, `esquema-claro/oscuro`.
- **Layout**: `@include flex-centro/entre/columna/envoltura`, `grid-auto($min, $hueco)`, `contenedor($ancho)`.
- **Effects**: `@include transicion(props...)` (unified timing function), `glass($fondo)`, `enlace-subrayado`.
- **Accessibility**: `@include foco-visible`, `visualmente-oculto`, `disabled`.
- **Base components**: `@include tarjeta-base`, `tarjeta-interactiva`.

`01-tools/_funciones.scss` defines **11 Sass functions**:

- **Conversion**: `rem($px)`, `em($px, $ctx)`.
- **Maps**: `tomar($mapa, $clave)` — errors if the key does not exist.
- **Fluid typography**: `fluido($min, $max, $vp-min, $vp-max)` generates a linear `clamp()`.
- **Token shortcuts**: `token-color`, `token-espacio`, `token-radio`, `token-sombra`, `token-z`, `token-duracion`.
- **Accessibility**: `contraste-sobre($color)` returns light or dark text depending on the background's HSL luminosity.

Full table with purpose and usage examples in `autodeploy/src/styles/README.md`.

### 1.6 ViewEncapsulation in Angular

Decision: **`ViewEncapsulation.Emulated`** (Angular's default) combined with **global styles in `styles/05-components/`**.

| Layer | Encapsulation | Why |
|---|---|---|
| `00-settings`, `01-tools`, `02-generic` | Global | Variables, mixins and reset must apply to the whole document. Custom Properties pierce Shadow DOM, so even if a component switched to `ShadowDom` tomorrow, tokens would still reach it. |
| `03-elements`, `04-layout`, `05-components`, `06-utilities` | Global | Shared across pages. Encapsulating each one would create massive duplication with no benefit. |
| Angular components with local `.scss` | `Emulated` | Only `pages/cuenta/cuenta.scss` keeps local styles (it needs `:host` for specific reasons). Every other component has an empty `.scss` that defers to the global styles. |

Rationale: this is a single-maintainer project, and maximum visual consistency is the priority. A hybrid approach (global ITCSS + encapsulated UI components) makes sense for a large team; here it would be unnecessary bureaucracy.

---

## 2. Semantic HTML and structure

### 2.1 Semantic elements used

| Element | Use in AutoDeploy |
|---|---|
| `<header>` | Site header (`<app-header>` on the public landing) and in the authenticated app: `disposicion-app__cabecera-movil` (mobile, with hamburger + logo + notification bell) and `disposicion-app__cabecera-desktop` (desktop, with theme toggle + notification bell + account icon). Sidebar footer (`barra-lateral__inferior`). |
| `<nav>` | 5+ instances, all with a distinctive `aria-label`: main (sidebar), header, product footer, legal footer, support footer, social links, breadcrumbs. |
| `<main>` | One per route, with `id="contenido-principal"` and `tabindex="-1"` so the skip link can land on it. |
| `<article>` | Notifications, dropdown posts. |
| `<section>` | Thematic groupings with a heading or `aria-label`/`aria-labelledby`. If there is no heading, it is switched to a `<div>` or given an accessible label. |
| `<aside>` | Authenticated app sidebar and secondary elements. |
| `<footer>` | Global page footer, sidebar footer (user info). |
| `<figure>` + `<figcaption>` | Accessible screenshot gallery (`galeria-capturas` component in `components/shared/galeria-capturas/`). |
| `<hr>` | Decorative separators with `aria-hidden="true"`. |
| `<button>` | Any clickable element that does not navigate (including the modal backdrop with `tabindex="-1"`). |
| `<a>` | Navigation links. |

**Project rule**: no bare `<div>`. Every wrapper without semantic meaning must be a `<section aria-label="...">`, `<article>`, `<aside>` or the appropriate HTML element. This prevents unlabeled `<section>` wrappers and improves accessibility.

### 2.2 Heading hierarchy

Rules:
- A single `<h1>` per route, provided by the inner page (login: "Inicia sesión", dashboard: "Panel principal"…).
- `<h2>` for main sections within a page.
- `<h3>` for subsections.
- No skipped levels: an `<h2>` is followed by an `<h3>`, never an `<h5>`.
- Sidebars do NOT add duplicate headings; they use `aria-labelledby` pointing at the visible title.

Example from the sidebar:

```html
<section aria-labelledby="barra-lateral-titulo-1">
  <header class="barra-lateral__seccion__cabecera">
    <span id="barra-lateral-titulo-1">Principal</span>
  </header>
  <ul>...</ul>
</section>
```

### 2.3 Form structure

All forms follow this pattern (see `pagina-login.html`, `pagina-registro.html`, `pagina-contacto.html`):

```html
<form (ngSubmit)="enviar()">
  <fieldset>
    <legend>Datos de acceso</legend>

    <article class="campo">
      <label class="campo__etiqueta" for="email">Correo electrónico</label>
      <input class="campo__input" id="email" name="email" type="email" required
             aria-describedby="email-pista">
      <p class="campo__pista" id="email-pista">Te enviaremos un código al email.</p>
    </article>
  </fieldset>

  <button type="submit" class="boton boton--primario">Continuar</button>
</form>
```

Details:
- Every `<input>` associated with its `<label for="...">` by `id`.
- `<fieldset>` + `<legend>` when there are related groups.
- `aria-describedby` pointing at the hint; screen readers announce it after the field.
- `:focus`, `:focus-visible` and `:invalid:not(:focus)` handled in `_forms.scss`.

---

## 3. UI component system

### 3.1 Implemented components

| Component | Variants | Sizes | States | File |
|---|---|---|---|---|
| `.boton` | `--primario`, `--secundario`, `--ghost`, `--peligro` | `md` (only one currently) | `:hover`, `:active`, `:focus-visible`, `:disabled` | `03-elements/_buttons.scss` |
| `.campo` (form input) | `__input`, `__textarea`, `__select` | — | `:focus`, `:focus-visible`, `:disabled`, `:invalid:not(:focus)` | `03-elements/_forms.scss` |
| `.toggle` (segmented) | `__opcion`, `__opcion--activa` | — | `:hover`, `:focus-visible`, `:disabled` | `03-elements/_forms.scss` |
| `.interruptor` (switch) | `--activo` | — | `:focus-visible`, `:disabled` | `03-elements/_forms.scss` |
| `.tarjeta-servidor` | `--destacada` | container queries (small/medium/large) | `:hover`, `:active`, `:focus-within` | `05-components/_tarjeta-servidor.scss` |
| `.tarjeta-stat` | accent `--primario/teal/cyan/exito/advertencia` | container queries (small/large) | `:hover`, `:active`, `:focus-within` | `05-components/_tarjeta-estadistica.scss` |
| `.tarjeta-plan` | `--destacado` | container queries (small/large) | `:hover`, `:active`, `:focus-within` | `05-components/_seccion-precios.scss` |
| `.barra-lateral` | `--abierta`, `--colapsada` | — | `:hover`, `:focus-visible`, `[aria-current="page"]` | `05-components/_barra-lateral.scss` |
| `.tabla-sitios` | interactive `__fila` | — | `:hover`, `:active`, `:focus-within` | `05-components/_tabla-sitios.scss` |
| `.spinner` | `--grande`, `--cyan`, `--verde` | — | `giro-spinner` animation, 0.8s linear | `01-tools/_animaciones.scss` |

### 3.2 BEM naming in practice

Real example (`_tarjeta-servidor.scss`):

```scss
.tarjeta-servidor {           // BLOCK
  container-type: inline-size;
  @include tarjeta-base;

  &__cabecera { ... }         // ELEMENT __cabecera
  &__indicador {              // ELEMENT __indicador
    &--verde { ... }          // element MODIFIER
    &--naranja { ... }
    &--rojo { ... }
  }
  &__nombre { ... }

  &--destacada { ... }        // block MODIFIER

  &:hover { ... }             // STATE
  &:focus-within { ... }      // STATE

  @include contenedor-pequeno {  // CONTAINER QUERY
    &__ip { display: none; }
  }
}
```

Rules kept across every partial in `05-components/`:
1. The root block contains properties + elements + modifiers + states + container/media queries.
2. Modifiers use `&--`, elements use `&__`.
3. No flat BEM (every element sits under the block's `&`).
4. No deep nesting: every BEM element is a direct child of the root block, never nested under another element.

### 3.3 Style guide

The `/style-guide` page is implemented in `autodeploy/src/app/pages/style-guide/` (commit `ad00511`). It is publicly reachable at `https://autodeploy.kruhale.com/style-guide` and shows every component with its variants and states (typography, palette, spacing, buttons, forms, cards, navigation, feedback, animations). It doubles as visual documentation and quick regression testing: any change to a token or component is instantly visible on that page.

---

## 4. Responsive design

### 4.1 Defined breakpoints

Sass variables in `00-settings/_css-variables.scss`:

```scss
$breakpoint-sm:  576px;   // large phone
$breakpoint-md:  768px;   // tablet
$breakpoint-lg:  992px;   // small desktop
$breakpoint-xl:  1200px;  // standard desktop
$breakpoint-2xl: 1400px;  // wide desktop
```

Decision: 5 breakpoints covering the most common viewports (iPhone, iPad portrait, 13" MacBook, 1440p desktop). They match Bootstrap/Tailwind so external developers recognize them immediately.

### 4.2 Mobile-first strategy

General pattern: base styles target mobile, and `@include escritorio { ... }` adds adjustments for larger sizes. Exception: when a desktop-first UI is more natural (a sticky sidebar that becomes fixed on mobile), `@include movil { ... }` holds the overrides.

Example (`_barra-lateral.scss`):

```scss
.barra-lateral {
  position: sticky;
  top: 0;
  height: 100vh;

  @include movil {
    position: fixed;
    transform: translateX(-100%);
  }
}
```

### 4.3 Container queries

Implemented in four components so the same block adapts to the width of its parent container, not the viewport: `_tarjeta-servidor.scss`, `_tarjeta-estadistica.scss`, `_seccion-precios.scss` (tarjeta-plan) and `_galeria-capturas.scss`.

```scss
.tarjeta-servidor {
  container-type: inline-size;
  container-name: tarjeta-servidor;

  @include contenedor-pequeno { &__ip { display: none; } }
  @include contenedor-grande  {
    &__metricas { display: grid; grid-template-columns: repeat(2, 1fr); }
  }
}
```

Benefit: the card lives in the sidebar (~280px), the dashboard grid (~340px) and the detail panel (>600px), and it reacts to the space it actually has without any viewport change. The screenshot gallery uses the same technique to go from 1 to 2-3 columns depending on the container it is placed in (welcome page, a section inside a panel, etc.).

### 4.4 Main adaptations (mobile / tablet / desktop)

| Area | Mobile (<768px) | Tablet (768-992px) | Desktop (>992px) |
|---|---|---|---|
| App header | `cabecera-movil` with hamburger + logo + bell | Sidebar appears; the mobile header disappears | Fixed sidebar + `cabecera-desktop` with theme toggle + bell + account icon |
| Sidebar | `fixed` with `transform: translateX(-100%)` and modal backdrop | Lateral `sticky` | Lateral `sticky`, optionally collapsible |
| Hero (seccion-bienvenida) | One column | One column | Two columns |
| Dashboard cards | 1 column | 2 columns | 3+ columns with container queries |
| Footer columns | Vertical stack | 2 columns | 4 columns |
| Typography | `fluido(2.5rem, 4.5rem)` | clamp scale | clamp scale |

### 4.5 Implemented pages

- `bienvenida` (public landing)
- `login`, `registro`
- `dashboard` (main panel)
- `gestion-servidor`, `nuevo-despliegue`, `onboarding`
- `terminal-selector`, `terminal-ssh`, `logs-terminal`
- `asistente-ia`
- `networking`, `firewall`, `backups`
- `billing`, `pago`, `confirmar-free`
- `documentacion`, `recursos`, `comunidad`, `contacto`, `estado`
- `cuenta`
- `aviso-legal`, `politica-privacidad`, `politica-cookies`

### 4.6 Comparative screenshots

Folder `docs/design/capturas/` (to be populated with 375px / 768px / 1280px captures of the main pages). The public deployment at https://autodeploy.kruhale.com lets anyone verify everything live with DevTools.

---

## 5. Media optimization

### 5.1 Chosen formats

| Format | When it is used |
|---|---|
| **SVG** | Logos, icons, decorative illustrations. Lossless vector scaling and minimal size. Base iconography via FontAwesome (web fonts) + inline SVGs for the footer social links. |
| **WebP** | Screenshots and photographs. Better compression than JPG with no visible loss. |
| **PNG** | Main logo (`logo.png`) for favicon and manifest compatibility. SVG migration pending. |

### 5.2 Tools used

- **SVGO** (https://jakearchibald.github.io/svgomg/) for SVGs.
- **Squoosh** (https://squoosh.app/) for JPG/PNG → WebP conversion.
- **ImageOptim** (macOS) for PNGs with transparency.

### 5.3 Optimization results

Table pending: it will be filled with real numbers as screenshots are added to the gallery (`docs/design/capturas/`).

### 5.4 Techniques in use

#### `<picture>` with `srcset` and `sizes`

Pattern applied in the `galeria-capturas` component (`autodeploy/src/app/components/shared/galeria-capturas/`):

```html
<picture>
  <source media="(min-width: 769px)" srcset="captura-dashboard-1200.webp" type="image/webp">
  <img src="captura-dashboard-800.webp"
       alt="Panel principal con tres servidores activos y métricas en vivo"
       loading="lazy"
       width="800" height="500">
</picture>
```

#### `loading="lazy"`

On every image below the fold (gallery, inner sections) to defer download until the user gets there.

### 5.5 CSS animations

`01-tools/_animaciones.scss` defines the reusable animations. Self-imposed rules:
- Only `transform` and `opacity` (the browser composites them on the GPU).
- Duration 150-500ms (except the spinner: 800ms continuous).
- Timing function `cubic-bezier(0.16, 1, 0.3, 1)` (soft ease-out).
- All of them are disabled under `prefers-reduced-motion`.

Available animations:
- `.animar--subir/derecha/escala` (page entrance).
- `.revelar` + variants (scroll reveal with IntersectionObserver).
- `.animar-hijos > *` (child stagger).
- `.spinner` (loading).
- `.aparecer` (quick 0.32s fade, micro-interaction).
- Component-local keyframes (`pulso-estado`, `latido`, `parpadeo-cursor`, `latido-indicador-sidebar`).

---

## 6. Theming system

### 6.1 Theme variables

Two blocks of Custom Properties in `00-settings/_variables.scss`:

```scss
:root {
  /* dark theme (default) */
  --fondo-normal: hsl(30, 4.65%, 10.78%);
  --texto-claro: hsl(40, 33.33%, 91.37%);
  --shadow-md: 0 0.5rem 1.25rem hsla(0, 0%, 0%, 0.2);
  /* ... */
}

.tema-claro {
  /* light-theme overrides */
  --fondo-normal: hsl(40, 18%, 96%);
  --texto-claro: hsl(30, 12%, 12%);
  --shadow-md: 0 0.5rem 1.25rem hsla(0, 0%, 0%, 0.08);
  /* ... */
}
```

Only the tokens that change with the theme are overridden (backgrounds, text, borders, shadows and the header blur). The yellow accent, state colors (green/red) and typography stay the same.

### 6.2 Theme switcher implementation

`autodeploy/src/app/services/theme.service.ts` orchestrates the switch:

1. On first boot it reads `localStorage.tema`. If there is no value, it calls `matchMedia("(prefers-color-scheme: light)")` and applies the system theme.
2. It keeps an `eleccionManual` signal that activates when the user presses the header button.
3. While `eleccionManual === false`, it listens to the `MediaQueryList` `change` event and reacts to live system theme changes.
4. When `eleccionManual === true`, the choice is persisted in `localStorage` and takes precedence over the system. Clearing `localStorage.tema` returns to automatic mode.

The visual control in the header (`app-header`) calls `themeService.alternarTema()`. The switch applies a `.tema-claro` class to `<html>`, and the CSS reset adds a smooth 200ms transition (`background-color`, `color`) that is disabled under `prefers-reduced-motion`.

### 6.3 Screenshots (light and dark mode)

Pending: populate `docs/design/capturas/` with captures of 3 representative pages: landing, dashboard, billing.

---

## 7. Full application and deployment

### 7.1 Current state

- Angular 20 frontend with standalone components, signals, lazy routes.
- Spring Boot 3.4 + Java 21 backend with record DTOs, Spring Security, Spring Data MongoDB.
- MongoDB 8 database.
- WebSockets (Spring + xterm.js) for interactive SSH terminals.
- AI via OpenRouter (configurable model).
- Reverse proxy nginx (container + host).
- Docker image published to GHCR.
- 5 languages (es / en / fr / de / it) with ngx-translate.
- 119/119 Karma+Jasmine tests on the frontend + 38/38 JUnit tests on the backend.

### 7.2 Deployment

- Public URL: **https://autodeploy.kruhale.com**
- GitHub Actions pipeline: CI (build + test) → CD (image build + GHCR push + SSH deploy with `appleboy/ssh-action`).
- TLS terminated by the VPS host nginx with Let's Encrypt.
- HSTS enabled.

### 7.3 Known issues and future improvements

| Area | Issue / Pending |
|---|---|
| WCAG | Automated Lighthouse / WAVE / TAW audits are reproducible with the commands in [`../accessibility/AUDIT.md`](../accessibility/AUDIT.md); the WCAG mechanisms are implemented across the components. |
| Screenshot gallery | The `galeria-capturas` component is ready, but the real images (dashboard, AI assistant, terminal, backups, metrics, firewall) will be generated and uploaded to `autodeploy/public/img/capturas/`. |
| Logo | `logo.png` is kept for favicon and manifest compatibility; SVG migration planned for a future iteration. |
| Account page | `pages/cuenta/cuenta.scss` keeps `:host` styles for specific needs; moving them to the global layer is planned for a future iteration. |
| Performance | The initial bundle exceeds 500 kB by 90 kB (Angular CLI warning). Future: lazy-load the billing/admin module. |
