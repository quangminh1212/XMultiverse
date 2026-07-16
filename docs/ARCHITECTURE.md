# Architecture — AUTOSAR-inspired modular layout

## Source layout

```
packages/backend/src/
├── app.ts / index.ts          # process entry
├── config/                    # scale, features, limits (global)
├── platform/                  # BSW — shared infrastructure
│   ├── repository.ts          # SQLite
│   ├── logger.ts
│   ├── dice.ts
│   ├── worldgen.ts            # generation engine
│   ├── player-state.ts
│   ├── ai-client.ts
│   ├── middleware/
│   └── types/
└── modules/                   # one SWC per folder
    ├── runtime/               # RTE, modes, watchdog, isolation
    ├── meta/                  # /api/config*
    ├── world/                 # index + routes + service
    ├── player/
    ├── roleplay/
    ├── travel/
    ├── quest/
    ├── journal/
    ├── rpg/
    ├── save/
    ├── auth/
    ├── multiplayer/
    ├── marketplace/
    └── streaming/
```

Each **module folder** is a software component:

| File | Role |
|------|------|
| `index.ts` | Register `FeatureModule` (id, feature flag, createRouter) |
| `routes.ts` | HTTP ports only for this SWC |
| `service.ts` | Public functions other SWCs/tools may import |

## Isolation (runtime)

- Registry mounts each SWC with `isolateRouter(id, router)`.
- Errors return `{ isolated: true, moduleId }` — siblings keep serving.
- `rte.invoke` + circuit breaker + modes (`full|core|degraded|safe`).
- See `GET /api/runtime/health`.

## Adding a new module

1. Create `modules/foo/{index,routes,service}.ts`
2. Add `FeatureId` in `config/features.ts` if optional
3. Register in `modules/registry.ts` `HTTP_MODULES` array
4. Keep imports of other SWCs only via their `service.ts` (not routes)

## Do not

- Put multi-domain routes back into one mega-file
- Call into another module’s private files — use `service.ts`
- Let a hung AI call block the process without RTE timeout
