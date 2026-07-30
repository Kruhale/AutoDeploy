# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-07-30

### Added
- Deterministic user avatars with optional profile photo upload (stored as a bounded data URL).
- Regression test suite covering session cleanup, form validation and i18n catalogs (626 specs).
- Wildcard route fallback so unknown URLs land on the home page instead of a blank screen.

### Changed
- Ink-sweep button system: every primary action shares the same amber sweep interaction.
- Slower editorial motion tokens with a single easing curve across all stylesheets.
- Account dossier redesigned with an always-on technical marquee.
- Translation catalogs are served with `no-cache` so deployments refresh copy instantly.

### Fixed
- Language choice is no longer reset when saving the profile or uploading a photo.
- Expired sessions now clear every cached signal (servers, activity, notifications, AI chat).
- Contact, firewall, onboarding, backups and checkout forms surface validation errors and block double submits.
- Anchor navigation scrolls to its section from any page.

## [0.6.0] - 2026-07-14

### Added
- Editorial redesign for the landing and interior pages, with live operations panel and stats strip.
- Docker multi-stage images, compose stacks and a hardened sandbox web target.
- CI workflow for build and test, plus a container publishing workflow.
- Playwright end-to-end journey and page-level smoke specs.
- Technical documentation: architecture, API reference, deployment guides and a WCAG 2.1 AA audit.

## [0.5.0] - 2026-06-28

### Added
- Billing area with plan catalog, usage meters and a mock checkout with Luhn validation.
- AI assistant with guarded command proposals, gated by the Pro plan.
- Internationalization in Spanish, English, French, German and Italian.
- Light theme with persisted preference, public status board and PWA manifest.

## [0.4.0] - 2026-06-15

### Added
- Networking cockpit: nginx sites, SSL certificates, subdomains and redirect rules.
- Firewall management backed by ufw with one-click presets.
- Snapshot backups with restore flow and daily cron installer.
- Real-time notifications over WebSocket with bell panel and toasts.

## [0.3.0] - 2026-06-01

### Added
- Git and zip deployments orchestrated over SSH/SFTP with live logs.
- Guided deployment wizard with runtime stack picker.
- Activity console with severity filters and embedded shell.
- Server metrics sampling, health probes and status endpoint.

## [0.2.0] - 2026-05-13

### Added
- Server management with AES-encrypted credentials and pooled SSH sessions.
- Guided SSH onboarding wizard and server detail view.
- Interactive SSH terminal over authenticated WebSocket.
- Dashboard with fleet overview, activity feed and live metrics.

## [0.1.0] - 2026-04-24

### Added
- JWT authentication with registration, login and route guards.
- ITCSS design system with self-hosted typography.
- Public landing with pricing, legal pages and cookie consent.
- Angular 20 workspace and Spring Boot service with MongoDB.
