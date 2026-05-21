# Artefactos del despliegue — AutoDeploy

Inventario de **todos** los ficheros y artefactos involucrados en el despliegue, organizados por su rol y por si forman parte del repositorio o no.

## Resumen

| Categoría | Cuántos | Ejemplos |
|-----------|---------|----------|
| Orquestación | 2 | `docker-compose.yml`, `docker-compose.prod.yml` |
| Construcción de imágenes | 2 | `backend/Dockerfile`, `autodeploy/Dockerfile` |
| Configuración runtime | 3 | `autodeploy/nginx.conf`, `backend/application.properties`, `.env` |
| Generados (no se suben) | 4 | `target/*.jar`, `dist/`, `node_modules/`, `mongodb-datos/` |
| Imágenes publicadas | 2 | `ghcr.io/kruhale/autodeploy-backend`, `...-frontend` |
| CI/CD | 2 | `.github/workflows/ci.yml`, `.github/workflows/cd.yml` |
| Documentación | 7 | `README.md`, `docs/*.md` |

## Tabla completa

| Artefacto | Ubicación | Propósito | ¿En el repo? | ¿Generado? | ¿Persiste? |
|-----------|-----------|-----------|---------------|------------|------------|
| **Orquestación** | | | | | |
| `docker-compose.yml` | raíz | Compose solo de MongoDB (desarrollo local) | ✅ | ❌ | n/a |
| `docker-compose.prod.yml` | raíz | Compose completo (mongodb + backend + frontend) | ✅ | ❌ | n/a |
| `.env` | raíz | Valores reales de las variables de entorno | ❌ (gitignore) | Manual | Sí |
| `.env.example` | raíz | Plantilla pública sin secretos | ✅ | ❌ | n/a |
| **Construcción** | | | | | |
| `backend/Dockerfile` | `backend/` | Multi-stage: JDK 21 build → JRE 21 runtime | ✅ | ❌ | n/a |
| `backend/pom.xml` | `backend/` | Dependencias Maven | ✅ | ❌ | n/a |
| `autodeploy/Dockerfile` | `autodeploy/` | Multi-stage: Node 22 build → nginx alpine | ✅ | ❌ | n/a |
| `autodeploy/package.json` | `autodeploy/` | Dependencias npm | ✅ | ❌ | n/a |
| `autodeploy/package-lock.json` | `autodeploy/` | Lock de versiones npm | ✅ | ❌ | n/a |
| **Configuración runtime** | | | | | |
| `autodeploy/nginx.conf` | `autodeploy/` | Reverse proxy + TLS + locations | ✅ | ❌ | n/a |
| `backend/src/main/resources/application.properties` | `backend/.../resources/` | Config Spring Boot | ✅ | ❌ | n/a |
| `/etc/nginx/ssl/autodeploy.crt` | dentro del contenedor | Cert autofirmado | ❌ | ✅ (en build) | mientras viva el contenedor |
| `/etc/nginx/ssl/autodeploy.key` | dentro del contenedor | Clave privada del cert | ❌ | ✅ (en build) | mientras viva el contenedor |
| **Artefactos generados (NO suben)** | | | | | |
| `backend/target/*.jar` | `backend/target/` | JAR ejecutable Spring Boot | ❌ (gitignore) | ✅ (Maven) | mientras viva el contenedor |
| `autodeploy/dist/autodeploy/browser/` | `autodeploy/dist/` | Bundle Angular (HTML/JS/CSS) | ❌ (gitignore) | ✅ (Angular CLI) | en imagen final |
| `autodeploy/node_modules/` | `autodeploy/` | Dependencias npm | ❌ (gitignore) | ✅ (`npm ci`) | n/a |
| `backend/target/maven-status/` | `backend/target/` | Caché Maven | ❌ (gitignore) | ✅ (Maven) | n/a |
| **Imágenes Docker** | | | | | |
| `ghcr.io/kruhale/autodeploy-backend:latest` | GitHub Container Registry | Imagen runtime backend | ✅ (publicada) | ✅ (CD) | en GHCR |
| `ghcr.io/kruhale/autodeploy-backend:<sha>` | GitHub Container Registry | Tag inmutable por commit | ✅ (publicada) | ✅ (CD) | en GHCR |
| `ghcr.io/kruhale/autodeploy-frontend:latest` | GitHub Container Registry | Imagen runtime frontend | ✅ (publicada) | ✅ (CD) | en GHCR |
| `ghcr.io/kruhale/autodeploy-frontend:<sha>` | GitHub Container Registry | Tag inmutable por commit | ✅ (publicada) | ✅ (CD) | en GHCR |
| `mongo:8` | Docker Hub | Imagen oficial MongoDB | (externa) | ❌ | en Docker Hub |
| **Volúmenes (datos persistentes)** | | | | | |
| `mongodb-datos` | volumen Docker named | Base de datos completa | ❌ | ✅ (en runtime) | **Sí, sobrevive `down`** |
| `backend-logs` | volumen Docker named | `/var/log/autodeploy/backend.log` rolling | ❌ | ✅ (en runtime) | **Sí, sobrevive `down`** |
| `nginx-logs` | volumen Docker named | `access.log` y `error.log` | ❌ | ✅ (en runtime) | **Sí, sobrevive `down`** |
| **CI/CD** | | | | | |
| `.github/workflows/ci.yml` | `.github/workflows/` | Build + tests en cada push | ✅ | ❌ | n/a |
| `.github/workflows/cd.yml` | `.github/workflows/` | Publica GHCR + SSH deploy al VPS | ✅ | ❌ | n/a |
| GitHub Secrets | GitHub repo settings | `SSH_PRIVATE_KEY`, `SSH_HOST`, etc. | (no en el repo) | Manual | en GitHub |
| **Documentación** | | | | | |
| `README.md` | raíz | Punto de entrada | ✅ | ❌ | n/a |
| `docs/ARCHITECTURE.md` | `docs/` | Diagrama, servicios, ADRs | ✅ | ❌ | n/a |
| `docs/DEPLOY.md` | `docs/` | Pasos de despliegue + troubleshooting | ✅ | ❌ | n/a |
| `docs/API.md` | `docs/` | Endpoints REST + ejemplos curl | ✅ | ❌ | n/a |
| `docs/VERIFICATION.md` | `docs/` | Pruebas de red y verificación post-deploy | ✅ | ❌ | n/a |
| `docs/ARTIFACTS.md` | `docs/` | (este archivo) | ✅ | ❌ | n/a |
| `docs/EVIDENCIA.md` | `docs/` | Salidas reales de pruebas locales/VPS | ✅ | ❌ | n/a |
| `docs/design/DOCUMENTACION.md` | `docs/design/` | 7 secciones técnicas DIW (Rublicas10) | ✅ | ❌ | n/a |
| `docs/accesibilidad/README.md` | `docs/accesibilidad/` | 8 secciones de accesibilidad WCAG | ✅ | ❌ | n/a |
| Swagger UI / OpenAPI JSON | `/swagger-ui.html`, `/v3/api-docs` | Generado en runtime por springdoc-openapi | (en runtime) | ✅ | mientras viva el backend |

## Política de `.gitignore`

Lo que **nunca** se sube (extracto del `.gitignore` real del repo):

```
# Secretos
.env
.env.local
.env*.local
.env.production.local
.env.test.local

# Node y Angular
node_modules/
dist/
autodeploy/dist/
.angular/

# Artefactos de build del backend
backend/target/
backend/.classpath
backend/.project
backend/.settings/
backend/.m2/
**/.m2/

# Tests y reportes de cobertura
coverage/
playwright-report/
test-results/
backend/target/surefire-reports/

# Logs
*.log
logs/

# IDE
.vscode/settings.json
.idea/

# Entorno local de pruebas SSH (no producto)
test-vps/
```

## Política de `.dockerignore`

Lo que **nunca** entra a la imagen Docker (reduce tamaño y evita filtrar):

| Proyecto | Ignora |
|----------|--------|
| `autodeploy/.dockerignore` | `node_modules/`, `dist/`, `.angular/`, `*.log`, `.git`, `e2e/`, `*.spec.ts`, `coverage/` |
| `backend/.dockerignore` | `target/`, `.idea/`, `*.iml`, `.git`, `*.log` |

## Cómo se generan los artefactos

### Build local

```bash
# Frontend
cd autodeploy
npm ci                 # genera node_modules/
npm run build          # genera dist/autodeploy/browser/

# Backend
cd backend
./mvnw package -DskipTests   # genera target/autodeploy-X.X.X.jar
```

### Build con Docker

```bash
# Construye AMBAS imágenes desde cero
docker compose -f docker-compose.prod.yml build

# Solo backend
docker compose -f docker-compose.prod.yml build backend
```

Cada `docker build` genera **capas intermedias** que quedan en el caché local de Docker. Para limpiar:

```bash
docker builder prune -af
```

### Publicación en GHCR (lo hace el CD automáticamente)

```bash
# Login en GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u Kruhale --password-stdin

# Tag y push
docker buildx build -t ghcr.io/kruhale/autodeploy-backend:latest \
                    -t ghcr.io/kruhale/autodeploy-backend:$(git rev-parse --short HEAD) \
                    ./backend --push

docker buildx build -t ghcr.io/kruhale/autodeploy-frontend:latest \
                    -t ghcr.io/kruhale/autodeploy-frontend:$(git rev-parse --short HEAD) \
                    ./autodeploy --push
```

Cada commit a `main` queda inmortalizado en GHCR como tag inmutable, lo que permite hacer rollback rápido (`IMAGE_TAG=<sha-anterior> docker compose up -d`).

## Tamaños aproximados

| Artefacto | Tamaño |
|-----------|--------|
| Imagen `autodeploy-backend` | ~270 MB (JRE 21 base + JAR) |
| Imagen `autodeploy-frontend` | ~45 MB (nginx alpine + bundle Angular) |
| Imagen `mongo:8` | ~830 MB (oficial) |
| Bundle Angular (`dist/`) | ~3 MB (gzip ~900 KB) |
| JAR backend | ~70 MB |
| `node_modules/` | ~500 MB (desarrollo) |
| `mongodb-datos/` | crece con uso (~50 MB tras 1 mes de demo) |

## Verificación de artefactos en el VPS

```bash
# Imágenes locales
docker compose -f docker-compose.prod.yml images

# Tag exacto corriendo
docker inspect autodeploy-backend --format '{{.Config.Image}}'

# Volúmenes existentes
docker volume ls | grep autodeploy

# Tamaño de un volumen
docker run --rm -v autodeploy_mongodb-datos:/data alpine du -sh /data
```
