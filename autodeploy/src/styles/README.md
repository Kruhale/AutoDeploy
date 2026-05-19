# Arquitectura de estilos — ITCSS

Los estilos de AutoDeploy siguen [ITCSS](https://itcss.io/) (Inverted Triangle CSS), que organiza los selectores en capas de menor a mayor especificidad. El orquestador único es `src/styles.scss` y carga las capas en orden estricto.

## Las 7 capas

```
00-settings     · variables y tokens (sin CSS generado)
01-tools        · mixins, helpers, animaciones reutilizables
02-generic      · reset, normalize
03-elements     · estilos base sobre tags HTML
04-layout       · estructura de página (header, main, footer, grid)
05-components   · bloques BEM concretos
06-utilities    · helpers .u-* (última capa, ganan por orden)
```

Cualquier capa nueva se añade a `styles.scss` en su sección, nunca antes ni después de capas que ya estén importadas.

## Cuándo va cada cosa

| Si lo que vas a escribir es… | Capa | Ejemplo |
|------------------------------|------|---------|
| Una variable de color, tamaño o token | `00-settings` | `--amarillo-normal`, `$breakpoint-md` |
| Un mixin o un keyframe global | `01-tools` | `@mixin movil`, `@keyframes entrar-abajo`, `.animar` |
| Un reset o un `box-sizing: border-box;` global | `02-generic` | `_reset.scss` |
| Estilos base sobre `button`, `input`, `a`… sin clase | `03-elements` | `_buttons.scss`, `_forms.scss` |
| Estructura de página: header, sidebar, grid principal | `04-layout` | `_layout.scss` |
| Un componente o sección con su bloque BEM (`.tarjeta-X`, `.pagina-X`) | `05-components` | `_pagina-login.scss`, `_tarjeta-servidor.scss` |
| Un helper transversal tipo `.u-oculto`, `.u-texto-centrado` | `06-utilities` | `_visibilidad.scss`, `_texto.scss`, `_espaciados.scss` |

## Convenciones

- **BEM** para los bloques de `05-components`: `.bloque__elemento--modificador`.
- **Nombres en español** consistentes con el resto del proyecto.
- **Prefijo `.u-`** para utilidades (`.u-oculto`, `.u-mt-l`).
- **Sin `!important`**. Si una utility no gana al componente es que el orden de capas está mal.
- **Sin anidamiento profundo** (>3 niveles); cada elemento BEM va en una clase plana al raíz del bloque.
- **Mobile first** con `@mixin movil`, `@mixin tablet`, `@mixin escritorio` desde `01-tools/_mixins.scss`.

## Páginas: patrón estándar

Cada página Angular sigue este patrón:

1. El componente vive en `src/app/pages/<página>/<página>.{ts,html,scss}`.
2. Su `.scss` local está **vacío** o casi (un comentario que apunta al global).
3. Los estilos reales están en `src/styles/05-components/_pagina-<página>.scss` con bloque BEM `.pagina-<página>__*`.
4. Ese partial se importa en `styles.scss` dentro de la sección `// 05 · Components`.

### Excepción documentada

`pages/cuenta/cuenta.scss` mantiene sus 1654 líneas en local porque usa `:host` (scoping nativo de Angular). Mover esa página a global obligaría a reescribir la raíz y se ha decidido aplazar para no romper visualmente. Es la única excepción al patrón.

## Cómo añadir una página nueva

1. Crear `src/styles/05-components/_pagina-foo.scss` con un bloque BEM `.pagina-foo`.
2. Añadir `@use "styles/05-components/pagina-foo";` en `styles.scss`.
3. Crear `src/app/pages/foo/foo.scss` con solo un comentario `// Estilos en styles/05-components/_pagina-foo.scss`.
4. En `@Component`, apuntar `styleUrl: "./foo.scss"` para que Angular no se queje.

## Cómo añadir un componente compartido

1. Crear `src/styles/05-components/_<nombre>.scss` con bloque BEM.
2. Añadir el `@use` en la sección de componentes de `styles.scss`.
3. El componente Angular puede usar las clases sin más, ya están globales.

## Cómo añadir una utilidad

1. Decidir si encaja en visibilidad / texto / espaciados o crear archivo nuevo en `06-utilities/`.
2. Si es archivo nuevo, registrarlo en `styles.scss` dentro de `// 06 · Utilities`.
3. Usar prefijo `.u-` y nombre descriptivo en español.
