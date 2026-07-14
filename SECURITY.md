# Security in AutoDeploy

AutoDeploy handles critical data: SSH credentials and private keys with full access to each user's servers. This document describes how the system is hardened, what auditing has been applied, and which channel to use if you find a flaw.

## Initial assessment

A **systematic security review** of the backend uncovered seven real vulnerabilities that functional testing had not caught. All of them were closed in commit `0c4ae84`.

As of today, all seven findings are closed and verified with automated tests in `backend/src/test/java/com/autodeploy/`.

## Defense in depth

Protection does not rest on a single measure but on layers that cover for each other. If one fails, the next ones should contain the incident.

### Cryptographic layer

- **Symmetric encryption of SSH credentials**: AES-256/GCM/NoPadding. Each ciphertext stores its own random 12-byte IV as a prefix, plus a 128-bit authentication tag that detects any tampering. The master key (`AUTODEPLOY_CIFRADO_CLAVE`) never touches the database: it is derived in memory with SHA-256 when the JVM starts.
- **JWT token signing**: HMAC-SHA384 with a secret of ≥ 256 bits (`AUTODEPLOY_JWT_SECRET`). Configurable expiration, 24 h by default.
- **Password hashing**: BCrypt with cost factor 10 (Spring Security default). Unique salt per entry.

### Startup layer

`JwtUtil` carries a `@PostConstruct` that aborts the `ApplicationContext` with `IllegalStateException` if:

```
- AUTODEPLOY_JWT_SECRET is empty or shorter than 32 bytes.
- AUTODEPLOY_CIFRADO_CLAVE is empty.
```

This blocks the classic "silent misconfiguration" pattern: no deployment ever comes up with insecure default values.

### Network and CORS layer

`SecurityConfig.java` declares an explicit allowlist in `autodeploy.cors.origenes`. The only three valid origins are:

- `https://autodeploy.kruhale.com` (production)
- `http://localhost:4200` (frontend dev)
- `http://localhost:8082` (container dev)

`*` is never combined with `setAllowCredentials(true)` — a classic anti-pattern that was present in early iterations of the code and has been removed.

### WebSocket authentication layer

The backend's three WebSockets (`/ws/terminal`, `/ws/metricas`, `/ws/notificaciones/{usuarioId}`) sit behind `JwtHandshakeInterceptor`: it extracts the JWT from the `?token=...` query param, validates it with `JwtUtil`, and rejects the handshake if the signature fails or the token has expired. Before this change, anyone with the URL could open an SSH terminal to the user's server.

### Per-endpoint authorization layer

Method-level Spring Security via `@PreAuthorize` with SpEL expressions. For example, on the 11 `/api/usuarios/{id}/**` endpoints:

```java
@PreAuthorize("hasRole('ADMIN') or #id == authentication.principal")
```

It compares the path variable against the `usuarioId` from the JWT and allows the legitimate bypass for administrators. Without this, user A could modify or delete user B by changing a URL parameter.

### Anti-injection layer

`LogService` receives `archivo` and `patron`, which used to be injected directly into a `tail`/`grep` string. Today:

- `archivo` is validated with `^[A-Za-z0-9_./~-]+$`.
- `patron` is validated with `^[A-Za-z0-9 ._/:@-]+$`.
- `lineas` is clamped to the range `[1, 5000]`.
- `grep -F` treats the pattern as a literal — no regex metacharacters.

### JSON serialization layer

The `Usuario` and `Servidor` models mark sensitive fields with `@JsonIgnore`:

- `Usuario.passwordHash`
- `Servidor.passwordCifrada`
- `Servidor.claveSshPrivada`

This works because no endpoint accepts those entities as `@RequestBody`; every write flow uses dedicated `record` DTOs.

## How to report a security issue

If you discover a vulnerability in any of the layers above, **do not publish it in a GitHub issue** — that would turn the finding into a public 0-day.

Instead, open a private report through [GitHub Security Advisories](https://github.com/Kruhale/AutoDeploy/security/advisories/new), including:

- A reproducible technical description (no long prose needed).
- The affected endpoint or component.
- The defense-in-depth layer being bypassed (cryptographic, CORS, authorization, etc.).
- If you have a proof of concept: the minimal command or request that triggers it.
- Your assessment of the impact (unauthorized read, escalation, remote execution…).

## Response timelines

1. **Acknowledgment of receipt** within 48 hours.
2. **Initial analysis and estimated CVSS** within 5 business days.
3. **Patch on `main`** within 30 days for high or critical severity vulnerabilities. For medium and low severity, the timeline is agreed with you.
4. **Public credit** in `CHANGELOG.md` (if you want it) under the *Security* section of the corresponding release.

## What is in scope and what is not

Since AutoDeploy operates on **third-party VPS servers**, we distinguish between flaws in the software and problems on the user's remote server.

| In scope | Out of scope (up to the user or third parties) |
|---|---|
| Authentication or authorization bypass on `/api/**` | Insecure configuration of the end user's VPS |
| Leakage of encrypted credentials or JWTs | Vulnerabilities in Spring Boot/Angular/MongoDB (report upstream) |
| Command injection through the SSH layer | Phishing the maintainer or a user to steal their JWT |
| XSS, CSRF, SSRF in the frontend or backend | Denial-of-service (DDoS) attacks |
| Privilege escalation between different users | Issues in the Let's Encrypt chain or the nginx host |
| Tampering with the AES-GCM encryption | Cosmetic issues with no security impact |

## Known gaps

Security does not end at commit `0c4ae84`. There are known improvements that have not been implemented yet and will be incorporated over time:

- Automatic rotation of `AUTODEPLOY_CIFRADO_CLAVE` with transparent migration of existing credentials.
- 2FA with TOTP on end-user login.
- Per-IP rate limiting on sensitive endpoints (`/api/auth/login`, `/api/auth/registro`).
- An external professional audit as the project matures.

If you are interested in working on any of these areas, open an issue describing your proposed approach before submitting a PR.
