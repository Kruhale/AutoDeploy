# Cómo aportar al proyecto

AutoDeploy nació como Trabajo Final del ciclo DAW, pero el código se ha pensado desde el principio para sobrevivir más allá del aula. Si has llegado aquí porque te interesa abrir un pull request, arreglar un bug o ampliar una funcionalidad, este documento explica las costumbres del proyecto antes de que toques nada — para que tu trabajo encaje con el resto y no se te devuelva por motivos que se podían haber evitado leyendo unas líneas.

## Filosofía del repositorio

Tres principios orientan todas las decisiones técnicas. Si una propuesta los rompe, probablemente no entre.

- **La solución más simple que funciona gana.** Tres líneas claras superan a una abstracción ingeniosa. No se pre-diseña para necesidades futuras hipotéticas; cuando lleguen, se refactoriza.
- **El código se escribe en español.** Clases, métodos, variables, ramas, commits, endpoints y selectores CSS. La excepción son los términos técnicos que no tienen traducción razonable (`signal`, `WebSocket`, `JWT`, `cron`).
- **El "qué" lo cuenta el nombre. El "por qué" lo cuenta el comentario.** Si un comentario explica lo mismo que ya dice el identificador, sobra. Si explica una decisión no obvia, queda.

## Antes de abrir un pull request

No empieces a programar a ciegas. Para cualquier cambio que no sea trivial:

1. **Mira si existe un issue** que describa lo que quieres hacer. Si no existe, ábrelo tú primero usando la plantilla correspondiente.
2. **Comenta el issue** indicando que te encargas, así evitamos trabajos paralelos.
3. **Acuerda el enfoque** si el cambio toca la arquitectura, varios módulos o algo sensible (auth, cifrado, capa SSH). Un comentario tuyo proponiendo el plan ahorra refactors enteros más tarde.
4. **Si vas a romper compatibilidad** (cambio de API, migración de datos, eliminación de endpoint), márcalo explícitamente y propón una estrategia de transición.

## Preparar tu entorno local

Tras hacer fork y clonar tu copia, deja el entorno listo en tres pasos:

```bash
# 1. Variables de entorno (no se versionan)
cp .env.example .env
# Edita .env con tus propias claves de prueba

# 2. Base de datos en Docker
docker compose up mongodb

# 3. Backend y frontend en paralelo (dos terminales)
cd backend && ./mvnw spring-boot:run        # → :8080
cd autodeploy && npm install && npm start    # → :4200
```

Si todo arranca sin errores, abre `http://localhost:4200` y ya tienes la aplicación funcionando contra Mongo y backend locales. Si algo falla, consulta [`docs/03-instalacion.md`](./docs/03-instalacion.md) — hay un apartado de Troubleshooting.

## Cómo se nombran las ramas

El nombre de la rama es la primera cosa que cualquiera lee de tu trabajo. Que diga algo.

| Prefijo | Para qué tipo de cambio | Ejemplo real |
|---------|-------------------------|--------------|
| `feature/` | Funcionalidad nueva | `feature/reconexion-automatica-servidores` |
| `fix/` | Corrección de un bug existente | `fix/onboarding-textarea-clave-ssh` |
| `refactor/` | Reorganización sin cambio funcional | `refactor/itcss-bem-estados` |
| `docs/` | Solo documentación | `docs/snippet-nginx-letsencrypt` |
| `recuperacion/` | Tareas de rúbrica académica | `recuperacion/itcss-bem-estados` |
| `chore/` | Mantenimiento, dependencias, CI | `chore/bump-spring-boot-3.4.1` |

Evita nombres genéricos como `feature/cambios`, `fix/varios`, `update`. Si necesitas tocar dos cosas sin relación, son dos ramas.

## La forma del commit

El proyecto sigue [Conventional Commits](https://www.conventionalcommits.org/) sin excepciones. El asunto del commit (la primera línea) tiene esta forma:

```
tipo(area): descripción imperativa en minúsculas
```

Los **tipos** admitidos son los habituales del estándar:

`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `style`, `perf`, `build`, `revert`.

El **área** es opcional pero recomendada para que el `git log` sea legible de un vistazo. Algunas áreas vivas en el repo: `backend`, `onboarding`, `styles`, `terminal`, `firewall`, `i18n`, `deploy`.

Ejemplos reales del historial del proyecto:

```
feat(backend): reconexión automática de servidores tras arrancar (#225)
fix(onboarding): añadir textarea para pegar la clave SSH privada (#223)
refactor(styles): anidamiento BEM con & + estados :hover/:focus en componentes
docs(deploy): mover Custom Properties CSS de Settings a 02-generic
```

Si el cambio merece explicación adicional (decisión técnica, alternativas descartadas, referencia a un commit anterior), deja una línea en blanco después del asunto y escríbelo en el cuerpo. Que el cuerpo del commit sea útil al *yo del año que viene* leyendo `git blame`.

## Anatomía de un pull request que se acepta a la primera

Tu PR está más cerca de mergearse si cumple estos criterios — no son normas mecánicas, son patrones que han demostrado funcionar:

- **Es pequeño.** Idealmente menos de 300 líneas de diff. Si necesitas más, parte el trabajo en varios PRs encadenados.
- **Hace una cosa.** Si necesitas la conjunción "y" para describirlo, son dos PRs.
- **Trae sus tests.** Si tocas backend Java, hay JUnit. Si tocas frontend, hay Karma/Jasmine. Si es un fix, hay un test que reproducía el bug *antes* de tu cambio.
- **Pasa el CI verde.** No abras el PR esperando que CI te diga lo que pasa; ejecuta los tests local antes (`./mvnw test` y `npm run test:unit`).
- **La descripción se lee sin abrir los archivos.** Resumen → motivación → forma de probar manualmente. Si tocaste UI, una captura. Si tocaste API, un ejemplo `curl`.
- **No mezcla refactors cosméticos** (renombres, reordenar imports, reformateo) con cambios funcionales. Un PR aparte para eso.

Plantilla automática disponible en [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md).

## Convenciones técnicas por capa

Las reglas de estilo no son arbitrarias: cada una existe porque su contraria causó un problema concreto en algún momento del proyecto. Si crees que una regla está mal, abre issue *antes* de saltártela.

### Backend (Java 21 + Spring Boot 3.4)

- **DTOs como `record`**, nunca clases POJO con getters/setters generados a mano.
- **Inyección por constructor**, no por campo (`@Autowired` está prohibido en campos).
- **Autorización a nivel método** con `@PreAuthorize("hasRole('ADMIN') or #id == authentication.principal")` cuando aplique. No filtres permisos en el controller a mano.
- **Wrapper de respuesta uniforme**: `ApiResponse<T>` con campos `success`, `message`, `data`. Tres campos. Siempre.
- **Excepciones de negocio** extienden `RuntimeException`. El `@RestControllerAdvice` global las mapea a HTTP.
- **Variables de entorno** para todo lo sensible. Nada de defaults en `application.properties` — el backend hace *fail-fast* si faltan.

### Frontend (Angular 20)

- **Signals** para todo el estado reactivo. No `BehaviorSubject` salvo cuando integras con APIs RxJS legadas.
- **Componentes standalone con `inject()`** dentro del cuerpo. Sin DI por constructor.
- **`async/await`** en servicios y componentes. `.then()` encadenado solo si te lo cruzas en código legado y vas a tocarlo lo mínimo.
- **Comillas dobles** en strings TypeScript (Prettier lo refuerza).
- **`const` por defecto**, `let` cuando reasignas, **nunca `var`**.
- **Métodos en lugar de arrow functions** como propiedades de clase. Las arrow functions se reservan para callbacks inline.
- **Rutas autenticadas** bajo `/app/*` con `authGuard`. Las páginas se cargan con `loadComponent` (lazy).

### Estilos (Sass + ITCSS + BEM)

- **Capas ITCSS** estrictas: `00-settings`, `01-tools`, `02-generic`, `03-elements`, `04-layout`, `05-components`, `06-utilities`. No se importan al revés.
- **BEM con anidación Sass**: `.bloque { &__elemento { &--modificador {} } }`. Tres niveles máximo.
- **Custom Properties CSS centralizadas** en `_variables.scss`. Si añades una variable, va ahí — no donde la usas por primera vez.
- **Sin `!important`.** Si lo necesitas, es que la especificidad está mal pensada.
- **Flexbox por defecto.** Grid sólo cuando Flexbox no llega.
- **Estados `:hover` y `:focus-visible`** son obligatorios en todo lo interactivo. Sin excepciones por accesibilidad.
- **Sin Tailwind**, sin CSS-in-JS, sin `style="..."` inline.

## La regla de autoría

El proyecto se firma con **un único nombre de autor: `Kruhale`**. Esta restricción no es estética — viene del módulo de Despliegue, donde la trazabilidad inequívoca de la autoría es uno de los criterios evaluables.

Implicaciones prácticas:

- No añadir `Co-Authored-By:` al final del mensaje de commit, ni siquiera cuando una herramienta lo proponga automáticamente.
- Si pasa por error (ocurre con plantillas de PR de GitHub y con algunos asistentes IA), reescribe el commit con `git commit --amend` **antes de hacer push**. Si ya está pusheado pero no mergeado, `git push --force-with-lease` sobre la rama temática.
- Si el commit ya está en `main`, **no se rehace**. Se asume y se documenta en el cuerpo del siguiente commit. Reescribir historia compartida es peor que el error original.

## Cuando metes la pata

Pasa, y se gestiona como un problema más:

- **Tests rotos en `main` por un merge tuyo** → abre un PR de revert inmediato y luego un segundo PR con el fix.
- **Secreto commiteado por accidente** → rota la credencial real *antes* que reescribir historia. La credencial ya está expuesta, el repo se limpia después.
- **Push forzado sobre `main`** → no debería ocurrir nunca. Si pasa, abre un issue describiendo qué se perdió y reconstrúyelo.
- **Conflictos de merge masivos** → preferible cerrar el PR, rebasar la rama contra `main` y abrir uno nuevo limpio.

## Dónde mirar si te pierdes

| Necesitas saber… | Mira en… |
|---|---|
| Cómo levantar el proyecto entero | [`docs/03-instalacion.md`](./docs/03-instalacion.md) |
| Cómo está organizado el código | [`docs/05-diseno.md`](./docs/05-diseno.md) |
| Qué tests existen y cómo se ejecutan | [`docs/07-pruebas.md`](./docs/07-pruebas.md) |
| Cómo se despliega en producción | [`docs/08-despliegue.md`](./docs/08-despliegue.md) |
| Qué reglas de seguridad aplica el código | [`SECURITY.md`](./SECURITY.md) |
| Convenciones de la API REST | [`docs/API.md`](./docs/API.md) o Swagger UI en `/swagger-ui.html` |

Si después de leer todo esto te queda alguna duda concreta, abre un issue con la etiqueta `question`. Es una etiqueta válida — no todo tiene que ser bug o feature.
