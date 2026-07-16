# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
