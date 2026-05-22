# Changelog

Todos los cambios relevantes del proyecto se documentan en este fichero.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added
- Refactor de componentes SCSS con anidamiento BEM y estados `:hover`/`:focus`.
- Reconexión automática de servidores tras arrancar el backend (#225).
- Textarea para pegar clave SSH privada en el onboarding (#223).
- Página `style-guide` con catálogo visual de tokens y componentes.
- Documentación de accesibilidad en `docs/accesibilidad/` (auditoría WCAG 2.1 AA).

### Changed
- Custom Properties CSS movidas de `00-settings` a `02-generic` (fuente única de verdad).
- README con enlaces a toda la documentación interna.

### Fixed
- Clave i18n correcta para el campo Contraseña en onboarding (#224).

### Security
- Migración de `AES/ECB` a `AES/GCM/NoPadding` con IV aleatorio y tag de 128 bits.
- CORS con whitelist explícita (sin `*` ni `setAllowCredentials(true)` combinado).
- `JwtHandshakeInterceptor` valida JWT antes del upgrade en los tres WebSockets.
- `@PreAuthorize` con ownership en 11 endpoints sensibles.
- Fail-fast en arranque si faltan `AUTODEPLOY_JWT_SECRET` o `AUTODEPLOY_CIFRADO_CLAVE`.
- `@JsonIgnore` en `passwordHash`, `passwordCifrada` y `claveSshPrivada`.
- Validación regex estricta en `LogService` para prevenir inyección de comandos shell.

## [1.0.0] - 2026-05-22

### Added
- Release inicial del Proyecto Final DAW (AutoDeploy).
- Frontend Angular 20 con signals, standalone components y rutas lazy.
- Backend Spring Boot 3.4 + Java 21 con records DTOs.
- MongoDB 8 con Spring Data MongoDB.
- Terminal SSH interactiva via WebSocket + xterm.js.
- Métricas en streaming via WebSocket cada 30s.
- Sistema de despliegues (Git clone, ZIP upload, builds reales).
- Gestión de firewall (ufw), DNS (dnsjava), backups (tar + cron), redirects (nginx).
- Asistente IA integrado con OpenRouter (modelo configurable).
- Sistema de notificaciones push.
- i18n con 5 idiomas (es, en, fr, de, it).
- Tema oscuro/claro con persistencia.
- CI/CD con GitHub Actions (build + tests + deploy con rollback automático).
- Documentación completa de los módulos DIW, DWES, DWEC y DAW.
