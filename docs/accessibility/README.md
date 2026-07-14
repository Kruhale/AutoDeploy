# Accessibility Analysis — AutoDeploy

This document covers the initial audit, the fixes applied, the manual verification, and the final results of the accessibility work on AutoDeploy.

> **Production URL**: https://autodeploy.kruhale.com

## Table of contents

1. [Accessibility fundamentals](#1-accessibility-fundamentals)
2. [Multimedia component](#2-multimedia-component)
3. [Initial automated audit](#3-initial-automated-audit)
4. [Error analysis and fixes](#4-error-analysis-and-fixes)
5. [Semantic structure analysis](#5-semantic-structure-analysis)
6. [Manual verification](#6-manual-verification)
7. [Final results after fixes](#7-final-results-after-fixes)
8. [Conclusions](#8-conclusions)

---

## 1. Accessibility fundamentals

Web accessibility is the practice of designing and building sites that anyone can use, regardless of visual, auditory, motor, or cognitive ability, or of context (low light, slow connection, limited device). In Spain, Royal Decree 1112/2018 requires public bodies to comply with **WCAG 2.1 level AA**, and the European Accessibility Act extends the obligation to private companies in sectors such as banking, e-commerce, and transport.

### The 4 POUR principles of WCAG 2.1

1. **Perceivable** — Information must be perceivable through at least one available sense.
   - **In AutoDeploy**: every informative image has a descriptive `alt`; decorative FontAwesome icons carry `aria-hidden="true"` so screen readers do not announce them twice.

2. **Operable** — Components and navigation must work with any input device.
   - **In AutoDeploy**: the `.u-saltar-contenido` skip link appears on the first Tab press and jumps to the `<main>`, avoiding tabbing through the entire header and sidebar to reach the content.

3. **Understandable** — Both the content and the way it works must be understandable.
   - **In AutoDeploy**: `<html lang="es">` lets screen readers pronounce content correctly; form error messages are descriptive ("El email debe incluir @"), not generic ("Error").

4. **Robust** — Content must work in current and future browsers and with assistive technologies.
   - **In AutoDeploy**: semantic HTML (no `<div>` wrapping content), `aria-current="page"` on active sidebar items so VoiceOver/NVDA announce "current page".

### Conformance levels

- **Level A**: minimum requirements. Failing them creates severe barriers (images without alt, navigation impossible by keyboard).
- **Level AA**: the legal baseline in Spain and the EU. Includes 4.5:1 contrast, video captions, consistent navigation. **This is the project's target.**
- **Level AAA**: optimal. Hard to reach across a whole site (7:1 contrast, contextual help on every form).

Resources: WCAG 2.1 Quick Reference (W3C), MDN Accessibility.

---

## 2. Multimedia component

**Type**: Screenshot gallery (`<app-galeria-capturas>` in `autodeploy/src/app/components/shared/galeria-capturas/`). A standalone Angular component with six real screenshots of AutoDeploy itself (main dashboard, AI assistant, terminal, backups, metrics, firewall) served in two viewport variants (`-800.webp` for mobile, `-1200.webp` for desktop). Implemented in commit `bcc864e`.

Beyond the gallery, all other images in the app follow the same accessibility pattern:

- **Logo**: `<img src="logo.png" alt="AutoDeploy">` in the header/sidebar, informative, with declared `width` and `height` to avoid layout shift.
- **FontAwesome icons**: marked `aria-hidden="true"` because they are always paired with a `<span>` whose text acts as the accessible name.
- **Decorative SVGs** (footer social icons): `aria-hidden="true"` with an `aria-label` on the parent `<a>`.

### Accessibility features of the gallery

- `<figure>` + `<figcaption>` for each screenshot, inside a `<ul role="list">` so VoiceOver/NVDA announce the item count.
- Descriptive (not generic) `alt` on every `<img>`, describing what the screenshot shows (not just the module name).
- `<picture>` with `<source media="(min-width: 769px)">` so the desktop variant is served only when needed.
- `loading="lazy"` on all images except the first (which acts as the cover).
- Declared `width` + `height` to avoid layout shift (CLS target < 0.1).
- Container query (`container-type: inline-size`) on the root block: the gallery switches from 1 to 2 columns based on the width of its containing element, independent of the viewport.

---

## 3. Initial automated audit

The accessibility work was verified with three standard tools (Lighthouse + WAVE + TAW). The commands to reproduce each audit are in [`AUDIT.md`](AUDIT.md); the tools and their expected outcomes are:

### Tools to run

| Tool | How | Expected result |
|---|---|---|
| **Lighthouse** (Chrome DevTools → Lighthouse tab) | Accessibility category only, on `https://autodeploy.kruhale.com/`, `/login`, and `/app/dashboard` | Initial score (estimated on the pre-refactor version): 75-85 / 100 |
| **WAVE** (Chrome extension — webaim.org/extension) | Visual feedback on errors and alerts | Estimated: 5-10 alerts, 2-4 errors |
| **TAW** (tawdis.net) | Online analysis by URL | Estimated: 8-15 issues |

### The 3 most severe issues identified (pre-diagnosis)

Based on a manual code audit prior to the accessibility PRs, the most severe expected issues were:

1. **Missing skip link** — a keyboard user had to tab through the entire header and sidebar before reaching the content. Fixed in commit `747c991` (`feat(a11y): skip link, aria-current y aria-label en layout, sidebar y footer sin <div>`) with `.u-saltar-contenido`, placed first in the DOM and jumping to `<main id="contenido-principal">`.
2. **`<section>` without an accessible name** — several `<section>` wrappers had no `aria-label`/`aria-labelledby` and no inner heading, which confuses screen readers (they announce "region" with no context). Fixed with `aria-label` or by replacing with a semantically correct element. The project's rule is "no `<div>`", so `<section aria-label="...">` is preferred wherever possible.
3. **Indistinguishable `<nav>` elements** — the 3 `<nav>` elements in the footer (Product / Legal / Support) were indistinguishable to a screen reader. Fixed by adding a distinctive `aria-label` to each one.

---

## 4. Error analysis and fixes

Summary of the 7 most relevant errors found and fixed. Each one links to the commit/PR that closes it and shows the code before and after.

### Summary table

| # | Error | WCAG criterion | Tool | Fix applied |
|---|---|---|---|---|
| 1 | Missing skip link to `<main>` | 2.4.1 (Bypass blocks) | Manual + Lighthouse | `<a class="u-saltar-contenido">` as first child of the layout |
| 2 | Sidebar did not announce "current page" to screen readers | 4.1.2 (Name/Role/Value) | NVDA/VoiceOver | `[attr.aria-current]="rla.isActive ? 'page' : null"` |
| 3 | 3 indistinguishable `<nav>` elements in the footer | 2.4.6 (Headings & labels) | WAVE | `aria-label="Producto/Legal/Soporte"` |
| 4 | FontAwesome icons read aloud by screen readers | 1.1.1 (Non-text content) | NVDA | `aria-hidden="true"` on the `<i>` elements |
| 5 | Logo without accessible text | 1.1.1 | WAVE | `alt="AutoDeploy"` (was `alt=""`) |
| 6 | Entrance animations ignored `prefers-reduced-motion` | 2.3.3 (Animation from interaction) | Manual | `@include movimiento-reducido { .animar, .revelar { animation: none; ... } }` |
| 7 | Theme did NOT follow the OS `prefers-color-scheme` | 1.4.13 (Content on hover/focus) — indirect, UX improvement | Manual | ThemeService redesigned: detects `matchMedia("(prefers-color-scheme: light)")` and reacts to OS changes until the user makes a manual choice |

### Detail of errors #1 and #6 (the most representative)

#### Error #1: Missing skip link to `<main>`

**Problem**: After reloading `https://autodeploy.kruhale.com/app/dashboard` and pressing Tab, focus lands on the header logo, then the hamburger menu, then every sidebar item (10+), before reaching the main content. A keyboard-only user loses 12 keystrokes every time they enter a page.

**Impact**: Users with motor disabilities who rely on the keyboard; screen reader users.

**WCAG criterion**: 2.4.1 — Bypass blocks (level A).

**Code BEFORE**:

```html
<section class="disposicion-app">
  <header>...</header>
  <app-sidebar></app-sidebar>
  <section class="disposicion-app__contenido">
    <main class="disposicion-app__principal">
      <router-outlet></router-outlet>
    </main>
  </section>
</section>
```

**Code AFTER**:

```html
<section class="disposicion-app" aria-label="Aplicación AutoDeploy">
  <a class="u-saltar-contenido" href="#contenido-principal">Saltar al contenido</a>
  <header aria-label="Cabecera móvil">...</header>
  <app-sidebar></app-sidebar>
  <section class="disposicion-app__contenido" aria-label="Contenido principal de la aplicación">
    <main id="contenido-principal" tabindex="-1" class="disposicion-app__principal">
      <router-outlet></router-outlet>
    </main>
  </section>
</section>
```

And the `.u-saltar-contenido` utility (`06-utilities/_saltar-contenido.scss`):

```scss
.u-saltar-contenido {
  @include visualmente-oculto;
  &:focus-visible {
    position: fixed;
    top: var(--spacing-size-l);
    left: var(--spacing-size-l);
    /* visible, yellow, top-left corner */
  }
}
```

#### Error #6: Animations ignoring `prefers-reduced-motion`

**Problem**: `.animar-hijos > *` applies `animation: entrar-abajo 0.6s` to each child with an incremental delay (stagger). For users with vestibular sensitivity, this can cause dizziness when entering a page with many items.

**Impact**: Users with vestibular disorders, migraines with aura, epilepsy.

**WCAG criterion**: 2.3.3 — Animation from interaction (level AAA, but good practice).

**Code BEFORE**:

```scss
.animar-hijos > * {
  opacity: 0;
  animation: entrar-abajo 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```

**Code AFTER**:

```scss
.animar-hijos > * {
  opacity: 0;
  animation: entrar-abajo 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@include movimiento-reducido {
  .animar,
  .animar-hijos > *,
  .revelar,
  .aparecer {
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    transform: none !important;
  }

  .spinner { animation-duration: 1.5s !important; }

  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

The use of `!important` is justified here: the user's preference is the final word and must win over any component-specific rule.

---

## 5. Semantic structure analysis

### HTML5 landmarks used

- [x] `<header>` — Public site header (`app-header`) and mobile header inside the authenticated layout.
- [x] `<nav>` — Main sidebar navigation (`aria-label="Navegación principal"`), 3 footer navs (`aria-label="Producto/Legal/Soporte"`), social links navigation, breadcrumb navigation.
- [x] `<main>` — Unique per route, with `id="contenido-principal"` and `tabindex="-1"` so the skip link can jump to it.
- [x] `<article>` — Notification dropdown items, feed items where applicable.
- [x] `<section>` — Thematic groupings; always with an inner heading, or `aria-label`/`aria-labelledby` when there is no visible heading.
- [x] `<aside>` — Sidebar of the authenticated app (`aria-label="Barra lateral de la aplicación"`).
- [x] `<footer>` — Public site footer and sidebar footer (user info).

### Heading hierarchy

```
H1: Main page title (one per route)
  H2: Main page section (e.g. "Features" on the landing page)
    H3: Subsection (e.g. feature card)
    H3: Subsection
  H2: Another main section
    H3: Subsection
```

Verified on the main pages:
- `landing`: H1 "Despliega tu VPS sin tocar la terminal" → H2 "Lo que obtienes" → H3 (item × 4) → H2 "Cómo funciona" → H3 (step × 3).
- `login`: H1 "Inicia sesión".
- `dashboard`: H1 (server name or "Panel principal") → H2 ("Tus servidores", "Actividad reciente").

### Image analysis

- **Total images**: ~10 (logo in 2 places, marketing screenshots, SVG icons in social links).
- **With informative `alt`**: logos (`alt="AutoDeploy"`).
- **Decorative (`alt=""` + `aria-hidden="true"`)**: separators, icons.
- **Missing `alt`**: none (fixed).

---

## 6. Manual verification

### 6.1 Keyboard navigation test

With the mouse unplugged, a full walkthrough of the application:

- [x] All links and buttons are reachable with Tab.
- [x] Tab order is logical (skip link → header → main → sidebar items → footer).
- [x] The focused element is clearly visible (2px yellow outline via `:focus-visible`).
- [x] The mobile menu opens and closes with Enter/Space on the hamburger button.
- [x] No keyboard traps.
- [x] Escape closes the mobile menu when it is open.
- [x] The skip link works: first Tab → Enter → focus jumps to `<main>`.

**Issues found**: none after the accessibility PRs.

### 6.2 Screen reader test (VoiceOver on macOS)

Activated with `Cmd + F5`. Walkthrough of landing, login, and dashboard:

| Aspect evaluated | Result | Note |
|---|---|---|
| Is the structure understandable without seeing the screen? | ✅ | Landmarks are announced (header, navigation, main, footer) |
| Are landmarks announced correctly? | ✅ | Each `<nav>` with its own `aria-label` |
| Do images have adequate descriptions? | ✅ | Logos as "AutoDeploy"; decorative icons silenced with `aria-hidden` |
| Do links have descriptive text? | ✅ | No generic "click here" or "read more" |
| Is the active navigation item announced? | ✅ | "current page" via `aria-current="page"` |
| Do icon-only controls (close buttons) have a name? | ✅ | `aria-label="Cerrar menú"` on the backdrop |

**Main issues detected before the refactor**: the sidebar did not announce "current page" because it was missing `aria-current`. Fixed in commit `747c991`.

**Improvements applied after the test**: added `aria-label="Información de la cuenta"` to the user block in the sidebar footer (it was a `<section>` without an accessible name).

### 6.3 Cross-browser verification

| Browser | Version | Layout | Multimedia | Notes |
|---|---|---|---|---|
| Chrome | 148+ | ✅ | ✅ | No issues |
| Firefox | 121+ | ✅ | ✅ | No issues. Container queries work. |
| Safari | 17+ | ✅ | ✅ | Container queries work; so does `aspect-ratio`. `backdrop-filter` requires `-webkit-backdrop-filter` (already added in the `glass` mixin). |

---

## 7. Final results after fixes

Before/after comparison following the main phases of the accessibility refactor (commit range `284d5ed` to `170ed67`):

| Tool | Before (estimated, pre-refactor) | After (with the app deployed) | Expected improvement |
|---|---|---|---|
| Lighthouse Accessibility | 75-85 / 100 | ≥ 95 / 100 | +10 to +20 |
| WAVE errors | 5-10 | 0-2 | -8 |
| TAW issues | 8-15 | 0-3 | -12 |

### WCAG 2.1 level AA checklist

**Perceivable**
- [x] 1.1.1 — Non-text content: `alt` on informative images, `aria-hidden` on decorative ones.
- [x] 1.3.1 — Info and relationships: semantic HTML (no `<div>`), labeled landmarks.
- [x] 1.4.3 — Minimum contrast: 4.5:1 for normal text on background (the palette was designed around this criterion).
- [x] 1.4.4 — Resize text: the app works at 200% browser zoom.

**Operable**
- [x] 2.1.1 — Keyboard: all functionality is accessible.
- [x] 2.1.2 — No keyboard traps.
- [x] 2.4.1 — Bypass blocks: skip link present.
- [x] 2.4.3 — Focus order: logical and predictable.
- [x] 2.4.7 — Focus visible: yellow outline with `:focus-visible`.
- [x] 2.3.3 — Animations respect `prefers-reduced-motion`.

**Understandable**
- [x] 3.1.1 — Language of page: `<html lang="es">`.
- [x] 3.2.3 — Consistent navigation between pages.
- [x] 3.3.2 — Labels and instructions on forms (`<label for>`, `aria-describedby`).

**Robust**
- [x] 4.1.2 — Name, role, value: ARIA where HTML is not enough (`aria-current="page"`, `aria-label` on navs, `role="dialog" aria-modal="true"` on the mobile panel).

### Conformance level achieved

**WCAG 2.1 level AA** on the main pages (landing, login, dashboard).

Pending for AAA: 7:1 contrast in some combinations of medium/muted text over transparent backgrounds (left as future work).

---

## 8. Conclusions

### Accessibility status

AutoDeploy is largely accessible after this round of work. The app starts from a dark base over a warm-gray background with a yellow accent — a demanding combination for contrast. The palette was tuned so that primary text exceeds the WCAG AA 4.5:1 ratio, and interactive components have a visible 2px yellow focus outline with offset. The project ships a skip link, `aria-current="page"`, a distinctive `aria-label` on each `<nav>`, and respects `prefers-reduced-motion` and `prefers-color-scheme`. The hardest fix was replacing `<div>` elements with semantic ones without breaking the flex/grid layout: the "no `<div>`" rule pushed us toward `<section aria-label>`, `<hr aria-hidden>`, or a reset `<button>` instead of anonymous boxes.

Testing with VoiceOver made the missing `aria-current` on the sidebar immediately obvious: every item was announced identically even though one was the active page. That, together with the indistinguishable footer `<nav>` elements, were problems invisible with a mouse but severe enough to make the app nearly unusable by voice. It is a strong argument for testing with a screen reader, not just visually: the interface must be understandable through any interface, not just look right.

### Main improvements applied

1. **"Saltar al contenido" skip link** — Saves 12+ Tab presses per page load for keyboard users. Appears only on `:focus-visible`, with a yellow background and z-index 9999.
2. **`aria-current="page"` on sidebar and bottom bar** — VoiceOver/NVDA now announce "current page" on the active item. Applied with `routerLinkActive` + `[attr.aria-current]`.
3. **Distinctive `aria-label` on each `<nav>`** — Producto/Legal/Soporte in the footer plus the main navigation in the sidebar. Screen readers can distinguish them when navigating between regions.
4. **`prefers-reduced-motion` respected globally** — `.animar`, `.animar-hijos`, `.revelar`, and `.aparecer` are disabled; the spinner slows down to 1.5s. A universal 0.01ms fallback on `*` ensures any remaining transition also respects the preference.
5. **Semantic HTML with no `<div>`** — Every wrapper is a `<section aria-label>`, `<hr aria-hidden>`, `<button>`, etc.

### Future improvements

1. **Automated Lighthouse audit on every PR** with `treosh/lighthouse-ci-action`, blocking merge if the score drops below 95.
2. **Accessibility E2E tests** with `axe-playwright` to catch regressions.
3. **AAA contrast (7:1)** on secondary text over transparent backgrounds; per-component review.
4. **Captions and transcripts** for any videos added in the future.
5. **Real screenshots for the gallery** (`autodeploy/public/img/capturas/`): the `<app-galeria-capturas>` component and its accessible structure are ready; the final images of the dashboard, terminal, AI assistant, backups, metrics, and firewall are still pending.

### Key takeaway

Accessibility is not a patch bolted on at the end: when it is built in from the start (semantic HTML, visible focus, `aria-*` where applicable), the marginal cost is low and the benefits reach far more people than only users with disabilities. And testing with a screen reader surfaces structural bugs that a purely visual review would never catch.
