# Chạy backend TroHome

Node.js 22+ (đã kiểm tra trên Node 24), PostgreSQL 15, Prisma/Client 6.19.3.
Chỉ làm việc tại backend. Không chạy seed/migrate reset/db push.

1. npm ci
2. Giữ nguyên .env hiện có; tham khảo .env.example để bổ sung PORT, HOST,
   CORS_ORIGINS, SESSION_TTL_SECONDS. Không ghi đè DATABASE_URL.
3. npm run prisma:validate và npm run prisma:status (chỉ đọc).
4. npm run build rồi npm start; hoặc npm run dev.
5. GET http://127.0.0.1:3001/api/health.

Máy thiếu npm trong PATH có thể dùng pnpm dlx npm@10 thay npm.
Không dùng npm audit fix --force vì có thể nâng Prisma ngoài phiên bản yêu cầu.

Server mặc định bind 127.0.0.1:3001; chỉ mở HOST=0.0.0.0 khi cần thiết cho
thiết bị trong mạng và đã cấu hình firewall. CORS_ORIGINS là danh sách origin
ngăn bằng dấu phẩy, không wildcard. Native client không có Origin vẫn dùng được
nhưng luôn cần token cho tài nguyên. TLS phải được triển khai trước sử dụng
ngoài máy; không bật trust proxy tùy tiện. Chưa triển khai production.

Ctrl+C/SIGTERM ngừng nhận request rồi disconnect Prisma, timeout 10 giây.
Lỗi startup không in chuỗi kết nối hoặc stack. Không log body/password/token.
Bearer token là chuỗi ngẫu nhiên; không cần JWT_SECRET. Server chỉ lưu SHA-256
của token, hết hạn tuyệt đối, tối đa 10.000 phiên trong bộ nhớ.

## Cấu trúc

src/config: cấu hình và Prisma singleton.
src/middlewares: authentication/role guards.
src/routes: HTTP parsing/validation/response cho auth và tài nguyên.
src/services: session, quyền truy cập và transaction nghiệp vụ.
src/validators: allowlist Zod cho body/query/params.
src/utils: lỗi tập trung; app.ts hỗ trợ dependency injection để kiểm thử;
server.ts chỉ khởi động và đóng kết nối. Không thêm controller trống để đủ thư mục.

## Kiểm thử không ghi database phát triển

- npm run typecheck
- npm run lint
- npm test: HTTP tests qua Supertest với Prisma giả lập; không cần DATABASE_URL.
- npm run test:db: chỉ SELECT và count trên PostgreSQL, không insert/delete.
- npm run prisma:validate
- npm run prisma:status

Tests giả lập không chứng minh concurrency/rollback của PostgreSQL thực.
Chưa có TEST_DATABASE_URL riêng nên không chạy integration ghi dữ liệu.
Không chạy lại prisma/test-integrity.cjs của giai đoạn 1 trong giai đoạn 2.

Không thay đổi schema hoặc migration đã áp dụng. Database rỗng sẽ cho danh sách
rỗng đúng thực tế; không tự sinh dữ liệu khi khởi động. Đăng ký/các API ghi chỉ
ghi khi được người gọi chủ động gọi. Việc kiểm thử tự động hiện không gọi chúng
trên database phát triển.

Tài liệu: [Express 5 error handling](https://expressjs.com/en/5x/guide/error-handling/),
[Zod basics](https://zod.dev/basics), [bcryptjs](https://www.npmjs.com/package/bcryptjs).
