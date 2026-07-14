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

**XMultiverse** là một ứng dụng web cho phép bạn nhập một cốt truyện/truyện bất kỳ, sau đó AI tự động **kiến tạo thế giới**, **dòng thời gian**, **nhân vật**, **phe phái**, và **nhiệm vụ**. Từ đó, bạn có thể tạo nhân vật của riêng mình, **nhập vai**, thực hiện hành động, và thậm chí **thêm sự kiện mới** vào timeline.

## Tính năng

- **Sinh thế giới tự động** từ cốt truyện: tên, mô tả, địa lý, phe phái, hệ thống sức mạnh, công nghệ.
- **Dòng thời gian tự động**: AI tạo 6–10 sự kiện lịch sử theo thứ tự thời gian.
- **Nhân vật & nhiệm vụ**: sinh sẵn nhân vật chính và quest cho người chơi.
- **Tạo nhân vật**: người dùng tạo nhân vật riêng để bước vào thế giới.
- **Nhập vai (roleplay)**: nhập hành động, AI trả về cảnh tiếp theo + gợi ý lựa chọn.
- **Chỉnh sửa timeline**: người chơi có thể bổ sung sự kiện lịch sử.
- **Lưu trữ SQLite**: worlds, players, lịch sử chat.
- **Demo mode**: chạy thử không cần AI API key.

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
   cp .env.example .env
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

## Cách sử dụng

1. Mở frontend tại http://localhost:5173.
2. Nhập cốt truyện/truyện vào ô **"Tạo thế giới mới"**.
3. Nhấn **"Kiến tạo thế giới"** — AI sẽ sinh ra thế giới, timeline, nhân vật, phe phái, nhiệm vụ.
4. Tạo nhân vật và nhấn **"Bước vào thế giới"**.
5. Nhập hành động để nhập vai, AI sẽ phản hồi cảnh tiếp theo và đưa ra lựa chọn.
6. Thêm sự kiện mới vào dòng thời gian khi cần.

## API Reference

| Method | Endpoint                       | Mô tả                          |
| ------ | ------------------------------ | ------------------------------ |
| GET    | `/health`                      | Health check                   |
| POST   | `/api/worlds`                  | Tạo thế giới từ story          |
| GET    | `/api/worlds`                  | Danh sách thế giới             |
| GET    | `/api/worlds/:id`              | Chi tiết thế giới              |
| POST   | `/api/worlds/:id/events`       | Thêm sự kiện timeline          |
| POST   | `/api/worlds/:id/players`      | Tạo nhân vật                   |
| GET    | `/api/worlds/:id/players`      | Danh sách nhân vật trong world |
| POST   | `/api/players/:id/act`         | Thực hiện hành động nhập vai   |
| GET    | `/api/players/:id/history`     | Lịch sử chat                   |

## Scripts

| Command          | Mô tả                                    |
| ---------------- | ---------------------------------------- |
| `npm run dev`    | Chạy backend + frontend song song        |
| `npm run build`  | Build cả backend và frontend             |
| `npm run start`  | Chạy backend production                  |
| `npm run lint`   | Kiểm tra formatting với Prettier         |
| `npm run format` | Tự động format code với Prettier         |
| `npm run clean`  | Xóa dist, node_modules, data             |

## Đóng góp

Xem [CONTRIBUTING.md](./CONTRIBUTING.md) và [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Changelog

Xem [CHANGELOG.md](./CHANGELOG.md).

## Giấy phép

[MIT](./LICENSE) © 2026 XMultiverse Contributors
