# AGENTS.md — Hướng dẫn cho AI Agent dùng XMultiverse

Tài liệu này dành cho các AI agent muốn tương tác với **XMultiverse 1.2.0** — platform open-world modular.

## Quick Start

```bash
npm install
npm run build

# Demo mode (không cần AI key)
# packages/backend/.env → DEMO_MODE=true

npm run xmv -- start --json
npm run xmv -- world create --story "..." --source movie --scale expansive --json
npm run xmv -- player create --world <WORLD_ID> --name "Kael" --role "Warrior" --json
npm run xmv -- travel --id <PLAYER_ID> --to "Location Name" --json
npm run xmv -- act --id <PLAYER_ID> --action "Explore" --json
npm run xmv -- world export --id <WORLD_ID> --out pack.xmv.json --json
npm run xmv -- stop --json
```

## Quality gate

```bash
npm run verify   # lint + unit/smoke tests + build
npm run smoke    # E2E API loop only
```

## Open-world scales

| Scale | ~locations | Env |
|-------|------------|-----|
| compact | 5 | `XMV_WORLD_SCALE=compact` |
| standard | 8 | default |
| expansive | 16 | |
| epic | 28–32 | |

Override: `XMV_LOCATIONS_MAX`, `XMV_QUESTS_MAX`, …

## Feature modules

Domain services (import when extending):

```
packages/backend/src/modules/
  world/service.ts
  travel/service.ts
  roleplay/service.ts
  quest/service.ts
  journal/service.ts
  rpg/service.ts
  save/service.ts
  game/routes.ts      # HTTP surface
  meta/routes.ts      # /api/config*
  registry.ts
```

Disable optional features:

```env
XMV_FEATURES_DISABLED=journal,relationships
```

## CLI Reference

| Lệnh | Mô tả |
|------|-------|
| `xmv doctor` | Chẩn đoán env |
| `xmv start` / `stop` / `status` / `health` | Server |
| `xmv world create --story "..." [--source] [--scale]` | Tạo world |
| `xmv world list` / `get` / `export` / `import` | World |
| `xmv player create` / `list` | Nhân vật |
| `xmv travel --id --to` | Du hành |
| `xmv act` / `history` | Roleplay |
| `xmv stats` / `inventory` / `roll` / `check` | RPG |
| `xmv save` / `load` / `saves` | Snapshot |
| `xmv event add` | Timeline |

Mọi lệnh hỗ trợ `--json`.

## JSON Output

```json
{
  "ok": true,
  "command": "world-create",
  "message": "...",
  "data": { },
  "timestamp": "..."
}
```

## API (selected)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/health` | Health + modular + scale |
| GET | `/api/config` | Scales + features + limits |
| POST | `/api/worlds` | `{ story, sourceType?, scale? }` |
| GET | `/api/worlds/:id/export` | World pack |
| POST | `/api/worlds/import` | Import pack |
| POST | `/api/players/:id/travel` | `{ locationId }` |
| POST | `/api/players/:id/act` | `{ action, autosave? }` |

## Environment

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `XMV_API_URL` | `http://localhost:3001` | CLI → backend |
| `AI_API_KEY` | — | AI provider |
| `AI_BASE_URL` | OpenAI | |
| `AI_MODEL` | `gpt-4o-mini` | |
| `DEMO_MODE` | `false` | Template worlds offline |
| `PORT` | `3001` | |
| `DB_PATH` | `./data/worlds.db` | |
| `XMV_WORLD_SCALE` | `standard` | Default scale |
| `XMV_FEATURES_DISABLED` | — | Comma feature ids |

## Isolation runtime (AUTOSAR-inspired)

Modules are **software components (SWCs)** with independent health:

| Concept | Implementation |
|---------|----------------|
| SWC | `modules/*` + feature id |
| RTE | `modules/runtime/rte.ts` — `rte.invoke(id, op, fn)` |
| Watchdog / CB | circuit CLOSED → OPEN after N failures; auto HALF_OPEN |
| Mode Manager | `full` \| `core` \| `degraded` \| `safe` (`XMV_MODE`) |
| HTTP isolation | `isolateRouter(id, router)` — 5xx stays in that SWC |

```bash
curl http://localhost:3001/api/runtime/health
curl -X POST http://localhost:3001/api/runtime/modes/core
curl -X POST http://localhost:3001/api/runtime/modules/marketplace/reset
```

Env: `XMV_MODULE_TIMEOUT_MS`, `XMV_CB_FAILURES`, `XMV_CB_OPEN_MS`, `XMV_AI_TIMEOUT_MS`, `XMV_MODE`.

## v1.3.0 platform features

| Module | API highlights |
|--------|----------------|
| Auth | `POST /auth/register`, `/auth/login`, `GET /auth/me` |
| Multiplayer | `POST /worlds/:id/share`, `/multiplayer/join`, `/players/:id/presence`, `GET /worlds/:id/online` |
| Marketplace | `GET /market/packs`, `POST /market/publish`, `POST /market/packs/:id/install` |
| Streaming | `POST /players/:id/act/stream` (SSE) |
| PWA | `/manifest.webmanifest`, `/sw.js` |

## Completion criteria (v1.3.0)

1. Open-world graph + scales + modular services  
2. Roleplay / RPG / quest / journal / discovery  
3. Save-load + export/import  
4. Auth local + multiplayer share/presence  
5. Marketplace packs + streaming GM + PWA mobile  
6. `npm run verify` (unit + smoke E2E) PASS  
7. OSS docs + CI  

Future (optional): OAuth cloud, realtime websocket rooms, native mobile shells.
