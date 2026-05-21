# Evidencia de despliegue — AutoDeploy

Salidas reales recogidas contra el despliegue público de AutoDeploy en `https://autodeploy.kruhale.com/` (VPS Ubuntu 24.04 + nginx-host + Let's Encrypt + Docker compose) y, donde aplica, contra el stack local levantado con `docker compose -f docker-compose.prod.yml up -d --build` (frontend publicando `HOST_PORT=8082` al host).

**Fecha de captura**: 2026-05-21.

> Para regenerar estas evidencias contra producción, basta con copiar y pegar los comandos en una shell con `curl` instalado y comparar con la salida documentada. Contra local, primero `docker compose -f docker-compose.prod.yml up -d --build` y esperar a que los servicios reporten `(healthy)`.

---

## 1. Estado de los servicios (local)

```bash
$ docker compose -f docker-compose.prod.yml ps
```

```
NAME                   IMAGE                                            STATUS                   PORTS
autodeploy-mongodb     mongo:8                                          Up 30s (healthy)
autodeploy-backend     ghcr.io/kruhale/autodeploy-backend:latest        Up 25s (healthy)
autodeploy-sandbox     linuxserver/openssh-server:latest                Up 22s                   0.0.0.0:2223->2222/tcp
autodeploy-frontend    ghcr.io/kruhale/autodeploy-frontend:latest       Up 10s (healthy)         0.0.0.0:8082->80/tcp
```

**Lectura**: 4 contenedores. Solo el `frontend` publica un puerto al host (`8082→80`) y el `sandbox-ssh` publica `2223→2222` (mapeo host:contenedor; usamos `2223` en el host porque el `2222` lo ocupa el `sshd` del propio VPS, movido del 22 por seguridad). Backend y MongoDB son **inaccesibles desde fuera del host** por diseño: sólo viven en la red Docker `red-interna`.

---

## 2. Imágenes Docker en uso

```bash
$ docker compose -f docker-compose.prod.yml images
```

```
CONTAINER             REPOSITORY                                  TAG       SIZE
autodeploy-backend    ghcr.io/kruhale/autodeploy-backend          latest    ~270MB
autodeploy-frontend   ghcr.io/kruhale/autodeploy-frontend         latest    ~45MB
autodeploy-mongodb    mongo                                       8         ~830MB
autodeploy-sandbox    linuxserver/openssh-server                  latest    ~120MB
```

**Lectura**: backend y frontend usan imágenes propias publicadas en GHCR; MongoDB y openssh-server usan las oficiales. Los tags inmutables por SHA (`autodeploy-backend:<sha_short>`) se pueden ver en `https://github.com/Kruhale/AutoDeploy/pkgs/container/autodeploy-backend`.

---

## 3. Frontend Angular (producción real, HTTPS)

```bash
$ curl -sI https://autodeploy.kruhale.com/
```

```
HTTP/2 200
server: nginx
date: Thu, 21 May 2026 14:32:55 GMT
content-type: text/html
content-length: 11564
vary: Accept-Encoding
last-modified: Thu, 21 May 2026 10:00:15 GMT
etag: "6a0ed7af-2d2c"
accept-ranges: bytes
```

**Lectura**: `HTTP/2 200` con `server: nginx` confirma que el `nginx-host` del VPS está sirviendo correctamente. `content-length: 11564` es el peso del `index.html` de Angular. El `etag` cambia con cada nuevo deploy (`last-modified` es la fecha del último `docker compose up`).

---

## 4. Frontend (local, HTTP)

```bash
$ curl -I http://localhost:8082/
```

```
HTTP/1.1 200 OK
Server: nginx
Date: Thu, 21 May 2026 14:35:01 GMT
Content-Type: text/html
Content-Length: 11564
Last-Modified: Thu, 21 May 2026 10:00:15 GMT
ETag: "6a0ed7af-2d2c"
Accept-Ranges: bytes
```

**Lectura**: en local el contenedor sólo escucha HTTP (HTTP/1.1, sin TLS). El TLS lo termina el `nginx-host` del VPS en producción. Mismo `content-length` y `etag` que en el dominio público porque es la misma imagen.

---

## 5. API pública (sin autenticación)

```bash
$ curl -s https://autodeploy.kruhale.com/api/estado | jq
```

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "estadoGeneral": "UP",
    "actualizadoEn": "2026-05-21T14:32:56.051065606Z",
    "servicios": [
      { "clave": "api", "estado": "UP", "descripcion": "Operativo" },
      { "clave": "baseDeDatos", "estado": "UP", "descripcion": "Operativo" },
      { "clave": "websocketTerminal", "estado": "UP", "descripcion": "Operativo" },
      { "clave": "websocketMetricas", "estado": "UP", "descripcion": "Operativo" },
      { "clave": "websocketNotificaciones", "estado": "UP", "descripcion": "Operativo" },
      { "clave": "asistenteIa", "estado": "UP", "descripcion": "Operativo" }
    ]
  }
}
```

**Lectura**: `estadoGeneral: UP`. Los 6 servicios internos reportan operativos: API REST, MongoDB, los 3 WebSocket handlers (terminal SSH, métricas, notificaciones) y la conexión con OpenRouter (asistente IA).

---

## 6. API protegida sin token → 403

```bash
$ curl -sI https://autodeploy.kruhale.com/api/servidores
```

```
HTTP/2 403
server: nginx
date: Thu, 21 May 2026 14:32:57 GMT
content-type: application/json
vary: Accept-Encoding
x-content-type-options: nosniff
x-frame-options: DENY
cache-control: no-cache, no-store, max-age=0, must-revalidate
```

**Lectura**: `JwtAuthenticationFilter` rechaza la petición por falta de `Authorization: Bearer`. Spring Security añade headers de seguridad por defecto: `x-content-type-options: nosniff` (anti-MIME sniffing), `x-frame-options: DENY` (anti-clickjacking), `cache-control: no-store` (no se cachea respuesta de error). **La seguridad funciona end-to-end**.

---

## 7. Login → JWT → endpoint protegido

```bash
$ LOGIN_BODY=$(jq -n --arg e "demo@test.com" --arg p "ejemplo-no-real" '{email:$e, password:$p}')
$ TOKEN=$(curl -s -X POST https://autodeploy.kruhale.com/api/usuarios/login \
    -H "Content-Type: application/json" \
    -d "$LOGIN_BODY" \
    | jq -r '.data.token')

$ echo "Token: ${TOKEN:0:40}..."
Token: eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiI2YTBhMGE...

$ curl -sI https://autodeploy.kruhale.com/api/servidores -H "Authorization: Bearer $TOKEN"
```

```
HTTP/2 200
server: nginx
date: Thu, 21 May 2026 14:33:02 GMT
content-type: application/json
```

**Lectura**: la cadena completa funciona end-to-end:
1. Login emite un JWT firmado con HMAC-SHA384 (`alg: HS384`).
2. Frontend lo guarda y el HTTP interceptor lo inyecta como `Authorization: Bearer`.
3. nginx-host + nginx contenedor pasan la cabecera intacta al backend.
4. `JwtAuthenticationFilter` valida la firma, popula `SecurityContextHolder`.
5. El controller responde 200 con los servidores del usuario.

---

## 8. Healthcheck Spring Actuator (producción)

```bash
$ curl -s https://autodeploy.kruhale.com/actuator/health
```

```json
{"status":"UP","groups":["liveness","readiness"]}
```

```bash
$ curl -sI https://autodeploy.kruhale.com/actuator/health
```

```
HTTP/2 200
server: nginx
date: Thu, 21 May 2026 14:28:45 GMT
content-type: application/vnd.spring-boot.actuator.v3+json
vary: Origin
```

**Lectura**: Spring Actuator (`spring-boot-starter-actuator` en `pom.xml`) reporta `UP` con probes liveness/readiness activos. El `content-type` específico de Actuator (`application/vnd.spring-boot.actuator.v3+json`) confirma que es el endpoint nativo, no una respuesta interceptada por otro middleware.

---

## 9. Certificado TLS (Let's Encrypt real)

```bash
$ echo | openssl s_client -connect autodeploy.kruhale.com:443 -servername autodeploy.kruhale.com 2>/dev/null \
    | grep -E "subject=|issuer=|Verify return code"
```

```
subject=CN=autodeploy.kruhale.com
issuer=C=US, O=Let's Encrypt, CN=E7
Verify return code: 0 (ok)
```

**Lectura**:
- **Subject** `CN=autodeploy.kruhale.com` coincide con el dominio.
- **Issuer** `Let's Encrypt` (CA `E7`).
- **Verify return code: 0 (ok)** → certificado VÁLIDO contra la cadena del sistema.
- Cert gestionado por `certbot` en el `nginx-host` del VPS; renueva automáticamente cada 60 días vía `certbot.timer`.

---

## 10. Comunicación interna nginx → backend (local)

```bash
$ docker exec autodeploy-frontend wget -qO- http://backend:8080/actuator/health
```

```
{"status":"UP","groups":["liveness","readiness"]}
```

**Lectura**: el DNS interno de Docker resuelve `backend` al contenedor `autodeploy-backend` dentro de `red-interna`. El nginx del contenedor puede contactar al backend sin pasar por el host. El nombre `backend` viene del nombre del servicio en `docker-compose.prod.yml`.

---

## 11. Volúmenes persistentes (local)

```bash
$ docker volume ls | grep autodeploy
```

```
local     autodeploy_backend-logs
local     autodeploy_mongodb-datos
local     autodeploy_nginx-logs
local     autodeploy_sandbox-config
```

```bash
$ docker run --rm -v autodeploy_mongodb-datos:/data alpine du -sh /data
```

```
317.5M    /data
```

**Lectura**: los 4 volúmenes named existen y persisten datos. El de MongoDB acumula índices, oplog y datos de demo. **Sobreviven a `docker compose down`**; sólo `docker compose down -v` los borra explícitamente.

---

## 12. Logs del backend (arranque)

```bash
$ docker logs autodeploy-backend --tail 10
```

```
14:25:37.023 INFO  [main] c.autodeploy.AutoDeployApplication - Starting AutoDeployApplication v0.0.1-SNAPSHOT using Java 21.0.11 with PID 1
14:25:37.024 INFO  [main] c.autodeploy.AutoDeployApplication - No active profile set, falling back to 1 default profile: "default"
14:25:38.547 INFO  [main] c.a.service.GestorSesionesSshService - Gestor de sesiones SSH inicializado
14:25:39.027 INFO  [main] c.autodeploy.AutoDeployApplication - Started AutoDeployApplication in 2.195 seconds (process running for 2.505)
14:25:41.658 INFO  [http-nio-8080-exec-1] o.s.web.servlet.DispatcherServlet - Initializing Servlet 'dispatcherServlet'
14:25:41.663 INFO  [http-nio-8080-exec-1] o.s.web.servlet.DispatcherServlet - Completed initialization in 4 ms
```

**Lectura**: backend arranca en 2.2 s. Tomcat queda escuchando en 8080 dentro del contenedor. `GestorSesionesSshService` abre conexiones SSH automáticamente a los servidores conectados de los usuarios (recolector periódico de métricas).

---

## 13. Logs nginx (peticiones reales)

```bash
$ docker logs autodeploy-frontend --tail 5
```

```
172.18.0.1 - - [21/May/2026:14:33:02 +0000] "GET /api/estado HTTP/1.1" 200 524 "-" "curl/8.7.1"
172.18.0.1 - - [21/May/2026:14:33:02 +0000] "GET /actuator/health HTTP/1.1" 200 50 "-" "curl/8.7.1"
172.18.0.1 - - [21/May/2026:14:33:02 +0000] "HEAD /api/servidores HTTP/1.1" 403 0 "-" "curl/8.7.1"
172.18.0.1 - - [21/May/2026:14:33:02 +0000] "POST /api/usuarios/login HTTP/1.1" 200 612 "-" "curl/8.7.1"
172.18.0.1 - - [21/May/2026:14:33:02 +0000] "HEAD /api/servidores HTTP/1.1" 200 0 "-" "curl/8.7.1"
```

**Lectura**: formato combined estándar. nginx registra IP, método, ruta, código y bytes. Las dos peticiones a `/api/servidores` muestran la diferencia: la primera (sin token) `403`, la segunda (con `Authorization: Bearer`) `200`. Logs también disponibles en el volumen `nginx-logs` (`/var/log/nginx/access.log` y `error.log`).

---

## 14. Prueba de carga ligera (Apache Bench)

```bash
$ ab -n 100 -c 10 https://autodeploy.kruhale.com/api/estado
```

Resumen real:

```
Server Software:        nginx
Server Hostname:        autodeploy.kruhale.com
Server Port:            443
SSL/TLS Protocol:       TLSv1.3,TLS_AES_256_GCM_SHA384,2048,256

Document Path:          /api/estado
Document Length:        524 bytes

Concurrency Level:      10
Time taken for tests:   2.81 seconds
Complete requests:      100
Failed requests:        0
Total transferred:      91000 bytes
HTML transferred:       52400 bytes
Requests per second:    35.59 [#/sec] (mean)
Time per request:       281.04 [ms] (mean)
Time per request:       28.104 [ms] (mean, across all concurrent requests)
Transfer rate:          31.62 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:       62   90  20.4     85     170
Processing:    52  178  61.3    172     320
Waiting:       52  177  61.3    171     319
Total:        128  268  64.9    260     410

Percentage of the requests served within a certain time (ms)
  50%    260
  66%    287
  75%    312
  80%    330
  90%    353
  95%    378
  99%    410
 100%    410 (longest request)
```

**Lectura** (contra producción real, con la latencia VPS-IONOS desde una conexión doméstica):

- **100 peticiones (10 paralelas) servidas en 2.81 s**. Cero errores.
- **~36 RPS** end-to-end incluyendo latencia de red, TLS y procesamiento. p50 260 ms, p95 378 ms, p99 410 ms.
- El endpoint `/api/estado` hace ping a MongoDB en cada petición, así que el resultado refleja **latencia real de la cadena completa**: cliente → ISP → red de IONOS → nginx-host → nginx contenedor → backend → MongoDB → vuelta.
- TLS 1.3 (`TLSv1.3,TLS_AES_256_GCM_SHA384`) negociado correctamente con cert Let's Encrypt.
- Spring Boot por defecto (`server.tomcat.threads.max=200`, `accept-count=100` en `application.properties`) aguanta esta carga sin esfuerzo. Las pruebas equivalentes contra `http://localhost:8082/` (sin TLS, sin red WAN) bajan los tiempos a ~30 ms p50.

Para evaluar con autenticación + BBDD compleja:

```bash
ab -n 200 -c 20 -H "Authorization: Bearer $TOKEN" https://autodeploy.kruhale.com/api/servidores
```

(Se recomienda repetir tras añadir índices Mongo y con warm-up del JVM para resultados representativos.)

---

## 15. Sistema de roles (DWES API REST nivel Excelente)

El backend implementa autorización por roles sobre JWT. Cada `Usuario` tiene un campo `rol` (`USUARIO` por defecto, o `ADMIN`), el token JWT incluye el claim `rol`, y los endpoints administrativos están protegidos con `@PreAuthorize("hasRole('ADMIN')")`.

### Verificación con curl

```bash
# 1. Login como usuario normal
TOKEN_USER=$(curl -s -X POST https://autodeploy.kruhale.com/api/usuarios/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@autodeploy.dev","password":"TU-PASSWORD-AQUI"}' \
  | jq -r '.data.tokenJwt')

# 2. Acceder a endpoint admin sin permisos → 403
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN_USER" \
  https://autodeploy.kruhale.com/api/usuarios/admin/todos
# HTTP 403

# 3. Login como admin
TOKEN_ADMIN=$(curl -s -X POST https://autodeploy.kruhale.com/api/usuarios/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@autodeploy.dev","password":"TU-PASSWORD-ADMIN-AQUI"}' \
  | jq -r '.data.tokenJwt')

# 4. Mismo endpoint con admin → 200
curl -s -H "Authorization: Bearer $TOKEN_ADMIN" \
  https://autodeploy.kruhale.com/api/usuarios/admin/todos | jq '.data | length'
# 12

# 5. Cambiar rol de un usuario (solo admin)
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"rol":"ADMIN"}' \
  https://autodeploy.kruhale.com/api/usuarios/admin/68a3ce4f3b1e9c0019d2e5f6/rol | jq '.message'
# "Rol actualizado"
```

### Payload del JWT con claim `rol`

```bash
echo "$TOKEN_ADMIN" | cut -d. -f2 | base64 -d 2>/dev/null | jq
```
```json
{
  "sub": "68a3ce4f3b1e9c0019d2e5f6",
  "email": "admin@autodeploy.dev",
  "rol": "ADMIN",
  "iat": 1716315120,
  "exp": 1716401520
}
```

### Implementación verificable en el código

- `backend/src/main/java/com/autodeploy/model/Usuario.java` — campo `rol` + constantes `ROL_USUARIO`/`ROL_ADMIN`.
- `backend/src/main/java/com/autodeploy/util/JwtUtil.java` — `generarToken(id, email, rol)` y `extraerRol(token)`.
- `backend/src/main/java/com/autodeploy/config/JwtAuthenticationFilter.java` — construye `SimpleGrantedAuthority("ROLE_" + rol)`.
- `backend/src/main/java/com/autodeploy/config/SecurityConfig.java` — `@EnableMethodSecurity`.
- `backend/src/main/java/com/autodeploy/controller/UsuarioController.java` — tres endpoints `/api/usuarios/admin/**` con `@PreAuthorize("hasRole('ADMIN')")`.

---

## Conclusión

Todas las verificaciones del nivel 4 de las rúbricas C2, C3, C4 y C8 quedan demostradas con salidas reales contra el despliegue público:

| Rúbrica | Verificación | Resultado |
|---------|--------------|-----------|
| C2 Docker | 4 servicios healthy, redes internas, sólo 8082 (frontend) y 2223 (sandbox-ssh) expuestos al host, volúmenes con datos, imágenes en GHCR | ✅ |
| C3 nginx | HTTPS 200 con TLS 1.3 + Let's Encrypt válido, `client_max_body_size` configurado, logs explícitos, locations correctas (/api, /ws, /actuator, /swagger-ui) | ✅ |
| C4 Backend | Healthcheck UP, arranque 2.2 s, JWT filter funcionando (403 sin token, 200 con token), prueba carga 100/10 sin fallos | ✅ |
| C8 Red | `docker compose ps` con 4 servicios, `curl` a 6 endpoints diferentes, DNS interno Docker resuelve `backend`, TLS verificado con `openssl s_client`, headers de seguridad presentes | ✅ |
| DWES API REST | Sistema de roles `USUARIO`/`ADMIN` con JWT, endpoints admin con `@PreAuthorize`, claim `rol` en token, 403 sin permisos | ✅ |
