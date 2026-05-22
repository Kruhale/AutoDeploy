# 06 · Desarrollo

## Secuencia de desarrollo

El proyecto se ha desarrollado en **5 sprints** de 2 semanas (de marzo a mayo 2026), siguiendo SCRUM simplificado con un único integrante. Tablero en GitHub Projects asociado al repo.

| Sprint | Foco | Resultado |
|---|---|---|
| 1 (marzo) | Investigación UX, sitemap, wireframes, prototipo Figma navegable, definición del MVP | Prototipo aprobado, MVP claro |
| 2 (marzo) | Backend: modelo de datos, JWT, MongoDB, MINA SSHD para conexión SSH | API REST funcional para `/login`, `/servidores`, `/comandos` |
| 3 (abril) | Frontend: Angular 20, login + dashboard + terminal con xterm.js, WebSockets | Conexión real al VPS, terminal funcional |
| 4 (abril) | Asistente IA, backups, firewall, métricas, networking | Funcionalidades secundarias completas |
| 5 (mayo) | Despliegue (Docker, nginx, GitHub Actions), accesibilidad WCAG, documentación DIW | App pública en https://autodeploy.kruhale.com |

## Dificultades encontradas

### 1. Conexión SSH desde Java
**Problema**: La librería estándar JSch quedó abandonada hace años y tiene bugs en handshake con servidores modernos.
**Solución**: Migrar a **Apache MINA SSHD 2.12.1**, que es un fork activo y soporta ed25519 + algoritmos modernos. Toda la SshCommandService la usa internamente.

### 2. WebSocket con autenticación JWT
**Problema**: Por defecto Spring WebSocket no procesa headers como `Authorization: Bearer ...` en el handshake. Si el WebSocket está expuesto, cualquiera podría conectarse.
**Solución**: Añadir un `HandshakeInterceptor` que extrae el JWT del query param (`?token=...`) y valida con `JwtUtil`. Si es inválido, cierra el socket antes de upgradear.

### 3. Centralizar los design tokens (DIW)
**Problema**: Tener Custom Properties dispersas por componentes o redefinidas en cada archivo hace imposible cambiar un color en todo el sitio sin tocar decenas de partials. Falta de "fuente única de verdad".
**Solución**: Centralizar todas las Custom Properties en `00-settings/_variables.scss` (`:root {}` para modo oscuro por defecto, `.tema-claro {}` para overrides). Las Sass vars de breakpoints quedan aparte en `_css-variables.scss` porque los mixins las necesitan en compilación. Documentado en el README de styles con la tabla Sass vs Custom Properties.

### 4. Container queries vs media queries
**Problema**: La tarjeta de servidor aparece en sidebar (~280px), grid (~340px) y panel detalle (>600px). Hacer un media query con varios breakpoints rompía el ancho del contenedor real porque el viewport es el mismo.
**Solución**: `container-type: inline-size; @container (max-width: 28rem) { ... }`. Resuelve el problema sin trucos.

### 5. iCloud duplicando `.git/`
**Problema**: La carpeta del proyecto vive en iCloud Drive. Al guardar el repositorio en `~/Documents/Obsidian Vault/...`, iCloud crea duplicados con sufijo ` 2` en `.git/index` y `.git/refs/heads/main`. Eso rompe `git fetch` con "bad object".
**Solución**: Borrar manualmente los archivos duplicados antes de empezar a trabajar (verificable con `find .git -name "*\ 2*"`).

### 6. Autorización con roles sobre JWT

**Problema**: la primera versión del backend exponía endpoints administrativos (listar usuarios, eliminar cuentas) sin distinguir entre usuario normal y administrador. El JWT sólo identificaba al usuario, pero no portaba su rol; el filtro de seguridad otorgaba siempre `ROLE_USUARIO`.

**Solución**:

1. Campo `rol` en el modelo `Usuario` (constantes `ROL_USUARIO` y `ROL_ADMIN`, default `USUARIO`).
2. `JwtUtil.generarToken(id, email, rol)` añade el claim `rol`. Se mantiene la firma antigua de 2 argumentos para no romper código legado.
3. `JwtAuthenticationFilter` lee el claim y crea `SimpleGrantedAuthority("ROLE_" + rol)`.
4. `SecurityConfig` activa `@EnableMethodSecurity` para procesar `@PreAuthorize`.
5. Endpoints `/api/usuarios/admin/**` con `@PreAuthorize("hasRole('ADMIN')")`.

Esto cumple la rúbrica DWES "API REST nivel Excelente" que exige *"sistema de autenticación y autorización con roles"*.

### 7. Auditoría de seguridad y endurecimiento del backend

**Problema**: una revisión sistemática del código en el último sprint detectó siete vulnerabilidades reales que el testing funcional había pasado por alto:

1. `CifradoUtil` usaba **AES/ECB** sin IV para credenciales SSH y API keys (mismo plaintext → mismo ciphertext, vulnerable a análisis de frecuencia).
2. **CORS** configurado con `setAllowedOriginPatterns("*")` + `setAllowCredentials(true)` (bypass total desde cualquier origen).
3. **WebSocket** `/ws/terminal` aceptaba handshake **sin autenticación** — cualquiera con la URL podía abrir terminal SSH al servidor del usuario.
4. Endpoints `/api/usuarios/{id}/**` **sin verificar ownership**: el usuario A podía leer/modificar/borrar al usuario B cambiando el `{id}`.
5. `LogService` concatenaba directamente `archivo` y `patron` en `tail`/`grep` — **inyección de comandos shell** (`?archivo=/etc/passwd;rm -rf /`).
6. `JWT secret` y `CIFRADO_CLAVE` tenían **fallback hardcoded** en `application.properties`. Si la variable de entorno faltaba, el sistema arrancaba con un secreto **público en GitHub**, permitiendo forjar JWTs.
7. Endpoints como `GET /api/usuarios/admin/todos` y `GET /api/servidores` devolvían la entidad completa, incluyendo `passwordHash` (bcrypt), `passwordCifrada` y `claveSshPrivada` en el JSON.

**Solución** (commit `0c4ae84`):

1. Migración a **`AES/GCM/NoPadding`** con IV aleatorio de 12 bytes prepended al ciphertext y tag de autenticación de 128 bits. Clave derivada con SHA-256. **Compatibilidad backwards**: si el ciphertext no tiene el prefijo `v2:`, se cae al descifrador ECB legacy para no perder credenciales ya guardadas en producción.
2. CORS con **whitelist concreta** (`https://autodeploy.kruhale.com`, `http://localhost:4200`, `http://localhost:8082`), configurable por `autodeploy.cors.origenes`.
3. Nuevo `JwtHandshakeInterceptor` que extrae el JWT del query param `?token=...` y lo valida con `JwtUtil`. Frontend modificado para enviar el token en los tres WS (`/ws/terminal`, `/ws/metricas`, `/ws/notificaciones`).
4. `@PreAuthorize("hasRole('ADMIN') or #id == authentication.principal")` aplicado a los 11 endpoints `/api/usuarios/{id}/**`. SpEL compara el path variable con el `usuarioId` del JWT y permite el bypass legítimo a los ADMIN.
5. `LogService` valida `archivo` y `patron` con regex estrictas (`^[A-Za-z0-9_./~-]+$` y `^[A-Za-z0-9 ._/:@-]+$`), limita `lineas` a `[1, 5000]` y usa `grep -F` para tratar el patrón como literal.
6. `@PostConstruct` en `JwtUtil` que aborta el arranque (`IllegalStateException`) si `AUTODEPLOY_JWT_SECRET` no está definida o es menor de 32 bytes. `application.properties` ya no contiene valores por defecto.
7. `@JsonIgnore` en `Usuario.passwordHash`, `Servidor.passwordCifrada` y `Servidor.claveSshPrivada`. La deserialización no se ve afectada porque ningún endpoint acepta la entidad como `@RequestBody` (todos usan DTOs).

Resultado: los 7 hallazgos quedan cerrados antes de la defensa. La tabla completa con archivo, línea y propuesta está en el cuerpo del commit `0c4ae84` y resumida en `docs/10-conclusiones.md`.

### 8. Co-Authored-By en commits
**Problema**: Algunas herramientas (Claude, plantillas de PR de GitHub) añaden por defecto un trailer `Co-Authored-By: Claude...`. La regla del proyecto exige sólo `Kruhale` como autor.
**Solución**: Documentado en `CLAUDE.md` y comprobado manualmente tras cada `git commit` con `git log --format='%an %ae'`. PRs que hayan añadido el trailer accidentalmente se rehacen con `git commit --amend` ANTES de pushear.

## Decisiones técnicas clave

| Decisión | Alternativas | Razón |
|---|---|---|
| **Angular 20 + signals** | React, Vue, Svelte | Signals dan reactividad declarativa sin RxJS para casos simples; el ecosistema Angular tiene routing/forms/i18n integrados; standalone components + lazy routes minimizan bundle. |
| **Spring Boot 3.4 + Java 21** | Node.js (Nest), Python (FastAPI), Kotlin (Ktor) | Java 21 con records DTOs reduce boilerplate; Spring Data MongoDB es maduro; el módulo DWES exige Java. |
| **MongoDB en lugar de PostgreSQL** | PostgreSQL, MySQL | El modelo es de documentos (servidor con muchas sub-entidades anidadas); Mongo facilita iterar el esquema en sprints sin migraciones. |
| **MINA SSHD para SSH** | JSch, sshj | MINA es el fork activo, soporta ed25519, mejor manejo de keep-alive. |
| **OpenRouter para IA** | OpenAI directo, Anthropic directo | OpenRouter ofrece muchos modelos detrás de una sola API key y el plan free cubre la demo. |
| **ITCSS + BEM sin componentes scoped** | CSS Modules, styled-components, Tailwind, Angular Emulated | Coherencia visual máxima en un proyecto individual; las Custom Properties atraviesan cualquier scope. |
| **nginx en host + nginx en contenedor** | Sólo nginx contenedor, traefik | El nginx-host termina TLS (Let's Encrypt) y permite mantener Docker simple; el contenedor sirve estáticos + proxy al backend. |

## Herramientas de control de versiones

- **Git** local + **GitHub** remoto. Ramas temáticas con nombres descriptivos del cambio concreto (p. ej. `tools-funciones-y-mixins`, `container-queries-en-tarjetas`, `skip-link-y-aria-en-layout`).
- **Commits convencionales**: `feat(area): ...`, `refactor(area): ...`, `docs(area): ...`, `fix(area): ...`.
- **PRs por rama** con título descriptivo y body que enumera cambios + test plan. CI bloquea merge si los tests fallan.
- **CI/CD** en GitHub Actions: `ci.yml` (build + tests) y `cd.yml` (build imagen + push GHCR + SSH deploy).
- Regla del proyecto: **un único autor por commit (`Kruhale`)**. Nunca `Co-Authored-By`.

## Fragmentos de código relevantes

### Conexión SSH (backend, `SshCommandService.java`)

```java
@Service
public class SshCommandService {

    public ResultadoComando ejecutarComando(Servidor servidor, String comando) {
        try (SshClient cliente = SshClient.setUpDefaultClient()) {
            cliente.start();
            try (ClientSession sesion = cliente.connect(
                    servidor.usuario(), servidor.ip(), 22).verify(10, SECONDS).getSession()) {
                sesion.addPasswordIdentity(cifradoUtil.descifrar(servidor.passwordCifrada()));
                sesion.auth().verify(10, SECONDS);
                try (var stream = sesion.executeRemoteCommand(comando)) {
                    return new ResultadoComando(true, stream);
                }
            }
        } catch (IOException e) {
            return new ResultadoComando(false, e.getMessage());
        }
    }
}
```

### Theme Service (frontend, `theme.service.ts`)

```typescript
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private documento = inject(DOCUMENT);
  private eleccionManual = signal<boolean>(this.haGuardado());
  temaActual = signal<Tema>(this.temaInicial());

  constructor() {
    effect(() => {
      const tema = this.temaActual();
      this.documento.documentElement.classList.toggle('tema-claro', tema === 'claro');
      if (this.eleccionManual()) this.almacen()?.setItem('tema', tema);
    });
    this.escucharSistema();
  }
  // Detecta prefers-color-scheme y sigue cambios del SO mientras el
  // usuario no haya pulsado el toggle.
}
```

### Container queries (frontend, `_tarjeta-servidor.scss`)

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
