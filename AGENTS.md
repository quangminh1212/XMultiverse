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

## Completion criteria (v1.2.0)

Platform single-player open-world được coi là **hoàn thiện** khi:

1. Tạo world từ story/movie với scale tùy chỉnh  
2. Bản đồ graph + travel có rule connection  
3. Roleplay + RPG (stats, inventory, dice)  
4. Quest / journal / discovery  
5. Save-load + export/import pack  
6. CLI agent JSON + UI web  
7. Module registry + feature flags  
8. Unit + smoke E2E pass (`npm run verify`)  
9. OSS: LICENSE, SECURITY, CI, CONTRIBUTING, CHANGELOG  

Ngoài scope v1 (có thể làm sau): multiplayer, auth cloud, streaming AI, marketplace packs.
