# Verificación de red — AutoDeploy

Guía operativa para comprobar que un despliegue de AutoDeploy funciona correctamente desde el punto de vista de red: URLs, puertos, rutas, comunicación entre servicios y respuestas observables.

Las salidas reales recogidas en un despliegue concreto están en [`EVIDENCIA.md`](EVIDENCIA.md).

## Topología de puertos

| Puerto | Quién escucha | Quién publica | Quién consume |
|--------|---------------|---------------|---------------|
| `80`/tcp | nginx (frontend) | host | Internet (redirige a 443) |
| `443`/tcp | nginx (frontend) | host | Internet (UI + API + WS) |
| `8080`/tcp | Spring Boot (backend) | red Docker interna | solo nginx |
| `27017`/tcp | MongoDB | red Docker interna | solo backend |

**Solo los puertos 80 y 443 están abiertos al host**. Backend y MongoDB son inaccesibles desde fuera del host por diseño.

## URLs principales

| URL | Servicio que responde | Auth |
|-----|------------------------|------|
| `https://<host>/` | nginx → estáticos Angular (`index.html`) | No |
| `https://<host>/app/dashboard` | Angular (SPA history fallback al index) | Cliente lee JWT del sessionStorage |
| `https://<host>/api/usuarios/login` | nginx → backend | No |
| `https://<host>/api/estado` | nginx → backend | No |
| `https://<host>/api/servidores` | nginx → backend | **Bearer JWT obligatorio** |
| `https://<host>/api/deploy/git` | nginx → backend | **Bearer JWT obligatorio** |
| `https://<host>/swagger-ui.html` | nginx → backend (springdoc-openapi) | No |
| `https://<host>/actuator/health` | nginx → backend (Spring Actuator) | No |
| `wss://<host>/ws/terminal?servidorId=X` | nginx (upgrade) → backend | (token vía query) |

## Comandos de verificación

### 1. Estado de los contenedores

```bash
docker compose -f docker-compose.prod.yml ps
```

Debe mostrar 3 servicios `Up (healthy)`:

- `autodeploy-mongodb` — `(healthy)` cuando el ping a Mongo responde
- `autodeploy-backend` — `(healthy)` cuando `/actuator/health` responde 200
- `autodeploy-frontend` — `(healthy)` cuando `https://localhost/` responde

### 2. Redirect HTTP → HTTPS

```bash
curl -I http://localhost/
```

Esperado: `HTTP/1.1 301 Moved Permanently` con `Location: https://localhost/`. Comprueba que nginx **fuerza HTTPS**.

### 3. Frontend Angular

```bash
curl -ksI https://localhost/
```

Esperado: `HTTP/2 200` con `content-type: text/html`. Sirve el `index.html` de Angular.

### 4. API pública (sin auth)

```bash
curl -ks https://localhost/api/estado | jq
```

Esperado: `{"success":true,"message":"OK","data":{"baseDeDatos":"OK",...}}`. Si `baseDeDatos: "ERROR"`, MongoDB no responde — revisa healthcheck.

### 5. API protegida sin token

```bash
curl -ksI https://localhost/api/servidores
```

Esperado: `HTTP/2 403`. **Confirma que el JWT filter funciona**: sin Bearer, no se pasa.

### 6. API protegida con token válido

```bash
# Login → guardar token
TOKEN=$(curl -ks -X POST https://localhost/api/usuarios/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"Demo1234!"}' \
  | jq -r '.data.token')

# Petición con token
curl -ksI https://localhost/api/servidores -H "Authorization: Bearer $TOKEN"
```

Esperado: `HTTP/2 200`.

### 7. Healthcheck del backend

```bash
curl -ks https://localhost/actuator/health | jq
```

Esperado: `{"status":"UP","components":{"mongo":{"status":"UP"},...}}`. Si alguno está `DOWN`, ese servicio tiene problemas.

### 8. WebSocket handshake

```bash
curl -ks -I -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
     https://localhost/ws/notificaciones/123
```

Esperado: `HTTP/1.1 101 Switching Protocols` (con un token válido pasaríamos al WS). Comprueba que nginx **proxifica con upgrade**.

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
192.168.65.1 - - [18/May/2026:12:34:56 +0000] "GET /api/estado HTTP/2.0" 200 142 "https://localhost/app/dashboard" "Mozilla/5.0 ..."
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
ab -n 100 -c 10 https://localhost/api/estado

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
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" https://localhost/api/servidores
```

## Resolución de nombre y dominio

### Local (sin dominio real)

```bash
# Comprueba que localhost resuelve
getent hosts localhost
ping -c 1 localhost
```

### Con dominio en el VPS

Antes de levantar el stack en un VPS con dominio:

```bash
# Comprueba que el A record resuelve a la IP correcta
dig +short autodeploy.midominio.com
# 1.2.3.4

# Desde fuera del VPS
curl -ksI https://autodeploy.midominio.com/
```

Si el navegador se queja de cert no válido es porque el cert es autofirmado (`CN=autodeploy.local`). Para uso real conviene sustituir `/etc/nginx/ssl/autodeploy.crt` y `.key` por un cert de Let's Encrypt:

```bash
docker run --rm -it -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly --standalone -d autodeploy.midominio.com
```

Después monta los `.pem` en el contenedor nginx y reinicia.

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

1. **Salta el TLS**: las peticiones irían en HTTP plano.
2. **Salta los headers** `X-Forwarded-*`: el backend recibe IP del Docker daemon, no del cliente real.
3. **Salta el rate limiting / CORS / etc.** que se podría configurar en nginx en el futuro.
4. **No usa la URL canónica** del producto.

Para hacer pruebas internas (no producción) y bypass del proxy, se puede entrar al contenedor:

```bash
docker exec -it autodeploy-backend bash
curl -fsS http://localhost:8080/api/estado
```
