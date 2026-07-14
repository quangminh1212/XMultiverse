/** Help text for the CLI. */

export const HELP_TEXT = `
XMultiverse CLI — Tập lệnh cho AI agent và người dùng
=====================================================

CÚ PHÁP:
  xmv <command> [subcommand] [options]
  xmv <command> --json              Xuất JSON (cho AI agent parse)
  xmv <command> --verbose           Xuất thêm data chi tiết

CHẨN ĐOÁN:
  xmv doctor                       Kiểm tra tất cả: .env, AI key, backend, deps
                                    → Cho biết đang thiếu gì và cách sửa
  xmv log [--lines 50]             Xem log file gần đây (mặc định 50 dòng)
                                    → Log file ở: %LOCALAPPDATA%\XMultiverse\log.txt

LỆNH THUỘC DỰ ÁN:
  xmv start                         Khởi động backend server (background)
  xmv stop                          Dừng backend server
  xmv status                        Kiểm tra backend đang chạy hay không
  xmv health                        Kiểm tra health endpoint của backend

THẾ GIỚI:
  xmv world create --story "..."    Tạo thế giới mới từ cốt truyện
  xmv world list                    Liệt kê tất cả thế giới
  xmv world get --id <worldId>      Xem chi tiết thế giới

NHÂN VẬT:
  xmv player create --world <id> --name "..." --role "..." [--backstory "..."] [--faction "..."]
                                    Tạo nhân vật trong thế giới
  xmv player list --world <id>      Liệt kê nhân vật trong thế giới

NHẬP VAI:
  xmv act --id <playerId> --action "..."
                                    Thực hiện hành động nhập vai
  xmv history --id <playerId>       Xem lịch sử chat

TIMELINE:
  xmv event add --world <id> --title "..." --desc "..." [--year 2024] [--important]
                                    Thêm sự kiện vào dòng thời gian

VÍ DỤ CHO AI AGENT:
  # Bước 0: Chẩn đoán môi trường
  xmv doctor --json

  # Bước 1: Workflow đầy đủ (JSON output cho agent parse):
  xmv start --json
  xmv world create --story "Một hiệp sĩ tìm kiếm thanh kiếm thần" --json
  xmv player create --world <worldId> --name "Kael" --role "Kiếm sĩ" --json
  xmv act --id <playerId> --action "Tiến vào rừng sâu" --json
  xmv event add --world <worldId> --title "Trận chiến đầu tiên" --desc "..." --year 2024 --json
  xmv stop --json

JSON OUTPUT FORMAT:
  Mọi lệnh --json xuất: { ok, command, message, data, steps, checklist?, missing?, nextSteps?, timestamp }
  - ok:         true/false — thành công hay thất bại
  - steps:      các bước đã thực hiện [{ index, total, label, status }]
  - checklist:  kết quả kiểm tra (chỉ lệnh doctor)
  - missing:    danh sách những thứ đang thiếu
  - nextSteps:  gợi ý bước tiếp theo cần làm

BIẾN MÔI TRƯỜNG:
  XMV_API_URL    URL backend (mặc định: http://localhost:3001)
  XMV_DEBUG      true để bật debug logging

LOG FILE:
  Tất cả log được ghi vào: %LOCALAPPDATA%\XMultiverse\log.txt
  Tự động xóa khi file vượt quá 100MB.
  Xem log: xmv log --lines 100
`.trim();
