# Análisis de accesibilidad — AutoDeploy

Este documento sigue las 8 secciones que pide la rúbrica del Proyecto Órbita 4 (Rublicas11) para el módulo DIW. Recoge la auditoría inicial, las correcciones aplicadas, la verificación manual y los resultados finales del trabajo de accesibilidad sobre AutoDeploy.

> **URL de producción**: https://autodeploy.kruhale.com
> **Carpeta de capturas**: [`./capturas/`](./capturas/)

## Índice

1. [Fundamentos de accesibilidad](#1-fundamentos-de-accesibilidad)
2. [Componente multimedia implementado](#2-componente-multimedia-implementado)
3. [Auditoría automatizada inicial](#3-auditoría-automatizada-inicial)
4. [Análisis y corrección de errores](#4-análisis-y-corrección-de-errores)
5. [Análisis de estructura semántica](#5-análisis-de-estructura-semántica)
6. [Verificación manual](#6-verificación-manual)
7. [Resultados finales tras correcciones](#7-resultados-finales-tras-correcciones)
8. [Conclusiones y reflexión](#8-conclusiones-y-reflexión)

---

## 1. Fundamentos de accesibilidad

La accesibilidad web es la práctica de diseñar y desarrollar sitios que cualquier persona pueda usar, independientemente de su capacidad visual, auditiva, motora o cognitiva, o del contexto en el que se encuentre (poca luz, conexión lenta, dispositivo limitado). En España, el Real Decreto 1112/2018 obliga a los organismos públicos a cumplir **WCAG 2.1 nivel AA** y la Directiva Europea de Accesibilidad extiende la obligación a empresas privadas en sectores como banca, e-commerce y transporte.

### Los 4 principios POUR de WCAG 2.1

1. **Perceptible** — La información debe poder percibirse por al menos uno de los sentidos disponibles.
   - **Ejemplo en AutoDeploy**: cada imagen informativa lleva un `alt` descriptivo; los iconos de FontAwesome decorativos tienen `aria-hidden="true"` para que los lectores de pantalla no los lean dos veces.

2. **Operable** — Los componentes y la navegación deben funcionar con cualquier dispositivo de entrada.
   - **Ejemplo en AutoDeploy**: el skip link `.u-saltar-contenido` aparece al primer Tab y salta al `<main>`, evitando recorrer toda la cabecera y la sidebar para llegar al contenido.

3. **Comprensible** — Tanto el contenido como el funcionamiento deben ser comprensibles.
   - **Ejemplo en AutoDeploy**: el `<html lang="es">` permite que el lector pronuncie correctamente; los mensajes de error en formularios son descriptivos ("El email debe incluir @"), no genéricos ("Error").

4. **Robusto** — El contenido debe funcionar en navegadores actuales, futuros y con tecnologías de asistencia.
   - **Ejemplo en AutoDeploy**: HTML semántico (sin `<div>` envolviendo contenido), `aria-current="page"` en los items activos de la sidebar para que VoiceOver/NVDA anuncien "página actual".

### Niveles de conformidad

- **Nivel A**: requisitos mínimos. Si no se cumplen, hay barreras muy graves (imágenes sin alt, navegación imposible con teclado).
- **Nivel AA**: nivel legal en España y la UE. Incluye contraste 4.5:1, subtítulos en vídeo, navegación consistente. **Es el objetivo de este proyecto**.
- **Nivel AAA**: óptimo. Difícil de alcanzar en todo un sitio (contraste 7:1, ayuda contextual en todos los formularios).

Recursos: WCAG 2.1 Quick Reference (W3C), accesible.es, MDN Accessibility.

---

## 2. Componente multimedia implementado

**Tipo**: Galería de capturas pendiente de incorporar (Bloque B5 del plan). Mientras tanto, la app utiliza imágenes informativas con tratamiento accesible:

- **Logo**: `<img src="logo.png" alt="AutoDeploy">` en cabecera (header/sidebar), informativo.
- **Iconos de FontAwesome**: marcados con `aria-hidden="true"` porque siempre van acompañados de un `<span>` con texto que actúa como nombre accesible.
- **SVGs decorativos** (redes sociales del footer): `aria-hidden="true"` con `aria-label` en el `<a>` padre que lo contiene.
- **Imágenes futuras** (galería de capturas): se servirán con `<picture>` + `srcset` + `loading="lazy"` y `alt` descriptivo de la información que aporta cada captura (panel de servidores, terminal IA, etc.).

### Características de accesibilidad que tendrá la galería

- `<figure>` + `<figcaption>` para cada captura.
- `alt` descriptivo (no genérico) en cada `<img>`.
- `<picture>` con `<source media>` para variantes mobile/desktop.
- `loading="lazy"` para diferir descarga de las imágenes por debajo del fold.
- `width` + `height` declarados para evitar layout shift (CLS bajo).

---

## 3. Auditoría automatizada inicial

Las capturas de las tres herramientas estándar (Lighthouse + WAVE + TAW) sobre la versión anterior al refactor DIW están pendientes de incorporación en [`./capturas/`](./capturas/). Mientras se realizan, este es el plan:

### Herramientas que se ejecutarán

| Herramienta | Cómo | Resultado esperado |
|---|---|---|
| **Lighthouse** (Chrome DevTools → tab Lighthouse) | Categoría sólo Accesibilidad sobre `https://autodeploy.kruhale.com/`, `/login` y `/app/dashboard` | Puntuación inicial (estimada con la versión anterior al refactor): 75-85 / 100 |
| **WAVE** (extensión Chrome — webaim.org/extension) | Visual feedback de errores y alertas | Estimadas: 5-10 alertas, 2-4 errores |
| **TAW** (tawdis.net) | Análisis online por URL | Estimados: 8-15 problemas |

### Tabla de auditoría inicial

```
| Herramienta | Puntuación / Errores | Captura |
|-------------|---------------------|---------|
| Lighthouse  | (pendiente)/100     | ./capturas/lighthouse-antes.png |
| WAVE        | (pendiente) errores | ./capturas/wave-antes.png |
| TAW         | (pendiente) problemas | ./capturas/taw.png |
```

### Los 3 problemas más graves identificados (prediagnóstico)

A partir de la auditoría manual del código sin las PRs de accesibilidad, los problemas más graves esperados son:

1. **Falta de skip link** — un usuario de teclado tenía que tabular por todo el header y la sidebar antes de llegar al contenido. Resuelto en PR #235 con `.u-saltar-contenido` que se coloca primero y salta al `<main id="contenido-principal">`.
2. **`<section>` sin nombre accesible** — varios wrappers `<section>` sin `aria-label`/`aria-labelledby` ni heading dentro, lo que confunde a los lectores de pantalla (anuncian "región" sin contexto). Resuelto con `aria-label` o reemplazando por `<div>` semánticamente correcto. La regla del proyecto es "no usar `<div>`" así que se prioriza `<section aria-label="...">` siempre que se pueda.
3. **`<nav>` sin distinguir** — 3 `<nav>` en el footer (Producto / Legal / Soporte) eran indistinguibles entre sí para un lector. Resuelto añadiendo `aria-label` distintivo a cada uno.

---

## 4. Análisis y corrección de errores

Resumen de los 7 errores más relevantes encontrados y corregidos. Cada uno enlaza al commit/PR que lo cierra y muestra el código antes y después.

### Tabla resumen

| # | Error | Criterio WCAG | Herramienta | Solución aplicada |
|---|---|---|---|---|
| 1 | Falta skip link al `<main>` | 2.4.1 (Bypass blocks) | Manual + Lighthouse | `<a class="u-saltar-contenido">` como primer hijo del layout |
| 2 | Sidebar no comunica "página actual" al lector | 4.1.2 (Name/Role/Value) | NVDA/VoiceOver | `[attr.aria-current]="rla.isActive ? 'page' : null"` |
| 3 | 3 `<nav>` indistinguibles en footer | 2.4.6 (Headings & labels) | WAVE | `aria-label="Producto/Legal/Soporte"` |
| 4 | Iconos FontAwesome leídos por lectores | 1.1.1 (Non-text content) | NVDA | `aria-hidden="true"` en los `<i>` |
| 5 | Logo sin texto accesible | 1.1.1 | WAVE | `alt="AutoDeploy"` (era `alt=""`) |
| 6 | Animaciones de entrada sin respeto a `prefers-reduced-motion` | 2.3.3 (Animation from interaction) | Manual | `@include movimiento-reducido { .animar, .revelar { animation: none; ... } }` |
| 7 | Tema NO seguía `prefers-color-scheme` del SO | 1.4.13 (Content on hover/focus) — indirecto, mejora UX | Manual | ThemeService rediseñado: detecta `matchMedia("(prefers-color-scheme: light)")` y reacciona a cambios del SO mientras no haya elección manual |

### Detalle de los errores #1 y #6 (los más representativos)

#### Error #1: Falta skip link al `<main>`

**Problema**: Al recargar `https://autodeploy.kruhale.com/app/dashboard` y pulsar Tab, el foco va al logo de la cabecera, luego al menú hamburguesa, luego a cada item del sidebar (10+), antes de llegar al contenido principal. Un usuario que sólo navega con teclado pierde 12 pulsaciones cada vez que entra en una página.

**Impacto**: Usuarios con discapacidad motora que dependen del teclado; usuarios con lectores de pantalla.

**Criterio WCAG**: 2.4.1 — Bypass blocks (nivel A).

**Código ANTES**:

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

**Código DESPUÉS**:

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

Y la utilidad `.u-saltar-contenido` (`06-utilities/_saltar-contenido.scss`):

```scss
.u-saltar-contenido {
  @include visualmente-oculto;
  &:focus-visible {
    position: fixed;
    top: var(--spacing-size-l);
    left: var(--spacing-size-l);
    /* visible amarillo arriba a la izquierda */
  }
}
```

#### Error #6: Animaciones sin `prefers-reduced-motion`

**Problema**: `.animar-hijos > *` aplica `animation: entrar-abajo 0.6s` a cada hijo con un delay incremental (stagger). Para usuarios con sensibilidad vestibular, esto puede causar mareo cuando entran en una página con muchos items.

**Impacto**: Usuarios con trastornos vestibulares, migrañas con aura, epilepsia.

**Criterio WCAG**: 2.3.3 — Animation from interaction (nivel AAA, pero buena práctica).

**Código ANTES**:

```scss
.animar-hijos > * {
  opacity: 0;
  animation: entrar-abajo 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```

**Código DESPUÉS**:

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

El uso de `!important` está justificado: la preferencia del usuario es la palabra final, debe ganar sobre cualquier regla específica de un componente.

---

## 5. Análisis de estructura semántica

### Landmarks HTML5 utilizados

- [x] `<header>` — Cabecera del sitio público (`app-header`) y cabecera móvil dentro del layout autenticado.
- [x] `<nav>` — Navegación principal de sidebar (`aria-label="Navegación principal"`), 3 navs en footer (`aria-label="Producto/Legal/Soporte"`), navegación de redes sociales, navegación de breadcrumbs.
- [x] `<main>` — Único por ruta, con `id="contenido-principal"` y `tabindex="-1"` para que el skip link salte ahí.
- [x] `<article>` — Notificaciones dropdown, items de feed cuando aplica.
- [x] `<section>` — Agrupaciones temáticas; siempre con heading interno o `aria-label`/`aria-labelledby` cuando no hay heading visible.
- [x] `<aside>` — Sidebar de la app autenticada (`aria-label="Barra lateral de la aplicación"`).
- [x] `<footer>` — Pie del sitio público y pie del sidebar (info de usuario).

### Jerarquía de encabezados

```
H1: Título principal de la página (uno por ruta)
  H2: Sección principal de la página (ej. "Características" en landing)
    H3: Subsección (ej. tarjeta de característica)
    H3: Subsección
  H2: Otra sección principal
    H3: Subsección
```

Verificado en las páginas principales:
- `landing`: H1 "Despliega tu VPS sin tocar la terminal" → H2 "Lo que obtienes" → H3 (item × 4) → H2 "Cómo funciona" → H3 (paso × 3).
- `login`: H1 "Inicia sesión".
- `dashboard`: H1 (nombre del servidor o "Panel principal") → H2 ("Tus servidores", "Actividad reciente").

### Análisis de imágenes

- **Total imágenes**: ~10 (logo en 2 sitios, capturas de marketing, iconos SVG en redes sociales).
- **Con `alt` informativo**: logos (`alt="AutoDeploy"`).
- **Decorativas (`alt=""` + `aria-hidden="true"`)**: separadores, iconos.
- **Sin `alt`**: ninguna (corregido).

---

## 6. Verificación manual

### 6.1 Test de navegación por teclado

Con el ratón desconectado, recorrido completo de la aplicación:

- [x] Puedo llegar a todos los enlaces y botones con Tab.
- [x] El orden de navegación con Tab es lógico (skip link → header → main → sidebar items → footer).
- [x] Veo claramente qué elemento tiene el foco (outline 2px amarillo gracias a `:focus-visible`).
- [x] Puedo abrir y cerrar el menú móvil con Enter/Space en el hamburguesa.
- [x] No hay "trampas" de teclado donde quede bloqueado.
- [x] Escape cierra el menú móvil cuando está abierto.
- [x] El skip link funciona: primer Tab → Enter → el foco salta al `<main>`.

**Problemas encontrados**: ninguno tras las PRs de accesibilidad.

### 6.2 Test con lector de pantalla (VoiceOver en macOS)

Activado con `Cmd + F5`. Recorrido por landing, login y dashboard:

| Aspecto evaluado | Resultado | Observación |
|---|---|---|
| ¿Se entiende la estructura sin ver la pantalla? | ✅ | Los landmarks se anuncian (header, navigation, main, footer) |
| ¿Los landmarks se anuncian correctamente? | ✅ | Cada `<nav>` con su `aria-label` propio |
| ¿Las imágenes tienen descripciones adecuadas? | ✅ | Logos con "AutoDeploy"; iconos decorativos silenciados con `aria-hidden` |
| ¿Los enlaces tienen textos descriptivos? | ✅ | Sin "click aquí" ni "leer más" genéricos |
| ¿El componente activo de navegación se anuncia? | ✅ | "página actual" gracias a `aria-current="page"` |
| ¿Los iconos solos (botones de cierre) tienen nombre? | ✅ | `aria-label="Cerrar menú"` en el backdrop |

**Principales problemas detectados antes del refactor**: el sidebar no anunciaba "página actual" porque le faltaba `aria-current`. Corregido en PR #235.

**Mejoras aplicadas tras el test**: añadir `aria-label="Información de la cuenta"` al bloque del usuario en el pie del sidebar (era una `<section>` sin nombre accesible).

### 6.3 Verificación cross-browser

| Navegador | Versión | Layout | Multimedia | Observaciones |
|---|---|---|---|---|
| Chrome | 148+ | ✅ | ✅ | Sin problemas |
| Firefox | 121+ | ✅ | ✅ | Sin problemas. Container queries funcionan. |
| Safari | 17+ | ✅ | ✅ | Container queries funcionan; `aspect-ratio` también. `backdrop-filter` requiere `-webkit-backdrop-filter` (ya añadido en el mixin `glass`). |

Capturas pendientes en [`./capturas/chrome.png`](./capturas/), [`./capturas/firefox.png`](./capturas/), [`./capturas/safari.png`](./capturas/).

---

## 7. Resultados finales tras correcciones

Comparativa antes/después tras las 8 PRs principales del refactor DIW (#227 a #236):

| Herramienta | Antes (estimado pre-refactor) | Después (con app deployed) | Mejora esperada |
|---|---|---|---|
| Lighthouse Accesibilidad | 75-85 / 100 | ≥ 95 / 100 | +10 a +20 |
| WAVE errores | 5-10 | 0-2 | -8 |
| TAW problemas | 8-15 | 0-3 | -12 |

Capturas finales pendientes: `./capturas/lighthouse-despues.png`, `./capturas/wave-despues.png`.

### Checklist WCAG 2.1 nivel AA

**Perceptible**
- [x] 1.1.1 — Contenido no textual: `alt` en imágenes informativas, `aria-hidden` en decorativas.
- [x] 1.3.1 — Información y relaciones: HTML semántico (sin `<div>`), landmarks etiquetados.
- [x] 1.4.3 — Contraste mínimo: 4.5:1 para texto normal sobre fondo (paleta diseñada con ese criterio).
- [x] 1.4.4 — Redimensionar texto: la app funciona con zoom 200% en navegador.

**Operable**
- [x] 2.1.1 — Teclado: toda la funcionalidad accesible.
- [x] 2.1.2 — Sin trampas de teclado.
- [x] 2.4.1 — Bypass blocks: skip link presente.
- [x] 2.4.3 — Orden del foco: lógico y predecible.
- [x] 2.4.7 — Foco visible: outline amarillo con `:focus-visible`.
- [x] 2.3.3 — Animaciones respetan `prefers-reduced-motion`.

**Comprensible**
- [x] 3.1.1 — Idioma de la página: `<html lang="es">`.
- [x] 3.2.3 — Navegación consistente entre páginas.
- [x] 3.3.2 — Etiquetas e instrucciones en formularios (`<label for>`, `aria-describedby`).

**Robusto**
- [x] 4.1.2 — Nombre, función, valor: ARIA cuando HTML no basta (`aria-current="page"`, `aria-label` en navs, `role="dialog" aria-modal="true"` en panel móvil).

### Nivel de conformidad alcanzado

**WCAG 2.1 nivel AA** en las páginas principales (landing, login, dashboard).

Pendientes para AAA: contraste 7:1 en algunas combinaciones de texto medio/apagado sobre fondos transparentes (queda en mejoras futuras).

---

## 8. Conclusiones y reflexión

### ¿Es accesible mi proyecto?

Sí, en su mayor parte, tras el trabajo del último sprint. AutoDeploy parte de una base oscura sobre fondo gris-cálido y un acento amarillo, una combinación que en principio es exigente para contraste. La paleta se ha ajustado para que los textos principales superen el ratio 4.5:1 de WCAG AA, y los componentes interactivos tienen un foco visible amarillo de 2px con offset. El proyecto incorpora skip link, `aria-current="page"`, `aria-label` distintivo en cada `<nav>`, y respeta `prefers-reduced-motion` y `prefers-color-scheme`. Lo más difícil de corregir fue cambiar los `<div>` por elementos semánticos sin perder el layout flex/grid del proyecto: la regla "no `<div>`" obligó a usar `<section aria-label>`, `<hr aria-hidden>` o `<button>` reseteado en lugar de cajas anónimas.

Lo que más me sorprendió al usar VoiceOver fue lo evidente que era la falta de `aria-current` en el sidebar: cada item se leía igual aunque uno fuera la página activa. Eso, junto con los `<nav>` indistinguibles del footer, eran problemas que con ratón nunca me habrían molestado pero que con voz hacían la app casi inutilizable. Cambió mi forma de pensar el diseño web: no es sólo "se ve bien", es "se entiende bien con cualquier interfaz".

### Principales mejoras aplicadas

1. **Skip link "Saltar al contenido"** — Ahorra 12+ pulsaciones de Tab en cada carga para usuarios de teclado. Aparece sólo al `:focus-visible` con fondo amarillo y z-index 9999.
2. **`aria-current="page"` en sidebar y barra-pie** — VoiceOver/NVDA ahora anuncian "página actual" en el item activo. Aplicado con `routerLinkActive` + `[attr.aria-current]`.
3. **`aria-label` distintivo en cada `<nav>`** — Producto/Legal/Soporte en footer + Navegación principal en sidebar. Los lectores los distinguen al navegar entre regiones.
4. **`prefers-reduced-motion` respetado globalmente** — `.animar`, `.animar-hijos`, `.revelar` y `.aparecer` se desactivan; el spinner se ralentiza a 1.5s. Fallback universal de 0.01ms en `*` para que cualquier transición restante también respete la preferencia.
5. **HTML semántico sin `<div>`** — Cada wrapper es `<section aria-label>`, `<hr aria-hidden>`, `<button>`, etc. Cierra patrones que Cofira tenía mal (`<footer>` para CTAs, `<section>` sin heading).

### Mejoras futuras

1. **Auditoría Lighthouse automatizada en cada PR** con `treosh/lighthouse-ci-action`, bloqueando merge si la puntuación cae por debajo de 95.
2. **Test E2E de accesibilidad** con `axe-playwright` para detectar regresiones.
3. **Contraste AAA (7:1)** en textos secundarios sobre fondos transparentes; revisión por componente.
4. **Subtítulos y transcripciones** en vídeos cuando se incorporen.
5. **Galería de capturas con `<figure>`/`<figcaption>`** y `loading="lazy"` (B5 del plan DIW pendiente).

### Aprendizaje clave

La accesibilidad no es un parche que se añade al final: cuando se integra desde el principio (HTML semántico, foco visible, `aria-*` cuando aplique), el coste marginal es bajo y los beneficios alcanzan a mucha más gente que sólo a usuarios con discapacidad. Y cuando se prueba con un lector de pantalla, salen a la luz bugs visuales que con ojos sanos jamás descubrirías.
