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

`.github/workflows/ci-cd.yml`:

```yaml
on:
  push: { branches: [main, recuperacion/**, feat/**] }
  pull_request:

jobs:
  ci:
    steps:
      - npm ci && npm run build  # frontend
      - ./mvnw package -DskipTests
      - ng test --watch=false    # 68/68
      - ./mvnw test              # JUnit

  cd:
    needs: ci
    if: github.ref == 'refs/heads/main'
    steps:
      - docker build -t ghcr.io/kruhale/autodeploy:latest .
      - docker push ghcr.io/kruhale/autodeploy:latest
      - appleboy/ssh-action: ssh root@vps "cd /opt/autodeploy && docker compose pull && docker compose up -d"
```

Triggers:
- **CI** en todo push (PR incluido).
- **CD** sólo en push a `main` tras CI verde.

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
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | Modelo por defecto |
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
