# Capturas del producto

Esta carpeta aloja las imágenes que la galería accesible (`app-galeria-capturas`) consume desde la página de Style Guide y, en el futuro, desde la sección de bienvenida.

## Formato y tamaños

Generar cada captura en **dos variantes WebP** (con un fallback JPG opcional para navegadores muy antiguos):

| Variante | Resolución | Densidad | Uso |
|---|---|---|---|
| Mobile | 800 × 500 px | 1× | `<source media="(max-width: 48rem)" srcset>` |
| Desktop | 1600 × 1000 px | 2× | `<source srcset>` por defecto |

Cada archivo debe pesar **menos de 200 KB**. Recomendado: optimizar con [Squoosh](https://squoosh.app/) (calidad ~75% WebP).

## Convención de nombres

```
<nombre-de-pantalla>-mobile.webp     · 800 × 500
<nombre-de-pantalla>-desktop.webp    · 1600 × 1000
<nombre-de-pantalla>-fallback.jpg    · 800 × 500 (opcional)
```

Ejemplo:

```
dashboard-mobile.webp
dashboard-desktop.webp
dashboard-fallback.jpg

asistente-ia-mobile.webp
asistente-ia-desktop.webp

terminal-mobile.webp
terminal-desktop.webp
```

## Cómo usarlas en la galería

En `autodeploy/src/app/pages/style-guide/style-guide.ts` (u otra página padre que renderice `<app-galeria-capturas>`):

```typescript
capturasDemo: Captura[] = [
  {
    src: "/img/capturas/dashboard-desktop.webp",
    srcMovil: "/img/capturas/dashboard-mobile.webp",
    fallback: "/img/capturas/dashboard-fallback.jpg",
    alt: "Panel principal con tres servidores activos y métricas en vivo (CPU 24%, RAM 58%, disco 42%)",
    titulo: "Panel principal con métricas en tiempo real",
    ancho: 1600,
    alto: 1000,
  },
  // ... otras 5
];
```

El componente genera automáticamente `<picture>` con `<source media>` + `<img loading="lazy">` + `<figure>` + `<figcaption>`.

## Alt descriptivo

El `alt` debe describir **la información que aporta la imagen**, no su apariencia. Buenos ejemplos:

- ✅ "Panel principal con tres servidores activos y métricas en vivo"
- ✅ "Terminal SSH conectada con prompt root@vps-prod-01 listo para recibir comandos"
- ❌ "Captura del panel"
- ❌ "Imagen de un dashboard"

Si una captura es puramente decorativa (poco probable en este caso), usar `alt=""` y ya está.
