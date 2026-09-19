# Sổ Chi Tiêu

Một trang Hugo tĩnh để theo dõi thu chi hằng ngày. Dữ liệu được lưu bằng
`localStorage` ngay trên trình duyệt, nên không cần máy chủ hay tài khoản.

## Chức năng

- **Input**: thêm khoản thu hoặc chi, chọn ngày, danh mục và ghi chú.
- **Giao dịch gần đây**: xem và xóa từng giao dịch hoặc xóa toàn bộ dữ liệu.
- **Dashboard**: tổng thu, tổng chi, số dư, biểu đồ theo danh mục và nhịp chi
  tiêu 7 ngày gần nhất.
- **Xuất CSV**: tải dữ liệu của tháng đang xem để sao lưu hoặc mở bằng Excel.
- **Blog**: chuyên mục bài viết về hàng không, du lịch và các chủ đề liên quan
  (thư mục `content/blog/`, giao diện tại `layouts/blog/`).

## Chạy trên máy

Yêu cầu Hugo Extended. Khởi động máy chủ phát triển bằng:

```bash
HUGO_CACHEDIR="$PWD/.hugo_cache" hugo server --disableFastRender
```

Sau đó mở địa chỉ Hugo hiển thị (mặc định là `http://localhost:1313`). Để tạo
bản tĩnh để triển khai:

```bash
HUGO_CACHEDIR="$PWD/.hugo_cache" hugo --minify
```

Thư mục `public/` là đầu ra để deploy. Vì dữ liệu chỉ nằm trong trình duyệt,
việc mở website bằng thiết bị hoặc trình duyệt khác sẽ bắt đầu với sổ trống.
