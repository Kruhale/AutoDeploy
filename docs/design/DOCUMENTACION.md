# Documentación del diseño visual y la arquitectura CSS — AutoDeploy

Este documento sigue la estructura de 7 secciones que pide la rúbrica DIW (Órbita 2 — Desarrollo CSS). Cada sección explica una decisión arquitectónica del proyecto, justifica el porqué y enlaza al código real.

> **Aplicación desplegada**: https://autodeploy.kruhale.com
> **Repositorio**: https://github.com/Kruhale/AutoDeploy
> **Figma**: enlace al prototipo en `docs/04-guia-estilos.md`.

## Índice

1. [Arquitectura CSS y comunicación visual](#1-arquitectura-css-y-comunicación-visual)
2. [HTML semántico y estructura](#2-html-semántico-y-estructura)
3. [Sistema de componentes UI](#3-sistema-de-componentes-ui)
4. [Responsive design](#4-responsive-design)
5. [Optimización multimedia](#5-optimización-multimedia)
6. [Sistema de temas](#6-sistema-de-temas)
7. [Aplicación completa y despliegue](#7-aplicación-completa-y-despliegue)

---

## 1. Arquitectura CSS y comunicación visual

### 1.1 Principios de comunicación visual

| Principio | Cómo se aplica en AutoDeploy |
|---|---|
| **Jerarquía** | Escala tipográfica completa (`--font-size-xs` a `--font-size-5xl`) + 4 pesos de fuente (`400/500/600/700/800/900`). Los títulos hero usan `fluido(2.5rem, 4.5rem)` para destacar mientras escalan con el viewport. El body se mantiene en `1rem` (`--font-size-base`) y las metadatos en `0.6875rem` (`--font-size-sm`). |
| **Contraste** | Paleta deliberadamente oscura con un acento amarillo (`--amarillo-normal: hsl(47, 86%, 56%)`) sobre fondos `hsl(30, 5%, 7-16%)`. Contraste texto principal `--texto-claro` (`hsl(40, 33%, 91%)`) sobre `--fondo-tarjeta` (`hsl(32, 4%, 16%)`) verificado en WebAIM (>4.5:1 WCAG AA). |
| **Alineación** | Layouts de página con CSS Grid (`grid-template-columns: minmax(0, 1fr)` y `auto-fit + minmax`). Componentes con Flexbox via `@include flex-centro/entre/columna`. Sin "flotantes" sueltos. |
| **Proximidad** | Sistema de espaciado de 15 niveles (`--spacing-size-xxs` a `--spacing-size-8xl`). Reglas: 8-12px entre elementos relacionados, 16-24px entre relacionados, 32-48px entre secciones, 64px+ entre bloques principales. |
| **Repetición** | Design tokens centralizados en `02-generic/_design-tokens.scss` — todo color, tipografía, espaciado, sombra, radius, duración viene de una única fuente. Si cambia `--amarillo-normal`, cambia toda la app. |

### 1.2 Metodología CSS: ITCSS + BEM

#### ITCSS — Inverted Triangle CSS

7 capas que se cargan en orden creciente de especificidad. El orquestador único es `src/styles.scss`:

```
00-settings    · solo Sass vars ($var). No genera CSS.
01-tools       · mixins, funciones, animaciones reutilizables.
02-generic     · reset + design tokens (CSS Custom Properties).
03-elements    · estilos base sobre tags HTML (button, input, ...).
04-layout      · estructura de página (header, main, footer, grids).
05-components  · bloques BEM concretos (40+ partials).
06-utilities   · helpers .u-* (última capa, ganan por orden).
```

> **Aclaración crítica** sobre Settings: en Cofira las Custom Properties (`:root { --x: y; }`) estaban en `00-settings/_variables.scss`. En AutoDeploy se han movido a `02-generic/_design-tokens.scss` porque generan CSS real, y Settings debe quedarse sólo con Sass vars (breakpoints). Detalle completo en `autodeploy/src/styles/README.md`.

#### BEM — Block Element Modifier

Cada componente es un bloque BEM con elementos (`&__elemento`) y modificadores (`&--modificador`) anidados con `&`:

```scss
.tarjeta-servidor {
  /* propiedades del bloque */

  &__cabecera { /* elemento */ }
  &__nombre   { /* elemento */ }
  &--destacada { /* modificador */ }

  &:hover { /* estado */ }
  &:focus-within { /* estado */ }
}
```

Esta convención garantiza que CSS resuelve sin colisiones aunque los estilos sean globales. No se usa `<div>` decorativo en HTML; en su lugar, elementos semánticos (`<section>`, `<article>`, `<aside>`, `<hr>`, `<nav>`).

### 1.3 Organización de archivos ITCSS

```
src/styles/
├── 00-settings/
│   ├── _fonts.scss          ← @import Outfit + JetBrains Mono
│   ├── _css-variables.scss  ← $breakpoint-sm/md/lg/xl/2xl
│   └── _variables.scss      ← @use 'css-variables' as *;
├── 01-tools/
│   ├── _mixins.scss         ← 31 mixins
│   ├── _funciones.scss      ← 11 funciones
│   └── _animaciones.scss    ← keyframes + .animar/.revelar/.spinner
├── 02-generic/
│   ├── _reset.scss          ← reset + transición de tema
│   └── _design-tokens.scss  ← :root { --x } + .tema-claro { --x }
├── 03-elements/
│   ├── _buttons.scss        ← .boton--primario/secundario/ghost/peligro
│   └── _forms.scss          ← .campo, .toggle, .interruptor
├── 04-layout/
│   └── _layout.scss         ← .disposicion-app
├── 05-components/           ← 40+ partials BEM
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
│   ├── _flex.scss           ← NUEVO
│   ├── _display.scss        ← NUEVO
│   ├── _z-index.scss        ← NUEVO
│   └── _saltar-contenido.scss ← NUEVO (skip link)
└── README.md                ← guía completa de la arquitectura
```

### 1.4 Sistema de design tokens

Los tokens viven en `02-generic/_design-tokens.scss` como Custom Properties bajo `:root {}` y overrides en `.tema-claro {}`.

**Familias documentadas**:

| Familia | Variables | Decisión |
|---|---|---|
| Fondos | `--fondo-normal`, `--fondo-oscuro`, `--fondo-tarjeta`, `--fondo-negro`, `--fondo-negro-medio`, `--fondo-cta-claro`, `--fondo-cabecera`, `--negro-cta` | Escala de grises con tinte cálido (HSL 28-34°) para que combine con el acento amarillo. |
| Acento | `--amarillo-normal`, `--amarillo-normal-hover` | Identidad visual del producto. Único acento principal; el resto son estados. |
| Textos | `--texto-claro`, `--texto-medio`, `--texto-apagado` | 3 niveles. Contraste verificado WCAG AA sobre `--fondo-tarjeta`. |
| Bordes | `--borde-normal`, `--borde-suave` | Con transparencia para que se integren en cualquier fondo. |
| Estados | `--verde-normal`, `--rojo-normal`, `--rojo-critico`, `--naranja-normal`, `--azul-normal`, `--cyan-normal`, `--teal-normal` | Colores semánticos (success/error/warning/info). |
| Transparencias | `--amarillo-transparente-008/030`, `--cyan-transparente-008`, `--negro-transparente-020/040` | Hover suaves y overlays. |
| Tipografía | `--font-primary` (Outfit), `--font-secondary`, `--font-mono` (JetBrains Mono), `--font-size-xs..5xl` (11 niveles), `--font-weight-normal..black` (6 pesos), `--line-height-tight/normal/relaxed` | Outfit por su legibilidad en pantalla y soporte de pesos hasta black. JetBrains Mono para terminales/snippets. |
| Espaciado | `--spacing-size-xxs..8xl` (15 niveles) | Múltiplos de 4px y 8px para mantener una rejilla armónica. |
| Border-radius | `--radius-xs..4xl`, `--radius-full` | Componentes con radius `m` (0.5rem) por defecto, `l` para tarjetas, `full` para badges. |
| Sombras | `--shadow-sm/md/lg`, `--shadow-glow-amarillo`, `--shadow-hover-amarillo`, `--shadow-hover-cyan` | Sombra glow ligera para hovers cálidos; sm/md/lg para elevaciones progresivas. |
| Z-index | `--z-sidebar (50)`, `--z-header (100)`, `--z-dropdown (200)`, `--z-modal (300)`, `--z-toast (400)` | Escala explícita: nunca números mágicos en componentes. |
| Duración | `--duration-fast (150ms)`, `--duration-base (200ms)`, `--duration-slow (300ms)` | Todas las transiciones del proyecto pasan por uno de los tres. |

### 1.5 Mixins y funciones

`01-tools/_mixins.scss` define **31 mixins** organizados por categorías. Los más usados:

- **Responsive viewport**: `@include movil`, `tablet`, `escritorio`, `entre($a, $b)`.
- **Container queries**: `@include contenedor-pequeno/mediano/grande`.
- **Preferencias usuario**: `@include movimiento-reducido`, `solo-tactil`, `solo-puntero-fino`, `contraste-alto`, `esquema-claro/oscuro`.
- **Layout**: `@include flex-centro/entre/columna/envoltura`, `grid-auto($min, $hueco)`, `contenedor($ancho)`.
- **Efectos**: `@include transicion(props...)` (timing function unificado), `glass($fondo)`, `enlace-subrayado`.
- **Accesibilidad**: `@include foco-visible`, `visualmente-oculto`, `disabled`.
- **Componente base**: `@include tarjeta-base`, `tarjeta-interactiva`.

`01-tools/_funciones.scss` define **11 funciones** Sass:

- **Conversión**: `rem($px)`, `em($px, $ctx)`.
- **Mapas**: `tomar($mapa, $clave)` con error si la clave no existe.
- **Tipografía fluida**: `fluido($min, $max, $vp-min, $vp-max)` genera `clamp()` lineal.
- **Atajos a tokens**: `token-color`, `token-espacio`, `token-radio`, `token-sombra`, `token-z`, `token-duracion`.
- **Accesibilidad**: `contraste-sobre($color)` devuelve texto claro u oscuro según la luminosidad HSL del fondo.

Tabla completa con propósito y ejemplo de uso en `autodeploy/src/styles/README.md`.

### 1.6 ViewEncapsulation en Angular

Decisión adoptada: **`ViewEncapsulation.Emulated`** (la opción por defecto de Angular) combinada con **estilos globales en `styles/05-components/`**.

| Capa | Encapsulación | Por qué |
|---|---|---|
| `00-settings`, `01-tools`, `02-generic` | Global | Variables, mixins, reset deben aplicar al documento entero. Las Custom Properties atraviesan Shadow DOM, así que aunque mañana se cambie un componente a `ShadowDom`, los tokens seguirán llegando. |
| `03-elements`, `04-layout`, `05-components`, `06-utilities` | Global | Compartidos entre páginas. Encapsular cada uno generaría duplicación masiva sin beneficio. |
| Componentes Angular con `.scss` local | `Emulated` | Sólo `pages/cuenta/cuenta.scss` mantiene estilos locales (usa `:host` por necesidades específicas). El resto tiene un `.scss` vacío que apunta al global. |

Razonamiento: el proyecto es individual, el equipo es de una persona, y se busca máxima coherencia visual. La opción híbrida que sugiere la rúbrica Rublicas5 (ITCSS global + componentes UI encapsulados) tendría sentido en un equipo grande; aquí sería burocracia innecesaria.

---

## 2. HTML semántico y estructura

### 2.1 Elementos semánticos utilizados

| Elemento | Uso en AutoDeploy |
|---|---|
| `<header>` | Cabecera del sitio (`<app-header>` en la landing pública) y de la app autenticada: `disposicion-app__cabecera-movil` (móvil con hamburguesa + logo + campana) y `disposicion-app__cabecera-desktop` (desktop con toggle de tema + campana de notificaciones + icono de cuenta). Pie de la barra lateral (`barra-lateral__inferior`). |
| `<nav>` | 5+ instancias, todas con `aria-label` distintivo: principal (sidebar), header, footer producto, footer legal, footer soporte, redes sociales, breadcrumbs. |
| `<main>` | Único por ruta, con `id="contenido-principal"` y `tabindex="-1"` para que el skip link salte ahí. |
| `<article>` | En notificaciones, posts del dropdown. |
| `<section>` | Agrupaciones temáticas con heading o `aria-label`/`aria-labelledby`. Si no hay heading, se cambia a `<div>` o se añade etiqueta accesible. |
| `<aside>` | Sidebar de la app autenticada y elementos secundarios. |
| `<footer>` | Pie de página global, pie del sidebar (info de usuario). |
| `<figure>` + `<figcaption>` | Galería de capturas accesible (componente `galeria-capturas` en `components/shared/galeria-capturas/`). |
| `<hr>` | Separadores decorativos con `aria-hidden="true"`. |
| `<button>` | Cualquier elemento clickable que no navega (incluido el backdrop modal con `tabindex="-1"`). |
| `<a>` | Enlaces de navegación. |

**Regla del proyecto**: no usar `<div>`. Cada wrapper sin significado semántico debe ser una `<section aria-label="...">`, `<article>`, `<aside>` o el elemento HTML que corresponda. Esto cierra el patrón Cofira (`<section>` sin heading) y mejora la accesibilidad.

### 2.2 Jerarquía de headings

Reglas:
- Un único `<h1>` por ruta. Lo aporta la página interna (login: "Inicia sesión", dashboard: "Panel principal"…).
- `<h2>` para secciones principales dentro de una página.
- `<h3>` para subsecciones.
- No se saltan niveles: tras un `<h2>` viene `<h3>`, nunca `<h5>`.
- Los sidebars y barras laterales NO añaden headings duplicados; usan `aria-labelledby` apuntando al título visible.

Ejemplo en el sidebar:

```html
<section aria-labelledby="barra-lateral-titulo-1">
  <header class="barra-lateral__seccion__cabecera">
    <span id="barra-lateral-titulo-1">Principal</span>
  </header>
  <ul>...</ul>
</section>
```

### 2.3 Estructura de formularios

Todos los formularios siguen este patrón (visible en `pagina-login.html`, `pagina-registro.html`, `pagina-contacto.html`):

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

Detalles:
- Cada `<input>` con su `<label for="...">` asociado por `id`.
- `<fieldset>` + `<legend>` cuando hay grupos relacionados.
- `aria-describedby` apuntando a la pista; los lectores la leen tras el campo.
- `:focus`, `:focus-visible` y `:invalid:not(:focus)` añadidos en `_forms.scss`.

---

## 3. Sistema de componentes UI

### 3.1 Componentes implementados

| Componente | Variantes | Tamaños | Estados | Archivo |
|---|---|---|---|---|
| `.boton` | `--primario`, `--secundario`, `--ghost`, `--peligro` | `md` (único actualmente) | `:hover`, `:active`, `:focus-visible`, `:disabled` | `03-elements/_buttons.scss` |
| `.campo` (form input) | `__input`, `__textarea`, `__select` | — | `:focus`, `:focus-visible`, `:disabled`, `:invalid:not(:focus)` | `03-elements/_forms.scss` |
| `.toggle` (segmented) | `__opcion`, `__opcion--activa` | — | `:hover`, `:focus-visible`, `:disabled` | `03-elements/_forms.scss` |
| `.interruptor` (switch) | `--activo` | — | `:focus-visible`, `:disabled` | `03-elements/_forms.scss` |
| `.tarjeta-servidor` | `--destacada` | container queries (peq/medio/grande) | `:hover`, `:active`, `:focus-within` | `05-components/_tarjeta-servidor.scss` |
| `.tarjeta-stat` | acento `--primario/teal/cyan/exito/advertencia` | container queries (peq/grande) | `:hover`, `:active`, `:focus-within` | `05-components/_tarjeta-estadistica.scss` |
| `.tarjeta-plan` | `--destacado` | container queries (peq/grande) | `:hover`, `:active`, `:focus-within` | `05-components/_seccion-precios.scss` |
| `.barra-lateral` | `--abierta`, `--colapsada` | — | `:hover`, `:focus-visible`, `[aria-current="page"]` | `05-components/_barra-lateral.scss` |
| `.tabla-sitios` | `__fila` interactiva | — | `:hover`, `:active`, `:focus-within` | `05-components/_tabla-sitios.scss` |
| `.spinner` | `--grande`, `--cyan`, `--verde` | — | animación `giro-spinner` 0.8s linear | `01-tools/_animaciones.scss` |

### 3.2 Nomenclatura BEM aplicada

Ejemplo real (`_tarjeta-servidor.scss`):

```scss
.tarjeta-servidor {           // BLOQUE
  container-type: inline-size;
  @include tarjeta-base;

  &__cabecera { ... }         // ELEMENTO __cabecera
  &__indicador {              // ELEMENTO __indicador
    &--verde { ... }          // MODIFICADOR de elemento
    &--naranja { ... }
    &--rojo { ... }
  }
  &__nombre { ... }

  &--destacada { ... }        // MODIFICADOR de bloque

  &:hover { ... }             // ESTADO
  &:focus-within { ... }      // ESTADO

  @include contenedor-pequeno {  // CONTAINER QUERY
    &__ip { display: none; }
  }
}
```

Reglas mantenidas en todos los partials de `05-components/`:
1. Bloque raíz contiene propiedades + elementos + modificadores + estados + container/media queries.
2. Modificadores con `&--`, elementos con `&__`.
3. Sin BEM plano (cada elemento bajo `&` del bloque).
4. Sin anidamiento profundo: cada elemento BEM está como hijo directo del bloque raíz, nunca anidado bajo otro elemento.

### 3.3 Style Guide

La página `/style-guide` está implementada en `autodeploy/src/app/pages/style-guide/` (commit `ad00511`, PR de Rublicas10 FASE 3). Es accesible públicamente en `https://autodeploy.kruhale.com/style-guide` y muestra todos los componentes con sus variantes y estados (tipografía, paleta, espaciado, botones, formularios, tarjetas, navegación, feedback, animaciones). Sirve a la vez como documentación visual y como testing rápido: cualquier cambio en un token o componente se ve en esa página al instante.

---

## 4. Responsive design

### 4.1 Breakpoints definidos

Variables Sass en `00-settings/_css-variables.scss`:

```scss
$breakpoint-sm:  576px;   // móvil grande
$breakpoint-md:  768px;   // tablet
$breakpoint-lg:  992px;   // desktop pequeño
$breakpoint-xl:  1200px;  // desktop estándar
$breakpoint-2xl: 1400px;  // desktop ancho
```

Decisión: 5 breakpoints que cubren la mayoría de viewports comunes (iPhone, iPad portrait, MacBook 13", desktop 1440p). Coinciden con los de Bootstrap/Tailwind para que los desarrolladores externos los reconozcan rápido.

### 4.2 Estrategia mobile-first

Patrón general: estilos base para móvil, `@include escritorio { ... }` añade ajustes para tamaños mayores. Excepción: cuando la UI desktop-first es más natural (sidebar fija que se vuelve fixed en móvil), se usa `@include movil { ... }` para los overrides.

Ejemplo (`_barra-lateral.scss`):

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

Implementadas en cuatro componentes para que el mismo bloque se adapte al ancho del contenedor padre, no del viewport: `_tarjeta-servidor.scss`, `_tarjeta-estadistica.scss`, `_seccion-precios.scss` (tarjeta-plan) y `_galeria-capturas.scss`.

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

Beneficio: la tarjeta vive en sidebar (~280px), grid dashboard (~340px), panel detalle (>600px) y reacciona al espacio que tiene disponible sin que el viewport cambie. La galería de capturas usa la misma técnica para pasar de 1 a 2-3 columnas según el contenedor donde se inserte (página de bienvenida, sección dentro de un panel, etc.).

### 4.4 Adaptaciones principales (mobile / tablet / desktop)

| Zona | Móvil (<768px) | Tablet (768-992px) | Desktop (>992px) |
|---|---|---|---|
| Header app | `cabecera-movil` con hamburguesa + logo + campana | Aparece el sidebar; la cabecera móvil desaparece | Sidebar fijo + `cabecera-desktop` con toggle de tema + campana + icono cuenta |
| Sidebar | `fixed` con `transform: translateX(-100%)` y backdrop modal | `sticky` lateral | `sticky` lateral, opcionalmente colapsable |
| Hero (seccion-bienvenida) | Una columna | Una columna | Dos columnas |
| Dashboard tarjetas | 1 columna | 2 columnas | 3+ columnas con container queries |
| Footer columnas | Stack vertical | 2 columnas | 4 columnas |
| Tipografía | `fluido(2.5rem, 4.5rem)` | escala en clamp | escala en clamp |

### 4.5 Páginas implementadas

- `bienvenida` (landing pública)
- `login`, `registro`
- `dashboard` (panel principal)
- `gestion-servidor`, `nuevo-despliegue`, `onboarding`
- `terminal-selector`, `terminal-ssh`, `logs-terminal`
- `asistente-ia`
- `networking`, `firewall`, `backups`
- `billing`, `pago`, `confirmar-free`
- `documentacion`, `recursos`, `comunidad`, `contacto`, `estado`
- `cuenta`
- `aviso-legal`, `politica-privacidad`, `politica-cookies`

### 4.6 Screenshots comparativos

Carpeta `docs/design/capturas/` (se irá poblando con capturas a 375px / 768px / 1280px de las páginas principales). El despliegue público en https://autodeploy.kruhale.com permite al evaluador comprobar todo en vivo con DevTools.

---

## 5. Optimización multimedia

### 5.1 Formatos elegidos

| Formato | Cuándo se usa |
|---|---|
| **SVG** | Logos, iconos, ilustraciones decorativas. Escalado vectorial sin pérdida y tamaño mínimo. Iconografía base FontAwesome (web fonts) + SVGs inline en redes sociales del footer. |
| **WebP** | Capturas y fotografías. Mejor compresión que JPG sin pérdida visible. |
| **PNG** | Logo principal (`logo.png`) por compatibilidad con favicons y manifest. Pendiente migración a SVG. |

### 5.2 Herramientas utilizadas

- **SVGO** (https://jakearchibald.github.io/svgomg/) para los SVG.
- **Squoosh** (https://squoosh.app/) para imágenes JPG/PNG → WebP.
- **ImageOptim** (en macOS) para PNGs con transparencia.

### 5.3 Resultados de optimización

Tabla pendiente de poblar con datos reales conforme se incorporen las capturas a la galería (`docs/design/capturas/`).

### 5.4 Tecnologías implementadas

#### `<picture>` con `srcset` y `sizes`

Patrón aplicado en el componente `galeria-capturas` (`autodeploy/src/app/components/shared/galeria-capturas/`):

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

En todas las imágenes por debajo del fold (galería, secciones internas) para diferir descarga hasta que el usuario llega.

### 5.5 Animaciones CSS

`01-tools/_animaciones.scss` define las animaciones reutilizables. Reglas autoimpuestas:
- Solo `transform` y `opacity` (el navegador las compone en GPU).
- Duración 150-500ms (excepto spinner: 800ms continuo).
- Timing function `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out suave).
- Todas se desactivan bajo `prefers-reduced-motion`.

Animaciones disponibles:
- `.animar--subir/derecha/escala` (entrada de página).
- `.revelar` + variantes (scroll reveal con IntersectionObserver).
- `.animar-hijos > *` (stagger de hijos).
- `.spinner` (loading).
- `.aparecer` (fade rápido de 0.32s, micro-interacción).
- Keyframes locales en cada componente (`pulso-estado`, `latido`, `parpadeo-cursor`, `latido-indicador-sidebar`).

---

## 6. Sistema de temas

### 6.1 Variables de tema

Dos bloques de Custom Properties en `02-generic/_design-tokens.scss`:

```scss
:root {
  /* tema oscuro (por defecto) */
  --fondo-normal: hsl(30, 4.65%, 10.78%);
  --texto-claro: hsl(40, 33.33%, 91.37%);
  --shadow-md: 0 0.5rem 1.25rem hsla(0, 0%, 0%, 0.2);
  /* ... */
}

.tema-claro {
  /* overrides para tema claro */
  --fondo-normal: hsl(40, 18%, 96%);
  --texto-claro: hsl(30, 12%, 12%);
  --shadow-md: 0 0.5rem 1.25rem hsla(0, 0%, 0%, 0.08);
  /* ... */
}
```

Sólo se sobreescriben los tokens que cambian con el tema (fondos, textos, bordes, sombras y cabecera blur). Acento amarillo, estados (verde/rojo) y tipografía se mantienen.

### 6.2 Implementación del Theme Switcher

`autodeploy/src/app/services/theme.service.ts` orquesta el cambio:

1. Al primer arranque, lee `localStorage.tema`. Si no hay valor, llama a `matchMedia("(prefers-color-scheme: light)")` y aplica el tema del sistema.
2. Mantiene un signal `eleccionManual` que se activa cuando el usuario pulsa el botón del header.
3. Mientras `eleccionManual === false`, escucha el evento `change` del `MediaQueryList` y reacciona a cambios del sistema en vivo.
4. Cuando `eleccionManual === true`, persiste en `localStorage` y prevalece sobre el sistema. Borrar `localStorage.tema` devuelve al modo automático.

Tag visual en el header (`app-header`) llama a `themeService.alternarTema()`. El cambio aplica una clase `.tema-claro` al `<html>` y el reset CSS añade una transición suave de 200ms (`background-color`, `color`) que se anula bajo `prefers-reduced-motion`.

### 6.3 Capturas (modo claro y oscuro)

Pendiente de poblar `docs/design/capturas/` con tomas en 3 páginas representativas: landing, dashboard, billing.

---

## 7. Aplicación completa y despliegue

### 7.1 Estado final

- Frontend Angular 20 con standalone components, signals, lazy routes.
- Backend Spring Boot 3.4 + Java 21 con record DTOs, Spring Security, Spring Data MongoDB.
- Base de datos MongoDB 8.
- WebSockets (Spring + xterm.js) para terminales SSH interactivas.
- IA con OpenRouter (modelo configurable).
- Reverse proxy nginx (contenedor + host).
- Imagen Docker publicada en GHCR.
- 5 idiomas (es / en / fr / de / it) con ngx-translate.
- 123/123 tests Karma+Jasmine en frontend.

### 7.2 Despliegue

- URL pública: **https://autodeploy.kruhale.com**
- Pipeline GitHub Actions: CI (build + test) → CD (build imagen + push GHCR + SSH deploy con `appleboy/ssh-action`).
- TLS terminado por nginx-host del VPS con Let's Encrypt.
- HSTS habilitado.

### 7.3 Problemas conocidos y mejoras futuras

| Área | Problema / Pendiente |
|---|---|
| WCAG | Capturas finales de Lighthouse / WAVE / TAW antes/después en `docs/accesibilidad/capturas/` (los mecanismos WCAG ya están aplicados; falta sólo la documentación visual del audit). |
| Galería de capturas | El componente `galeria-capturas` está listo pero las imágenes reales (dashboard, asistente IA, terminal, backups, métricas, firewall) se generarán y se subirán a `autodeploy/public/img/capturas/` al final del sprint. |
| Logo | `logo.png` se mantiene por compatibilidad con favicons y manifest; migración a SVG planificada para una iteración futura. |
| Cuenta | `pages/cuenta/cuenta.scss` mantiene estilos `:host` por necesidades específicas; mover a global en una iteración futura. |
| Performance | El bundle inicial supera 500 kB por 90 kB (warning de Angular CLI). Futuro: lazy-load del módulo de billing/admin. |
