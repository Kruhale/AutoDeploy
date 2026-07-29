# Product screenshots

This folder holds the images consumed by the accessible gallery component (`app-galeria-capturas`) on the Style Guide page and, in the future, on the welcome section.

## Format and sizes

Generate every screenshot in **two WebP variants** (with an optional JPG fallback for very old browsers):

| Variant | Resolution | Density | Usage |
|---|---|---|---|
| Mobile | 800 × 500 px | 1× | `<source media="(max-width: 48rem)" srcset>` |
| Desktop | 1600 × 1000 px | 2× | Default `<source srcset>` |

Each file must weigh **less than 200 KB**. Recommended: optimize with [Squoosh](https://squoosh.app/) (~75% WebP quality).

## Naming convention

```
<screen-name>-mobile.webp     · 800 × 500
<screen-name>-desktop.webp    · 1600 × 1000
<screen-name>-fallback.jpg    · 800 × 500 (optional)
```

Example:

```
dashboard-mobile.webp
dashboard-desktop.webp
dashboard-fallback.jpg

asistente-ia-mobile.webp
asistente-ia-desktop.webp

terminal-mobile.webp
terminal-desktop.webp
```

## Using them in the gallery

In `autodeploy/src/app/pages/style-guide/style-guide.ts` (or any other parent page that renders `<app-galeria-capturas>`):

```typescript
capturasDemo: Captura[] = [
  {
    src: "/img/capturas/dashboard-desktop.webp",
    srcMovil: "/img/capturas/dashboard-mobile.webp",
    fallback: "/img/capturas/dashboard-fallback.jpg",
    alt: "Main dashboard with three active servers and live metrics (CPU 24%, RAM 58%, disk 42%)",
    titulo: "Main dashboard with real-time metrics",
    ancho: 1600,
    alto: 1000,
  },
  // ... 5 more
];
```

The component automatically generates `<picture>` with `<source media>` + `<img loading="lazy">` + `<figure>` + `<figcaption>`.

## Descriptive alt text

The `alt` must describe **the information the image conveys**, not its appearance. Good examples:

- ✅ "Main dashboard with three active servers and live metrics"
- ✅ "Connected SSH terminal with a root@vps-prod-01 prompt ready for commands"
- ❌ "Screenshot of the panel"
- ❌ "Image of a dashboard"

If a screenshot is purely decorative (unlikely here), use `alt=""` and nothing else.
