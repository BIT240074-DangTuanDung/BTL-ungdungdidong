# Dữ liệu demo TroHome — Giai đoạn 3

Seed dựa trên lib/seed.ts hiện có, không sửa frontend, schema hoặc migration.
UUID ổn định được ánh xạ từ ID cũ theo namespace trohome-demo-v1.

## Bộ dữ liệu

- 4 tài khoản: demo.host (chủ trọ), demo.lan và demo.minh (người thuê),
  demo.viewer (người xem/gửi yêu cầu).
- 1 khu trọ CMC, 50 phòng (2 occupied, 48 vacant/listed).
- 2 hồ sơ người thuê, 2 hợp đồng active.
- 3 hóa đơn: paid, unpaid, overdue; có đơn giá điện nước chốt từ dữ liệu mẫu.
- 1 yêu cầu thuê gắn demo.viewer, 1 yêu cầu sửa chữa của Lan, 2 yêu thích.

Giữ các mốc ngày 2026–2027 của bộ mẫu để phù hợp dữ liệu ứng dụng; không tự đổi
tháng theo thời điểm chạy. Số điện thoại/giấy tờ là dữ liệu từ seed hiện có,
không dùng để liên hệ hoặc xác minh người thật. Cờ isDepositPaid để false:
không mô phỏng chứng từ chuyển tiền cọc thực.

## Tài khoản và mật khẩu

Mật khẩu sinh ngẫu nhiên riêng cho mỗi tài khoản, bcrypt cost 12 trong DB.
Xem username/password tại backend/.seed-accounts.local.json trên máy của bạn.
File đã được Git ignore, không in mật khẩu trong log hoặc tài liệu.
Không chia sẻ/commit file này; đổi mật khẩu khi sử dụng ngoài demo.
Tài khoản demo này đăng nhập REST API mới, chưa đăng nhập frontend cục bộ hiện tại.

## Lệnh tại backend

- npm run seed:preview: xem số lượng dự kiến, không ghi DB/tạo tài khoản.
- npm run seed: chạy Prisma db seed với --apply rõ ràng.
- npm run typecheck:seed: kiểm tra TypeScript riêng cho seed.
- node node_modules/tsx/dist/cli.mjs tests/seed-smoke.ts: kiểm tra đăng nhập
  và quyền trên database đã seed, không tạo thêm dữ liệu.
- Thêm --check-rerun vào lệnh trên để kiểm chứng lần seed thứ hai không thay đổi
  fingerprint của bất kỳ bảng nào. Chỉ dùng trên môi trường demo đã tạo đủ bộ mẫu.

Script chỉ cho phép localhost/127.0.0.1, database trohome_db, schema public,
NODE_ENV khác production. Không có --apply thì chỉ preview, kể cả Prisma gọi
seed tự động. Không dùng migrate reset hoặc db push.

Trong transaction, script khóa các bảng để tránh ghi đồng thời:
1. Nếu toàn bộ ID demo đã có: dừng thành công, không cập nhật bản ghi/mật khẩu.
2. Nếu database có dữ liệu nhưng demo chưa đủ: dừng, không tự sửa/xóa/import bù.
3. Nếu rỗng: tạo cả bộ demo trong một transaction; lỗi thì rollback toàn bộ.

Nếu bạn xóa một phần demo, seed sẽ dừng để bảo vệ dữ liệu còn lại; không reset.
Nếu đã đổi mật khẩu, file credentials cũ có thể không còn dùng được; seed không
đặt lại mật khẩu. Không xóa file credentials rồi kỳ vọng lấy lại mật khẩu DB.

## Kết quả thực hiện

Đã tạo backup trước seed tại backend/backups, không đưa lên Git.
Backup đã kiểm tra đọc được, chưa thử phục hồi vào database riêng.
Seed đã tạo thành công đủ số lượng nêu trên trong PostgreSQL.
Đã kiểm chứng seed lần hai giữ nguyên fingerprint của toàn bộ 9 bảng, kể cả
mật khẩu. Đăng nhập/logout và GET dữ liệu qua API thành công cho cả 4 tài khoản;
host thấy 3 hóa đơn, Lan 2, Minh 1, viewer 0. Lan không truy cập được hóa đơn Minh.
Các kiểm tra API không thay đổi bản ghi. API/MockAPI/frontend được giữ nguyên.
Typecheck backend, seed và dự án gốc đều đạt; ESLint code backend/seed/tests đạt.
41/41 kiểm thử API giả lập đạt. Prisma validate đạt, migration vẫn đồng bộ.
Prisma 6 cảnh báo cấu hình seed trong package.json sẽ bị bỏ ở Prisma 7;
đây là cảnh báo tương thích tương lai, không nâng phiên bản trong giai đoạn này.

## Expo Go

Ứng dụng Expo Go vẫn dùng dữ liệu cục bộ của RentalContext. Seed không tự
kết nối frontend vào API. Bước tích hợp riêng cần đổi lớp lưu dữ liệu/auth và
dùng IP LAN của máy tính làm địa chỉ API; không dùng localhost từ điện thoại.
Chưa sửa HOST, firewall hoặc cấu hình Expo trong giai đoạn seed.
