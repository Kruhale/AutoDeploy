# WCAG 2.1 AA Audit — AutoDeploy

Operational document to reproduce the accessibility audit against the deployed instance (`https://autodeploy.kruhale.com`) and verify WCAG 2.1 level AA compliance.

> Reports and screenshots are written to `reports/accessibility/` when you run the commands below (kept out of version control).

---

## 1. How to run the audit

### 1.1 Lighthouse (Chrome DevTools / CLI)

For the automated audit (performance + accessibility + SEO + best practices):

```bash
# Install (one time only)
npm install -g lighthouse

# Full audit
lighthouse https://autodeploy.kruhale.com \
  --only-categories=accessibility,performance,seo,best-practices \
  --output html --output-path reports/accessibility/lighthouse-home.html \
  --chrome-flags="--headless"

# Accessibility-only audit
lighthouse https://autodeploy.kruhale.com \
  --only-categories=accessibility \
  --output json --output-path reports/accessibility/lighthouse-home.json \
  --chrome-flags="--headless"
```

Repeat for `/login`, `/register`, `/app` (authenticated via the token stored in the browser session).

### 1.2 WAVE — WebAIM

1. Open https://wave.webaim.org/
2. Enter `https://autodeploy.kruhale.com`
3. Save the screenshot to `reports/accessibility/wave-home.png`.

### 1.3 TAW — accessibility

1. https://www.tawdis.net/
2. Same URL.
3. Screenshot to `reports/accessibility/taw-home.png`.

### 1.4 Manual keyboard verification

Press Tab from the top of the document and verify:
- The skip link ("Saltar al contenido") appears on the first Tab.
- Every interactive element receives focus with a visible outline (2 px ring using the `--amarillo-normal` variable).
- Esc closes modals and dropdowns.
- Arrow keys navigate within lists and selectors.

### 1.5 Screen readers

- **macOS**: `Cmd + F5` to enable VoiceOver. Walk through the home page and verify the landmarks (`header`, `nav`, `main`, `footer`) are announced.
- **Windows**: NVDA, free (https://www.nvaccess.org/).

---

## 2. WCAG 2.1 AA criteria and how the code meets them

### 2.1 Text contrast

Defined in `00-settings/_variables.scss` with ratios verified against `--fondo-tarjeta` (L=16%):

| Token | Luminance | Ratio | Level |
|---|---|---|---|
| `--texto-claro` | L=91% | ~11.6:1 | AAA |
| `--texto-medio` | L=63% | ~5.3:1 | AA |
| `--texto-apagado` | L=60% | ~4.7:1 | AA |

For `.tema-claro` (L=96%) the same variables are overridden on lines 154-156, keeping AA in every case.

### 2.2 Skip link

`autodeploy/src/styles/06-utilities/_saltar-contenido.scss`:

- Visually hidden with `visually-hidden` until it receives focus.
- On `:focus-visible` it jumps to the top-left with a high z-index, yellow background, and double outline.
- The `AppLayout` component includes it as the first child of the `body`.

### 2.3 ARIA landmarks and semantics

- `<header>` for the app header.
- `<nav role="navigation" aria-label="..">` for the sidebar and header.
- A single `<main>` per page.
- `<footer>` for the footer.
- `<aside>` for side panels.

Verifiable in `autodeploy/src/app/components/layout/*/*.html`.

### 2.4 Visible focus

In `_animaciones.scss:140-162` the `@include movimiento-reducido` block honors `prefers-reduced-motion`. All focusable components use `:focus-visible` with a yellow outline offset by 2-3 px.

### 2.5 Touch targets

Buttons and inputs meet a minimum of 44×44 px (WCAG 2.5.5 AAA minimum, recommended by Apple/Material). Verifiable in `_buttons.scss` and `_forms.scss`, where height ≥ `2.5rem` (40 px) + padding ≥ `0.5rem`.

### 2.6 Page language

`<html lang="es">` is set in `autodeploy/src/index.html` and updated dynamically by `IdiomaService` when the user switches language.

### 2.7 Text alternatives for images

Main logo: `<img src="logo.png" alt="AutoDeploy">` in `header.html:3`. Decorative images carry `aria-hidden="true"`.

### 2.8 Reduced motion

`_animaciones.scss` includes:

```scss
@include movimiento-reducido {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Meets WCAG 2.3.3.

---

## 3. Actual Lighthouse results (2026-05-21)

HTML/JSON reports stored in `reports/accessibility/`:

| Page | URL | Performance | **Accessibility** | Best Practices | SEO |
|---|---|---|---|---|---|
| Home | `/` | 72 | **100** ✅ | **100** ✅ | 75 |
| Login | `/login` | 70 | **100** ✅ | **100** ✅ | 83 |
| Register | `/register` | 86 | **100** ✅ | **100** ✅ | 83 |

**Accessibility 100/100 and Best Practices 100/100** on all 3 audited pages, comfortably exceeding the project's WCAG 2.1 level AA target.

### How to reproduce

```bash
# From the repo root
lighthouse https://autodeploy.kruhale.com \
  --only-categories=accessibility,performance,seo,best-practices \
  --output=html --output=json \
  --output-path=reports/accessibility/lighthouse-home \
  --chrome-flags="--headless --no-sandbox" --quiet
```

Repeat for `/login` and `/register`, changing the `--output-path`.

### Full reports

The Lighthouse HTML/JSON reports are generated locally with the commands above and stored in `reports/accessibility/`. **They are not versioned in the repo** (listed in `.gitignore`): they are reproducible artifacts weighing ~570 KB each, and they may contain internal IDs that trigger false positives in secret scanners.

To regenerate them at any time, re-run the command from section 1.1.

For WAVE and TAW (additional visual audits), follow the instructions in sections 1.2 and 1.3 and save the screenshots to the same folder.

---

## 4. Post-audit iteration plan

If a tool reports issues:

1. **Critical errors** (contrast, missing label, missing alt) → fix immediately and re-audit.
2. **Warnings** (heading skips, redundant links) → prioritize by how often they appear across pages.
3. **Best practices** (lang on sub-elements, security headers) → file as an issue and address in the next iteration.

Document the fixes in the pull request that resolves them and link the fixing commit.
