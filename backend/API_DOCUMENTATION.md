# TroHome REST API — Giai đoạn 2

Base URL: http://127.0.0.1:3001/api. Không seed hoặc kết nối frontend.

## Quy ước

JSON body; response thành công là {"data": ...}, danh sách là {"data": []}.
204 không có body. Tiền/đơn giá/chỉ số/diện tích nhận và trả chuỗi thập phân
để tránh sai số JS, ví dụ "3000000.00". total là chuỗi làm tròn 2 số.
UUID cho mọi ID. Ngày hợp đồng YYYY-MM-DD; response Prisma DateTime là ISO UTC.
Kỳ hóa đơn YYYY-MM. List dùng page=1&limit=20, tối đa 100; sắp xếp ổn định theo id.
Không có tổng số trang. Body dùng schema strict: trường ngoài danh sách bị từ chối.

Trừ health/register/login, tất cả endpoint yêu cầu:
`Authorization: Bearer <token>`. Đây là opaque session token ngẫu nhiên 256-bit,
không phải JWT. Không gửi token qua URL. Chỉ dùng HTTPS khi truy cập từ ngoài máy.
Không dùng cookie nên không có cơ chế cookie tự động kèm request/CSRF.

Lỗi: {"error":{"code":"VALIDATION_ERROR","message":"Invalid request.","fields":[]}}.
400: dữ liệu/UUID/query sai; 401: phiên sai/hết hạn; 403: sai vai trò/CORS;
404: không tìm thấy hoặc ngoài quyền; 409: trùng/xung đột trạng thái/FK;
413: JSON quá 64KB; 429: vượt giới hạn; 500: lỗi nội bộ đã ẩn;
503: database không sẵn sàng ở health.

## Tài khoản

- GET /health: không auth; SELECT 1 thật. Response
  {"data":{"status":"ok","database":"connected"}}.
- POST /auth/register: không auth; body
  {"username":"lan","password":"a-long-unique-password","fullName":"Lan","phone":"0901234567"}.
  Tạo User role tenant và Tenant cùng transaction; 201 trả hồ sơ không hash.
  Không nhận role/tenantId/isDepositPaid. Username chuẩn hóa lowercase/trim,
  3–64 ký tự a-z, 0-9, _, ., -. Password tối thiểu 12 ký tự, tối đa 72 byte UTF-8.
- POST /auth/login: body {"username":"lan","password":"a-long-unique-password"}.
  Response {"data":{"token":"<opaque-token>","expiresIn":3600}}.
  20 lần gọi login/register/change-password mỗi IP trong 15 phút; không tin
  X-Forwarded-For vì trust proxy mặc định tắt.
- POST /auth/logout: auth; không body; vô hiệu hóa phiên hiện tại, 204.
- GET /auth/me: auth; trả id, username, role, fullName, phone, tenantId,
  isDepositPaid, createdAt, updatedAt. Không bao giờ trả passwordHash.
- PATCH /auth/me: auth; body gồm fullName và/hoặc phone; đồng bộ hồ sơ Tenant.
- POST /auth/change-password: auth; body currentPassword/newPassword;
  kiểm tra mật khẩu cũ, hash bcrypt cost 12, vô hiệu hóa mọi phiên của tài khoản, 204.

## Khu trọ và phòng

- GET /properties: chủ trọ xem khu của mình; tài khoản khác chỉ thấy khu có
  phòng vacant đang listed. Trả id/name/address, không trả thông tin riêng chủ trọ.
- GET /properties/:id: cùng quy tắc.
- POST /properties: host; body {"name":"Khu A","address":"Hà Nội"}; ownerId từ phiên.
- PATCH /properties/:id: host sở hữu; name/address tùy chọn nhưng ít nhất 1 trường.
- GET /rooms: host xem phòng của mình; tenant/viewer xem phòng listed, vacant.
  Query ngoài phân trang: propertyId, type=standard|premium, q (mã/mô tả),
  minPrice, maxPrice (chuỗi tiền). Không nhận ownerId.
- GET /rooms/:id: host sở hữu, hoặc phòng listed/vacant, hoặc tenant có hợp đồng
  tại phòng đó (kể cả lịch sử); không trả hồ sơ khách khác.
- POST /rooms: host sở hữu propertyId; body ví dụ:
  {"propertyId":"<uuid>","code":"101","floor":1,"type":"standard","area":"20",
  "price":"3000000","deposit":"3000000","electricityRate":"3800","waterRate":"20000",
  "listed":true,"maxOccupants":2,"amenities":["Wifi"],"images":[],"description":""}.
  Backend giữ status vacant, currentOccupantsCount=0.
- PATCH /rooms/:id: host sở hữu; các trường POST trừ propertyId, tất cả tùy chọn.
  Không đổi status/currentOccupantsCount qua endpoint này.
- PATCH /rooms/:id/status: host sở hữu; body {"status":"maintenance"} hoặc vacant.
  Chỉ chuyển giữa vacant/maintenance; tự gỡ listed. occupied/reserved chỉ do workflow.
- DELETE /rooms/:id: host sở hữu; chỉ phòng vacant; FK từ chối xóa khi còn lịch sử.
  Favorite có cascade theo migration.

## Người thuê và hợp đồng

- GET /tenants: host; chỉ người thuê có hợp đồng với chủ trọ hoặc yêu cầu thuê
  accepted tại phòng của chủ trọ. Dùng để chọn tenantId khi lập hợp đồng.
- GET /contracts và GET /contracts/:id: host sở hữu phòng hoặc chính tenant.
- POST /contracts: host sở hữu phòng; body
  {"roomId":"<uuid>","tenantId":"<uuid>","startDate":"2026-11-03",
  "endDate":"2027-11-03","monthlyRent":"3000000","deposit":"3000000"}.
  endDate tùy chọn, phải sau startDate; monthlyRent > 0.
  Tenant phải có lịch sử hợp đồng với host hoặc yêu cầu accepted tại phòng.
  Nếu phòng reserved, phải đúng người có yêu cầu accepted giữ phòng.
  Khóa phòng, tạo hợp đồng active, chuyển occupied/listed=false/số người=1 cùng transaction.
  Unique DB chặn hai hợp đồng active cùng phòng hoặc người thuê.
- POST /contracts/:id/end: host sở hữu; body {"endDate":"2026-12-03"};
  kết thúc hợp đồng active, chuyển phòng vacant/listed=false/số người=0.
  Yêu cầu accepted tương ứng chuyển cancelled để có thể yêu cầu thuê lại.
  Không có sửa tiền/ngày hợp đồng tùy ý làm thay đổi lịch sử hóa đơn.

## Yêu cầu thuê

- GET /inquiries: host xem yêu cầu đến phòng của mình; tài khoản khác xem yêu cầu của mình.
- POST /inquiries: tenant/viewer; body {"roomId":"<uuid>","message":"Muốn xem phòng"}.
  Room phải listed/vacant; tên/điện thoại/userId lấy từ tài khoản.
- PATCH /inquiries/:id/status: host sở hữu được contacted/accepted/rejected khi
  new/contacted; người gửi được cancelled. Body {"status":"accepted"}.
  Accept khóa phòng, chuyển reserved và từ chối các yêu cầu cạnh tranh.
  Người gửi được hủy accepted khi phòng vẫn reserved, trả phòng vacant.

## Hóa đơn và ghi nhận thu tiền

- GET /invoices: host sở hữu hoặc chính tenant; query status=unpaid|overdue|paid.
- GET /invoices/:id: cùng quyền, có total.
- POST /invoices: host sở hữu hợp đồng; body
  {"contractId":"<uuid>","period":"2026-11","electricityOld":"100",
  "electricityNew":"120","waterOld":"10","waterNew":"12","other":"50000","otherNote":"Internet"}.
  Không nhận rent/tenantId/roomId/rates/status/paidAt; suy ra từ hợp đồng/phòng.
  Đơn giá hiện tại được chốt vào hóa đơn; muốn lập hóa đơn lịch sử phải đối soát
  đơn giá trước, endpoint chưa hỗ trợ lịch sử biểu giá.
  Kỳ phải nằm trong tháng của hợp đồng, chỉ số không giảm; unique phòng/kỳ.
- PATCH /invoices/:id/status: host; body {"status":"overdue"} hoặc unpaid.
  Chỉ hóa đơn chưa paid, 204; chưa có dueDate nên quá hạn được đánh dấu thủ công.
- POST /invoices/:id/pay: host sở hữu; body {} hoặc không body.
  Ghi nhận toàn bộ đã thu, paidAt do server. Gọi lại không đổi paidAt.
  Tenant không được xác nhận. Không gọi cổng thanh toán hay chuyển tiền.
- GET /payments: hóa đơn paid thuộc quyền truy cập, sắp xếp paidAt giảm dần,
  có total; đây là lịch sử thu hóa đơn, không phải bảng giao dịch riêng.

## Sửa chữa và yêu thích

- GET /repairs: host sở hữu phòng hoặc chính tenant.
- POST /repairs: tenant có hợp đồng active; body
  {"roomId":"<uuid>","description":"Vòi nước rò rỉ","images":[]}.
- PATCH /repairs/:id/status: host pending→in_progress→completed; host hoặc tenant
  sở hữu được pending→cancelled; body {"status":"in_progress"}; 204.
- GET /favorites: chỉ của mình, chỉ hiện phòng còn listed/vacant.
- PUT /favorites/:id: id là roomId; thêm yêu thích phòng listed/vacant, không body;
  upsert không tạo trùng.
- DELETE /favorites/:id: bỏ yêu thích của mình, 204, gọi lặp an toàn.

## Giới hạn có chủ ý

Không có bảng Payment, Session, Appointment, Notification, AuditLog.
Phiên và rate limit chỉ ở bộ nhớ một tiến trình, restart đăng xuất mọi người;
không chạy cluster/nhiều instance. Muốn phiên bền vững cần Redis hoặc schema
Session và phê duyệt riêng. Không thêm bảng trong giai đoạn này.
Không có tự cấp role host, quản trị user, reset password/email, upload ảnh,
thu tiền cọc thực, thanh toán một phần/hoàn tiền, seed, push notification,
CRUD tenant độc lập (schema chưa có ownerId để phân quyền hồ sơ chưa thuê).
Ảnh chỉ nhận URL HTTPS, không tải URL từ server.
Chưa tạo tài khoản host trong database rỗng: cần bước cấp quyền vận hành được
phê duyệt riêng. Endpoint host vẫn kiểm thử bằng tài khoản giả lập.
