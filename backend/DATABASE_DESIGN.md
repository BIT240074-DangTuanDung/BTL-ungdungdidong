# Thiết kế dữ liệu TroHome

## Phạm vi và kết quả khảo sát

Nguồn: lib/types.ts, seed.ts, api.ts, database.ts, database.web.ts, business.ts,
format.ts, context/RentalContext.tsx và các màn hình trong src/app cùng components.
Routes thực tế đã chuyển từ app sang src/app. Không chỉnh sửa frontend.

- Vai trò: host (quản lý), tenant (người thuê), viewer (xem/tìm phòng).
- RentalContext đang dùng AsyncStorage làm nguồn ưu tiên, SQLite làm fallback;
  bản web database.web.ts là no-op. Không import api.ts trong context hiện tại.
- lib/api.ts khai báo GET/POST/PATCH/DELETE /rooms và GET/POST/PATCH /invoices
  trên MockAPI. Tenant/Contract được lồng trong currentTenant/currentContract.
  Các hàm tenant, contract, inquiry, property còn lại chỉ trả dữ liệu giả, không lưu server.
- CRUD hiện tại: thêm/sửa/xóa phòng; thêm/sửa người thuê; lập/kết thúc hợp đồng;
  tạo hóa đơn/đánh dấu đã thu; gửi/liên hệ/duyệt/từ chối/hủy yêu cầu thuê;
  tạo/cập nhật sửa chữa; đăng ký/đăng nhập; bật/tắt yêu thích.
- seed có 50 phòng, 2 người thuê/hợp đồng, hóa đơn và yêu cầu mẫu.
  ID dạng room_101, prop_bt không phải UUID.
- Thông báo suy ra từ hóa đơn, yêu cầu và hợp đồng sắp hết hạn;
  doanh thu tính theo paidAt, múi giờ Asia/Ho_Chi_Minh.

## Chín bảng và quan hệ

- User: UUID, username duy nhất, passwordHash, role, tên, điện thoại,
  isDepositPaid và tenantId tùy chọn duy nhất. User–Tenant là 0..1–0..1;
  người thuê do chủ trọ tạo không bắt buộc có tài khoản.
- Property: tên, địa chỉ, ownerId → User. Một chủ trọ có nhiều khu trọ.
  Đây là trường sở hữu bổ sung cần thiết cho backend nhiều tài khoản.
- Room: propertyId → Property, mã/tầng/loại/diện tích/giá/cọc/đơn giá điện nước,
  trạng thái, listed, mô tả, số người tối đa/hiện tại, images và amenities dạng text[].
  Mã phòng duy nhất trong khu. Một khu có nhiều phòng.
- Tenant: tên, điện thoại, số giấy tờ tùy chọn, ghi chú. Không unique điện thoại
  hoặc số giấy tờ vì dữ liệu cũ có thể trống và số liên hệ có thể dùng chung.
- Contract: roomId → Room, tenantId → Tenant, ngày bắt đầu/kết thúc, tiền thuê,
  cọc, active. Một phòng/người thuê có nhiều hợp đồng lịch sử.
- Invoice: contractId, roomId, tenantId liên kết hợp đồng bằng FK ghép để
  không thể gắn hóa đơn vào sai phòng/người thuê; thêm FK trực tiếp Room/Tenant.
  Kỳ YYYY-MM duy nhất theo phòng. Chỉ số cũ/mới, đơn giá chốt tại thời điểm lập,
  tiền thuê/phụ phí/ghi chú, trạng thái và paidAt. Không lưu tổng tiền dư thừa:
  rent + (electricityNew-electricityOld)*electricityRate
  + (waterNew-waterOld)*waterRate + other. Làm tròn tiền đến 2 chữ số tại backend.
- Inquiry: roomId → Room, userId → User tùy chọn để nhập yêu cầu cũ,
  tên/điện thoại/lời nhắn và trạng thái.
- RepairRequest: roomId → Room, tenantId → Tenant, mô tả/ảnh/trạng thái.
- Favorite: userId → User, roomId → Room; cặp user/phòng duy nhất.

Mọi bảng có khóa chính UUID, createdAt và updatedAt. Tiền dùng Decimal(18,2);
diện tích Decimal(10,2); chỉ số Decimal(14,3). Ngày hợp đồng DateTime @db.Date;
mốc sự kiện DateTime @db.Timestamptz(3). updatedAt do Prisma quản lý, câu SQL
trực tiếp phải tự cập nhật. UUID do Prisma sinh, importer SQL phải tự cấp UUID.
Enum giữ nguyên giá trị frontend để giảm chuyển đổi. Có index theo FK,
trạng thái, phòng đang đăng và thời gian nhận tiền.

## Toàn vẹn và giao dịch bắt buộc

schema.prisma và constraints.sql phải được triển khai cùng nhau. Prisma validate
chỉ xác thực schema, không kiểm chứng SQL bổ sung trên PostgreSQL.

- Restrict xóa mọi dữ liệu nghiệp vụ có quan hệ; chỉ Favorite được Cascade.
  Không xóa lịch sử tài chính để xóa phòng. Chưa bổ sung soft-delete vì UI chưa có.
- Unique roomId/period ngăn hóa đơn trùng kể cả hai request đồng thời.
- Partial unique index trong constraints.sql cho phép tối đa một hợp đồng active
  mỗi phòng và mỗi người thuê. Đây là quy tắc mạnh hơn chống chồng khoảng thời
  gian cho hợp đồng active, phù hợp UI hiện tại. Chưa hỗ trợ đặt trước nhiều hợp
  đồng tương lai. Không cấm khoảng ngày của hợp đồng inactive chồng nhau.
- CHECK bổ sung kiểm soát tiền/chỉ số/sức chứa/ngày/kỳ/trạng thái thanh toán.
  Partial unique cho yêu cầu thuê đang mở của cùng tài khoản/phòng.
- Backend phải xác minh owner.role=host, quyền sở hữu qua Property.ownerId,
  quyền truy cập tenantId và quan hệ sửa chữa với hợp đồng. FK không thay thế
  phân quyền. Tenant hiện chưa có chủ sở hữu riêng: quyền chủ trọ trên hồ sơ
  phải suy qua hợp đồng; cần quy tắc onboarding cho hồ sơ chưa có hợp đồng.
- Lập/kết thúc hợp đồng phải khóa phòng trong transaction và cập nhật trạng thái,
  số người/listed cùng hợp đồng; duyệt yêu cầu phải khóa phòng, từ chối yêu cầu
  cạnh tranh trong cùng transaction. Xử lý lỗi unique thành thông báo xung đột.
- Hóa đơn đã paid không được sửa qua API. Chốt paidAt phía server một lần,
  cập nhật có điều kiện status != paid. Kiểm tra kỳ nằm trong hợp đồng khi lập.
  Trạng thái overdue hiện thủ công vì chưa có dueDate.

## Tích hợp tiếp theo (chưa thực hiện)

Thay lưu toàn bộ AppData bằng endpoint có xác thực và CRUD theo tài nguyên.
Không chuyển cơ chế DELETE toàn bảng của SQLite sang PostgreSQL.
Giữ DTO hiện có, thêm adapter UUID, ngày YYYY-MM-DD/ISO, Decimal thành số có
kiểm tra giới hạn an toàn hoặc chuỗi trong API mới; favorites trả danh sách roomId.
contractId của hóa đơn phải được tìm từ lịch sử thực, không mặc định hợp đồng
active hiện tại. Đơn giá thiếu phải được đối soát, không tự suy từ giá hiện tại.
Loại bỏ fallback PATCH thất bại thành POST và nuốt mọi lỗi GET thành mảng rỗng
khi xây API thật. Lưu ảnh bằng URL bền vững, không URI cục bộ của thiết bị.

Đăng nhập demo, mã xác minh chủ trọ cố định và mật khẩu cục bộ phải thay bằng
xác thực server/password hash; không nhận role/ownerId đáng tin từ client.
isDepositPaid hiện chỉ là cờ demo, không phải chứng từ đã chuyển tiền.
Chưa có backend HTTP hoàn chỉnh trong phạm vi này; schema không tự kết nối UI.

## Chủ động không tạo bảng dư thừa

Không tách Host (User.role đủ), Building (Property đủ), RoomImage/Amenity
(chưa có metadata/danh mục), Listing (Room.listed đủ), MeterReading (Invoice đủ),
Service (other/otherNote đủ), Payment (hiện chỉ đánh dấu thu toàn bộ),
Notification (đang suy ra), Appointment và ActivityLog (chưa triển khai).
Thanh toán nhiều lần/hoàn tiền/cọc có chứng từ, lịch hẹn có giờ, push/read-state,
audit log, dịch vụ định kỳ và quản lý người ở cùng là đề xuất tương lai.
isPremiumUser là cờ demo, chưa thiết kế billing/subscription.

Tham khảo: [Prisma 6 custom migrations](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/customizing-migrations).
