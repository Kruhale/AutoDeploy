# 03 · Instalación y preparación

> Para detalles completos de despliegue (Docker Compose, nginx-host, TLS, variables de entorno, CI/CD), consultar [`DEPLOY.md`](./DEPLOY.md). Este documento ofrece el resumen ejecutivo.

## Requisitos

| Componente | Versión mínima | Para qué |
|---|---|---|
| Docker | 24.x | Stack en producción local |
| Docker Compose | v2 (plugin) | `docker compose -f ...` |
| Node.js | 20.x | Frontend dev (`npm start`) |
| npm | 10.x | Dependencias del frontend |
| Java | 21 (LTS) | Backend en local (con Maven Wrapper) |
| MongoDB | 8 (Docker oficial) | Persistencia |

## Variables de entorno (mínimas)

Crear `.env` en la raíz del repo:

```ini
AUTODEPLOY_JWT_SECRET=cadena_256_bits_min
AUTODEPLOY_CIFRADO_CLAVE=clave_AES_para_credenciales_SSH
OPENROUTER_API_KEY=opcional_para_asistente_ia
OPENROUTER_MODEL=openai/gpt-4o-mini
HOST_PORT=8082
```

Ejemplo completo en [`.env.example`](../.env.example).

## Instalación rápida (producción local con Docker)

```bash
git clone git@github.com:Kruhale/AutoDeploy.git
cd AutoDeploy
cp .env.example .env   # editar valores
docker compose -f docker-compose.prod.yml up --build
```

Frontend público en `http://localhost:8082`. Backend y MongoDB sólo en la red Docker `red-interna`.

## Desarrollo local (3 procesos)

```bash
# Terminal 1 — MongoDB
docker compose up mongodb

# Terminal 2 — Backend (puerto 8080)
cd backend && ./mvnw spring-boot:run

# Terminal 3 — Frontend (puerto 4200, proxifica /api a localhost:8080)
cd autodeploy && npm install && npm start
```

## Verificación

```bash
curl -I http://localhost:8082
curl http://localhost:8080/actuator/health
docker compose -f docker-compose.prod.yml ps
```

Swagger UI: `http://localhost:8082/swagger-ui.html` (vía proxy nginx).

## Producción real

El despliegue real vive en `autodeploy.kruhale.com`. Pipeline en `.github/workflows/ci-cd.yml`: build → tests → push imagen a GHCR → SSH al VPS con `appleboy/ssh-action` y `docker compose pull && up -d`. nginx-host del VPS termina TLS con Let's Encrypt y proxifica al contenedor.

Más detalles y troubleshooting en [`DEPLOY.md`](./DEPLOY.md).
