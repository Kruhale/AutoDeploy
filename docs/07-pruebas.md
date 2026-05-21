# 07 · Pruebas

## Metodología

Combinación de **testing manual exploratorio** (durante el desarrollo) + **tests automatizados** (en CI). No se aplica TDD estricto: los tests acompañan a la funcionalidad pero no preceden el código, dado que el alcance del proyecto y el tiempo del sprint lo desaconsejaban.

## Tipos de pruebas

### 1. Tests unitarios — Frontend (Karma + Jasmine)

Ubicación: `autodeploy/src/**/*.spec.ts`.

Cubren:

- **Services** (`idioma.service.spec.ts`, `usuario.service.spec.ts`, `servidor.service.spec.ts`): inicialización, persistencia en localStorage, llamadas HTTP mockeadas.
- **Components** (`*.spec.ts`): rendering inicial, eventos.
- **Pipes y guards**: lógica de validación.

Ejecutar:

```bash
cd autodeploy
npm test -- --watch=false              # ejecución única
npm test                               # modo watch (TDD local)
ng test --include='**/idioma.service.spec.ts'  # un único test
```

Estado actual: **68/68 tests SUCCESS**.

### 2. Tests unitarios — Backend (JUnit + Mockito)

Ubicación: `backend/src/test/java/com/autodeploy/`.

Cubren:

- **JwtUtilTest**: generación, validación y caducidad de tokens.
- **CifradoUtilTest**: cifrado / descifrado AES, casos de clave inválida.
- **ServidorServiceTest**: lógica de servicio con MongoRepository mockeado.

Ejecutar:

```bash
cd backend
./mvnw test                           # todos
./mvnw test -Dtest=JwtUtilTest#deberiaGenerarTokenValido
```

### 3. Tests end-to-end (Playwright) — Exploratorios

Carpeta `tests/e2e/` (excluida de `.gitignore` por `.git/info/exclude` mientras se estabilizan).

Pruebas manuales semi-automatizadas para flujos críticos:
- Registro + login.
- Conectar servidor sandbox SSH local (contenedor `linuxserver/openssh-server`).
- Cambio de tema oscuro/claro.

### 4. Smoke tests en producción

Tras cada deploy, el pipeline `cd.yml` ejecuta:

```bash
curl -sf https://autodeploy.kruhale.com/ > /dev/null && echo OK
curl -sf https://autodeploy.kruhale.com/api/actuator/health | grep '"status":"UP"' && echo OK
```

Si alguna respuesta falla, el deploy se marca como FAILED y se restaura la imagen anterior.

## Cobertura

| Capa | Cobertura aproximada |
|---|---|
| Frontend services | 75% |
| Frontend components | 40% |
| Backend controllers | 60% |
| Backend services | 70% |
| Backend utils (JwtUtil, CifradoUtil) | 95% |

No se alcanza el 80% global pedido por la rúbrica DIW en lo referente a frontend porque muchos componentes son pura presentación. Sí se cubren todos los **services** (lógica de negocio) por encima de 70%.

## Resultados y estadísticas

```
Chrome Headless 148.0.0.0: Executed 68 of 68 SUCCESS (0.367 secs / 0.355 secs)
TOTAL: 68 SUCCESS

Maven Surefire: Tests run: 24, Failures: 0, Errors: 0, Skipped: 0
```

## Pruebas de accesibilidad

El refactor DIW (PRs #220 a #248) ya aplicó los mecanismos WCAG 2.1 AA (skip link, `aria-current="page"`, `aria-label` distintivo, `prefers-reduced-motion`, contrastes ajustados, jerarquía semántica). Lo que queda pendiente son las **capturas de auditoría** que documentan el resultado:

- **Lighthouse** (Chrome DevTools) sobre 3 páginas (landing, login, dashboard).
- **WAVE** (extensión Chrome) para listar errores de contraste y semántica.
- **TAW** (https://www.tawdis.net) sobre la URL pública.
- **VoiceOver** (macOS) — navegación completa con teclado y lectura.
- **Cross-browser**: Chrome, Firefox, Safari.

Las capturas se guardarán en `docs/accesibilidad/capturas/` y los resultados ya están documentados en `docs/accesibilidad/README.md` (8 secciones de Rublicas11).

## Pruebas manuales realizadas durante el desarrollo

Checklist exploratorio tras cada sprint:

- [x] Registro de usuario con email único y contraseña válida.
- [x] Login con credenciales válidas e inválidas.
- [x] Conectar servidor sandbox por SSH con clave privada.
- [x] Conectar servidor sandbox con contraseña.
- [x] Abrir terminal interactiva y ejecutar `ls /`.
- [x] Ver métricas en vivo (CPU, RAM) durante 30 segundos.
- [x] Programar backup automático a las 03:00.
- [x] Verificar que aparece el `auto-*.tar.gz` tras un par de horas.
- [x] Añadir regla de firewall (allow 22/tcp) y comprobar con `ufw status`.
- [x] Pedir al asistente IA un comando inocuo (`hostname`) y ejecutarlo.
- [x] Cambiar idioma a inglés, francés, alemán, italiano y volver a español.
- [x] Alternar tema oscuro/claro y comprobar persistencia tras recarga.
- [x] Logout y re-login.
- [x] Navegación por teclado (Tab) por landing, login y dashboard.
- [x] Skip link funciona y salta al `<main>`.
- [x] Móvil: hamburguesa abre/cierra sidebar; backdrop cierra al pulsar.
- [x] Móvil: viewport 320px, layout no rompe.
