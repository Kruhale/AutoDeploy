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
| `OPENROUTER_MODEL` | No | Modelo IA por defecto. Default `openai/gpt-4o-mini` | Slug de https://openrouter.ai/models |
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
OPENROUTER_MODEL=openai/gpt-4o-mini
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

Debes ver los 3 servicios en estado `running` y `(healthy)`:

```
NAME                   IMAGE                    STATUS                   PORTS
autodeploy-mongodb     mongo:8                  Up 30s (healthy)
autodeploy-backend     ghcr.io/.../backend      Up 25s (healthy)
autodeploy-frontend    ghcr.io/.../frontend     Up 10s (healthy)         0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

Si alguno se queda en `(unhealthy)` o `starting`, mira la sección **Troubleshooting**.

### 5. Verificar acceso

```bash
# Redirect HTTP→HTTPS
curl -I http://localhost/
# Esperado: HTTP/1.1 301 Moved Permanently · Location: https://localhost/

# Frontend Angular
curl -ksI https://localhost/
# Esperado: HTTP/2 200

# Backend público
curl -ks https://localhost/api/estado | jq
# Esperado: {"success":true,"data":{"baseDeDatos":"OK",...}}
```

Abre el navegador en `https://localhost/`. La primera vez verás el aviso del cert autofirmado: avanzar (en Chrome: "Configuración avanzada" → "Acceder a localhost").

## Despliegue al VPS

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
curl -ksf https://<dominio>/actuator/health | jq
# Esperado: {"status":"UP","components":{"mongo":{"status":"UP"},...}}

# 4. Métricas Prometheus (opcional)
curl -ks https://<dominio>/actuator/prometheus | head -20

# 5. Login real
curl -ks -X POST https://<dominio>/api/usuarios/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"DemoPass123"}' | jq
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

### El navegador muestra "Tu conexión no es privada"

Es esperado: el certificado es autofirmado. En Chrome haz click en "Configuración avanzada" → "Acceder a localhost". En Firefox, "Acepto el riesgo y continuo".

Para evitarlo en producción, sustituye los archivos `/etc/nginx/ssl/autodeploy.crt` y `.key` por un certificado de Let's Encrypt o de tu autoridad certificadora.

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

Verifica el secret `SSH_PRIVATE_KEY`: tiene que ser la clave privada **completa** incluyendo las líneas `-----BEGIN OPENSSH PRIVATE KEY-----` y `-----END OPENSSH PRIVATE KEY-----`. La clave pública correspondiente debe estar en `~/.ssh/authorized_keys` del usuario `SSH_USER` en el VPS.

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
