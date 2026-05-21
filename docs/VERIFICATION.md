# Verificación de red — AutoDeploy

Guía operativa para comprobar que un despliegue de AutoDeploy funciona correctamente desde el punto de vista de red: URLs, puertos, rutas, comunicación entre servicios y respuestas observables.

Las salidas reales recogidas en un despliegue concreto están en [`EVIDENCIA.md`](EVIDENCIA.md).

## Topología de puertos

| Puerto | Quién escucha | Quién publica | Quién consume |
|--------|---------------|---------------|---------------|
| `8082`/tcp (`HOST_PORT`) | nginx contenedor (frontend) | host | `nginx-host` del VPS o, en local, navegador directo |
| `2223`/tcp → contenedor `2222`/tcp | sshd (sandbox-ssh) | host | Backend (vía DNS Docker `sandbox-ssh:2222`) y usuarios externos que quieran probar el asistente IA. El `2222` del host lo ocupa el `sshd` del propio VPS |
| `8080`/tcp | Spring Boot (backend) | red Docker interna | solo nginx contenedor |
| `27017`/tcp | MongoDB | red Docker interna | solo backend |

En producción, **el `nginx-host` del VPS** termina TLS con Let's Encrypt y hace `proxy_pass http://localhost:8082`. Los puertos `8080` (backend) y `27017` (mongo) **NUNCA** se publican al host: están aislados en la red Docker `red-interna`.

## URLs principales

| URL | Servicio que responde | Auth |
|-----|------------------------|------|
| `https://autodeploy.kruhale.com/` | nginx → estáticos Angular (`index.html`) | No |
| `https://autodeploy.kruhale.com/app/dashboard` | Angular (SPA history fallback al index) | Cliente lee JWT del sessionStorage |
| `https://autodeploy.kruhale.com/api/usuarios/login` | nginx → backend | No |
| `https://autodeploy.kruhale.com/api/estado` | nginx → backend | No |
| `https://autodeploy.kruhale.com/api/servidores` | nginx → backend | **Bearer JWT obligatorio** |
| `https://autodeploy.kruhale.com/api/deploy/git` | nginx → backend | **Bearer JWT obligatorio** |
| `https://autodeploy.kruhale.com/swagger-ui.html` | nginx → backend (springdoc-openapi) | No |
| `https://autodeploy.kruhale.com/actuator/health` | nginx → backend (Spring Actuator) | No |
| `wss://autodeploy.kruhale.com/ws/terminal?servidorId=X` | nginx (upgrade) → backend | (token vía query) |

En local sin `nginx-host` por delante, sustituir `https://autodeploy.kruhale.com` por `http://localhost:8082`.

## Comandos de verificación

### 1. Estado de los contenedores

```bash
docker compose -f docker-compose.prod.yml ps
```

Debe mostrar 4 contenedores: tres con healthcheck (`Up (healthy)`) y el sandbox-ssh sin healthcheck definido (`Up`):

- `autodeploy-mongodb` — `(healthy)` cuando el ping a Mongo responde
- `autodeploy-backend` — `(healthy)` cuando `/actuator/health` responde 200
- `autodeploy-frontend` — `(healthy)` cuando `http://127.0.0.1/` responde (chequeado dentro del contenedor por el `HEALTHCHECK` del Dockerfile)
- `autodeploy-sandbox` — `Up` (la imagen `linuxserver/openssh-server` no expone healthcheck; el deploy lo recicla con `docker compose restart sandbox-ssh` en cada deploy)

### 2. Frontend en producción (TLS)

```bash
curl -sI https://autodeploy.kruhale.com/
```

Esperado: `HTTP/2 200`, `server: nginx`, `content-type: text/html`, `content-length` ≈ 11564. Sirve el `index.html` de Angular a través del `nginx-host` que termina TLS con Let's Encrypt.

### 3. Frontend en local (sin TLS)

```bash
curl -I http://localhost:8082/
```

Esperado: `HTTP/1.1 200 OK`, `Server: nginx`. El contenedor sirve HTTP plano en el puerto interno del host (`HOST_PORT=8082`).

### 4. API pública (sin auth)

```bash
curl -ks https://autodeploy.kruhale.com/api/estado | jq
```

Esperado: `{"success":true,"message":"OK","data":{"baseDeDatos":"OK",...}}`. Si `baseDeDatos: "ERROR"`, MongoDB no responde — revisa healthcheck.

### 5. API protegida sin token

```bash
curl -ksI https://autodeploy.kruhale.com/api/servidores
```

Esperado: `HTTP/2 403`. **Confirma que el JWT filter funciona**: sin Bearer, no se pasa.

### 6. API protegida con token válido

```bash
# Login → guardar token
LOGIN_BODY=$(jq -n --arg e "demo@test.com" --arg p "<tu-contrasena>" '{email:$e, password:$p}')
TOKEN=$(curl -s -X POST https://autodeploy.kruhale.com/api/usuarios/login \
  -H "Content-Type: application/json" \
  -d "$LOGIN_BODY" \
  | jq -r '.data.token')

# Petición con token
curl -ksI https://autodeploy.kruhale.com/api/servidores -H "Authorization: Bearer $TOKEN"
```

Esperado: `HTTP/2 200`.

### 7. Healthcheck del backend

```bash
curl -ks https://autodeploy.kruhale.com/actuator/health | jq
```

Esperado: `{"status":"UP","components":{"mongo":{"status":"UP"},...}}`. Si alguno está `DOWN`, ese servicio tiene problemas.

### 8. WebSocket handshake

```bash
curl -ks -I -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
     https://autodeploy.kruhale.com/ws/notificaciones/123
```

Esperado contra HTTP/1.1: `HTTP/1.1 101 Switching Protocols`. Con HTTP/2 sobre el dominio público se obtiene `HTTP/2 405` porque HTTP/2 no soporta `Upgrade`; los clientes reales (browsers, xterm.js) usan HTTP/1.1 para el handshake o WebTransport.

### 9. Comunicación interna nginx → backend

Desde dentro del contenedor de nginx:

```bash
docker exec autodeploy-frontend wget -qO- http://backend:8080/actuator/health
```

Esperado: el mismo JSON `{"status":"UP",...}`. Confirma que **la red Docker resuelve `backend` correctamente**.

### 10. Comunicación interna backend → mongodb

```bash
docker exec autodeploy-backend curl -fsS http://localhost:8080/actuator/health | jq '.components.mongo'
```

Si `status: UP`, el backend habla con MongoDB OK. Internamente usa la URL `mongodb://mongodb:27017/autodeploy`.

## Logs de los proxies

### Access log de nginx (peticiones HTTP)

```bash
docker exec autodeploy-frontend tail -f /var/log/nginx/access.log
```

Formato (combined):

```
172.18.0.1 - - [21/May/2026:14:33:02 +0000] "GET /api/estado HTTP/1.1" 200 524 "https://autodeploy.kruhale.com/app/dashboard" "Mozilla/5.0 ..."
```

### Error log de nginx (problemas de proxy / SSL)

```bash
docker exec autodeploy-frontend tail -f /var/log/nginx/error.log
```

### Log del backend (Spring Boot)

```bash
docker exec autodeploy-backend tail -f /var/log/autodeploy/backend.log
```

Formato:

```
2026-05-18 12:34:56.789 INFO  [http-nio-8080-exec-1] c.a.controller.UsuarioController - Login correcto para demo@test.com
```

### Log de MongoDB

```bash
docker logs autodeploy-mongodb --tail 50
```

## Prueba de carga ligera

Para verificar que el backend aguanta carga concurrente moderada:

```bash
# Apache Bench: 100 peticiones, 10 concurrentes, contra endpoint público
ab -n 100 -c 10 https://autodeploy.kruhale.com/api/estado

# Lectura típica de los números:
# - Requests per second: > 100 RPS para /api/estado (es muy ligero)
# - Time per request (mean): < 100 ms
# - Failed requests: 0
```

Si Failed > 0 o el tiempo medio supera 1s, revisa:

- `docker stats` — ¿el backend está al 100% CPU?
- `docker compose logs backend` — ¿hay errores de pool MongoDB?

Una versión más realista con autenticación:

```bash
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" https://autodeploy.kruhale.com/api/servidores
```

## Resolución de nombre y dominio

### Local (sin dominio real)

```bash
# Comprueba que localhost resuelve
getent hosts localhost
ping -c 1 localhost
```

### Con dominio en el VPS

```bash
# Comprueba que el A record resuelve a la IP del VPS
dig +short autodeploy.kruhale.com
# 217.160.204.238

# Petición externa
curl -sI https://autodeploy.kruhale.com/
# HTTP/2 200, server: nginx

# Verifica el certificado TLS (Let's Encrypt)
echo | openssl s_client -connect autodeploy.kruhale.com:443 \
    -servername autodeploy.kruhale.com 2>/dev/null \
    | grep -E "subject=|issuer=|Verify return code"
# subject=CN=autodeploy.kruhale.com
# issuer=C=US, O=Let's Encrypt, CN=E7
# Verify return code: 0 (ok)
```

El TLS lo termina el `nginx-host` del VPS con cert Let's Encrypt centralizado (renovación automática vía `certbot.timer`). El contenedor sólo sirve HTTP en `localhost:8082`.

### Resolución dentro de la red Docker

Los nombres `backend`, `frontend`, `mongodb` son **DNS interno de Docker**: solo resuelven dentro de la red `red-interna`. Comprueba con:

```bash
docker exec autodeploy-backend getent hosts mongodb
# 172.18.0.2     mongodb.red-interna
```

## Tabla resumen: qué responde cada servicio

| Petición | Pasos internos | Servicio final que responde |
|----------|----------------|------------------------------|
| `GET /` | nginx sirve `index.html` desde `/usr/share/nginx/html` | nginx |
| `GET /app/dashboard` | nginx → `try_files` → cae al `index.html` (history fallback) | nginx |
| `GET /api/estado` | nginx → `proxy_pass http://backend:8080/api/estado` → Spring lee el ping a Mongo | backend (+ mongo) |
| `GET /actuator/health` | nginx → `proxy_pass http://backend:8080/actuator/health` | backend (Spring Actuator) |
| `GET /swagger-ui.html` | nginx → `proxy_pass http://backend:8080/swagger-ui.html` | backend (springdoc) |
| `WSS /ws/terminal` | nginx upgrade → backend → MINA SSHD → VPS remoto :22 | backend ↔ VPS remoto |

## Qué significa cada estado en `docker compose ps`

| Estado | Significado |
|--------|-------------|
| `created` | El contenedor está definido pero no se ha arrancado |
| `running` | Proceso principal en ejecución (PID 1 vivo) |
| `running (healthy)` | + healthcheck OK los últimos N intentos |
| `running (unhealthy)` | Proceso vivo pero healthcheck falla. Revisar logs |
| `running (starting)` | En periodo de gracia inicial; healthcheck aún no se ha ejecutado |
| `exited (0)` | Terminó correctamente |
| `exited (1)` o más | Crash. `docker logs <name>` muestra el motivo |
| `restarting` | En bucle de reinicio; suele indicar config rota |

## Anti-patrón: NO acceder al backend directamente

Hubo una versión inicial donde el backend exponía `8080` al host (`"8080:8080"`). Esto se ha eliminado por varias razones:

1. **Salta el TLS** que termina el `nginx-host` en producción.
2. **Salta los headers** `X-Forwarded-*` que nginx inyecta: el backend recibiría la IP del Docker daemon en lugar de la del cliente real.
3. **Salta rate limiting / CORS** que se puedan configurar en nginx en el futuro.
4. **No usa la URL canónica** del producto.

Para diagnóstico interno (no producción) se puede entrar al contenedor del backend:

```bash
docker exec -it autodeploy-backend curl -fsS http://localhost:8080/api/estado
```
