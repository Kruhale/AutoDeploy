# 08 · Despliegue

> Documento técnico completo: [`DEPLOY.md`](./DEPLOY.md). Evidencia visual del despliegue real: [`EVIDENCIA.md`](./EVIDENCIA.md). Verificación de red y servicios: [`VERIFICATION.md`](./VERIFICATION.md). Artefactos: [`ARTIFACTS.md`](./ARTIFACTS.md).

## Arquitectura desplegada

El stack se compone de 4 contenedores Docker comunicados por una red interna y un nginx-host en el VPS que termina TLS. La separación entre servicios es estricta: sólo el frontend expone puerto al host (`8082`), el backend y MongoDB sólo se ven dentro de la red Docker.

![Salida de docker compose ps con los cuatro servicios del stack en local (frontend/backend/mongodb healthy, sandbox-ssh en Up)](./assets/capturas/02-compose-ps.png)

![Salida de docker compose ps en el VPS de producción mostrando los cuatro servicios del stack (frontend/backend/mongodb healthy, sandbox-ssh en Up)](./assets/capturas/32-vps-compose-ps.png)

![Salida de docker network inspect mostrando los contenedores conectados a la red interna red-interna con sus IPs internas](./assets/capturas/07-red-interna.png)

![Salida de docker volume ls listando los volumenes persistentes del stack (datos de MongoDB y configuracion del sandbox SSH)](./assets/capturas/37-volumenes.png)

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

### Runs verdes en GitHub Actions

![Listado de runs de GitHub Actions con varios CI y CD recientes en verde](./assets/capturas/23-ci-verde.png)

![Detalle interno de un run del workflow CD en verde con los jobs build-and-push y deploy-vps completados (smoke test y rollback dentro del step Deploy y verificación)](./assets/capturas/24-cd-verde.png)

### Historial Git ordenado

Commits descriptivos siguiendo convenciones (`feat`, `fix`, `refactor`, `docs`, `chore`, `ci`) y autoria unica del proyecto:

![Salida de git log --oneline --graph mostrando commits descriptivos, merges a main y nombres de rama temáticos](./assets/capturas/25-git-log.png)

### Artefactos publicados en GHCR

Cada `cd.yml` etiqueta las imágenes con el SHA corto y con `latest`, las sube al GitHub Container Registry y desde ahí el VPS hace `docker compose pull`:

![Pagina de GHCR del paquete autodeploy-backend con la imagen publicada, sus tags por SHA y el contador de descargas](./assets/capturas/26-ghcr-backend.png)

![Pagina de GHCR del paquete autodeploy-frontend con la imagen publicada y sus tags](./assets/capturas/27-ghcr-frontend.png)

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

![Pagina de inicio publica de autodeploy.kruhale.com servida por HTTPS con certificado Let's Encrypt valido en el navegador](./assets/capturas/18-web-home.png)

![Panel de seguridad del navegador confirmando que la conexión a autodeploy.kruhale.com es segura y el certificado es válido](./assets/capturas/19-ssl-letsencrypt.png)

### Reverse proxy nginx-host (VPS) + nginx-contenedor

El tráfico entra por el nginx del propio VPS (termina TLS), que hace `proxy_pass` al puerto `8082` publicado por el contenedor frontend. Dentro del contenedor, otro nginx sirve los estáticos y proxifica `/api`, `/ws`, `/actuator`, `/swagger-ui*` y `/v3/api-docs` al backend interno `backend:8080`:

![Salida de systemctl status nginx en el VPS con el servicio activo y running](./assets/capturas/28-vps-nginx-status.png)

![Comando nginx -t en el VPS confirmando que la configuracion del nginx-host es sintacticamente correcta](./assets/capturas/29-vps-nginx-test.png)

![Fichero /etc/nginx/sites-enabled/autodeploy.kruhale.com con el bloque HTTP inicial y los proxy_pass a 127.0.0.1:8082 (parte 1, el bloque HTTPS añadido por certbot vive en otro fragmento del mismo fichero)](./assets/capturas/30-vps-nginx-conf.png)

![Salida de certbot certificates en el VPS mostrando el certificado activo de autodeploy.kruhale.com y la fecha de renovacion automatica](./assets/capturas/31-vps-certbot.png)

![Tail del access log del nginx-host mostrando peticiones reales de los distintos vhosts del VPS con códigos 200 y redirects 301](./assets/capturas/33-vps-nginx-acess-log.png)

### Verificación end-to-end con curl

Comprobaciones que se hacen tras cada deploy desde el propio runner y desde el host:

![curl -sI a https://autodeploy.kruhale.com/api/estado devolviendo HTTP/2 200 con headers de seguridad (X-Content-Type-Options, X-Frame-Options) y Server: nginx](./assets/capturas/09-curl-api-headers.png)

![curl a https://autodeploy.kruhale.com/api/estado devolviendo el JSON con success true, estadoGeneral UP, timestamp y lista de los 6 servicios internos](./assets/capturas/10-curl-api-json.png)

![curl -sI a https://autodeploy.kruhale.com/actuator/health devolviendo HTTP/2 200 con content-type application/vnd.spring-boot.actuator.v3+json](./assets/capturas/12-curl-health.png)

![curl -sI a https://autodeploy.kruhale.com/swagger-ui.html devolviendo HTTP/2 302 con Location a /swagger-ui/index.html](./assets/capturas/11-curl-swagger.png)

### Logs reales de los contenedores

Spring Boot logueando peticiones autenticadas, Mongo aceptando conexiones de la red interna y el nginx del contenedor sirviendo estáticos:

![Logs del contenedor backend con el banner de Spring Boot y mensajes de Started AutoDeployApplication en X segundos](./assets/capturas/04-logs-backend.png)

![Logs del contenedor frontend con el nginx arrancado escuchando en el puerto 80 dentro del contenedor](./assets/capturas/05-logs-frontend.png)

![Logs del contenedor mongodb con líneas de Connection accepted del cliente mongosh, demostrando que la BBDD acepta sesiones del backend](./assets/capturas/06-logs-mongodb.png)

### Prueba ligera de carga

`hey` contra la home de producción para medir latencias representativas. Resultados con percentiles p50, p95 y p99 documentados en [`EVIDENCIA.md`](./EVIDENCIA.md):

![Salida de hey -n 500 -c 20 contra https://autodeploy.kruhale.com con histograma de tiempos, requests/segundo y percentiles 50/95/99](./assets/capturas/17-carga-500req.png)

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
