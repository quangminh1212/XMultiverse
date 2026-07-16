# Contributing to XMultiverse

Cảm ơn bạn quan tâm đến việc đóng góp cho XMultiverse! Tài liệu này mô tả quy trình đóng góp.

## Bắt đầu

1. Fork repository này.
2. Clone fork của bạn: `git clone https://github.com/<your-username>/XMultiverse.git`
3. Cài đặt dependencies: `npm install`
4. Tạo một branch mới cho tính năng/sửa lỗi của bạn: `git checkout -b feature/my-feature`

## Development setup

```bash
npm install
cp .env.example packages/backend/.env   # or set DEMO_MODE=true
npm run dev                             # backend :3001 + frontend :5173
```

## Code standards

- **TypeScript** for backend, frontend, and CLI.
- Follow existing package layout (see [README.md](./README.md)).
- File names: **kebab-case** for modules; **PascalCase** for React components.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) in English, one short line:
  - `feat: add location travel graph`
  - `fix: validate world create input`
  - `docs: update API reference`
  - `test: cover skill checks`
- Before opening a PR, run:

```bash
npm run verify   # lint + test + build
```

Or step by step: `npm run format` → `npm test` → `npm run build`.

## Pull request process

1. Branch from `main` (`feature/*`, `fix/*`, `chore/*`).
2. Pass `npm run verify`.
3. Open a PR using the template; describe problem, approach, and test plan.
4. Update [CHANGELOG.md](./CHANGELOG.md) for user-facing changes.
5. Wait for review; address feedback.

## Quy ước branch

- `main`: branch chính, luôn ở trạng thái build được.
- `feature/*`: tính năng mới.
- `fix/*`: sửa lỗi.
- `chore/*`: bảo trì, cấu hình, dependency.

## Báo cáo lỗi

Mở issue với các thông tin:
- Mô tả lỗi rõ ràng.
- Các bước tái hiện.
- Hành vi mong đợi vs. hành vi thực tế.
- Phiên bản Node.js, OS, browser.

## Giấy phép

Bằng việc đóng góp, bạn đồng ý các đóng góp của bạn được phát hành theo giấy phép MIT.
