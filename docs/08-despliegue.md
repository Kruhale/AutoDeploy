# 08 · Despliegue

> Documento técnico completo: [`DEPLOY.md`](./DEPLOY.md). Evidencia visual del despliegue real: [`EVIDENCIA.md`](./EVIDENCIA.md). Verificación de red y servicios: [`VERIFICATION.md`](./VERIFICATION.md). Artefactos: [`ARTIFACTS.md`](./ARTIFACTS.md).

## Entorno de despliegue

**VPS** en `autodeploy.kruhale.com` (217.160.204.238):

| Componente | Detalle |
|---|---|
| Proveedor | IONOS |
| SO | Ubuntu 24.04 LTS |
| Recursos | 2 vCPU, 4 GB RAM, 80 GB SSD |
| nginx-host | 1.24, termina TLS con Let's Encrypt |
| Docker Engine | 24.x con Compose plugin |
| DNS | A record apuntando a 217.160.204.238 |

## Configuración CI/CD

El pipeline está dividido en dos workflows en `.github/workflows/`:

### `ci.yml` — Build + tests
```yaml
on:
  push:
  pull_request:

jobs:
  backend-test:       # mvn test con MongoDB efímero (servicio mongo:8)
    steps:
      - ./mvnw -B verify

  frontend-test:      # Karma + Jasmine sobre Chrome Headless
    steps:
      - npm ci
      - npm run build
      - ng test --watch=false --browsers=ChromeHeadlessCI

  lint-docker:        # hadolint sobre los dos Dockerfiles
    steps:
      - hadolint backend/Dockerfile
      - hadolint autodeploy/Dockerfile
```

### `cd.yml` — Build + push + deploy
```yaml
on:
  push:               # cualquier rama (commit 438ccfc lo abrió a feature branches)
  workflow_dispatch:  # ejecución manual con tag de imagen específico

jobs:
  build-and-push:
    steps:
      - docker build -t ghcr.io/kruhale/autodeploy-backend:$SHA backend/
      - docker build -t ghcr.io/kruhale/autodeploy-frontend:$SHA autodeploy/
      - docker push ...

  deploy-vps:
    needs: build-and-push
    steps:
      - appleboy/ssh-action@v1
        with:
          script: |
            cd /opt/autodeploy
            export IMAGE_TAG=$SHA
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d --no-build
            # Smoke test: healthcheck + curl al frontend; rollback si falla.
```

Triggers:
- **CI** en todo push y todo PR.
- **CD** en cualquier rama tras CI verde (cambio aplicado en el commit `438ccfc` para permitir deploy de ramas de feature). Smoke test al final con rollback automático en caso de fallo.

Secrets necesarios en GitHub:

| Secret | Para qué |
|---|---|
| `GHCR_TOKEN` | Publicar imagen Docker en GitHub Container Registry |
| `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` | Conexión SSH al VPS desde el runner |
| `AUTODEPLOY_JWT_SECRET`, `AUTODEPLOY_CIFRADO_CLAVE` | Inyectados al contenedor por `.env` del VPS |

## Proceso de despliegue documentado

### Despliegue desde cero en un VPS nuevo

```bash
# 1. SSH al VPS como root
ssh root@autodeploy.kruhale.com

# 2. Instalar Docker + nginx-host + certbot
apt update && apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx

# 3. Clonar repo
mkdir -p /opt && cd /opt && git clone https://github.com/Kruhale/AutoDeploy.git autodeploy
cd autodeploy

# 4. Configurar .env
cp .env.example .env
nano .env  # rellenar AUTODEPLOY_JWT_SECRET, AUTODEPLOY_CIFRADO_CLAVE, OPENROUTER_API_KEY

# 5. Levantar el stack
docker compose -f docker-compose.prod.yml up -d --build

# 6. Configurar nginx-host (copiar docs/snippets/nginx-host-autodeploy.conf)
cp docs/snippets/nginx-host-autodeploy.conf /etc/nginx/sites-available/autodeploy
ln -s /etc/nginx/sites-available/autodeploy /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 7. Obtener certificado TLS Let's Encrypt
certbot --nginx -d autodeploy.kruhale.com -m alejandrobravocalderom@gmail.com --agree-tos -n

# 8. Verificar
curl -I https://autodeploy.kruhale.com
docker compose ps
```

### Despliegue de actualización

```bash
cd /opt/autodeploy
docker compose pull
docker compose up -d
```

El pipeline CD lo automatiza tras cada merge a `main`.

## Variables de entorno

| Variable | Valor (ejemplo) | Documentación |
|---|---|---|
| `AUTODEPLOY_JWT_SECRET` | 256-bit cadena aleatoria | Firmar JWTs HS384 |
| `AUTODEPLOY_CIFRADO_CLAVE` | clave AES 32 chars | Cifrar credenciales SSH antes de persistir |
| `SPRING_DATA_MONGODB_URI` | `mongodb://mongodb:27017/autodeploy` | URI Mongo (red interna Docker) |
| `OPENROUTER_API_KEY` | sk-or-v1-... | Asistente IA |
| `OPENROUTER_MODEL` | `google/gemini-2.5-pro` | Modelo por defecto |
| `HOST_PORT` | `8082` | Puerto del host expuesto |

`.env.example` contiene todos los valores con explicación.

## URL de la aplicación en producción

**https://autodeploy.kruhale.com**

- HTTPS con Let's Encrypt (auto-renovación con `certbot.timer`).
- HSTS habilitado.
- Redirección 80 → 443.
- API en `/api/...`, WebSocket en `/ws/...`, docs en `/swagger-ui.html`.

## Verificación post-deploy

```bash
# Estado de contenedores
docker compose -f docker-compose.prod.yml ps

# Logs en tiempo real
docker compose -f docker-compose.prod.yml logs -f backend

# Healthcheck
curl https://autodeploy.kruhale.com/api/actuator/health
# {"status":"UP","components":{"mongo":{"status":"UP"}, ...}}

# Frontend
curl -I https://autodeploy.kruhale.com
# HTTP/2 200
```

Detalles, troubleshooting y referencias completas en [`DEPLOY.md`](./DEPLOY.md).
