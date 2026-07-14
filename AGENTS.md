# AGENTS.md — Hướng dẫn cho AI Agent dùng XMultiverse

Tài liệu này dành cho các AI agent (Devin, Claude, GPT, v.v.) muốn tương tác với dự án XMultiverse qua command line.

## Quick Start

```bash
# 1. Cài dependencies (chỉ lần đầu)
npm install

# 2. Khởi động backend
npm run xmv start

# 3. Kiểm tra health
npm run xmv health

# 4. Tạo thế giới từ cốt truyện
npm run xmv world create -- --story "Một hiệp sĩ tìm kiếm thanh kiếm thần để đánh bại quỷ vương"

# 5. Tạo nhân vật
npm run xmv player create -- --world <WORLD_ID> --name "Kael" --role "Kiếm sĩ"

# 6. Nhập vai — thực hiện hành động
npm run xmv act -- --id <PLAYER_ID> --action "Tiến vào Rừng sâu Bóng Đêm"

# 7. Dừng server khi xong
npm run xmv stop
```

## CLI Reference

Tất cả lệnh đều có flag `--json` để xuất JSON (cho AI agent parse) và `--verbose` để xem data chi tiết.

### Server

| Lệnh | Mô tả |
|------|-------|
| `xmv start` | Khởi động backend (background process) |
| `xmv stop` | Dừng backend |
| `xmv status` | Kiểm tra backend đang chạy không |
| `xmv health` | Health check endpoint |

### World

| Lệnh | Mô tả |
|------|-------|
| `xmv world create --story "..."` | Tạo thế giới từ cốt truyện |
| `xmv world list` | Liệt kê tất cả thế giới |
| `xmv world get --id <worldId>` | Xem chi tiết thế giới |

### Player

| Lệnh | Mô tả |
|------|-------|
| `xmv player create --world <id> --name "..." --role "..." [--backstory "..."] [--faction "..."]` | Tạo nhân vật |
| `xmv player list --world <id>` | Liệt kê nhân vật trong thế giới |

### Roleplay

| Lệnh | Mô tả |
|------|-------|
| `xmv act --id <playerId> --action "..."` | Thực hiện hành động nhập vai |
| `xmv history --id <playerId>` | Xem lịch sử chat |

### Timeline

| Lệnh | Mô tả |
|------|-------|
| `xmv event add --world <id> --title "..." --desc "..." [--year 2024] [--important]` | Thêm sự kiện timeline |

## JSON Output Format

Khi dùng `--json`, mọi lệnh xuất theo format thống nhất:

```json
{
  "ok": true,
  "command": "world-create",
  "message": "Đã tạo thế giới \"Vùng đất bóng tối\" (ID: abc-123)",
  "data": { ... },
  "timestamp": "2026-07-15T00:00:00.000Z"
}
```

- `ok`: `true` nếu thành công, `false` nếu lỗi
- `command`: tên lệnh đã chạy
- `message`: mô tả kết quả (tiếng Việt)
- `data`: data chi tiết (world, player, result, v.v.)
- `timestamp`: ISO 8601

## Workflow đầy đủ cho AI Agent

```bash
# Bước 1: Khởi động
npm run xmv start -- --json
# → Parse response, kiểm tra ok=true

# Bước 2: Tạo thế giới
npm run xmv world create -- --story "..." --json
# → Parse data.id → WORLD_ID

# Bước 3: Tạo nhân vật
npm run xmv player create -- --world <WORLD_ID> --name "Hero" --role "Warrior" --json
# → Parse data.id → PLAYER_ID

# Bước 4: Nhập vai (lặp nhiều lần)
npm run xmv act -- --id <PLAYER_ID> --action "..." --json
# → Parse data.scene, data.choices, data.events

# Bước 5: Thêm sự kiện timeline nếu cần
npm run xmv event add -- --world <WORLD_ID> --title "..." --desc "..." --json

# Bước 6: Dọn dẹp
npm run xmv stop -- --json
```

## Build & Verify

```bash
npm run build          # Build tất cả packages
npm run lint           # Kiểm tra formatting
npm run format         # Tự động format
```

## Environment Variables

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `XMV_API_URL` | `http://localhost:3001` | URL backend cho CLI |
| `AI_API_KEY` | — | API key cho AI (OpenAI, Groq, Gemini...) |
| `AI_BASE_URL` | `https://api.openai.com/v1` | Base URL AI provider |
| `AI_MODEL` | `gpt-4o-mini` | Model AI |
| `DEMO_MODE` | `false` | Bật demo mode (không cần AI key) |
| `PORT` | `3001` | Port backend |
| `DB_PATH` | `./data/worlds.db` | Đường dẫn SQLite |

## Lưu ý

- Backend phải đang chạy trước khi gọi `world create`, `player create`, `act`, v.v.
- Dùng `xmv start` để khởi động backend background, hoặc `npm run dev` để chạy cả backend + frontend.
- Trong demo mode (`DEMO_MODE=true`), thế giới được sinh từ template cố định, không gọi AI thật.
- Để dùng AI thật: set `AI_API_KEY` và `DEMO_MODE=false` trong `.env`.
- File `.env` phải nằm ở `packages/backend/.env` (hoặc root, backend sẽ tìm cả hai).
