# Arquitectura de estilos — ITCSS

Los estilos de AutoDeploy siguen [ITCSS](https://itcss.io/) (Inverted Triangle CSS), que organiza los selectores en capas de menor a mayor especificidad. El orquestador único es `src/styles.scss` y carga las capas en orden estricto.

## Las 7 capas

```
00-settings     · solo variables Sass ($var). No genera CSS.
01-tools        · mixins, helpers, keyframes y animaciones reutilizables.
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
| Un mixin o un keyframe global | `01-tools` | `@mixin movil`, `@keyframes entrar-abajo`, `.animar` |
| Un reset o un `box-sizing: border-box;` global | `02-generic` | `_reset.scss` |
| Estilos base sobre `button`, `input`, `a`… sin clase | `03-elements` | `_buttons.scss`, `_forms.scss` |
| Estructura de página: header, sidebar, grid principal | `04-layout` | `_layout.scss` |
| Un componente o sección con su bloque BEM (`.tarjeta-X`, `.pagina-X`) | `05-components` | `_pagina-login.scss`, `_tarjeta-servidor.scss` |
| Un helper transversal tipo `.u-oculto`, `.u-texto-centrado` | `06-utilities` | `_visibilidad.scss`, `_texto.scss`, `_espaciados.scss` |

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

- **Orden canónico** dentro del bloque raíz: propiedades → elementos `&__x` → modificadores `&--x` → estados `:hover/:focus/:focus-within` → media queries.
- **Nombres en español** consistentes con el resto del proyecto.
- **Prefijo `.u-`** para utilidades (`.u-oculto`, `.u-mt-l`).
- **Sin `!important`**. Si una utility no gana al componente es que el orden de capas está mal.
- **Sin anidamiento profundo** (>3 niveles); cada elemento BEM va anidado bajo el bloque raíz directamente, no como descendiente combinado.
- **Mobile first** con `@mixin movil`, `@mixin tablet`, `@mixin escritorio` desde `01-tools/_mixins.scss`.

## Estados interactivos

Cada componente con interacción real debe definir explícitamente sus estados usando las variables `--*-hover` del design tokens (`--amarillo-normal-hover`, etc.):

```scss
.tarjeta-servidor {
  transition: transform var(--duration-base), box-shadow var(--duration-base), border-color var(--duration-base);

  &:hover {
    transform: translateY(-0.125rem);
    box-shadow: var(--shadow-hover-amarillo);
    border-color: var(--amarillo-normal-hover);
  }

  &:focus-within {
    outline: 2px solid var(--amarillo-normal);
    outline-offset: 2px;
  }
}
```

Estados obligatorios para accesibilidad: `:hover` (cursor), `:focus-visible` o `:focus-within` (teclado). Sin esto, los usuarios de teclado no ven dónde está el foco.

## Páginas: patrón estándar

Cada página Angular sigue este patrón:

1. El componente vive en `src/app/pages/<página>/<página>.{ts,html,scss}`.
2. Su `.scss` local está **vacío** o casi (un comentario que apunta al global).
3. Los estilos reales están en `src/styles/05-components/_pagina-<página>.scss` con bloque BEM `.pagina-<página>__*`.
4. Ese partial se importa en `styles.scss` dentro de la sección `// 05 · Components`.

### Excepción documentada

`pages/cuenta/cuenta.scss` mantiene sus 1654 líneas en local porque usa `:host` (scoping nativo de Angular). Mover esa página a global obligaría a reescribir la raíz y se ha decidido aplazar para no romper visualmente. Es la única excepción al patrón.

## Cómo añadir una página nueva

1. Crear `src/styles/05-components/_pagina-foo.scss` con un bloque BEM `.pagina-foo` y anidamiento con `&__elemento` y `&--modificador`.
2. Añadir `@use "styles/05-components/pagina-foo";` en `styles.scss`.
3. Crear `src/app/pages/foo/foo.scss` con solo un comentario `// Estilos en styles/05-components/_pagina-foo.scss`.
4. En `@Component`, apuntar `styleUrl: "./foo.scss"` para que Angular no se queje.

## Cómo añadir un componente compartido

1. Crear `src/styles/05-components/_<nombre>.scss` con el bloque BEM anidado.
2. Añadir el `@use` en la sección de componentes de `styles.scss`.
3. El componente Angular puede usar las clases sin más, ya están globales.

## Cómo añadir una utilidad

1. Decidir si encaja en visibilidad / texto / espaciados o crear archivo nuevo en `06-utilities/`.
2. Si es archivo nuevo, registrarlo en `styles.scss` dentro de `// 06 · Utilities`.
3. Usar prefijo `.u-` y nombre descriptivo en español.
