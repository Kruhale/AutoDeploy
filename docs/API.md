# API REST — AutoDeploy

Documentación de los endpoints REST del backend. Hay dos formas de explorar la API:

- **Esta guía**: endpoints principales con ejemplos `curl` reales.
- **Swagger UI**: `https://<host>/swagger-ui.html` — UI interactiva generada por springdoc-openapi a partir de las anotaciones JAX-RS de los controllers. Permite ejecutar peticiones desde el navegador.
- **OpenAPI JSON**: `https://<host>/v3/api-docs` — esquema completo para generar clientes.

## Convenciones

### Wrapper `ApiResponse<T>`

**Todos** los endpoints devuelven un objeto con esta forma:

```json
{
  "success": true,
  "message": "Texto descriptivo",
  "data": { /* payload tipado */ }
}
```

En errores controlados (`BadRequestException`, `ResourceNotFoundException`), `success=false`, `message` con el motivo y `data=null`.

### Autenticación

Todos los endpoints **excepto** los públicos requieren un header:

```
Authorization: Bearer <token-jwt>
```

El token se obtiene del endpoint de login y caduca en 24 h (`autodeploy.jwt.expiration=86400000` ms).

**Endpoints públicos** (sin JWT, ver `SecurityConfig`):

- `POST /api/usuarios/registro`
- `POST /api/usuarios/login`
- `GET  /api/estado/**`
- `POST /api/webhooks/git/{token}`
- `GET  /swagger-ui/**`, `/v3/api-docs/**`, `/actuator/**`
- `GET  /ws/**` (WebSocket handshake)

Si llamas a un endpoint protegido sin token, recibes `403 Forbidden`.

### Códigos de respuesta

| Código | Significado |
|--------|-------------|
| 200 OK | Operación correcta |
| 201 Created | Recurso creado (POST de creación) |
| 204 No Content | Borrado correcto |
| 400 Bad Request | Validación fallida o regla de negocio |
| 401 Unauthorized | Token JWT inválido o expirado |
| 403 Forbidden | Falta token o no tienes permiso |
| 404 Not Found | Recurso no existe |
| 500 Internal Server Error | Excepción inesperada |

## Endpoints principales

### Autenticación

#### `POST /api/usuarios/registro` (público)

Crea un usuario nuevo con plan `free`.

> Construye el body con jq para no escribir credenciales literales en el shell history.

```bash
# placeholder no commiteable: usa tu propia contrasena
BODY=$(jq -n --arg n Demo --arg e demo@test.com --arg p TU_CONTRASENA \
  '{nombre:$n, email:$e, password:$p}')
curl -s -X POST https://autodeploy.kruhale.com/api/usuarios/registro \
  -H "Content-Type: application/json" \
  -d "$BODY"
```

**Response 201:**

```json
{
  "success": true,
  "message": "Usuario registrado",
  "data": {
    "id": "6a0a0a689356a752b06489e7",
    "nombre": "Demo",
    "email": "demo@test.com",
    "token": null,
    "plan": "free",
    "fechaFinSuscripcion": null,
    "idioma": "es"
  }
}
```

**Errores:** 400 si email ya existe.

#### `POST /api/usuarios/login` (público)

Devuelve el JWT.

```bash
# placeholder: sustituye TU_CONTRASENA por la real
BODY=$(jq -n --arg e demo@test.com --arg p TU_CONTRASENA '{email:$e, password:$p}')
curl -s -X POST https://autodeploy.kruhale.com/api/usuarios/login \
  -H "Content-Type: application/json" \
  -d "$BODY"
```

**Response 200:**

```json
{
  "success": true,
  "message": "Login correcto",
  "data": {
    "id": "6a0a0a689356a752b06489e7",
    "nombre": "Demo",
    "email": "demo@test.com",
    "token": "eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiI2YTBhMGE2OD...",
    "plan": "free",
    "idioma": "es"
  }
}
```

**Errores:** 400 si credenciales incorrectas.

### Estado del sistema

#### `GET /api/estado` (público)

Para usar en /estado del frontend y por monitorización externa.

```bash
curl -s https://autodeploy.kruhale.com/api/estado | jq
```

**Response 200:**

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

`estadoGeneral` es `UP` si todos los servicios están operativos, `PARCIAL` si alguno está degradado, `DOWN` si la BBDD no responde.

### Servidores VPS

#### `GET /api/servidores` (requiere JWT)

Lista los servidores del usuario logueado.

```bash
TOKEN="eyJhbGciOi..."
curl -s https://autodeploy.kruhale.com/api/servidores -H "Authorization: Bearer $TOKEN" | jq
```

**Response 200:**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "6a09f4f59356a752b064885a",
      "nombre": "test-vps",
      "direccionIp": "10.0.0.5",
      "puertoSsh": 22,
      "usuarioSsh": "autodeploy",
      "metodoAutenticacion": "password",
      "estado": "conectado",
      "fechaCreacion": "2026-05-17T17:03:49"
    }
  ]
}
```

#### `POST /api/servidores` (requiere JWT)

Registra un servidor nuevo. La contraseña/clave privada se cifra con AES-256 antes de guardarse.

```bash
# placeholder: cambia TU_CONTRASENA_SSH por la real del servidor remoto
BODY=$(jq -n \
  --arg n prod-api --arg ip 1.2.3.4 --arg u root --arg pw TU_CONTRASENA_SSH \
  '{nombre:$n, direccionIp:$ip, puertoSsh:22, usuarioSsh:$u,
    metodoAutenticacion:"password", password:$pw}')
curl -s -X POST https://autodeploy.kruhale.com/api/servidores \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY"
```

**Response 201:** El servidor creado con la contraseña ya cifrada en `passwordCifrada`.

#### `POST /api/servidores/probar-conexion` (requiere JWT)

Comprueba SSH antes de guardar.

#### `POST /api/servidores/{id}/reboot` (requiere JWT)

Ejecuta `sudo reboot` por SSH.

### Despliegues

#### `POST /api/deploy/git` (requiere JWT)

Despliegue por git clone/pull en el VPS.

```bash
curl -s -X POST https://autodeploy.kruhale.com/api/deploy/git \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "servidorId": "6a09f4f59356a752b064885a",
    "repoUrl": "https://github.com/usuario/repo.git",
    "directorio": "/var/www/miapp",
    "rama": "main",
    "tecnologia": "nodejs"
  }'
```

**Response 201:** El `Despliegue` incluye `tokenWebhook` (Base64 random de 24 bytes) que se usa luego para configurar webhooks de auto-deploy.

#### `POST /api/deploy/zip` (requiere JWT, multipart)

Sube un ZIP y lo despliega por SFTP.

```bash
curl -s -X POST https://autodeploy.kruhale.com/api/deploy/zip \
  -H "Authorization: Bearer $TOKEN" \
  -F "servidorId=6a09f4f59356a752b064885a" \
  -F "directorio=/var/www/miapp" \
  -F "tecnologia=estatica" \
  -F "archivo=@/ruta/local/miapp.zip"
```

Límite 50 MB. Si subes más, recibirás 400 con "El ZIP excede el tamano maximo de 50 MB". Si el ZIP no es `.zip`, 400. Si el archivo viene corrupto o intenta hacer zip-slip (`../../etc/passwd`), 400.

#### `POST /api/webhooks/git/{tokenWebhook}` (público)

GitHub/GitLab dispara este endpoint al hacer push. AutoDeploy verifica:

1. Que el `tokenWebhook` corresponde a un despliegue existente.
2. Que la cabecera `X-GitHub-Event: push` o `X-Gitlab-Event: Push Hook` está presente.
3. Que la rama del payload coincide con la configurada.

Si todo OK, dispara `git pull` en el servidor.

```bash
# Simulación manual (lo que GitHub haría)
curl -s -X POST https://autodeploy.kruhale.com/api/webhooks/git/abc123def456 \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref":"refs/heads/main","commits":[]}'
```

### Asistente IA (solo plan Pro / Business)

#### `POST /api/asistente-ia/mensaje` (requiere JWT)

Envía mensaje al modelo IA. Si propone un comando, viene marcado para confirmar.

```bash
curl -s -X POST https://autodeploy.kruhale.com/api/asistente-ia/mensaje \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": "6a0a0a689356a752b06489e7",
    "servidorId": "6a09f4f59356a752b064885a",
    "mensaje": "Dime el uso de disco",
    "historial": []
  }'
```

**Response 200:**

```json
{
  "success": true,
  "message": "Respuesta generada",
  "data": {
    "respuesta": "Para verificar el espacio libre, ejecuto df -h.",
    "comandoPropuesto": "df -h",
    "razonamiento": "df -h muestra uso del disco en formato legible.",
    "requiereConfirmacion": true,
    "salidaComandoAutoEjecutado": null
  }
}
```

**Errores:**
- 400 "El asistente IA solo esta disponible en planes Pro y Business" (plan free)
- 400 "No has configurado tu API key de OpenRouter" (falta config)
- 400 "Tu API key de OpenRouter no es valida" (401 de OpenRouter)
- 400 "No tienes creditos en OpenRouter" (402 de OpenRouter)
- 400 "Demasiadas peticiones" (429 de OpenRouter, rate limit)

#### `POST /api/asistente-ia/ejecutar` (requiere JWT)

Confirma y ejecuta el comando propuesto.

```bash
curl -s -X POST https://autodeploy.kruhale.com/api/asistente-ia/ejecutar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"servidorId":"...","comando":"df -h"}'
```

**Response 200:**

```json
{
  "success": true,
  "message": "Comando ejecutado",
  "data": {
    "salida": "Filesystem      Size  Used Avail Use% Mounted on\noverlay         911G   53G  812G   7% /\n..."
  }
}
```

#### `PUT /api/asistente-ia/configuracion/{usuarioId}` (requiere JWT)

Guarda la API key de OpenRouter (cifrada con AES en MongoDB) y el modelo preferido.

```bash
curl -s -X PUT https://autodeploy.kruhale.com/api/asistente-ia/configuracion/$USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "<tu-clave-openrouter>",
    "modeloPreferido": "google/gemini-2.5-pro",
    "comandosAutoAprobados": ["df -h", "free -m", "uptime"]
  }'
```

### Recursos por servidor

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/servidores/{id}/backups` | GET | Listar backups del servidor |
| `/api/servidores/{id}/backups/auto` | POST | Activar/desactivar backups automáticos (cron en VPS) |
| `/api/servidores/{id}/firewall` | GET | Reglas UFW activas |
| `/api/servidores/{id}/firewall` | POST | Añadir regla UFW |
| `/api/servidores/{id}/networking` | GET | Configuración de red (interfaces, DNS) |
| `/api/servidores/{id}/redirecciones` | GET / POST | Redirecciones nginx (subdominios → puerto interno) |
| `/api/servidores/{id}/ssl` | GET / POST | Estado y emisión de certificados Let's Encrypt |
| `/api/servidores/{id}/logs` | GET | Tail de logs de aplicaciones desplegadas |
| `/api/metricas/{id}/ultima` | GET | Última snapshot de métricas (CPU, RAM, disco) |
| `/api/metricas/{id}/recolectar-ahora` | POST | Forzar recolección inmediata de métricas |

### WebSocket

| Endpoint | Mensaje cliente → servidor | Mensaje servidor → cliente |
|----------|----------------------------|----------------------------|
| `/ws/terminal?servidorId=X` | Texto que el usuario escribe en xterm.js | Salida del shell remoto |
| `/ws/metricas?servidorId=X` | (vacío, solo handshake) | JSON con CPU/RAM/disco cada 30 s |
| `/ws/notificaciones/{usuarioId}` | (vacío) | JSON `Notificacion` cuando algo ocurre |

Ejemplo de conexión desde JavaScript:

```javascript
const ws = new WebSocket(`wss://${location.host}/ws/metricas?servidorId=${id}`);
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

## Endpoints administrativos (rol ADMIN)

Los endpoints bajo `/api/usuarios/admin/**` están protegidos con `@PreAuthorize("hasRole('ADMIN')")`. Un JWT cuyo claim `rol` no sea `ADMIN` recibe **HTTP 403**.

#### `GET /api/usuarios/admin/todos`

Lista todos los usuarios registrados. Solo accesible por administradores.

```bash
curl -s -H "Authorization: Bearer $TOKEN_ADMIN" \
  https://autodeploy.kruhale.com/api/usuarios/admin/todos | jq
```

```json
{
  "success": true,
  "message": "OK",
  "data": [
    { "id": "6a0a...", "email": "demo@test.com", "rol": "USUARIO", "plan": "free" },
    { "id": "6a0b...", "email": "admin@autodeploy.dev", "rol": "ADMIN", "plan": "business" }
  ]
}
```

#### `PUT /api/usuarios/admin/{id}/rol`

Cambia el rol de un usuario. Body: `{ "rol": "ADMIN" }` o `{ "rol": "USUARIO" }`.

```bash
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"rol":"ADMIN"}' \
  https://autodeploy.kruhale.com/api/usuarios/admin/6a0a.../rol | jq
```

**Errores:** 400 si el rol no es `USUARIO` o `ADMIN`. 403 si el solicitante no es ADMIN. 404 si el usuario no existe.

#### `DELETE /api/usuarios/admin/{id}`

Borra un usuario por ID (acción administrativa).

```bash
curl -s -X DELETE \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -o /dev/null -w "HTTP %{http_code}\n" \
  https://autodeploy.kruhale.com/api/usuarios/admin/6a0a...
# HTTP 204
```

---

## Health & métricas (sin JWT)

```bash
curl -s https://autodeploy.kruhale.com/actuator/health | jq
# {"status":"UP","components":{"mongo":{"status":"UP"},...}}

curl -s https://autodeploy.kruhale.com/actuator/info | jq
# {"app":{"name":"AutoDeploy","descripcion":"Panel de gestion..."}}

curl -s https://autodeploy.kruhale.com/actuator/metrics | jq
# Lista de métricas disponibles

curl -s https://autodeploy.kruhale.com/actuator/prometheus | head -20
# Exposición Prometheus para scraping
```

## Errores comunes y cómo evitarlos

| Síntoma | Causa | Solución |
|---------|-------|----------|
| 403 en todo | Falta `Authorization: Bearer` o token expirado | Hacer login otra vez |
| 401 con token | Token firmado con otro `JWT_SECRET` | Verifica `AUTODEPLOY_JWT_SECRET` en el `.env` del servidor |
| 413 en `/api/deploy/zip` | `client_max_body_size` < tamaño del ZIP | Subir el valor en `autodeploy/nginx.conf` |
| WebSocket falla con 502 | nginx no proxifica `/ws/` con `Upgrade` | Ya está configurado, comprueba que nginx arrancó OK |
| `data` siempre `null` en frontend | Se accede a `respuesta` en lugar de `respuesta.data` | Patrón `ApiResponse<T>`: extrae `.data` |
