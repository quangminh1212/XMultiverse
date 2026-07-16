# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Modular platform**: `modules/` registry + per-domain services (world, travel, roleplay, quest, journal, rpg, save) and feature flags (`XMV_FEATURES*`).
- **Open-world scale presets**: `compact` | `standard` | `expansive` | `epic` | `custom` (API `scale`, CLI `--scale`, UI selector, env `XMV_WORLD_SCALE`).
- **Real expandable graph**: `expandLocationGraph` grows connected locations to scale target.
- **Config API**: `GET /api/config`, `/config/scales`, `/config/features`, `/config/modules`.
- **Discovery map**: track visited locations + % explored.
- **Journal**: auto entries on discovery + manual notes (not every act).
- **World export/import** (JSON pack `xmultiverse-world-v1`) — API, UI, CLI.
- **Genre-aware demo worlds**: scifi, noir, post-apoc, magic, mecha, fantasy.
- Quest status actions (active/completed/failed) in UI.
- Homepage world search + import JSON; map shortcuts explore / talk NPC.
- **Lightweight open-world caps** (`config/limits.ts`): max 8 locations, slim AI context, throttled opt-in autosave, light world list, capped chat/journal/timeline.

### Changed
- Autosave is **opt-in** (and throttled); discovery still auto-saves once.
- Chat stores plain scene text (not full JSON blobs).
- World list endpoint returns a compact projection.

## [1.1.0] - 2026-07-16

### Added
- Open-world **locations graph** generated with each world (5–10 connected places).
- **Travel** API/CLI/UI: move between locations with connection rules.
- **Source types** for world seed: `story` | `movie` | `book` | `anime` | `original`.
- Story/movie **presets** on the homepage for one-click world creation.
- Player **quest log** + relationship updates applied from roleplay results.
- Save list **load/delete** UI; map panel and current-location badge.
- CLI: `xmv travel --id <player> --to "<location>"`; `world create --source ...`.
- **Unit tests** (Vitest) for dice, validation, and worldgen travel graph.
- Consistent **API errors** (`error` + `code`), request validation, security headers, rate limit.
- `SECURITY.md`, GitHub issue/PR templates; CI matrix Node 18/20/22 with `npm test`.

### Changed
- Version bump to **1.1.0** across workspaces.
- Health endpoint includes `version` and `uptime`.
- CONTRIBUTING / package metadata aligned with international OSS practices.

## [1.0.0] - 2026-07-15

### Added
- Initial release of XMultiverse.
- AI-powered world generation from story input.
- Automatic timeline, factions, characters, and quests generation.
- Player creation and roleplay interaction with the Game Master AI.
- Manual timeline event editing.
- SQLite persistence for worlds, players, and chat history.
- React + Vite frontend with dark theme UI.
- Demo mode for testing without an AI API key.
