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

## 5. Cobertura

Las cifras son estimaciones a partir de las áreas testeadas (no medidas con JaCoCo/Istanbul, pendiente para un sprint futuro):

| Capa | Cobertura estimada |
|---|---|
| Backend — utilidades (`JwtUtil`, `CifradoUtil`) | ~95 % |
| Backend — services de negocio | ~70 % |
| Backend — controllers principales | ~60 % |
| Frontend — services | ~75 % |
| Frontend — componentes | ~40 % |

El **80 % global** que pide la rúbrica DIW no se alcanza en frontend porque muchos componentes son pura presentación y su valor en test unitario es bajo; la prioridad ha sido testear la lógica de negocio (services) y la cadena de seguridad (auth/guard/interceptor), donde sí supera el 70 %.

---

## 6. Pruebas de accesibilidad WCAG 2.1 AA

Las **auditorías automatizadas** están documentadas en [`docs/accesibilidad/AUDITORIA.md`](./accesibilidad/AUDITORIA.md), con reports JSON+HTML guardados en `docs/assets/capturas/accesibilidad/`:

- **Lighthouse Accesibilidad**: **100 / 100** en `/`, `/login` y `/register` (auditadas el 2026-05-21).
- Resto de páginas (dashboard, billing, asistente IA, terminal): pendiente auditar — el código aplica los mismos mecanismos WCAG que las anteriores (skip link, `aria-current`, `aria-label` distintivo, `prefers-reduced-motion`, contrastes verificados).

**Pruebas manuales complementarias**:

- **VoiceOver** (macOS Cmd+F5): navegación con teclado por landing, login y dashboard. Se verifica que los landmarks se anuncian (header, navigation, main, footer), que el item activo del sidebar se lee como "página actual" gracias a `aria-current`, y que el skip link salta al `<main>` con un único Tab + Enter desde la primera carga.
- **Cross-browser**: Chrome 148, Firefox 121, Safari 17 — sin regresiones visuales ni funcionales detectadas.

El documento [`docs/accesibilidad/README.md`](./accesibilidad/README.md) contiene las 8 secciones formales que pide la rúbrica DIW Órbita 4 (Rublicas11): fundamentos, componente multimedia, auditoría automatizada, análisis de errores, estructura semántica, verificación manual, resultados finales y conclusiones.

---

## 7. Pruebas manuales realizadas durante el desarrollo

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
