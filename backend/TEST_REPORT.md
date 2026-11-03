# Báo cáo Giai đoạn 2 — 03/11/2026

## Kết quả kiểm chứng

- Backend typecheck, build, ESLint: đạt.
- Typecheck dự án gốc: đạt; không sửa frontend/config gốc trong giai đoạn 2.
- HTTP/unit tests: 41/41 đạt, không skip. Express/Supertest chạy thật qua
  localhost với Prisma giả lập; không ghi database phát triển.
- Server đã build khởi động thành công trên 127.0.0.1:3001.
- GET /api/health với PostgreSQL thật: 200,
  {"data":{"status":"ok","database":"connected"}}. Server thử đã dừng.
- PostgreSQL 15.19, trohome_db: kiểm tra trong transaction READ ONLY;
  cả 9 model đều 0 bản ghi trước/sau; 4 CHECK và 3 partial unique index tồn tại.
- Prisma validate: đạt. migrate status: Database schema is up to date.
- CLI/Client giữ 6.19.3, đã ghim phiên bản chính xác trong package.json.

## Phạm vi tests

Health thành công/thất bại; đăng ký hash mật khẩu, chặn tự cấp host;
đăng nhập đúng/sai; rate limit; phiên sai/hết hạn/đăng xuất; đổi mật khẩu
vô hiệu hóa phiên; profile đồng bộ Tenant; CORS; ẩn lỗi nội bộ; UUID/query/body;
mass assignment; PATCH không ghi đè trường bị bỏ trống.

Phân quyền host/tenant; bộ lọc sở hữu; thêm/sửa khu trọ; thêm/sửa/xóa phòng;
gửi/duyệt yêu cầu thuê và giữ chỗ; tenant không được duyệt; lập/kết thúc hợp đồng;
phòng occupied; tenant không liên quan; phòng reserved cho người khác;
hóa đơn chốt giá; trùng kỳ; kỳ ngoài hợp đồng; tổng tiền Decimal;
host ghi nhận thanh toán; chặn tenant xác nhận và chặn mở lại hóa đơn paid;
sửa chữa chỉ khi có hợp đồng; tenant không được xác nhận hoàn tất;
xóa yêu thích chỉ của mình.

Mock tests kiểm chứng HTTP, quyền và nhánh nghiệp vụ, không thay thế integration
ghi dữ liệu thực. Chưa có database test riêng nên không chạy concurrency,
rollback hoặc FK tests mới trên PostgreSQL trong giai đoạn này.
Không chạy lại script ghi dữ liệu kiểm thử của giai đoạn 1.

## Dependency audit

Cài dependency báo 14 cảnh báo (11 moderate, 3 high).
Audit --omit=dev xác nhận 3 high trong chuỗi Prisma → @prisma/config →
deepmerge-ts (GHSA-ggr8-5vv4-36mx). npm đề xuất nâng Prisma major;
không áp dụng vì yêu cầu giữ 6.19.3. Không khẳng định dependency hoàn toàn sạch.
Cần rà soát và duyệt hướng xử lý riêng trước production; chưa triển khai production.

## Giới hạn

Phiên/rate limit lưu RAM, chỉ dùng một tiến trình; restart đăng xuất. Phiên
gắn fingerprint passwordHash nên thay mật khẩu khiến phiên cũ không hợp lệ.
Không có tài khoản host trong database rỗng; API không tự cấp đặc quyền.
Việc cấp host cần bước vận hành được duyệt riêng.

Tenant chưa có ownerId: không mở CRUD tenant độc lập. Host chỉ thấy tenant có
hợp đồng hoặc inquiry accepted. Đăng ký tạo Tenant; cập nhật qua auth/me.
Không có thanh toán trực tuyến/hoàn tiền/trả góp, upload file, quên mật khẩu,
nhắc việc lưu trữ hoặc audit log.

Không sửa schema/migration, không seed, không thay MockAPI hoặc nối frontend.
Giai đoạn 3 cần phê duyệt riêng.

## File chính

src/app.ts, server.ts; config, middlewares, routes, services, validators, utils;
tests/api.test.ts, tests/database-readonly.cjs; package.json/package-lock.json;
tsconfig.json, eslint.config.mjs, .env.example, .gitignore;
API_DOCUMENTATION.md, BACKEND_SETUP.md, TEST_REPORT.md.
Các file database giai đoạn 1 được giữ nguyên.
