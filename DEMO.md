# TroHome — Hướng dẫn trình diễn

## Chạy ứng dụng

- `npm install` nếu chưa có thư viện.
- `npm start`, sau đó mở bằng môi trường Expo tương thích SDK 58 hoặc nhấn W để mở web.
- Dữ liệu demo được lưu trên thiết bị/trình duyệt. Không cần chạy MockAPI.
- Chủ trọ mẫu: `admin` / `123456`. Đây là tài khoản trình diễn, không phải quản trị hệ thống.
- Tạo tài khoản người thuê với email hợp lệ và mật khẩu ít nhất 8 ký tự.

## Kịch bản trình diễn 5–7 phút

1. Khám phá danh sách phòng, lọc theo giá/diện tích và tìm địa chỉ.
2. Đăng ký người thuê, đăng nhập, lưu phòng yêu thích và gửi yêu cầu thuê phòng còn trống.
3. Mở Yêu cầu thuê để xem trạng thái chờ xử lý. Phòng chưa bị giữ ngay khi gửi yêu cầu.
4. Đăng xuất, đăng nhập chủ trọ mẫu, chấp nhận yêu cầu. Phòng chuyển sang giữ chỗ; các yêu cầu chờ khác của phòng bị từ chối.
5. Từ yêu cầu đã chấp nhận, lập hợp đồng với người thuê đã được chọn. Kiểm tra ngày, giá thuê và tiền cọc.
6. Lập hóa đơn cho phòng, nhập chỉ số điện nước. Thử chỉ số mới nhỏ hơn chỉ số cũ và hóa đơn trùng kỳ để minh họa kiểm tra dữ liệu.
7. Xác nhận thu tiền, mở thống kê doanh thu theo tháng nhận tiền.
8. Đăng nhập lại người thuê, kiểm tra hợp đồng, hóa đơn và thông báo. Tải lại ứng dụng để chứng minh dữ liệu được lưu.

## Các điểm nghiệp vụ đã cải thiện

- Tách yêu cầu thuê khỏi hợp đồng và đặt cọc.
- Chặn màn hình quản lý người thuê/phòng/hóa đơn mới đối với người không phải chủ trọ.
- Người thuê chỉ xem hóa đơn của mình; không có quyền xác nhận thanh toán.
- Không mở lại hóa đơn đã thu tiền.
- Hóa đơn lưu đơn giá riêng; sửa giá điện nước của phòng không làm đổi tổng hóa đơn đã chốt.
- Doanh thu tính từ thời điểm thanh toán theo múi giờ Việt Nam, không theo kỳ hóa đơn.
- Lưu dữ liệu tuần tự, có thông báo lỗi; hoạt động trên web mà không cần SQLite.
- Không tự động gửi dữ liệu người thuê lên dịch vụ MockAPI công khai trong luồng ứng dụng.

## Kiểm tra

- `npx tsc --noEmit`
- `npx expo lint`
- `node --test tests/business.test.cjs`
- `npx expo export --platform web`

## Giới hạn cần trình bày trung thực

Đây là bản mẫu cục bộ, chưa phải hệ thống vận hành nhiều chủ trọ độc lập. Dữ liệu không đồng bộ giữa thiết bị; tài khoản chủ trọ trên cùng thiết bị cùng quản lý dữ liệu demo. Phân quyền phía ứng dụng không thay thế kiểm soát truy cập phía máy chủ.

Xác thực hiện tại là mô phỏng lưu trên thiết bị, còn mật khẩu dạng văn bản trong kho tài khoản. Không sử dụng mật khẩu thật hoặc thông tin cá nhân thật khi trình diễn. Cần thay bằng dịch vụ xác thực phía máy chủ trước khi sử dụng thực tế.

Chưa triển khai gửi email khôi phục mật khẩu, trang quản trị/kiểm duyệt, phân quyền theo chủ sở hữu nhiều nhà trọ, thanh toán trực tuyến, thông báo đẩy, ký số, gia hạn có lịch sử và xuất PDF. Màn hình nhắc việc hiện hiển thị danh sách từ dữ liệu hiện có, chưa có trạng thái đã đọc.

Chỉ nên giới thiệu đúng phần đã chạy và kiểm tra; các phần trên thuộc hướng phát triển tiếp theo. Cần chạy thử kịch bản trên điện thoại thật trước buổi thi.
