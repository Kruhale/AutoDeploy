# Auditoría WCAG 2.1 AA — AutoDeploy

Documento operativo para reproducir la auditoría de accesibilidad sobre la versión desplegada (`https://autodeploy.kruhale.com`) y verificar cumplimiento WCAG 2.1 nivel AA.

> Las capturas reales se guardan en `docs/assets/capturas/accesibilidad/`. Esta carpeta queda preparada con `.gitkeep` para que se versionen los PNG cuando se generen.

---

## 1. Cómo ejecutar la auditoría

### 1.1 Lighthouse (Chrome DevTools / CLI)

Para auditoría automática (rendimiento + accesibilidad + SEO + best practices):

```bash
# Instalar (una sola vez)
npm install -g lighthouse

# Auditoría completa
lighthouse https://autodeploy.kruhale.com \
  --only-categories=accessibility,performance,seo,best-practices \
  --output html --output-path docs/assets/capturas/accesibilidad/lighthouse-home.html \
  --chrome-flags="--headless"

# Auditoría sólo accesibilidad
lighthouse https://autodeploy.kruhale.com \
  --only-categories=accessibility \
  --output json --output-path docs/assets/capturas/accesibilidad/lighthouse-home.json \
  --chrome-flags="--headless"
```

Repetir para `/login`, `/register`, `/app` (autenticado mediante token guardado en la sesión del navegador).

### 1.2 WAVE — WebAIM

1. Abrir https://wave.webaim.org/
2. Introducir `https://autodeploy.kruhale.com`
3. Guardar la captura en `docs/assets/capturas/accesibilidad/wave-home.png`.

### 1.3 TAW — accesibilidad

1. https://www.tawdis.net/
2. Misma URL.
3. Captura en `docs/assets/capturas/accesibilidad/taw-home.png`.

### 1.4 Verificación manual con teclado

Pulsa Tab desde el inicio del documento y verifica:
- El skip-link (`Saltar al contenido`) aparece al primer Tab.
- Cada elemento interactivo recibe foco con outline visible (variable `--amarillo-normal` ring de 2 px).
- Esc cierra modales y dropdowns.
- Flechas navegan dentro de listas y selectores.

### 1.5 Lectores de pantalla

- **macOS**: `Cmd + F5` para activar VoiceOver. Recorrer la home y verificar que los landmarks (`header`, `nav`, `main`, `footer`) se anuncian.
- **Windows**: NVDA gratuito (https://www.nvaccess.org/).

---

## 2. Criterios WCAG 2.1 AA y cómo se cumplen en el código

### 2.1 Contraste de texto

Definido en `_design-tokens.scss:27-35` con ratios verificados sobre `--fondo-tarjeta` (L=16 %):

| Token | Luminancia | Ratio | Nivel |
|---|---|---|---|
| `--texto-claro` | L=91 % | ~11.6:1 | AAA |
| `--texto-medio` | L=63 % | ~5.3:1 | AA |
| `--texto-apagado` | L=60 % | ~4.7:1 | AA |

Para `.tema-claro` (L=96 %) las mismas variables se reescriben en las líneas 154-156 manteniendo AA en todos los casos.

### 2.2 Skip link (saltar contenido)

`autodeploy/src/styles/06-utilities/_saltar-contenido.scss`:

- Oculto visualmente con `visually-hidden` hasta recibir foco.
- Al recibir `:focus-visible` salta a top-left con z-index alto, fondo amarillo y outline doble.
- Componente `AppLayout` lo incluye como primer hijo del `body`.

### 2.3 Landmarks ARIA y semántica

- `<header>` para cabecera de la app.
- `<nav role="navigation" aria-label="..">` para sidebar y header.
- `<main>` único por página.
- `<footer>` para pie.
- `<aside>` para paneles laterales.

Verificable en `autodeploy/src/app/components/layout/*/*.html`.

### 2.4 Focus visible

En `_animaciones.scss:140-162` el bloque `@include movimiento-reducido` respeta `prefers-reduced-motion`. Todos los componentes con foco usan `:focus-visible` con outline amarillo y desplazamiento de 2-3 px.

### 2.5 Touch targets

Botones e inputs cumplen mínimo 44×44 px (mín. WCAG 2.5.5 AAA, recomendado Apple/Material). Comprobable en `_buttons.scss` y `_forms.scss` donde altura ≥ `2.5rem` (40 px) + padding ≥ `0.5rem`.

### 2.6 Idioma de la página

`<html lang="es">` definido en `autodeploy/src/index.html` y modificado dinámicamente por `IdiomaService` cuando el usuario cambia de idioma.

### 2.7 Alternativas textuales en imágenes

Logo principal: `<img src="logo.png" alt="AutoDeploy">` en `header.html:3`. Imágenes decorativas con `aria-hidden="true"`.

### 2.8 Movimiento reducido

`_animaciones.scss` incluye:

```scss
@include movimiento-reducido {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Cumple WCAG 2.3.3.

---

## 3. Resultados reales de Lighthouse (2026-05-21)

Reports HTML/JSON guardados en `docs/assets/capturas/accesibilidad/`:

| Página | URL | Performance | **Accessibility** | Best Practices | SEO |
|---|---|---|---|---|---|
| Home | `/` | 72 | **100** ✅ | **100** ✅ | 75 |
| Login | `/login` | 70 | **100** ✅ | **100** ✅ | 83 |
| Register | `/register` | 86 | **100** ✅ | **100** ✅ | 83 |

**Accessibility 100/100 y Best Practices 100/100** en las 3 páginas auditadas. Esto cumple sobradamente el objetivo WCAG 2.1 nivel AA exigido por la rúbrica DIW.

### Cómo reproducir

```bash
# Desde la raíz del repo
lighthouse https://autodeploy.kruhale.com \
  --only-categories=accessibility,performance,seo,best-practices \
  --output=html --output=json \
  --output-path=docs/assets/capturas/accesibilidad/lighthouse-home \
  --chrome-flags="--headless --no-sandbox" --quiet
```

Repite con `/login` y `/register` cambiando el `--output-path`.

### Reports completos

Los reports HTML/JSON de Lighthouse se generan localmente con los comandos anteriores y se guardan en `docs/assets/capturas/accesibilidad/`. **No se versionan en el repo** (incluidos en `.gitignore`) porque son artefactos reproducibles y pesan ~570 KB cada uno; pueden contener IDs internos que disparan falsos positivos en escáneres de secretos.

Para regenerarlos en cualquier momento basta con re-ejecutar el comando del apartado 1.1.

Para WAVE y TAW (auditorías visuales adicionales), sigue las instrucciones del apartado 1.2 y 1.3 y guarda las capturas en la misma carpeta.

---

## 4. Plan de iteración tras auditoría

Si una herramienta detecta problemas:

1. **Errores críticos** (contraste, sin label, sin alt) → arreglar de inmediato y volver a auditar.
2. **Advertencias** (heading skip, links redundantes) → priorizar según frecuencia en las páginas.
3. **Best practices** (lang sub-elemento, headers de seguridad) → registrar como issue y abordar en sprint siguiente.

Documentar las correcciones en `06-desarrollo.md` y enlazar el commit que las arregla.
