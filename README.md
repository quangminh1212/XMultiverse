# XMultiverse

<p align="center">
  <strong>Nhập một câu chuyện — AI sẽ kiến tạo thế giới, dòng thời gian, và cho bạn bước vào sống trong đó.</strong>
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
  <a href="./CHANGELOG.md"><img alt="Changelog" src="https://img.shields.io/badge/Changelog-Keep%20a%20Changelog-blue.svg" /></a>
  <a href="https://nodejs.org"><img alt="Node.js" src="https://img.shields.io/badge/Node.js-%3E%3D18-green.svg" /></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.5-blue.svg" /></a>
</p>

---

## Giới thiệu

**XMultiverse** là platform kiến tạo **thế giới mở** từ cốt truyện, phim, sách hoặc anime. AI sinh **bản đồ địa điểm có thể du hành**, **timeline**, **NPC**, **phe phái**, **quests** — rồi người chơi (hoặc AI agent qua CLI) bước vào **khám phá**, **nhập vai**, và để lại dấu ấn lên thế giới.

## Tính năng

- **Sinh thế giới mở** từ story/movie/book/anime: geography + đồ thị locations nối nhau.
- **Du hành (travel)**: di chuyển giữa địa điểm, gặp NPC theo vùng, khám phá open world.
- **Preset cốt truyện/phim** trên UI để kiến tạo nhanh.
- **Dòng thời gian**: 6–10 sự kiện lịch sử; người chơi có thể bổ sung.
- **Nhân vật & quest log**: quest theo dõi active/completed/failed.
- **Nhập vai (roleplay)**: scene, choices, dice checks, effects, items, XP, relationships.
- **RPG systems**: stats, inventory, 1d20 skill checks, NPC disposition, save/load.
- **CLI cho AI agent**: `xmv world/player/act/travel/save/... --json`.
- **SQLite persistence** + **Demo mode** (không cần AI key).
- **Cross-platform**: Windows, macOS, Linux.

## Yêu cầu hệ thống

| Yêu cầu     | Phiên bản    | Ghi chú                                  |
| ----------- | ------------ | ---------------------------------------- |
| Node.js     | >= 18        | Cần thiết cho `fetch` built-in           |
| npm         | >= 9         | Đi kèm Node.js                           |
| Hệ điều hành| Windows 10+ / macOS 11+ / Linux (glibc 2.31+) | `better-sqlite3` cần native build |

### Ghi chú theo nền tảng

- **Windows**: `better-sqlite3` cần Visual Studio Build Tools (cài qua `npm install -g windows-build-tools` hoặc "Desktop development with C++" workload trong VS Installer). Hoặc dùng prebuilt binary (mặc định).
- **macOS**: Cần Xcode Command Line Tools (`xcode-select --install`).
- **Linux**: Cần `python3`, `make`, `g++` (cho native build). Trên Ubuntu/Debian: `sudo apt install build-essential python3`.

## Công nghệ

| Layer      | Công nghệ                                          |
| ---------- | -------------------------------------------------- |
| Backend    | Node.js, Express, TypeScript, SQLite (better-sqlite3) |
| Frontend   | React, Vite, TypeScript                            |
| AI         | Bất kỳ API tương thích OpenAI (OpenAI, Groq, Gemini, OpenRouter...) |
| Monorepo   | npm workspaces                                     |

## Cấu trúc dự án

```
xmultiverse/
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI: build & format check
│       └── release.yml         # Auto release on tag
├── .vscode/                    # Editor config (VS Code)
├── packages/
│   ├── backend/                # @xmultiverse/backend
│   │   └── src/
│   │       ├── config/         # Cấu hình môi trường
│   │       ├── middleware/     # Express middleware (error handlers)
│   │       ├── routes/         # Định nghĩa API routes
│   │       ├── services/       # Business logic (AI client, worldgen, repository)
│   │       ├── types/          # TypeScript domain types
│   │       ├── app.ts          # Express app setup
│   │       └── index.ts        # Entry point
│   └── frontend/               # @xmultiverse/frontend
│       └── src/
│           ├── components/     # Reusable UI components
│           ├── hooks/          # Custom React hooks
│           ├── pages/          # Page-level views
│           ├── services/       # API client
│           ├── styles/         # Global styles
│           ├── types/          # TypeScript domain types
│           ├── App.tsx
│           └── main.tsx
├── .editorconfig
├── .env.example
├── .gitattributes
├── .gitignore
├── .prettierrc.json
├── .prettierignore
├ ├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├ ├── CONTRIBUTING.md
├ ├── LICENSE
├ ├── README.md
├ ├── package.json
└── tsconfig.base.json
```

## Cài đặt

### Yêu cầu

- [Node.js](https://nodejs.org/) >= 18
- npm (đi kèm Node.js)
- Một API key AI (OpenAI, Groq, Gemini, OpenRouter...)

### Các bước

1. **Clone & cài dependencies:**

   ```bash
   git clone <repo-url> XMultiverse
   cd XMultiverse
   npm install
   ```

2. **Cấu hình môi trường:**

   ```bash
   # macOS / Linux
   cp .env.example .env

   # Windows (Command Prompt)
   copy .env.example .env

   # Windows (PowerShell)
   Copy-Item .env.example .env
   ```

   Mở file `.env` và điền:

   ```env
   AI_API_KEY=sk-...
   AI_BASE_URL=https://api.openai.com/v1
   AI_MODEL=gpt-4o-mini
   DEMO_MODE=false
   PORT=3001
   DB_PATH=./data/worlds.db
   ```

   <details>
   <summary>Ví dụ với các provider khác</summary>

   **Groq:**
   ```env
   AI_API_KEY=gsk_...
   AI_BASE_URL=https://api.groq.com/openai/v1
   AI_MODEL=llama3-70b-8192
   ```

   **OpenRouter:**
   ```env
   AI_API_KEY=sk-or-...
   AI_BASE_URL=https://openrouter.ai/api/v1
   AI_MODEL=anthropic/claude-3.5-sonnet
   ```

   **Demo mode (không cần key):**
   ```env
   DEMO_MODE=true
   ```
   </details>

3. **Chạy ứng dụng:**

   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001
   - Health check: http://localhost:3001/health

### Sử dụng CLI

```bash
# Build CLI trước (nếu chưa build)
npm run build

# Chạy CLI trực tiếp
node packages/cli/dist/index.js help
node packages/cli/dist/index.js doctor
node packages/cli/dist/index.js start
node packages/cli/dist/index.js world create --story "..." --json

# Hoặc link globally
npm link
xmv help
```

### Vị trí log file (theo nền tảng)

| Nền tảng | Đường dẫn                                   |
| -------- | ------------------------------------------- |
| Windows  | `%LOCALAPPDATA%\XMultiverse\log.txt`        |
| macOS    | `~/Library/Logs/XMultiverse/log.txt`        |
| Linux    | `~/.local/share/XMultiverse/log.txt`        |

Log file tự động xóa khi vượt quá 100MB.

## Cách sử dụng

1. Mở frontend tại http://localhost:5173.
2. Nhập cốt truyện/truyện vào ô **"Tạo thế giới mới"**.
3. Nhấn **"Kiến tạo thế giới"** — AI sẽ sinh ra thế giới, timeline, nhân vật, phe phái, nhiệm vụ.
4. Tạo nhân vật và nhấn **"Bước vào thế giới"**.
5. Nhập hành động để nhập vai, AI sẽ phản hồi cảnh tiếp theo và đưa ra lựa chọn.
6. Thêm sự kiện mới vào dòng thời gian khi cần.

## API Reference

| Method | Endpoint | Mô tả |
| ------ | -------- | ----- |
| GET | `/health` | Health check |
| GET | `/api/config` | Scales + feature flags + default limits |
| GET | `/api/config/scales` | Danh sách open-world scale |
| GET | `/api/config/features` | Module feature toggles |
| POST | `/api/worlds` | Tạo thế giới (`story`, `sourceType`, `scale`) |
| GET | `/api/worlds` | Danh sách thế giới |
| GET | `/api/worlds/:id` | Chi tiết thế giới |
| DELETE | `/api/worlds/:id` | Xóa thế giới |
| GET | `/api/worlds/:id/export` | Export world pack JSON |
| POST | `/api/worlds/import` | Import world pack (new IDs) |
| GET | `/api/worlds/:id/locations` | Bản đồ địa điểm |
| GET/POST | `/api/players/:id/journal` | Nhật ký khám phá |
| GET | `/api/players/:id/discovery` | % địa điểm đã khám phá |
| POST | `/api/worlds/:id/events` | Thêm sự kiện timeline |
| POST | `/api/worlds/:id/players` | Tạo nhân vật |
| GET | `/api/worlds/:id/players` | Danh sách nhân vật |
| POST | `/api/players/:id/act` | Hành động nhập vai |
| POST | `/api/players/:id/travel` | Du hành tới location |
| GET | `/api/players/:id/location` | Vị trí hiện tại |
| GET | `/api/players/:id/history` | Lịch sử chat |
| GET/POST | `/api/players/:id/quests` | Quest log |
| POST/DELETE | `/api/players/:id/inventory` | Túi đồ |
| GET/POST | `/api/players/:id/relationships` | NPC disposition |
| POST | `/api/roll`, `/api/players/:id/check` | Dice / skill check |
| POST/GET | `/api/players/:id/saves` | Save snapshots |
| POST | `/api/saves/:id/load` | Load snapshot |

## Scripts

| Command           | Mô tả                                         |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Backend + frontend song song                  |
| `npm run build`   | Build backend, frontend, CLI                  |
| `npm run start`   | Backend production                            |
| `npm test`        | Unit tests (Vitest, backend)                  |
| `npm run verify`  | lint + test + build (CI-equivalent)           |
| `npm run lint`    | Prettier check                                |
| `npm run format`  | Prettier write                                |
| `npm run clean`   | Xóa dist, node_modules, data                  |

## Security

Xem [SECURITY.md](./SECURITY.md). API trả lỗi dạng `{ error, code }`, có security headers và rate limit cấu hình qua env.

## Đóng góp

Xem [CONTRIBUTING.md](./CONTRIBUTING.md) và [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Changelog

Xem [CHANGELOG.md](./CHANGELOG.md).

## Giấy phép

[MIT](./LICENSE) © 2026 XMultiverse Contributors
