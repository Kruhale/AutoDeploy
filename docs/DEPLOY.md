# Guía de despliegue — AutoDeploy

Guía paso a paso para levantar AutoDeploy en local o en un VPS desde cero.

## Requisitos previos

| Software | Versión mínima | Comando de verificación |
|----------|----------------|--------------------------|
| Docker Engine | 24.0 | `docker --version` |
| Docker Compose | v2.20 | `docker compose version` |
| Git | 2.30 | `git --version` |
| 2 GB RAM libres | — | `free -h` |
| 3 GB disco libres | — | `df -h /` |

No hace falta Java, Node ni Maven en la máquina: todo se construye dentro de los contenedores.

## Variables de entorno

| Variable | Obligatoria | Descripción | Cómo generarla |
|----------|-------------|-------------|----------------|
| `AUTODEPLOY_JWT_SECRET` | Sí | Clave HMAC para firmar tokens JWT (mín. 256 bits) | `openssl rand -base64 48` |
| `AUTODEPLOY_CIFRADO_CLAVE` | Sí | Clave AES-256 para cifrar credenciales SSH en MongoDB | `openssl rand -base64 32` |
| `OPENROUTER_API_KEY` | No | API key del asistente IA (https://openrouter.ai/keys) | Crear cuenta en OpenRouter |
| `OPENROUTER_MODEL` | No | Modelo IA por defecto. Default `google/gemini-2.5-pro` | Slug de https://openrouter.ai/models |
| `IMAGE_TAG` | No | Tag de imagen Docker a desplegar. Default `latest` | Cualquier SHA o tag de GHCR |

Las variables se leen de un archivo `.env` en la raíz del proyecto. Hay un `.env.example` con los valores por defecto.

## Despliegue local (desde cero)

### 1. Clonar el repositorio

```bash
git clone https://github.com/Kruhale/AutoDeploy.git
cd AutoDeploy
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con valores reales (los de .env.example son placeholders)
nano .env
```

Ejemplo de `.env` válido para desarrollo:

```env
AUTODEPLOY_JWT_SECRET=8K7QzVMpL+EvW9rH4tYbF3aXcN6dP1iR2sU0jK5mLxA=
AUTODEPLOY_CIFRADO_CLAVE=YXV0b2RlcGxveS1zZWNyZXQta2V5LTMyYg==
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
OPENROUTER_MODEL=google/gemini-2.5-pro
```

### 3. Levantar el stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

El primer arranque tarda 2-4 min (build de imágenes). Después tarda 15-20 s.

### 4. Esperar a que todo esté `healthy`

```bash
docker compose -f docker-compose.prod.yml ps
```

Debes ver los servicios en estado `running` y `(healthy)`. Solo el **frontend** publica un puerto al host (`HOST_PORT`, por defecto `8082`); backend, mongodb y sandbox-ssh quedan únicamente accesibles dentro de la red interna de Docker:

```
NAME                   IMAGE                                            STATUS                   PORTS
autodeploy-mongodb     mongo:8                                          Up 30s (healthy)
autodeploy-backend     ghcr.io/kruhale/autodeploy-backend:latest        Up 25s (healthy)
autodeploy-sandbox     linuxserver/openssh-server:latest                Up 20s                   0.0.0.0:2222->2222/tcp
autodeploy-frontend    ghcr.io/kruhale/autodeploy-frontend:latest       Up 10s (healthy)         0.0.0.0:8082->80/tcp
```

Si alguno se queda en `(unhealthy)` o `starting`, mira la sección **Troubleshooting**.

> **Nota sobre TLS**: el contenedor del frontend sirve sólo HTTP en el puerto `8082`. El TLS lo termina el `nginx-host` del VPS (Let's Encrypt centralizado) cuando se despliega en producción detrás de un dominio. En desarrollo local no hay HTTPS: se accede directamente por `http://localhost:8082/`.

### 5. Verificar acceso (local sin nginx-host por delante)

```bash
# Frontend Angular (SPA servida por nginx contenedor)
curl -I http://localhost:8082/
# Esperado: HTTP/1.1 200 OK, server: nginx, content-type: text/html

# Backend público (vía reverse proxy nginx → backend:8080)
curl -s http://localhost:8082/api/estado | jq
# Esperado: {"success":true,"data":{"estadoGeneral":"UP",...}}

# Spring Actuator healthcheck
curl -s http://localhost:8082/actuator/health
# Esperado: {"status":"UP","groups":["liveness","readiness"]}

# Endpoint protegido sin JWT → 403 (confirma que el filter funciona)
curl -sI http://localhost:8082/api/servidores
# Esperado: HTTP/1.1 403 Forbidden
```

Abre el navegador en `http://localhost:8082/`.

### 5 bis. Verificar acceso (producción real)

Una vez detrás de `nginx-host` + Let's Encrypt en un VPS público:

```bash
curl -I https://autodeploy.kruhale.com/                  # HTTP/2 200
curl -s https://autodeploy.kruhale.com/api/estado | jq   # estadoGeneral: UP
curl -s https://autodeploy.kruhale.com/actuator/health   # {"status":"UP",...}
```

## Despliegue al VPS compartido (con nginx-host)

Este es el escenario típico cuando el VPS ya tiene un nginx en los puertos 80/443 sirviendo otras aplicaciones. AutoDeploy se publica en un **puerto interno del host** (por defecto `8082`) y el `nginx-host` del VPS hace `proxy_pass` desde el dominio público.

```
Internet ─► nginx-host VPS :443 (TLS, Let's Encrypt) ─► localhost:8082 ─► nginx-container (HTTP) ─► backend / mongo
```

### Pasos completos (primera vez)

#### 1. Comprobar que el puerto interno está libre

```bash
sudo ss -tlnp | grep 8082
```

Si no devuelve nada, está libre. Si está ocupado, cambia `HOST_PORT` en `.env` a otro puerto disponible.

#### 2. Clonar y configurar `.env`

```bash
cd /opt
sudo git clone https://github.com/Kruhale/AutoDeploy.git
sudo chown -R $USER:$USER AutoDeploy
cd AutoDeploy
cp .env.example .env
# Editar y rellenar AUTODEPLOY_JWT_SECRET, AUTODEPLOY_CIFRADO_CLAVE, OPENROUTER_API_KEY, HOST_PORT
nano .env
```

#### 3. Levantar el stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Verifica que el contenedor `autodeploy-frontend` esté publicando `8082:80`. Prueba interna:

```bash
curl -fsS http://localhost:8082/api/estado | jq
```

Si responde el JSON `{"success":true,...}` está OK.

#### 4. Configurar el nginx-host del VPS

Copia el snippet preparado:

```bash
sudo cp docs/snippets/nginx-host-autodeploy.conf /etc/nginx/sites-available/autodeploy
# Reemplazar TU-DOMINIO.com por el dominio real
sudo sed -i 's/TU-DOMINIO\.com/midominio.es/g' /etc/nginx/sites-available/autodeploy
sudo ln -s /etc/nginx/sites-available/autodeploy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. Asegurarse de que el A record del dominio apunta a la IP del VPS

En el panel del registrador:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | `@` (o el subdominio) | `<IP-pública-del-VPS>` |

Espera unos minutos a que propague:

```bash
dig +short midominio.es
# Debe devolver la IP del VPS
```

#### 6. Emitir certificado Let's Encrypt

```bash
sudo certbot --nginx -d midominio.es
```

Certbot:
- Detecta el `server_name midominio.es` en `/etc/nginx/sites-available/autodeploy`.
- Hace el challenge HTTP-01 en el puerto 80.
- Rellena automáticamente `ssl_certificate` y `ssl_certificate_key`.
- Añade el redirect 301 HTTP→HTTPS (opción 2 cuando lo pregunte).
- Programa la renovación automática cada 60 días (`/etc/cron.d/certbot`).

#### 7. Verificación final

```bash
# Cert válido
curl -I https://midominio.es/
# HTTP/2 200, server: nginx, sin warnings

# API funcional
curl https://midominio.es/api/estado | jq
```

Abre `https://midominio.es` en el navegador — debe mostrar el dashboard con candado verde.

### Cuando se hace push a main (CD automático)

El workflow `cd.yml`:

1. Construye las imágenes y las publica en GHCR.
2. Conecta por SSH al VPS y ejecuta:

   ```bash
   cd /opt/AutoDeploy
   git pull origin main
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d --remove-orphans
   ```

3. Hace smoke test contra `https://midominio.es/api/estado`.

El nginx-host del VPS **no se toca** en cada despliegue: solo se reconfigura cuando cambian rutas o el dominio.

## Despliegue automatizado con GitHub Actions

### Opción A — automático con GitHub Actions

Cualquier push a `main` dispara el workflow `cd.yml`, que:

1. Construye las imágenes `autodeploy-backend` y `autodeploy-frontend`.
2. Las publica en GHCR como `:latest` y `:<sha-corto>`.
3. Entra por SSH al VPS y ejecuta:

   ```bash
   cd /opt/autodeploy
   git pull origin main
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d --remove-orphans
   docker image prune -f
   ```

4. Hace un `curl -ksf https://<dominio>/api/estado` como smoke test. Si falla, el workflow falla en rojo.

GitHub Secrets necesarios (Settings → Secrets and variables → Actions):

| Secret | Valor |
|--------|-------|
| `SSH_HOST` | dominio o IP pública del VPS |
| `SSH_USER` | usuario SSH del VPS (típicamente `deploy` o `ubuntu`) |
| `SSH_PORT` | `22` (o el que uses) |
| `SSH_PRIVATE_KEY` | clave privada SSH completa (formato OpenSSH) |
| `AUTODEPLOY_JWT_SECRET` | el mismo del `.env` |
| `AUTODEPLOY_CIFRADO_CLAVE` | el mismo del `.env` |
| `OPENROUTER_API_KEY` | API key del asistente IA |

### Opción B — manual desde la máquina local

Si necesitas desplegar sin esperar al CI/CD:

```bash
# 1. Construir y publicar imágenes
docker buildx build -t ghcr.io/kruhale/autodeploy-backend:latest ./backend --push
docker buildx build -t ghcr.io/kruhale/autodeploy-frontend:latest ./autodeploy --push

# 2. Conectar al VPS y actualizar
ssh deploy@<dominio-vps>
cd /opt/autodeploy
git pull origin main
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Configuración inicial del VPS (una vez)

```bash
# Como root en el VPS
apt-get update && apt-get install -y docker.io docker-compose-v2 git
usermod -aG docker deploy

# Como usuario deploy
mkdir -p /opt/autodeploy
cd /opt/autodeploy
git clone https://github.com/Kruhale/AutoDeploy.git .
cp .env.example .env
# Editar .env con los valores reales
nano .env

# Login en GHCR para hacer pull de imágenes privadas (si lo son)
echo $GITHUB_TOKEN | docker login ghcr.io -u Kruhale --password-stdin

# Primera vez
docker compose -f docker-compose.prod.yml up -d
```

## Verificación post-despliegue

```bash
# 1. Estado de los contenedores
docker compose -f docker-compose.prod.yml ps

# 2. Logs en vivo de los últimos 50 segundos
docker compose -f docker-compose.prod.yml logs --tail 50 --timestamps

# 3. Healthcheck explícito del backend
curl -sf https://autodeploy.kruhale.com/actuator/health | jq
# Esperado: {"status":"UP","groups":["liveness","readiness"]}

# 4. Métricas Prometheus (opcional)
curl -s https://autodeploy.kruhale.com/actuator/prometheus | head -20

# 5. Login real (sustituye EMAIL y PWD por credenciales válidas)
LOGIN_BODY=$(jq -n --arg e "demo@test.com" --arg p "ejemplo-no-real" '{email:$e, password:$p}')
curl -s -X POST https://autodeploy.kruhale.com/api/usuarios/login \
  -H "Content-Type: application/json" \
  -d "$LOGIN_BODY" | jq
```

## Troubleshooting

### `413 Request Entity Too Large` al subir un ZIP grande

**Causa:** `client_max_body_size` de nginx demasiado bajo.
**Solución:** ya viene configurado a 60 MB en `autodeploy/nginx.conf`. Si subes archivos más grandes, sube el valor y rebuild el frontend.

### Backend se queda en `(unhealthy)` indefinidamente

**Causa más común:** MongoDB no arrancó correctamente o `AUTODEPLOY_JWT_SECRET` está vacío.

```bash
docker compose -f docker-compose.prod.yml logs mongodb --tail 20
docker compose -f docker-compose.prod.yml logs backend --tail 50
```

Si ves `IllegalArgumentException: The signing key's size is X bits which is less than the 256 bits`, el JWT secret es muy corto. Regenéralo con `openssl rand -base64 48`.

### En local entro por http://localhost:8082 sin HTTPS

Es por diseño: el contenedor del frontend escucha sólo en HTTP/80 (mapeado a `HOST_PORT=8082` en el host). El TLS lo termina el `nginx-host` del VPS en producción con Let's Encrypt centralizado, no el contenedor.

Si quieres HTTPS en local para pruebas, opciones:

- Levantar un nginx propio en el host con un cert autofirmado y `proxy_pass http://localhost:8082`.
- Usar `mkcert` para generar un cert válido en `localhost` y un nginx host.
- Para auditorías Lighthouse/WAVE/TAW: hacerlas directamente contra `https://autodeploy.kruhale.com` (cert Let's Encrypt válido, mismo código).

### `403 Forbidden` en cualquier endpoint protegido

El interceptor JWT está funcionando: falta el header `Authorization: Bearer <token>`. Loguéate primero (`POST /api/usuarios/login`) y usa el token devuelto.

### El asistente IA responde "No has configurado tu API key de OpenRouter"

Cada usuario configura su propia API key desde la UI (`/app/asistente-ia` → "Ajustes"). La API key del `.env` no se usa: es legacy.

### `docker compose up` se queda en build infinito

```bash
# Limpiar caché de Docker
docker builder prune -af
docker system prune -af --volumes  # CUIDADO: borra TODOS los volúmenes
docker compose -f docker-compose.prod.yml up -d --build --no-cache
```

### CD desde GitHub Actions falla con `Permission denied (publickey)`

Verifica el secret `SSH_PRIVATE_KEY`: tiene que ser la clave privada **completa** incluyendo las cabeceras `BEGIN/END OPENSSH PRIVATE KEY` (formato OpenSSH, generado con `ssh-keygen -t ed25519`). La clave pública correspondiente debe estar en `~/.ssh/authorized_keys` del usuario `SSH_USER` en el VPS.

### Volumen `mongodb-datos` corrupto / quiero empezar de cero

```bash
docker compose -f docker-compose.prod.yml down -v   # ⚠️ borra TODA la BBDD
docker compose -f docker-compose.prod.yml up -d
```

### WebSocket de terminal SSH se cae cada minuto

Comprueba que el proxy WS no tenga timeout corto. En `autodeploy/nginx.conf` el bloque `/ws/` ya tiene `proxy_read_timeout 3600s`. Si lo cambias, rebuild el frontend.

### Quiero ver qué versión está corriendo en el VPS

```bash
# En el VPS
cd /opt/autodeploy && git log --oneline -1
docker compose -f docker-compose.prod.yml images
```

## Rollback rápido

Si el último despliegue ha roto algo:

```bash
# En el VPS
docker compose -f docker-compose.prod.yml down
IMAGE_TAG=<sha-anterior> docker compose -f docker-compose.prod.yml up -d
```

Donde `<sha-anterior>` es el SHA corto del commit estable previo (visible en `docker compose images` o en GHCR).
