# 04 · Guía de estilos y prototipado

> Documento de detalle: [`docs/design/DOCUMENTACION.md`](./design/DOCUMENTACION.md) (7 secciones que pide Rublicas10).

## Prototipo Figma

Enlace al archivo: pendiente (compartir desde Figma → "Get link" → permisos View).

El archivo contiene cuatro páginas:

1. **Moodboard** — Dirección estética con palabras clave (oscuro, profesional, cálido, técnico) y referencias visuales (Linear, Stripe, Coolify).
2. **Guía de estilo** — Paleta de color completa con escalas, escala tipográfica (H1–Caption con Outfit), librería de iconos (FontAwesome 6 documentada), sistema de espaciado (`4/8/12/16/24/32/48/64`).
3. **Componentes** — Biblioteca de componentes con todos los estados (default / hover / focus / active / disabled / invalid).
4. **Mockups** — Pantallas finales con contenido real: bienvenida, login, dashboard, billing, asistente-ia, terminal, onboarding.
5. **Sitemap** — Diagrama completo de las 27 rutas (públicas, autenticadas, legales).
6. **Wireframes** — Baja fidelidad de 6 pantallas core.

## Sistema de color

Tokens en HSL (`02-generic/_design-tokens.scss`):

| Token | Valor | Uso |
|---|---|---|
| `--fondo-normal` | `hsl(30, 4.65%, 10.78%)` | Fondo principal del documento (oscuro). |
| `--fondo-tarjeta` | `hsl(32, 4.11%, 16.47%)` | Tarjetas, paneles, modales. |
| `--amarillo-normal` | `hsl(47, 86%, 56%)` | Acento principal (CTA, foco, indicadores). |
| `--amarillo-normal-hover` | `hsl(45, 78%, 48%)` | Estado hover del acento. |
| `--texto-claro` | `hsl(40, 33.33%, 91.37%)` | Texto principal sobre fondo oscuro (contraste WCAG AA verificado). |
| `--texto-medio` | `hsl(30, 5.08%, 63.14%)` | Subtítulos y texto secundario. |
| `--texto-apagado` | `hsl(33, 4.12%, 40%)` | Metadatos, helpers de form. |
| `--verde-normal` | `hsl(142.09, 70.56%, 45.29%)` | Estado éxito. |
| `--rojo-normal` | `hsl(0, 79.17%, 60.59%)` | Estado error. |

Modo claro definido en `.tema-claro { ... }` con overrides sólo en fondos, textos, bordes y sombras (acento y semánticos se mantienen).

## Tipografía

Familias:
- **Outfit** (Google Fonts) — cuerpo y títulos. Pesos importados: 400/500/600/700/800.
- **JetBrains Mono** (Google Fonts) — terminales, snippets, código.

Escala (`--font-size-*`):

| Token | Valor | Uso |
|---|---|---|
| `xs` | 0.625rem | Tags, badges. |
| `sm` | 0.6875rem | Metadatos. |
| `md` | 0.875rem | Botones, inputs. |
| `base` | 1rem | Cuerpo. |
| `lg` | 1.25rem | Subtítulos. |
| `xl` | 1.5rem | Títulos de sección. |
| `2xl` | 1.75rem | H2 destacados. |
| `3xl` | 2rem | H1 de página interna. |
| `4xl` | 2.5rem | Hero secundario. |
| `5xl` | 3.5rem | Hero principal. |

Línea-altura: `1.2` (títulos), `1.5` (cuerpo), `1.75` (textos largos).

Tipografía fluida: hero de bienvenida usa `font-size: fluido(2.5rem, 4.5rem)` (clamp generado por la función Sass `fluido()`).

## Espaciado

15 niveles de `--spacing-size-xxs` (0.25rem) a `--spacing-size-8xl` (6rem) en `02-generic/_design-tokens.scss`. Reglas:

- 8-12px entre elementos muy relacionados.
- 16-24px entre elementos relacionados.
- 32-48px entre secciones.
- 64px+ entre bloques principales.

## Wireframes

Carpeta `docs/design/wireframes/` (pendiente de poblar). Diseñados en Figma (página "Wireframes"):

- Pantalla de inicio / landing
- Login y registro
- Dashboard principal
- Asistente IA
- Onboarding
- Perfil de usuario

## Componentes reutilizables

| Componente | Variantes | Estados | Archivo SCSS |
|---|---|---|---|
| `.boton` | `--primario/secundario/ghost/peligro` | hover, active, focus-visible, disabled | `03-elements/_buttons.scss` |
| `.campo` (input/textarea/select) | — | focus, focus-visible, disabled, invalid | `03-elements/_forms.scss` |
| `.tarjeta-servidor` | `--destacada`, container queries | hover, active, focus-within | `05-components/_tarjeta-servidor.scss` |
| `.tarjeta-stat` | acento variable | hover, active, focus-within | `05-components/_tarjeta-estadistica.scss` |
| `.tarjeta-plan` | `--destacado` | hover, active, focus-within | `05-components/_seccion-precios.scss` |
| `.barra-lateral` | `--abierta/colapsada` | hover, focus-visible, aria-current | `05-components/_barra-lateral.scss` |
| `.spinner` | `--grande/cyan/verde` | animado | `01-tools/_animaciones.scss` |

## Referencia completa

Para mixins, funciones, tokens, ITCSS y arquitectura completa, ver [`autodeploy/src/styles/README.md`](../autodeploy/src/styles/README.md) y [`docs/design/DOCUMENTACION.md`](./design/DOCUMENTACION.md).
