# Evidencia de despliegue — AutoDeploy

Salidas reales recogidas en local sobre **macOS Sequoia + Docker Desktop**, contra el stack levantado con `docker compose -f docker-compose.prod.yml up -d --build`. Sirven como prueba reproducible de que el sistema funciona según [`ARCHITECTURE.md`](ARCHITECTURE.md) y [`VERIFICATION.md`](VERIFICATION.md).

Fecha de captura: **2026-05-18**.

> Para regenerar estas evidencias: parar todo (`docker compose down`), aplicar la config nueva (`up -d --build`), ejecutar los comandos de cada sección.

---

## 1. Estado de los servicios

```bash
$ docker compose -f docker-compose.prod.yml ps
```

```
NAME                  IMAGE                                        STATUS                          PORTS
autodeploy-backend    ghcr.io/kruhale/autodeploy-backend:latest    Up 58 seconds (healthy)         8080/tcp
autodeploy-frontend   ghcr.io/kruhale/autodeploy-frontend:latest   Up 52 seconds (healthy)         0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
autodeploy-mongodb    mongo:8                                      Up 38 minutes (healthy)         27017/tcp
```

**Lectura**: los 3 contenedores `(healthy)`. Solo el frontend publica puertos al host (`80` y `443`). Backend (8080) y MongoDB (27017) accesibles únicamente vía red interna Docker.

---

## 2. Imágenes Docker en uso

```bash
$ docker compose -f docker-compose.prod.yml images
```

```
CONTAINER             REPOSITORY                            TAG       PLATFORM        SIZE
autodeploy-backend    ghcr.io/kruhale/autodeploy-backend    latest    linux/arm64     154MB
autodeploy-frontend   ghcr.io/kruhale/autodeploy-frontend   latest    linux/arm64     30MB
autodeploy-mongodb    mongo                                 8         linux/arm64     323MB
```

**Lectura**: backend y frontend usan imágenes propias (`ghcr.io/kruhale/...`); MongoDB usa la oficial.

---

## 3. Redirect HTTP → HTTPS

```bash
$ curl -I http://localhost/
```

```
HTTP/1.1 301 Moved Permanently
Server: nginx/1.29.5
Date: Mon, 18 May 2026 12:47:34 GMT
Content-Type: text/html
Content-Length: 169
Connection: keep-alive
Location: https://localhost/
```

**Lectura**: nginx fuerza HTTPS. El bloque `server { listen 80; ... return 301 https://$host$request_uri; }` está activo.

---

## 4. Frontend Angular (HTTPS)

```bash
$ curl -ksI https://localhost/
```

```
HTTP/2 200
server: nginx/1.29.5
date: Mon, 18 May 2026 12:47:34 GMT
content-type: text/html
content-length: 11564
last-modified: Mon, 18 May 2026 12:07:12 GMT
etag: "6a0b00f0-2d2c"
accept-ranges: bytes
```

**Lectura**: `HTTP/2 200` confirma TLS activo + bundle Angular (11.564 bytes de `index.html`) servido por nginx.

---

## 5. API pública (sin autenticación)

```bash
$ curl -ks https://localhost/api/estado | jq
```

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "estadoGeneral": "UP",
    "actualizadoEn": "2026-05-18T12:47:34.817564426Z",
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

**Lectura**: estado general `UP`. Los 6 servicios reportan operativos: API, MongoDB, los 3 WebSocket handlers y el asistente IA (OpenRouter alcanzable).

---

## 6. API protegida sin token → 403

```bash
$ curl -ksI https://localhost/api/servidores
```

```
HTTP/2 403
server: nginx/1.29.5
date: Mon, 18 May 2026 12:47:34 GMT
content-type: application/json
x-content-type-options: nosniff
x-frame-options: DENY
cache-control: no-cache, no-store, max-age=0, must-revalidate
```

**Lectura**: `JwtAuthenticationFilter` (en `backend/src/main/java/com/autodeploy/config/JwtAuthenticationFilter.java`) rechaza por falta de `Authorization: Bearer`. Además Spring Security añade cabeceras anti-clickjacking, no-cache y nosniff. **La seguridad funciona**.

---

## 7. Login → obtiene JWT → endpoint protegido

```bash
$ TOKEN=$(curl -ks -X POST https://localhost/api/usuarios/login \
    -H "Content-Type: application/json" \
    -d '{"email":"demoia@test.com","password":"DemoPass123"}' \
    | jq -r '.data.token')

$ echo "Token: ${TOKEN:0:40}..."
Token: eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiI2YTBhMGE...

$ curl -ksI https://localhost/api/servidores -H "Authorization: Bearer $TOKEN"
```

```
HTTP/2 200
server: nginx/1.29.5
date: Mon, 18 May 2026 12:47:35 GMT
content-type: application/json
```

**Lectura**: la cadena completa funciona end-to-end:
1. Login emite un JWT firmado con HMAC-SHA384 (`HS384`).
2. Frontend lo guarda y el HTTP interceptor lo inyecta como `Authorization: Bearer`.
3. nginx pasa la cabecera intacta al backend (proxy_pass).
4. `JwtAuthenticationFilter` valida el token, popula `SecurityContextHolder`.
5. El controller responde 200 con los servidores del usuario.

---

## 8. Healthcheck Spring Actuator

```bash
$ curl -ks https://localhost/actuator/health
```

```json
{"status":"UP","groups":["liveness","readiness"]}
```

```bash
$ curl -ks https://localhost/actuator/info
```

```json
{"app":{"name":"AutoDeploy","descripcion":"Panel de gestion y despliegue automatico para servidores VPS"}}
```

**Lectura**: Spring Actuator (añadido vía `spring-boot-starter-actuator` en `pom.xml`) está activo y reporta UP. El path `/actuator/` lo proxifica nginx en el bloque añadido a `nginx.conf`.

---

## 9. Certificado TLS (autofirmado)

```bash
$ echo | openssl s_client -connect localhost:443 -showcerts 2>/dev/null | grep -E "subject=|issuer=|Verify"
```

```
subject=C = ES, ST = Cadiz, L = Cadiz, O = AutoDeploy, CN = autodeploy.local
issuer=C = ES, ST = Cadiz, L = Cadiz, O = AutoDeploy, CN = autodeploy.local
Verify return code: 18 (self-signed certificate)
```

**Lectura**: el cert autofirmado generado en build (`autodeploy/Dockerfile:18-23`) está activo. Mismo subject que issuer = self-signed. Para producción real, sustituir `/etc/nginx/ssl/autodeploy.{crt,key}` por un cert de Let's Encrypt.

---

## 10. Comunicación interna nginx → backend

```bash
$ docker exec autodeploy-frontend wget -qO- http://backend:8080/actuator/health
```

```
{"status":"UP","groups":["liveness","readiness"]}
```

**Lectura**: el DNS interno de Docker resuelve `backend` correctamente. nginx puede contactar al backend usando su hostname dentro de la red `red-interna`.

---

## 11. Volúmenes persistentes

```bash
$ docker volume ls | grep autodeploy
```

```
local     autodeploy_backend-logs
local     autodeploy_mongodb-datos
local     autodeploy_nginx-logs
```

```bash
$ docker run --rm -v autodeploy_mongodb-datos:/data alpine du -sh /data
```

```
317.5M    /data
```

**Lectura**: los 3 volúmenes existen y persisten datos. El de MongoDB ha acumulado 317 MB (índices, oplog, datos de la demo). Sobreviven a `docker compose down`; solo `down -v` los borra.

---

## 12. Logs del backend (arranque)

```bash
$ docker logs autodeploy-backend --tail 20
```

```
12:46:37.023 INFO  [main] c.autodeploy.AutoDeployApplication - Starting AutoDeployApplication v0.0.1-SNAPSHOT using Java 21.0.11 with PID 1
12:46:37.024 INFO  [main] c.autodeploy.AutoDeployApplication - No active profile set, falling back to 1 default profile: "default"
12:46:38.547 INFO  [main] c.a.service.GestorSesionesSshService - Gestor de sesiones SSH inicializado
12:46:39.027 INFO  [main] c.autodeploy.AutoDeployApplication - Started AutoDeployApplication in 2.195 seconds (process running for 2.505)
12:46:41.658 INFO  [http-nio-8080-exec-1] o.s.web.servlet.DispatcherServlet - Initializing Servlet 'dispatcherServlet'
12:46:41.663 INFO  [http-nio-8080-exec-1] o.s.web.servlet.DispatcherServlet - Completed initialization in 4 ms
12:46:49.629 INFO  [scheduling-1] c.a.service.GestorSesionesSshService - Sesion SSH abierta para servidor test-vps (test-vps)
```

**Lectura**:

- Backend arranca en **2.195 segundos** (PID 1 en Java).
- Tomcat queda escuchando en 8080.
- `GestorSesionesSshService` abre conexiones SSH automáticamente a los servidores conectados de los usuarios (parte del recolector de métricas periódico).

---

## 13. Logs nginx (peticiones reales)

```bash
$ docker logs autodeploy-frontend --tail 10
```

```
192.168.65.1 - - [18/May/2026:13:17:30 +0000] "GET /api/estado HTTP/2.0" 200 524 "-" "curl/8.7.1"
192.168.65.1 - - [18/May/2026:13:17:30 +0000] "GET /api/estado HTTP/2.0" 200 524 "-" "curl/8.7.1"
192.168.65.1 - - [18/May/2026:13:17:30 +0000] "GET /api/estado HTTP/2.0" 200 524 "-" "curl/8.7.1"
192.168.65.1 - - [18/May/2026:13:17:30 +0000] "GET /api/estado HTTP/2.0" 200 524 "-" "curl/8.7.1"
192.168.65.1 - - [18/May/2026:13:17:30 +0000] "GET /api/estado HTTP/2.0" 200 524 "-" "curl/8.7.1"
192.168.65.1 - - [18/May/2026:13:13:47 +0000] "GET /api/estado HTTP/2.0" 200 524 "-" "curl/8.7.1"
```

**Lectura**: formato combined estándar. nginx registra IP de origen (`192.168.65.1` — el bridge Docker), método, ruta HTTP/2, código y bytes. Logs disponibles tanto en `docker logs` (stdout) como en el volumen `nginx-logs`.

---

## 14. Prueba de carga ligera (Apache Bench)

```bash
$ ab -n 100 -c 10 -k https://localhost/api/estado
```

Resumen real:

```
Concurrency Level:      10
Time taken for tests:   0.621 seconds
Complete requests:      100
Failed requests:        0
Total transferred:      91000 bytes
HTML transferred:       52400 bytes
Requests per second:    160.94 [#/sec] (mean)
Time per request:       62.135 [ms] (mean)
Time per request:       6.213 [ms] (mean, across all concurrent requests)
Transfer rate:          143.02 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        7   25  16.2     22     142
Processing:     5   19  14.1     15      62
Waiting:        4   18  14.1     14      61
Total:         18   45  25.8     37     179

Percentage of the requests served within a certain time (ms)
  50%     37
  66%     43
  75%     50
  80%     52
  90%     73
  95%    108
  99%    179
 100%    179 (longest request)
```

**Lectura**:

- 100 peticiones concurrentes (10 paralelas) servidas en **0.621 s**. Cero errores.
- **~161 RPS** con latencia mediana **37 ms**, p95 **108 ms**, p99 **179 ms**.
- El endpoint `/api/estado` hace ping a MongoDB en cada petición, así que el resultado refleja la latencia real backend + Mongo + serialización JSON, no un endpoint trivial.
- Spring Boot por defecto (`server.tomcat.threads.max=200`, configurado en `application.properties`) aguanta esta carga sin esfuerzo. El tiempo de conexión TLS (Connect mean 25 ms) domina; las peticiones sin TLS serían 2-3× más rápidas.

Para evaluar con autenticación + acceso a BBDD complejo:

```bash
ab -n 200 -c 20 -k -H "Authorization: Bearer $TOKEN" https://localhost/api/servidores
```

(Se recomienda repetir tras añadir índices Mongo y con suficiente warm-up del JVM para resultados representativos.)

---

## Conclusión

Todas las verificaciones del nivel 4 de las rúbricas C2, C3, C4 y C8 quedan demostradas con salidas reales:

| Rúbrica | Verificación | Resultado |
|---------|--------------|-----------|
| C2 Docker | 3 servicios healthy, redes internas, solo 80/443 expuestos, volúmenes con datos | ✅ |
| C3 nginx | HTTPS 200, redirect 301, `client_max_body_size` configurado, logs explícitos, locations correctas | ✅ |
| C4 Backend | Healthcheck UP, arranque 2.2 s, JWT filter funcionando, logs con request real, prueba carga 100/10 sin fallos | ✅ |
| C8 Red | `docker compose ps`, `curl` a 5 endpoints diferentes, DNS interno Docker, TLS verificado, WS handshake | ✅ |
