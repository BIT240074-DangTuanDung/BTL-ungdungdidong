# Kế hoạch migration và kết quả triển khai

## Đã triển khai sau phê duyệt ngày 03/11/2026

- Migration 20261103050332_init_trohome đã áp dụng thành công, gồm constraints.sql
  và BEGIN/COMMIT. Không chỉnh sửa migration này sau khi đã áp dụng.
- Trước triển khai: xác nhận không có bảng ứng dụng trong public, lưu backup
  tại backend/backups (được bỏ qua bởi Git), kiểm tra archive đọc được bằng
  pg_restore --list. Chưa thử phục hồi backup vào database riêng.
- Thử toàn bộ migration trong transaction và ROLLBACK thành công trước deploy.
- Prisma Client 6.19.3 đã generate; validate đạt, migrate status: up to date.
- test-integrity.cjs: 11 kiểm thử từ chối dữ liệu sai đạt; dữ liệu hợp lệ được
  chấp nhận; toàn bộ dữ liệu thử rollback, cả 9 bảng còn 0 bản ghi.
- Chưa chạy kiểm thử cạnh tranh bằng hai kết nối, chưa nhập dữ liệu cũ,
  chưa triển khai HTTP API hoặc kết nối frontend.
- preflight.cjs và verify-migration.cjs chỉ dùng trước migration khởi tạo;
  không chạy lại trên database đã có bảng. test-integrity.cjs có thể chạy lại.

Các mục dưới đây ghi lại kế hoạch và kết quả trước thời điểm phê duyệt.

Kết quả kiểm tra phiên làm việc:
- Prisma CLI và Client: 6.19.3; format/validate thành công.
- migrate diff --from-empty --to-schema-datamodel sinh schema-preview.sql thành công,
  không truy cập database. Preview chưa bao gồm constraints.sql, không chạy riêng.
- Typecheck đạt sau khi loại thư mục thư viện backup khỏi tsconfig.
- expo lint không tìm thấy npx trong môi trường. ESLint trực tiếp báo lỗi sẵn có
  react-hooks/refs tại context/RentalContext.tsx:291 và 2 warnings
  (.expo/types/router.d.ts, lib/api.ts). Không sửa frontend ngoài phạm vi.
- SQL bổ sung chưa được chạy/kiểm thử trên PostgreSQL.

Không chạy db push, migrate reset hay migrate dev trong nhiệm vụ này.
Chưa tạo bảng, chưa nhập seed, chưa sửa MockAPI hoặc frontend.
constraints.sql là bản SQL bổ sung cần duyệt, không phải migration đã áp dụng.

## Trước khi được phê duyệt

1. Kiểm tra CLI và Client cài tại backend vẫn là 6.19.3. Không dùng CLI global
   hoặc npx tải bản mới. package.json đang dùng dấu ^; không nâng phiên bản.
2. Validate, format và migrate diff từ empty đến schema chỉ đọc schema,
   không introspect hoặc ghi database. Chạy lint/typecheck frontend.
3. Rà soát SQL sinh ra cùng constraints.sql. Chưa được coi là kiểm chứng runtime.

## Sau khi người dùng phê duyệt tạo bảng

1. Kiểm tra đích kết nối riêng tư là trohome_db PostgreSQL 15; backup bằng
   pg_dump và thử phục hồi bản sao. Không in DATABASE_URL ra log.
   Kiểm tra lại database có thật sự chưa có bảng và migration hay không;
   nếu đã có thì dừng để thiết kế baseline, không đánh dấu applied tùy tiện.
2. Trên database phát triển dùng riêng, từ backend chạy:

   ` .\node_modules\.bin\prisma.cmd migrate dev --name init_trohome --create-only `

   Lệnh này chỉ được chạy ở giai đoạn được duyệt; có thể cần shadow database,
   hoặc đề nghị reset nếu phát hiện drift. Không chấp nhận reset.
3. Nối nội dung prisma/constraints.sql vào cuối migration.sql vừa sinh.
   Bọc migration khởi tạo trong BEGIN/COMMIT để các ràng buộc được áp dụng cùng
   bảng. Duyệt SQL không có DROP dữ liệu. Commit migration và migration_lock.toml.
4. Chạy trên database thử nghiệm rồi đích được duyệt:

   ` .\node_modules\.bin\prisma.cmd migrate deploy `

   Sau đó: ` .\node_modules\.bin\prisma.cmd generate `

5. Kiểm thử trong transaction rollback: FK không tồn tại, hóa đơn sai
   contract/room/tenant, kỳ trùng, chỉ số giảm, tiền âm, paid thiếu paidAt,
   hai hợp đồng active cùng phòng/người thuê, yêu cầu trùng, xóa phòng còn
   lịch sử. Kiểm thử hai kết nối đồng thời lập hợp đồng/lập hóa đơn.
   Ca hợp lệ: nhiều hợp đồng inactive, nhiều hóa đơn khác kỳ, khách chưa có User.

## Nhập dữ liệu cũ là bước riêng

Xuất bản sao AsyncStorage/SQLite/MockAPI không chỉnh nguồn; lựa chọn nguồn chính
và đối soát các bản sao. Lập mapping (nguồn, loại, legacyId) → UUID để giữ quan hệ
và nhập lặp an toàn. Không dùng trực tiếp ID dạng room_101.
Nhập User/Tenant, Property có chủ sở hữu xác định, Room, Contract, Invoice,
Inquiry/RepairRequest/Favorite theo thứ tự FK. User có tenantId nhập sau Tenant.
Không tự tạo tài khoản đăng nhập với mật khẩu demo; yêu cầu đặt lại mật khẩu.
Chuyển idNumber rỗng thành null; chuẩn hóa username và xử lý trùng.
Đối soát hợp đồng active, kỳ hóa đơn, đơn giá lịch sử, paidAt, URI ảnh và
số người; cách ly bản ghi không xác định được hợp đồng thay vì đoán.
Không tự chuyển isDepositPaid thành giao dịch ngân hàng.
So sánh số lượng, tổng tiền và báo cáo doanh thu trước/sau theo múi giờ Việt Nam.

## Khôi phục

Chưa chuyển frontend sang backend cho đến khi kiểm chứng xong. Nếu migration
thất bại, kiểm tra transaction/migration status và sửa có kiểm soát trên bản sao.
Không reset database hoặc xóa bảng để thử lại; phục hồi backup chỉ sau phê duyệt.
SQL CHECK/partial indexes phải được giữ trong lịch sử migration vì Prisma 6
không mô tả đầy đủ chúng trong schema.
