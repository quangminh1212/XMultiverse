# Contributing to XMultiverse

Cảm ơn bạn quan tâm đến việc đóng góp cho XMultiverse! Tài liệu này mô tả quy trình đóng góp.

## Bắt đầu

1. Fork repository này.
2. Clone fork của bạn: `git clone https://github.com/<your-username>/XMultiverse.git`
3. Cài đặt dependencies: `npm install`
4. Tạo một branch mới cho tính năng/sửa lỗi của bạn: `git checkout -b feature/my-feature`

## Quy ước code

- Sử dụng **TypeScript** cho cả backend và frontend.
- Tuân thủ cấu trúc thư mục hiện có (xem [README.md](./README.md)).
- Đặt tên file theo **kebab-case** cho file thường, **PascalCase** cho component React.
- Viết commit message theo [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: thêm tính năng X`
  - `fix: sửa lỗi Y`
  - `docs: cập nhật README`
  - `refactor: tái cấu trúc module Z`
- Chạy `npm run build` trước khi commit để đảm bảo không có lỗi TypeScript.
- Chạy `npm run lint` (nếu có) để kiểm tra style code.

## Quy trình Pull Request

1. Đảm bảo code build thành công: `npm run build`
2. Push branch lên fork của bạn.
3. Mở Pull Request về branch `main` của repository gốc.
4. Mô tả rõ ràng thay đổi trong PR: vấn đề giải quyết, cách tiếp cận, ảnh hưởng.
5. Đợi review và phản hồi các bình luận.

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
