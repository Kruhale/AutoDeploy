# `docs/assets/`

Carpeta de recursos visuales del proyecto: diagramas exportados, capturas de pantalla, mockups y material gráfico para incluir en la documentación.

## Estructura recomendada

- `diagramas/` — exports PNG/SVG de los diagramas Mermaid usados en `05-diseno.md` y `ARCHITECTURE.md`.
- `capturas/manual/` — capturas para `09-manual-usuario.md` (registro, dashboard, despliegue, backups, etc.).
- `capturas/pipeline/` — runs en verde de GitHub Actions referenciados en `08-despliegue.md`.
- `capturas/accesibilidad/` — informes Lighthouse, WAVE y TAW (alineados con `07-pruebas.md`).
- `mockups/` — exports de Figma (PNG por pantalla) de la guía de estilos.

Las capturas que se incrustan en los Markdown deben usar rutas relativas, por ejemplo:

```markdown
![Panel principal](./assets/capturas/manual/panel.png)
```
