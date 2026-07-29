# Seguridad en AutoDeploy

AutoDeploy maneja datos críticos: credenciales SSH y claves privadas con acceso completo a los servidores de cada usuario. Este documento describe cómo está blindado el sistema, qué auditoría se ha aplicado y por qué canal informar si encuentras un fallo.

## Diagnóstico inicial

El sprint final del proyecto incluyó una **revisión sistemática de seguridad** del backend que destapó siete vulnerabilidades reales que el testing funcional no había cazado. Todas se cerraron en el commit `0c4ae84`. Las explicaciones técnicas — qué hacía mal el código, cómo se explotaba y cómo quedó la solución — están en [`docs/06-desarrollo.md`](./docs/06-desarrollo.md) bajo *"Auditoría de seguridad y endurecimiento del backend"*.

A día de hoy, los siete hallazgos están cerrados y verificados con tests automáticos en `backend/src/test/java/com/autodeploy/`.

## Defensa en profundidad

La protección no descansa en una única medida sino en capas que se cubren entre sí. Si una falla, las siguientes deberían contener el incidente.

### Capa criptográfica

- **Cifrado simétrico de credenciales SSH**: AES-256/GCM/NoPadding. Cada ciphertext almacena su propio IV aleatorio de 12 bytes prefijado, más un tag de autenticación de 128 bits que detecta cualquier manipulación. La clave maestra (`AUTODEPLOY_CIFRADO_CLAVE`) nunca toca la base de datos: deriva en memoria con SHA-256 al iniciar la JVM.
- **Firma de tokens JWT**: HMAC-SHA384 con secreto de ≥ 256 bits (`AUTODEPLOY_JWT_SECRET`). Caducidad configurable, 24 h por defecto.
- **Hash de contraseñas**: BCrypt con factor de coste 10 (Spring Security por defecto). Salt único por entrada.

### Capa de arranque

`JwtUtil` lleva un `@PostConstruct` que aborta el `ApplicationContext` con `IllegalStateException` si:

```
- AUTODEPLOY_JWT_SECRET está vacío o es menor de 32 bytes.
- AUTODEPLOY_CIFRADO_CLAVE está vacío.
```

Esto bloquea el patrón típico de "ojos que no ven, corazón que no siente": ningún despliegue se levanta con valores por defecto inseguros.

### Capa de red y CORS

`SecurityConfig.java` declara una lista blanca explícita en `autodeploy.cors.origenes`. Los tres únicos orígenes válidos son:

- `https://autodeploy.kruhale.com` (producción)
- `http://localhost:4200` (dev frontend)
- `http://localhost:8082` (dev contenedor)

No se usa `*` combinado con `setAllowCredentials(true)` (un antipatrón clásico que ya estaba en el código de las primeras semanas).

### Capa de autenticación WebSocket

Los tres WebSockets del backend (`/ws/terminal`, `/ws/metricas`, `/ws/notificaciones/{usuarioId}`) están detrás de `JwtHandshakeInterceptor`: extrae el JWT del query param `?token=...`, lo valida con `JwtUtil` y rechaza el handshake si la firma falla o el token está caducado. Antes de este cambio, cualquiera con la URL podía abrir terminal SSH al servidor del usuario.

### Capa de autorización por endpoint

Spring Security a nivel de método mediante `@PreAuthorize` con expresiones SpEL. Por ejemplo, en los 11 endpoints `/api/usuarios/{id}/**`:

```java
@PreAuthorize("hasRole('ADMIN') or #id == authentication.principal")
```

Compara el path variable contra el `usuarioId` del JWT y permite el bypass legítimo a los administradores. Sin esto, el usuario A podía modificar/borrar al usuario B cambiando un parámetro de la URL.

### Capa anti-inyección

`LogService` recibe `archivo` y `patron` y los inyectaba directamente en una cadena `tail`/`grep`. Hoy:

- `archivo` se valida con `^[A-Za-z0-9_./~-]+$`.
- `patron` se valida con `^[A-Za-z0-9 ._/:@-]+$`.
- `lineas` se clampa al rango `[1, 5000]`.
- `grep -F` trata el patrón como literal — sin metacaracteres regex.

### Capa de serialización JSON

Los modelos `Usuario` y `Servidor` marcan los campos sensibles con `@JsonIgnore`:

- `Usuario.passwordHash`
- `Servidor.passwordCifrada`
- `Servidor.claveSshPrivada`

Esto vale porque ningún endpoint acepta esas entidades como `@RequestBody`; todos los flujos de escritura usan DTOs `record` específicos.

## Cómo notificar un fallo de seguridad

Si descubres una vulnerabilidad en cualquiera de las capas anteriores, **no la publiques en un issue de GitHub** — eso convertiría el hallazgo en un 0-day público.

En su lugar, escribe a [alejandrobravocalderom@gmail.com](mailto:alejandrobravocalderom@gmail.com) incluyendo:

- Una descripción técnica reproducible (sin necesidad de prosa larga).
- El endpoint o componente afectado.
- Capa de la defensa en profundidad que se elude (criptográfica, CORS, autorización, etc.).
- Si tienes una prueba de concepto: el comando o request mínimo que la dispara.
- Tu impresión del impacto (lectura no autorizada, escalada, ejecución remota…).

Cifrar el correo con PGP no es obligatorio pero se agradece. Cualquier `mailbox` con TLS estándar es válido.

## Plazos a los que me comprometo

1. **Confirmación de recepción** dentro de 48 horas (correo personal, sin auto-responder).
2. **Análisis inicial y CVSS estimado** dentro de 5 días laborables.
3. **Parche en `main`** dentro de 30 días para vulnerabilidades de severidad alta o crítica. Para las medias y bajas, el plazo se acuerda contigo.
4. **Crédito público** en `CHANGELOG.md` (si lo deseas) bajo la sección *Security* del release correspondiente.

## Qué entra y qué no

Como AutoDeploy actúa sobre **servidores VPS de terceros**, hay que distinguir entre fallos del software y problemas del servidor remoto del usuario.

| Sí entra en este programa | No entra (depende del usuario o de terceros) |
|---|---|
| Bypass de autenticación o autorización en `/api/**` | Configuración insegura del VPS del usuario final |
| Filtración de credenciales cifradas o JWTs | Vulnerabilidades en Spring Boot/Angular/MongoDB (reportar al proyecto upstream) |
| Inyección de comandos sobre la capa SSH | Phishing al autor o a un usuario para robarle el JWT |
| XSS, CSRF, SSRF en el frontend o backend | Ataques de denegación de servicio (DDoS) |
| Escalada de privilegios entre usuarios distintos | Problemas en la cadena de Let's Encrypt o nginx-host |
| Manipulación del cifrado AES-GCM | Errores cosméticos o sin impacto en la seguridad |

## Lo que queda pendiente

La seguridad no se acaba en el commit `0c4ae84`. Hay mejoras conocidas que aún no se han implementado y que se irán incorporando:

- Rotación automática de `AUTODEPLOY_CIFRADO_CLAVE` con migración transparente de credenciales antiguas.
- 2FA con TOTP en el login del usuario final.
- Limitación de tasa por IP en endpoints sensibles (`/api/auth/login`, `/api/auth/registro`).
- Auditoría externa profesional cuando el proyecto salga del ámbito académico.

Si te interesa colaborar en alguna de estas líneas, abre un issue describiendo el enfoque que propones antes de mandar un PR.
