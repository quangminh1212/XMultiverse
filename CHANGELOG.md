# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-07-16

### Added
- **Auth**: local register/login, bearer sessions (`/api/auth/*`).
- **Multiplayer**: world share codes, presence heartbeat, online list.
- **Marketplace**: publish / browse / search / install world packs.
- **Streaming GM**: `POST /api/players/:id/act/stream` (SSE tokens + final result).
- **PWA / mobile**: web manifest, service worker, responsive safe-area CSS.
- UI: Platform panel (auth, join, market), Share/Publish, Streaming checkbox, online roster.

## [1.2.0] - 2026-07-16

### Added
- **Modular platform** (`packages/backend/src/modules/`): registry, meta config API, game routes, domain services (world, travel, roleplay, quest, journal, rpg, save).
- **Open-world scales**: `compact` | `standard` | `expansive` | `epic` | `custom` with UI/CLI/env and `expandLocationGraph`.
- **Feature flags**: `XMV_FEATURES` / `XMV_FEATURES_DISABLED` + runtime toggle endpoint.
- **Config API**: `GET /api/config`, `/config/scales`, `/config/features`, `/config/modules`.
- **Discovery, journal, export/import** world packs; genre-aware demo worlds.
- **E2E smoke tests** (`app.smoke.test.ts`): full create → play → travel → act → export loop.
- Lightweight caps (scale-aware), security headers, rate limit, consistent API errors.

### Changed
- Default open-world is scale-aware and modular; health reports `modular: true`.
- Version **1.2.0** — platform considered feature-complete for single-player open-world use.

## [1.1.0] - 2026-07-16

### Added
- Initial modular OSS hardening, unit tests, RPG systems, CLI travel.

## [1.0.0] - 2026-07-15

### Added
- Initial release of XMultiverse.
- AI-powered world generation from story input.
- Player creation, roleplay, timeline, SQLite, React UI, demo mode.
