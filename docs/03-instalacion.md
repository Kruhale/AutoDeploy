# 03 · Instalación y preparación

Este documento es el resumen ejecutivo para poner en marcha el proyecto en local en menos de cinco minutos. Para troubleshooting, rollback y despliegue paso a paso en un VPS desde cero, ver [`DEPLOY.md`](./DEPLOY.md).

---

## Requisitos del sistema

| Componente | Versión mínima | Para qué |
|---|---|---|
| Docker Engine | 24.x | Levantar el stack completo en local |
| Docker Compose | v2 (plugin de Docker) | `docker compose -f docker-compose.prod.yml ...` |
| Node.js | 20.x | Frontend en modo dev (`npm start`, hot reload) |
| npm | 10.x | Resolución de dependencias del frontend |
| Java | 21 (LTS) | Backend en modo dev con Maven Wrapper |
| RAM libre | 2 GB | Recomendado para que arranque holgado |
| Disco libre | 3 GB | Imágenes Docker + volúmenes de Mongo |

> No necesitas instalar Java ni Node si vas a levantar todo con Docker Compose. Solo hacen falta para el modo "tres procesos" descrito al final.

---

## Variables de entorno obligatorias

El backend **se niega a arrancar** si las dos primeras no están definidas (fail-fast por seguridad, ver SEC-6).

Crea `.env` en la raíz del repositorio:

```ini
# Clave HMAC para firmar JWTs. Mínimo 32 bytes.
AUTODEPLOY_JWT_SECRET=$(openssl rand -base64 48)

# Clave AES de la que se deriva (con SHA-256) la clave de cifrado de
# credenciales SSH almacenadas en MongoDB.
AUTODEPLOY_CIFRADO_CLAVE=$(openssl rand -base64 32)

# Clave pública SSH que se instala en el contenedor sandbox-ssh como
# authorized_key del usuario `demo`. Genera el par con:
#   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_autodeploy_sandbox -N ""
# y pega aquí el contenido de id_ed25519_autodeploy_sandbox.pub
SANDBOX_PUBLIC_KEY=ssh-ed25519 AAAA... usuario@host

# Opcional (asistente IA). Si se omite, la página /app/asistente-ia
# mostrará un aviso al primer mensaje.
# OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
# OPENROUTER_MODEL=google/gemini-2.5-pro

# Puerto del host donde el contenedor frontend publica nginx.
# Por defecto 8082. Cambia si el puerto está ocupado.
HOST_PORT=8082
```

El archivo [`.env.example`](../.env.example) contiene todos los valores comentados y listos para copiar.

---

## Instalación rápida (Docker Compose)

```bash
git clone git@github.com:Kruhale/AutoDeploy.git
cd AutoDeploy
cp .env.example .env
$EDITOR .env                                          # rellena las claves
docker compose -f docker-compose.prod.yml up -d --build
```

Esto crea **cuatro servicios** en la red Docker `red-interna`:

| Servicio | Puerto interno | Puerto host | Healthcheck |
|---|---|---|---|
| `frontend` (nginx + Angular) | 80 | `8082` (HOST_PORT) | `wget` a `http://127.0.0.1/` |
| `backend` (Spring Boot) | 8080 | — | `curl /actuator/health` |
| `mongodb` (Mongo 8) | 27017 | — | `mongosh ping` |
| `sandbox-ssh` (`linuxserver/openssh-server`) | 2222 | `2223` | — (sin healthcheck propio) |

Acceso: <http://localhost:8082/>. Backend y Mongo viajan dentro de la red Docker, **no se exponen al host**.

---

## Verificación

```bash
docker compose -f docker-compose.prod.yml ps          # los 3 con healthcheck en (healthy)
curl -I http://localhost:8082/                        # 200 OK, server: nginx
curl -s http://localhost:8082/api/estado | jq         # estadoGeneral: UP, 6 servicios operativos
curl -s http://localhost:8082/actuator/health         # {"status":"UP",...}
```

- Swagger UI: <http://localhost:8082/swagger-ui.html> (proxificado por el nginx del contenedor).
- OpenAPI JSON: <http://localhost:8082/v3/api-docs>.

Si algún servicio queda `(unhealthy)` o `starting`, mira la sección **Troubleshooting** de [`DEPLOY.md`](./DEPLOY.md).

---

## Modo desarrollo (tres procesos en paralelo)

Útil para iterar el frontend o el backend sin reconstruir los contenedores cada vez:

```bash
# Terminal 1 — solo MongoDB en Docker (puerto 27017 al host)
docker compose up mongodb

# Terminal 2 — Backend con hot reload de Spring Boot DevTools (puerto 8080)
cd backend
./mvnw spring-boot:run

# Terminal 3 — Frontend con Angular CLI (puerto 4200, proxifica /api → :8080)
cd autodeploy
npm install
npm start
```

Acceso a la SPA en <http://localhost:4200/>. Las llamadas `/api/...` van al backend en `:8080` por el proxy configurado en `proxy.conf.json`.

---

## CI/CD en producción

El despliegue real vive en `https://autodeploy.kruhale.com` (VPS IONOS Ubuntu 24.04). Hay dos workflows de GitHub Actions:

- **`.github/workflows/ci.yml`** — build + tests en cualquier rama:
  - `backend-test`: `./mvnw verify` con un servicio MongoDB efímero.
  - `frontend-test`: `ng test --watch=false` (119 tests) + `ng build`.
  - `lint-docker`: `hadolint` sobre los dos Dockerfiles.
- **`.github/workflows/cd.yml`** — solo despliega tras CI en verde:
  - Build de las dos imágenes (`autodeploy-backend`, `autodeploy-frontend`) y push a GHCR.
  - SSH al VPS con `appleboy/ssh-action` y `docker compose pull && up -d`.
  - **Smoke test** contra `https://autodeploy.kruhale.com/api/estado` con `estadoGeneral: UP`.
  - **Rollback automático** si el smoke test falla: el `.env` del VPS vuelve al `IMAGE_TAG` anterior.

Detalle completo paso a paso en [`DEPLOY.md`](./DEPLOY.md).
