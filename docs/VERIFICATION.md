# Network verification — AutoDeploy

Operational guide to verify that an AutoDeploy deployment works correctly from the network point of view: URLs, ports, routes, inter-service communication, and observable responses.

## Port topology

| Port | Who listens | Who publishes | Who consumes |
|--------|---------------|---------------|---------------|
| `8082`/tcp (`HOST_PORT`) | nginx container (frontend) | host | the VPS `nginx-host`, or the browser directly in local setups |
| `2223`/tcp → container `2222`/tcp | sshd (sandbox-ssh) | host | Backend (via Docker DNS `sandbox-ssh:2222`) and external users who want to try the AI assistant. Host port `2222` is taken by the VPS's own `sshd` |
| `8080`/tcp | Spring Boot (backend) | internal Docker network | nginx container only |
| `27017`/tcp | MongoDB | internal Docker network | backend only |

In production, **the VPS `nginx-host`** terminates TLS with Let's Encrypt and does `proxy_pass http://localhost:8082`. Ports `8080` (backend) and `27017` (mongo) are **NEVER** published to the host: they are isolated inside the `red-interna` Docker network.

## Main URLs

| URL | Responding service | Auth |
|-----|------------------------|------|
| `https://autodeploy.kruhale.com/` | nginx → Angular static assets (`index.html`) | No |
| `https://autodeploy.kruhale.com/app/dashboard` | Angular (SPA history fallback to index) | Client reads JWT from sessionStorage |
| `https://autodeploy.kruhale.com/api/usuarios/login` | nginx → backend | No |
| `https://autodeploy.kruhale.com/api/estado` | nginx → backend | No |
| `https://autodeploy.kruhale.com/api/servidores` | nginx → backend | **Bearer JWT required** |
| `https://autodeploy.kruhale.com/api/deploy/git` | nginx → backend | **Bearer JWT required** |
| `https://autodeploy.kruhale.com/swagger-ui.html` | nginx → backend (springdoc-openapi) | No |
| `https://autodeploy.kruhale.com/actuator/health` | nginx → backend (Spring Actuator) | No |
| `wss://autodeploy.kruhale.com/ws/terminal?servidorId=X` | nginx (upgrade) → backend | (token via query) |

For a local setup without `nginx-host` in front, replace `https://autodeploy.kruhale.com` with `http://localhost:8082`.

## Verification commands

### 1. Container status

```bash
docker compose -f docker-compose.prod.yml ps
```

It should show 4 containers: three with a healthcheck (`Up (healthy)`) and sandbox-ssh with no healthcheck defined (`Up`):

- `autodeploy-mongodb` — `(healthy)` when the Mongo ping responds
- `autodeploy-backend` — `(healthy)` when `/actuator/health` returns 200
- `autodeploy-frontend` — `(healthy)` when `http://127.0.0.1/` responds (checked inside the container by the Dockerfile's `HEALTHCHECK`)
- `autodeploy-sandbox` — `Up` (the `linuxserver/openssh-server` image ships no healthcheck; the deploy recycles it with `docker compose restart sandbox-ssh` on every deploy)

### 2. Frontend in production (TLS)

```bash
curl -sI https://autodeploy.kruhale.com/
```

Expected: `HTTP/2 200`, `server: nginx`, `content-type: text/html`, `content-length` ≈ 11564. It serves the Angular `index.html` through the `nginx-host` that terminates TLS with Let's Encrypt.

### 3. Frontend locally (no TLS)

```bash
curl -I http://localhost:8082/
```

Expected: `HTTP/1.1 200 OK`, `Server: nginx`. The container serves plain HTTP on the host-side port (`HOST_PORT=8082`).

### 4. Public API (no auth)

```bash
curl -ks https://autodeploy.kruhale.com/api/estado | jq
```

Expected: `{"success":true,"message":"OK","data":{"baseDeDatos":"OK",...}}`. If `baseDeDatos: "ERROR"`, MongoDB is not responding — check its healthcheck.

### 5. Protected API without a token

```bash
curl -ksI https://autodeploy.kruhale.com/api/servidores
```

Expected: `HTTP/2 403`. **This confirms the JWT filter works**: no Bearer, no access.

### 6. Protected API with a valid token

```bash
# Login → store the token
LOGIN_BODY=$(jq -n --arg e "demo@test.com" --arg p "<your-password>" '{email:$e, password:$p}')
TOKEN=$(curl -s -X POST https://autodeploy.kruhale.com/api/usuarios/login \
  -H "Content-Type: application/json" \
  -d "$LOGIN_BODY" \
  | jq -r '.data.token')

# Request with the token
curl -ksI https://autodeploy.kruhale.com/api/servidores -H "Authorization: Bearer $TOKEN"
```

Expected: `HTTP/2 200`.

### 7. Backend healthcheck

```bash
curl -ks https://autodeploy.kruhale.com/actuator/health | jq
```

Expected: `{"status":"UP","components":{"mongo":{"status":"UP"},...}}`. If any component is `DOWN`, that service has a problem.

### 8. WebSocket handshake

```bash
curl -ks -I -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
     https://autodeploy.kruhale.com/ws/notificaciones/123
```

Expected over HTTP/1.1: `HTTP/1.1 101 Switching Protocols`. Over HTTP/2 on the public domain you get `HTTP/2 405` because HTTP/2 does not support `Upgrade`; real clients (browsers, xterm.js) use HTTP/1.1 for the handshake, or WebTransport.

### 9. Internal communication nginx → backend

From inside the nginx container:

```bash
docker exec autodeploy-frontend wget -qO- http://backend:8080/actuator/health
```

Expected: the same `{"status":"UP",...}` JSON. This confirms that **the Docker network resolves `backend` correctly**.

### 10. Internal communication backend → mongodb

```bash
docker exec autodeploy-backend curl -fsS http://localhost:8080/actuator/health | jq '.components.mongo'
```

If `status: UP`, the backend talks to MongoDB correctly. Internally it uses the URL `mongodb://mongodb:27017/autodeploy`.

## Proxy logs

### nginx access log (HTTP requests)

```bash
docker exec autodeploy-frontend tail -f /var/log/nginx/access.log
```

Format (combined):

```
172.18.0.1 - - [21/May/2026:14:33:02 +0000] "GET /api/estado HTTP/1.1" 200 524 "https://autodeploy.kruhale.com/app/dashboard" "Mozilla/5.0 ..."
```

### nginx error log (proxy / SSL problems)

```bash
docker exec autodeploy-frontend tail -f /var/log/nginx/error.log
```

### Backend log (Spring Boot)

```bash
docker exec autodeploy-backend tail -f /var/log/autodeploy/backend.log
```

Format:

```
2026-05-18 12:34:56.789 INFO  [http-nio-8080-exec-1] c.a.controller.UsuarioController - Login correcto para demo@test.com
```

### MongoDB log

```bash
docker logs autodeploy-mongodb --tail 50
```

## Light load test

To verify that the backend handles moderate concurrent load:

```bash
# Apache Bench: 100 requests, 10 concurrent, against a public endpoint
ab -n 100 -c 10 https://autodeploy.kruhale.com/api/estado

# How to read the numbers:
# - Requests per second: > 100 RPS for /api/estado (it is very lightweight)
# - Time per request (mean): < 100 ms
# - Failed requests: 0
```

If Failed > 0 or the mean time exceeds 1s, check:

- `docker stats` — is the backend at 100% CPU?
- `docker compose logs backend` — any MongoDB pool errors?

A more realistic version with authentication:

```bash
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" https://autodeploy.kruhale.com/api/servidores
```

## Name resolution and domain

### Local (no real domain)

```bash
# Verify that localhost resolves
getent hosts localhost
ping -c 1 localhost
```

### With a domain on the VPS

```bash
# Verify that the A record resolves to the VPS IP
dig +short autodeploy.kruhale.com
# 217.160.204.238

# External request
curl -sI https://autodeploy.kruhale.com/
# HTTP/2 200, server: nginx

# Verify the TLS certificate (Let's Encrypt)
echo | openssl s_client -connect autodeploy.kruhale.com:443 \
    -servername autodeploy.kruhale.com 2>/dev/null \
    | grep -E "subject=|issuer=|Verify return code"
# subject=CN=autodeploy.kruhale.com
# issuer=C=US, O=Let's Encrypt, CN=E7
# Verify return code: 0 (ok)
```

TLS is terminated by the VPS `nginx-host` with a centralized Let's Encrypt certificate (auto-renewal via `certbot.timer`). The container only serves HTTP on `localhost:8082`.

### Resolution inside the Docker network

The names `backend`, `frontend`, and `mongodb` are **internal Docker DNS**: they only resolve inside the `red-interna` network. Check with:

```bash
docker exec autodeploy-backend getent hosts mongodb
# 172.18.0.2     mongodb.red-interna
```

## Summary table: which service answers what

| Request | Internal steps | Final responding service |
|----------|----------------|------------------------------|
| `GET /` | nginx serves `index.html` from `/usr/share/nginx/html` | nginx |
| `GET /app/dashboard` | nginx → `try_files` → falls back to `index.html` (history fallback) | nginx |
| `GET /api/estado` | nginx → `proxy_pass http://backend:8080/api/estado` → Spring pings Mongo | backend (+ mongo) |
| `GET /actuator/health` | nginx → `proxy_pass http://backend:8080/actuator/health` | backend (Spring Actuator) |
| `GET /swagger-ui.html` | nginx → `proxy_pass http://backend:8080/swagger-ui.html` | backend (springdoc) |
| `WSS /ws/terminal` | nginx upgrade → backend → MINA SSHD → remote VPS :22 | backend ↔ remote VPS |

## What each `docker compose ps` state means

| State | Meaning |
|--------|-------------|
| `created` | The container is defined but has not been started |
| `running` | Main process running (PID 1 alive) |
| `running (healthy)` | + healthcheck OK for the last N attempts |
| `running (unhealthy)` | Process alive but the healthcheck fails. Check the logs |
| `running (starting)` | Within the initial grace period; the healthcheck has not run yet |
| `exited (0)` | Terminated cleanly |
| `exited (1)` or higher | Crash. `docker logs <name>` shows the reason |
| `restarting` | Restart loop; usually indicates broken configuration |

## Anti-pattern: do NOT access the backend directly

An early version published backend port `8080` on the host (`"8080:8080"`). This was removed for several reasons:

1. **It bypasses TLS**, which `nginx-host` terminates in production.
2. **It bypasses the `X-Forwarded-*` headers** nginx injects: the backend would see the Docker daemon's IP instead of the real client's.
3. **It bypasses any rate limiting / CORS** that may be configured in nginx in the future.
4. **It does not use the product's canonical URL**.

For internal diagnostics (not production) you can exec into the backend container:

```bash
docker exec -it autodeploy-backend curl -fsS http://localhost:8080/api/estado
```
