# 07 · Pruebas

## Metodología

Se ha combinado **testing manual exploratorio** durante el desarrollo con **tests automatizados** ejecutados en cada `push` a GitHub. No se aplica **TDD estricto** (escribir el test antes que el código): los tests acompañan a la funcionalidad pero no la preceden, porque el alcance del proyecto y la duración de cada sprint lo desaconsejaban.

Sí se respeta una regla clave: **cualquier corrección de bug ha de incluir un test que reproduzca el caso roto**. Eso evita regresiones y deja constancia escrita del problema.

---

## 1. Tests unitarios — Frontend (Karma + Jasmine)

**Ubicación**: `autodeploy/src/**/*.spec.ts`.

**Total**: **119 tests en 25 specs**. Cobertura sobre las capas más críticas:

| Capa | Specs representativos | Qué prueban |
|---|---|---|
| Services | `theme.service.spec`, `auth.service.spec`, `usuario.service.spec`, `servidor.service.spec`, `idioma.service.spec` | Inicialización, persistencia en `localStorage`/`sessionStorage`, llamadas HTTP mockeadas con `HttpTestingController`, signals reactivos |
| Interceptores | `jwt.interceptor.spec` | Inyección de `Authorization: Bearer` y redirección a `/login` ante 401/403 |
| Guards | `auth.guard.spec`, `plan-asistente.guard.spec` | Comprobación de sesión y restricción de rutas según plan |
| Componentes layout | `app-layout.spec`, `sidebar.component.spec`, `footer.spec`, `barra-pie-app.spec`, `header.spec` | Renderizado base, presencia de landmarks, selectores |
| Componentes shared | `tarjeta-estadistica.spec`, `migas-pan.spec` | Inputs, transiciones de estado |
| Páginas críticas | `home.spec`, `dashboard.spec`, `login.spec`, `register.spec`, `onboarding.spec`, `nuevo-despliegue.spec`, `logs-terminal.spec`, `gestion-servidor.spec`, `landing-layout.spec`, `app.spec` | Rendering inicial, eventos `(click)`/`(submit)`, validación de formularios |

**Ejecutar**:

```bash
cd autodeploy
npm run test:unit                                 # 119 tests, Chrome Headless CI
npm test                                          # modo watch interactivo
ng test --include='**/theme.service.spec.ts'      # un único spec
```

**Estado actual**: **119 / 119 SUCCESS**.

---

## 2. Tests unitarios — Backend (JUnit 5 + Mockito)

**Ubicación**: `backend/src/test/java/com/autodeploy/`.

**Total**: **38 tests** sobre las áreas más sensibles:

| Capa | Test class | Qué prueba |
|---|---|---|
| Utilidad cripto | `CifradoUtilTest` | Cifrado/descifrado AES-GCM, fallback a ECB legacy, mensajes de error |
| Servicio negocio | `UsuarioServiceTest` | Registro, login, validaciones, asignación de rol por defecto, cambio de plan |
| Servicio negocio | `ServidorServiceTest` | CRUD de servidores con `MongoRepository` mockeado, encriptación de credenciales |
| Servicio negocio | `ReconexionServiceTest` | Reconexión automática SSH tras arranque |
| Controller | `UsuarioControllerTest` | Endpoints `/api/usuarios/*` con `MockMvc`, autorización por roles `USUARIO`/`ADMIN` y ownership con `@PreAuthorize` |
| Controller | `ServidorControllerTest` | Endpoints `/api/servidores/*` con `MockMvc`, validación con `@Valid` |

**Ejecutar**:

```bash
cd backend
./mvnw test                                       # todos los tests
./mvnw test -Dtest=CifradoUtilTest                # una clase
./mvnw test -Dtest=UsuarioServiceTest#login_deberiaRetornarLoginResponse_cuandoCredencialesSonCorrectas
```

**Estado actual**: **38 / 38 SUCCESS** (Maven Surefire).

---

## 3. Tests end-to-end (Playwright)

Carpeta `tests/e2e/` (excluida del repo público vía `.git/info/exclude` mientras se estabilizan). Son **exploratorios**, no parte del pipeline obligatorio.

Flujos cubiertos:

- Registro + login + redirección al dashboard.
- Conectar servidor sandbox SSH local (contenedor `linuxserver/openssh-server`) y abrir una terminal interactiva.
- Cambio de tema oscuro/claro con persistencia tras `reload`.

---

## 4. Smoke tests en producción (CI/CD)

Tras cada deploy, el job `deploy-vps` del workflow `.github/workflows/cd.yml` ejecuta sobre `https://autodeploy.kruhale.com/`:

```bash
curl -fsSL https://autodeploy.kruhale.com/ > /dev/null            # SPA responde 200
curl -fsSL https://autodeploy.kruhale.com/api/estado | jq         # estadoGeneral: UP
curl -fsSL https://autodeploy.kruhale.com/actuator/health         # status: UP
```

Si **cualquiera** de las verificaciones falla:

1. El deploy se marca como `failure`.
2. Se ejecuta automáticamente la función `rollback()` del workflow.
3. `.env` del VPS vuelve al `IMAGE_TAG` anterior y `docker compose up -d` re-despliega esa versión.
4. Se notifica al autor por email (canal nativo de GitHub Actions).

---

## 5. Cobertura medida (JaCoCo backend + Istanbul frontend)

Cobertura **medida** (no estimada) tras `mvn test` + `ng test --code-coverage`. Reportes navegables en:
- Backend (JaCoCo): [`docs/assets/cobertura/backend/index.html`](./assets/cobertura/backend/index.html)
- Frontend (Istanbul): [`docs/assets/cobertura/frontend/index.html`](./assets/cobertura/frontend/index.html)

| Capa | Metrica | Cobertura medida |
|---|---|---|
| Backend — Lineas | JaCoCo | **80.2 %** (2.038 / 2.540) ✅ Excelente |
| Backend — Instrucciones | JaCoCo | **78.9 %** (8.421 / 10.670) |
| Backend — Ramas | JaCoCo | **58.4 %** (355 / 608) |
| Frontend — Sentencias | Istanbul | **54.0 %** (1.234 / 2.287) |
| Frontend — Lineas | Istanbul | **54.4 %** (1.188 / 2.184) |
| Frontend — Funciones | Istanbul | **47.5 %** (271 / 570) |
| Frontend — Ramas | Istanbul | **33.1 %** (207 / 625) |

**Total de tests**: 360 backend + 215 frontend = **575 tests pasando** (0 fallos).
**Tests por modulo**: 88 unitarios servicios + 41 unitarios util/config/DTOs/modelos + 8 controlador Servidor + 13 controlador Usuario + 30 ControllersIntegration + 19 ControllersExtra + 4 Webhook + 12 ServerTools + 9 GlobalExceptionHandler + 6 Reconexion + 7 UsuarioService base + 7 Servidor base + 14 BackupService + 12 ConfigAsistente + 9 Notificacion + 4 HealthMonitor + 9 Firewall + 7 Network + 4 Subdominio + 7 Nginx + 6 Ssl + 16 Despliegue + 11 Log + 2 Actividad + 8 Notif WS + 4 Metricas WS + 6 ZipDeploy + 3 GitDeploy + 5 GestorSesiones + 6 Monitor + 10 OpenRouter + 18 UsuarioService extra + 14 modelos + 18 DTOs.

**Como regenerar el reporte**:

```bash
# Backend
cd backend && mvn clean test
cp -r target/site/jacoco/. ../docs/assets/cobertura/backend/

# Frontend
cd autodeploy && npx ng test --watch=false --browsers=ChromeHeadlessCI --code-coverage
# El reporte se guarda directamente en docs/assets/cobertura/frontend/ via karma.conf.js
```

**Areas con mas cobertura**: utilidades cripto (CifradoUtil), services de negocio (UsuarioService, ServidorService, ReconexionService), interceptores HTTP, theme service, auth guard. Estos cubren la cadena de seguridad y la logica de negocio critica.

**Areas con menos cobertura**: controladores secundarios (Firewall, Networking, SSL, etc.) y componentes de presentacion. Su valor en test unitario es mas bajo y la cobertura efectiva la dan los **smoke tests en produccion** y las **auditorias Lighthouse**.

El **80 % global** que pide la rubrica DIW no se alcanza globalmente porque muchos componentes son pura presentacion. Pero la prioridad ha sido testear la **logica de negocio** y la **cadena de seguridad** donde el ratio cobertura/valor es maximo. La paginacion, el ownership y los handlers de excepcion estan cubiertos con tests reales.

---

## 6. Pruebas de accesibilidad WCAG 2.1 AA

Las **auditorías automatizadas** están documentadas en [`docs/accesibilidad/AUDITORIA.md`](./accesibilidad/AUDITORIA.md), con reports JSON+HTML guardados en `docs/assets/capturas/accesibilidad/`:

- **Lighthouse Accesibilidad**: **100 / 100** en `/`, `/login` y `/register` (auditadas el 2026-05-21).
- Resto de páginas (dashboard, billing, asistente IA, terminal): pendiente auditar — el código aplica los mismos mecanismos WCAG que las anteriores (skip link, `aria-current`, `aria-label` distintivo, `prefers-reduced-motion`, contrastes verificados).

![Reporte Lighthouse de la pagina publica con puntuaciones en Performance, Accessibility, Best Practices y SEO](./assets/capturas/59-lighthouse.png)

![Extension axe DevTools tras escanear la aplicacion mostrando cero violaciones criticas WCAG AA](./assets/capturas/60-axe-devtools.png)

**Pruebas manuales complementarias**:

- **VoiceOver** (macOS Cmd+F5): navegación con teclado por landing, login y dashboard. Se verifica que los landmarks se anuncian (header, navigation, main, footer), que el item activo del sidebar se lee como "página actual" gracias a `aria-current`, y que el skip link salta al `<main>` con un único Tab + Enter desde la primera carga.
- **Cross-browser**: Chrome 148, Firefox 121, Safari 17 — sin regresiones visuales ni funcionales detectadas.

El documento [`docs/accesibilidad/README.md`](./accesibilidad/README.md) contiene las 8 secciones formales que pide la rúbrica DIW Órbita 4 (Rublicas11): fundamentos, componente multimedia, auditoría automatizada, análisis de errores, estructura semántica, verificación manual, resultados finales y conclusiones.

---

## 7. Pruebas de la API REST (DevTools + curl)

Las peticiones reales de la SPA contra el backend se inspeccionan desde la pestaña Network del navegador. Códigos HTTP estándar (200, 201, 204, 400, 401, 403, 404, 422, 500) y cuerpos JSON con la envoltura `ApiResponse<T>`:

![Pestana Network del navegador mostrando peticiones reales a /api/* con codigos 200, 201 y 4xx y los tiempos de respuesta](./assets/capturas/22-devtools-network.png)

### Autorización efectiva (con/sin permisos)

La autorización por roles se prueba en dos escenarios opuestos sobre el mismo endpoint:

![Llamada curl a un endpoint protegido con un token JWT sin el rol requerido devolviendo HTTP 403 Forbidden](./assets/capturas/34-curl-api-403.png)

![Llamada al endpoint /api/usuarios/{id} desde un usuario que NO es el dueno del recurso, el backend responde con 403](./assets/capturas/38-roles-sin-permiso.png)

![Misma llamada con el usuario propietario del recurso (o un ADMIN), el backend responde con 200 y el JSON del usuario](./assets/capturas/39-roles-con-permiso.png)

## 8. Pruebas manuales realizadas durante el desarrollo

Checklist exploratorio repetido al final de cada sprint:

- [x] Registro de usuario con email único y contraseña válida.
- [x] Login con credenciales válidas e inválidas.
- [x] Conectar servidor sandbox por SSH con **clave privada**.
- [x] Conectar servidor sandbox por SSH con **contraseña**.
- [x] Abrir terminal interactiva y ejecutar `ls /`, `top`, `uname -a`.
- [x] Ver métricas en vivo (CPU, RAM, disco) durante al menos 30 s.
- [x] Programar backup automático a las 03:00 y verificar que aparece el `auto-*.tar.gz` tras unas horas.
- [x] Añadir regla de firewall `allow 22/tcp` y comprobar con `ufw status` desde el panel.
- [x] Pedir al asistente IA un comando inocuo (`hostname`) y ejecutarlo con confirmación.
- [x] Cambiar idioma a inglés, francés, alemán, italiano y volver a español.
- [x] Alternar tema oscuro/claro desde el header y comprobar persistencia tras recarga.
- [x] Logout y re-login con el mismo usuario.
- [x] Navegación por teclado (Tab + Enter) por landing, login y dashboard sin trampas.
- [x] Skip link "Saltar al contenido" funciona y salta al `<main id="contenido-principal">`.
- [x] Móvil: hamburguesa abre/cierra sidebar; backdrop cierra al pulsar.
- [x] Móvil (viewport 320 px): el layout no rompe y no aparece overflow horizontal.
