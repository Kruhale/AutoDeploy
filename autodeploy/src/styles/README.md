# Arquitectura de estilos — ITCSS

Los estilos de AutoDeploy siguen [ITCSS](https://itcss.io/) (Inverted Triangle CSS), que organiza los selectores en capas de menor a mayor especificidad. El orquestador único es `src/styles.scss` y carga las capas en orden estricto.

## Las 7 capas

```
00-settings     · solo variables Sass ($var). No genera CSS.
01-tools        · mixins, funciones y keyframes/animaciones reutilizables.
02-generic      · reset + design tokens (CSS Custom Properties).
03-elements     · estilos base sobre tags HTML (button, input, a, …).
04-layout       · estructura de página (header, main, footer, grid).
05-components   · bloques BEM concretos (tarjetas, secciones, páginas).
06-utilities    · helpers .u-* (última capa, ganan por orden de cascada).
```

Cualquier archivo nuevo se añade a `styles.scss` en su sección, nunca antes ni después de capas que ya estén importadas.

## Variables Sass vs CSS Custom Properties

**Esta distinción es la base del orden de carga ITCSS y conviene tenerla clara**:

| | Variables Sass (`$var`) | Custom Properties (`var(--var)`) |
|---|--------------------------|-----------------------------------|
| Sintaxis | `$breakpoint-md: 768px;` | `--amarillo-normal: hsl(47, 86%, 56%);` |
| Cuándo se resuelven | **En compilación** (build de Sass) | **En tiempo de ejecución** (cada repaint del navegador) |
| ¿Genera CSS? | No por sí solas | Sí, viajan en el bundle como `:root { --x: y; }` |
| El orden de import importa | **Sí**. Usarlas antes de declararlas falla la build. | **No**. El navegador resuelve `var()` contra la cascada final del documento, independientemente del orden con que llegó al CSS. |
| ¿Se pueden cambiar en runtime? | No (son texto sustituido) | Sí (`document.documentElement.style.setProperty(...)`, temas, media queries) |
| Capa ITCSS correcta | **Settings (00)** | **Generic/Theme (02)** |

**Por qué importa**: poner Custom Properties en Settings es un error conceptual común. Settings se supone que no genera CSS — y `:root { --x: y; }` sí lo genera. Settings tiene que quedarse con Sass vars (breakpoints, mapas de tokens) y los tokens visibles al navegador viven en `02-generic/_design-tokens.scss`.

El error contrario también es común: justificar el orden de carga de Settings diciendo "si no se carga antes, los `var()` no funcionarían". Es falso para Custom Properties. El orden solo importa para Sass vars.

## Cuándo va cada cosa

| Si lo que vas a escribir es… | Capa | Ejemplo |
|------------------------------|------|---------|
| Una Sass var (`$breakpoint-md: 768px`) | `00-settings` | `_css-variables.scss`, `_variables.scss` |
| Una Custom Property visible al navegador (`--amarillo-normal`) | `02-generic` | `_design-tokens.scss` |
| Un mixin con `@content` o parámetros | `01-tools` | `_mixins.scss` |
| Una función (`@function`) que devuelve un valor | `01-tools` | `_funciones.scss` |
| Un keyframe o una clase de animación global | `01-tools` | `_animaciones.scss` (`.animar`, `.revelar`, `.spinner`, `.aparecer`) |
| Un reset o un `box-sizing: border-box;` global | `02-generic` | `_reset.scss` |
| Estilos base sobre `button`, `input`, `a`… sin clase | `03-elements` | `_buttons.scss`, `_forms.scss` |
| Estructura de página: header, sidebar, grid principal | `04-layout` | `_layout.scss` |
| Un componente o sección con su bloque BEM (`.tarjeta-X`, `.pagina-X`) | `05-components` | `_pagina-login.scss`, `_tarjeta-servidor.scss` |
| Un helper transversal tipo `.u-oculto`, `.u-flex-centro` | `06-utilities` | `_visibilidad.scss`, `_flex.scss`, `_display.scss`, `_z-index.scss`, `_saltar-contenido.scss` |

## Mixins disponibles (`01-tools/_mixins.scss`)

| Mixin | Para qué sirve | Ejemplo de uso |
|---|---|---|
| `@include movil-pequeno` | Media query `max-width: $breakpoint-sm` (576px) | `@include movil-pequeno { ... }` |
| `@include movil` | Media query `max-width: $breakpoint-md` (768px) | `@include movil { padding: 1rem; }` |
| `@include tablet` | Media query `max-width: $breakpoint-lg` (992px) | `@include tablet { ... }` |
| `@include escritorio` | Media query `min-width: $breakpoint-lg` | `@include escritorio { ... }` |
| `@include escritorio-grande` | Media query `min-width: $breakpoint-xl` (1200px) | |
| `@include entre($a, $b)` | Rango personalizado | `@include entre(720px, 960px) { ... }` |
| `@include solo-tactil` | `(hover: none) and (pointer: coarse)` | Pulsa el dispositivo (móvil/tablet sin ratón) |
| `@include solo-puntero-fino` | `(hover: hover) and (pointer: fine)` | Sólo cuando hay ratón con precisión |
| `@include movimiento-reducido` | `prefers-reduced-motion: reduce` | Bloquea animaciones para usuarios sensibles |
| `@include contraste-alto` | `prefers-contrast: more` | Reforzar bordes/texto |
| `@include esquema-claro` / `oscuro` | `prefers-color-scheme: ...` | Fallback si no hay theme switcher |
| `@include contenedor-pequeno/mediano/grande` | Container queries | Requiere `container-type: inline-size` en el ancestro |
| `@include flex-centro` | `display:flex; align-items:center; justify-content:center;` | El mixin más usado del proyecto |
| `@include flex-entre` | Flex con `space-between` | |
| `@include flex-columna` | Flex en columna | |
| `@include flex-envoltura` | Flex con `flex-wrap: wrap` | |
| `@include grid-auto($min, $hueco)` | Grid responsivo `auto-fit + minmax` | `@include grid-auto(16rem)` |
| `@include contenedor($ancho)` | Ancho máximo + márgenes centrados | `@include contenedor(64rem)` |
| `@include transicion($props...)` | Transition con timing function unificado | `@include transicion(opacity, transform)` |
| `@include foco-visible` | `:focus-visible` con outline amarillo estándar | Dentro de un selector |
| `@include truncar($lineas)` | Ellipsis multi-línea | `@include truncar(2)` |
| `@include centrado-absoluto` | `position:absolute; top:50%; left:50%; translate(-50%,-50%)` | |
| `@include visualmente-oculto` | Patrón sr-only (oculto visual, accesible) | Para labels invisibles |
| `@include disabled` | `opacity:0.5; cursor:not-allowed; pointer-events:none;` | En `&:disabled { @include disabled; }` |
| `@include tarjeta-base` | Tarjeta con padding/border/radius del proyecto | |
| `@include tarjeta-interactiva` | Tarjeta + hover + focus-within | `.mi-tarjeta { @include tarjeta-interactiva; }` |
| `@include glass($fondo)` | Backdrop-filter blur (efecto vidrio) | |
| `@include enlace-subrayado` | Subrayado animado en hover/foco | |

## Funciones disponibles (`01-tools/_funciones.scss`)

Las funciones devuelven un **valor**: a diferencia de los mixins, no inyectan reglas CSS sino que se usan como literal en una declaración.

| Función | Devuelve | Ejemplo |
|---|---|---|
| `rem($px)` | Píxeles → `rem` (base 16) | `padding: rem(24);` → `1.5rem` |
| `em($px, $contexto: 16)` | Píxeles → `em` respecto a un contexto | `padding: em(12, 14);` |
| `tomar($mapa, $clave)` | Acceso seguro a mapa Sass (error si falta) | `color: tomar($colores, primario);` |
| `fluido($min, $max, $vp-min, $vp-max)` | `clamp()` lineal entre dos viewports | `font-size: fluido(2.5rem, 4.5rem);` |
| `token-color($nombre)` | `var(--$nombre)` | `color: token-color(texto-claro);` |
| `token-espacio($nivel)` | `var(--spacing-size-$nivel)` | `padding: token-espacio(2xl);` |
| `token-radio($nivel)` | `var(--radius-$nivel)` | `border-radius: token-radio(l);` |
| `token-sombra($nivel)` | `var(--shadow-$nivel)` | `box-shadow: token-sombra(md);` |
| `token-z($capa)` | `var(--z-$capa)` | `z-index: token-z(modal);` |
| `token-duracion($vel)` | `var(--duration-$vel)` | `transition-duration: token-duracion(base);` |
| `contraste-sobre($color)` | Negro u oscuro según luminosidad del fondo | `color: contraste-sobre($fondo);` |

## Cuándo crear mixin vs función vs utility

- **Mixin** (`@mixin`): cuando reutilizas un **bloque de declaraciones CSS** (o quieres aceptar `@content`). Ej: media queries (`@include movil { ... }`), patrones (`@include flex-centro`), efectos (`@include glass`).
- **Función** (`@function`): cuando reutilizas un **cálculo o valor derivado**. Ej: convertir unidades (`rem(24)`), generar `clamp()` fluido (`fluido(2.5rem, 4.5rem)`).
- **Utility** (`.u-*` en `06-utilities/`): cuando reutilizas una regla directamente desde HTML. Ej: `<a class="u-saltar-contenido">`, `<section class="u-flex-centro">`.

Una regla sencilla:

> Si lo usas en SCSS y necesita `@content` o varias propiedades → mixin.
> Si lo usas en SCSS y devuelve un solo valor → función.
> Si lo usas en HTML sin modificar el componente → utility.

## Estados obligatorios por tipo de componente

Cada componente interactivo debe definir explícitamente sus estados. Los lectores de pantalla y la navegación por teclado dependen de esto.

| Componente | Estados mínimos | Notas |
|---|---|---|
| Botón (`button`, `<a class="boton">`) | `:hover`, `:active`, `:focus-visible`, `:disabled` | `:focus-visible` para el outline, no `:focus` (que también se activa con ratón) |
| Input / textarea / select | `:focus`, `:focus-visible`, `:disabled`, `:invalid:not(:focus)` | Mostrar borde rojo en `:invalid` sólo cuando el campo NO está enfocado |
| Tarjeta / fila clickable | `:hover`, `:active`, `:focus-within` | `:focus-within` porque el foco lo reciben los elementos hijos (links/buttons), no la tarjeta |
| Item de navegación | `:hover`, `:focus-visible`, `[aria-current="page"]` | `aria-current` lo aplica el router en runtime |
| Enlace | `:hover`, `:focus-visible` | + `&::after` con subrayado animado si es un enlace destacado |
| Modal / overlay | `:focus-within`, focus trap por JS | + `aria-modal="true"` y `role="dialog"` en HTML |

## Responsive: estrategias usadas en el proyecto

El proyecto **combina varios enfoques** intencionadamente para mostrar dominio de las herramientas:

1. **Mobile-first con mixins** (la mayoría): `@include movil { ... }` cuando el breakpoint coincide con uno del sistema (576/768/992/1200/1400). Centralizado en `_mixins.scss`.
2. **`@media` directo con Sass var** (excepción justificada): cuando el bloque está a nivel raíz (no anidado bajo un selector, p.ej. `_banner-cookies.scss`) o usa un breakpoint específico distinto al del sistema (`960px`, `720px`, `60rem`, `56.25rem`, `36rem`).
3. **Tipografía fluida con `fluido()`** (`01-tools/_funciones.scss`): genera un `clamp()` que escala entre dos viewports sin necesidad de breakpoints. Se usa en hero (`_seccion-bienvenida.scss`) y títulos principales.
4. **`clamp()` manual** (puntual): cuando el valor es muy específico y no se reutiliza, mantener `clamp(...)` directo es más claro que envolverlo en `fluido()`.
5. **Container queries con `@container`**: en `_tarjeta-servidor.scss`, `_tarjeta-estadistica.scss`, `_seccion-precios.scss` (tarjeta-plan) y `_galeria-capturas.scss`. El componente se adapta al ancho del contenedor (sidebar, grid, panel detalle, modal), no del viewport. Requiere `container-type: inline-size; container-name: ...;` en el bloque raíz.
6. **Imágenes responsive con `<picture>`/`srcset`/`sizes`/`loading="lazy"`**: en las imágenes informativas con varias variantes y en above-the-fold con `width`/`height` declarados para evitar layout shift.

## Accesibilidad: checklist WCAG aplicado

El proyecto apunta a **WCAG 2.1 nivel AA**. Lista de mecanismos aplicados:

- **HTML semántico**: `<header>`, `<main>`, `<nav>`, `<aside>`, `<footer>`, `<section aria-labelledby>`, `<article>`. Sin `<div>` para envolver contenido semántico.
- **Landmarks etiquetados**: cada `<nav>` y `<section>` sin heading visible lleva `aria-label` o `aria-labelledby`.
- **Skip link**: `.u-saltar-contenido` como primer foco al cargar la página; salta al `<main id="contenido-principal" tabindex="-1">`.
- **`aria-current="page"`**: en cada item del sidebar y barra-pie cuando coincide con la ruta activa (`routerLinkActive` + `[attr.aria-current]`).
- **Foco visible**: `:focus-visible` en todos los interactivos con outline amarillo 2px y offset 2px. Nunca se anula sin alternativa.
- **`prefers-reduced-motion`**: `@include movimiento-reducido` en `_animaciones.scss` desactiva `.animar`, `.animar-hijos`, `.revelar`, `.aparecer` y limita `*` a 0.01ms.
- **`prefers-color-scheme`**: el `ThemeService` aplica automáticamente el tema del sistema al primer arranque y se sincroniza con cambios del SO mientras el usuario no haya elegido manualmente.
- **Contraste**: paleta diseñada con WCAG AA (texto principal sobre fondo ≥ 4.5:1). Verificado con WebAIM Contrast Checker / Stark.
- **Imágenes**: `alt` significativo en informativas; `alt=""` + `aria-hidden="true"` en decorativas.
- **Iconos**: FontAwesome y SVG decorativos con `aria-hidden="true"`; los que actúan solos llevan `aria-label` en el `<button>`/`<a>` padre.
- **Formularios**: cada `<input>` con su `<label>` (asociado por wrapping o `for/id`), `:invalid` con feedback visual, `<fieldset>` + `<legend>` cuando el grupo es semánticamente relacionado.

## Convenciones BEM

- **Anidamiento Sass con `&`** en los bloques de `05-components`. El bloque raíz contiene sus elementos como `&__elemento` y sus modificadores como `&--modificador`:

  ```scss
  .tarjeta-servidor {
    /* propiedades del bloque */

    &__cabecera { /* ... */ }
    &__nombre   { /* ... */ }

    &--destacada { /* ... */ }
  }
  ```

- **Orden canónico** dentro del bloque raíz: propiedades → elementos `&__x` → modificadores `&--x` → estados `:hover/:focus-visible/:active/:focus-within` → container/media queries.
- **Nombres en español** consistentes con el resto del proyecto.
- **Prefijo `.u-`** para utilidades (`.u-flex-centro`, `.u-saltar-contenido`).
- **Sin `!important`**, salvo en `@include movimiento-reducido` (preferencia del usuario que debe ganar). Si una utility no gana al componente es que el orden de capas está mal.
- **Sin anidamiento profundo** (>3 niveles); cada elemento BEM va anidado bajo el bloque raíz directamente.
- **Mobile first** con `@mixin movil`, `@mixin tablet`, `@mixin escritorio` desde `01-tools/_mixins.scss`.

## Estados interactivos: ejemplo completo

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

## Páginas: patrón estándar

Cada página Angular sigue este patrón:

1. El componente vive en `src/app/pages/<página>/<página>.{ts,html,scss}`.
2. Su `.scss` local está **vacío** o casi (un comentario que apunta al global).
3. Los estilos reales están en `src/styles/05-components/_pagina-<página>.scss` con bloque BEM `.pagina-<página>__*`.
4. Ese partial se importa en `styles.scss` dentro de la sección `// 05 · Components`.

### Sin excepciones

Todas las páginas siguen el patrón "scss local vacío + partial global en 05-components/". La última excepción que quedaba (`pages/cuenta/cuenta.scss`, ~1800 líneas con `:host`) se migró a `05-components/_pagina-cuenta.scss` el 2026-05-22: el bloque `:host { display: block; }` pasó a `app-cuenta { display: block; }`, que afecta al host element del componente sin necesidad de ViewEncapsulation local.

## Cómo añadir una página nueva

1. Crear `src/styles/05-components/_pagina-foo.scss` con un bloque BEM `.pagina-foo` y anidamiento con `&__elemento` y `&--modificador`.
2. Si vas a usar mixins o funciones, añadir al inicio `@use "../01-tools/mixins" as *;` y/o `@use "../01-tools/funciones" as *;`.
3. Añadir `@use "styles/05-components/pagina-foo";` en `styles.scss`.
4. Crear `src/app/pages/foo/foo.scss` con solo un comentario `// Estilos en styles/05-components/_pagina-foo.scss`.
5. En `@Component`, apuntar `styleUrl: "./foo.scss"` para que Angular no se queje.

## Cómo añadir un componente compartido

1. Crear `src/styles/05-components/_<nombre>.scss` con el bloque BEM anidado.
2. Añadir el `@use` en la sección de componentes de `styles.scss`.
3. El componente Angular puede usar las clases sin más, ya están globales.

## Cómo añadir una utilidad

1. Decidir si encaja en visibilidad / texto / espaciados / flex / display / z-index / saltar-contenido o crear archivo nuevo en `06-utilities/`.
2. Si es archivo nuevo, registrarlo en `styles.scss` dentro de `// 06 · Utilities`.
3. Usar prefijo `.u-` y nombre descriptivo en español.
