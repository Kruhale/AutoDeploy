# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- SCSS component refactor with BEM nesting and `:hover`/`:focus` states.
- Automatic server reconnection after backend startup (#225).
- Textarea for pasting a private SSH key during onboarding (#223).
- `style-guide` page with a visual catalog of tokens and components.
- Accessibility documentation in `docs/accessibility/` (WCAG 2.1 AA audit).

### Changed
- CSS Custom Properties moved from `00-settings` to `02-generic` (single source of truth).
- README with links to all internal documentation.

### Fixed
- Correct i18n key for the Password field in onboarding (#224).

### Security
- Migrated from `AES/ECB` to `AES/GCM/NoPadding` with random IV and 128-bit tag.
- CORS with an explicit whitelist (no `*` combined with `setAllowCredentials(true)`).
- `JwtHandshakeInterceptor` validates the JWT before the upgrade on all three WebSockets.
- `@PreAuthorize` with ownership checks on 11 sensitive endpoints.
- Fail-fast on startup if `AUTODEPLOY_JWT_SECRET` or `AUTODEPLOY_CIFRADO_CLAVE` are missing.
- `@JsonIgnore` on `passwordHash`, `passwordCifrada` and `claveSshPrivada`.
- Strict regex validation in `LogService` to prevent shell command injection.

## [1.0.0] - 2026-05-22

### Added
- Initial release of AutoDeploy, a self-hosted deployment panel for VPS.
- Angular 20 frontend with signals, standalone components and lazy routes.
- Spring Boot 3.4 + Java 21 backend with record DTOs.
- MongoDB 8 with Spring Data MongoDB.
- Interactive SSH terminal via WebSocket + xterm.js.
- Streaming metrics via WebSocket every 30s.
- Deployment system (Git clone, ZIP upload, real builds).
- Firewall (ufw), DNS (dnsjava), backups (tar + cron) and redirects (nginx) management.
- Integrated AI assistant powered by OpenRouter (configurable model).
- Push notification system.
- i18n with 5 languages (es, en, fr, de, it).
- Dark/light theme with persistence.
- CI/CD with GitHub Actions (build + tests + deploy with automatic rollback).
- Full project documentation covering frontend, backend, design and deployment.
