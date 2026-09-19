---
title: "BSP và ARC: Cách hãng bay và đại lý vận hành thanh toán vé máy bay"
date: 2026-09-19
description: "Tìm hiểu Billing and Settlement Plan (BSP) của IATA và Airline Reporting Corporation (ARC) — hai hệ thống thanh toán trung gian giúp đại lý bán vé và hãng bay thanh quyết toán hàng ngàn giao dịch mỗi tuần."
topic: "Hàng không"
---

BSP và ARC là hai cụm từ mà bất kỳ ai bước chân vào ngành đại lý du lịch đều sớm bắt gặp. Với người mới, mọi thứ khá dễ gây bối rối: IATA là gì, IATAN khác IATA ra sao, vì sao mã số ARC lại giống mã số IATAN, và quan trọng nhất — hai hệ thống này đóng vai trò gì trong việc **phát hành vé máy bay**?

Bài viết này sẽ giải thích BSP và ARC là gì, chúng hoạt động thế nào trong quy trình ticketing của một hãng hàng không, và vì sao một đại lý muốn bán vé thay cho hãng bay gần như không thể bỏ qua chúng.

## BSP là gì?

**BSP — Billing and Settlement Plan** (Kế hoạch Thanh toán và Quyết toán) là hệ thống kế toán điện tử do **IATA** (Hiệp hội Vận tải Hàng không Quốc tế) vận hành, dùng để đơn giản hóa việc trao đổi dữ liệu và dòng tiền giữa các đại lý du lịch và các hãng hàng không.

Nghe có vẻ phức tạp, nhưng hiểu đơn giản: **BSP là một trung gian thanh toán giữa hãng bay và đại lý.** Nếu GDS giúp gom kho vé của nhiều hãng bay để đại lý so sánh và đặt chỗ, thì BSP gom tiền từ các đại lý rồi phân phối về cho đúng từng hãng bay.

Vì sao BSP tồn tại? Vì nó đóng vai trò là **một điểm quyết toán tiền duy nhất**. Nếu không có BSP, mỗi đại lý sẽ phải kết nối riêng rẽ với từng hãng bay — vừa tốn kém vừa không khả thi về mặt vận hành. BSP thuộc về IATA, và IATA lại do chính các hãng bay sở hữu và đại diện quyền lợi. Vì vậy, thay vì phải thẩm định từng đại lý một, các hãng bay tin tưởng giao việc đó cho IATA.

## ARC là gì?

**ARC — Airline Reporting Corporation** là tổ chức làm công việc gần như tương tự BSP, nhưng phạm vi hoạt động tại **Hoa Kỳ**, cùng với Puerto Rico, Quần đảo Virgin và American Samoa. Tại các khu vực này, ARC là đơn vị kế toán thuộc sở hữu của các hãng bay, phụ trách toàn bộ giao dịch tài chính giữa đại lý và hãng vận chuyển.

Điểm khác biệt cốt lõi giữa IATA và ARC: trách nhiệm của IATA rộng hơn nhiều vì đây là **tổ chức đặt chuẩn chính của ngành hàng không**. ARC tập trung gần như hoàn toàn vào mối quan hệ tài chính giữa hãng bay và đại lý tại thị trường Mỹ.

Cách nhớ đơn giản: nếu đại lý của bạn đặt tại Hoa Kỳ, bạn cần ARC. Ở các thị trường còn lại, BSP và IATA là hai chữ viết tắt bạn cần thuộc lòng.

## Vai trò của BSP/ARC trong vận hành ticketing

Khi một hành khách mua vé từ đại lý, tiền của họ đến tay hãng bay theo cách nào? Có hai kịch bản chính, và cả hai đều có sự tham gia — ở mức nhiều hơn hoặc ít hơn — của BSP/ARC.

### Kịch bản 1: Đại lý là merchant of record

Đây là mô hình phổ biến nhất. Đại lý là bên bán vé, nhận tiền từ khách rồi thanh toán lại cho hãng bay qua ngân hàng thanh toán (clearing bank) của BSP hoặc ARC. Tiến trình diễn ra như sau:

1. Hành khách thanh toán cho đại lý / OTA.
2. Đại lý gửi yêu cầu ticketing lên GDS.
3. GDS truy cập hệ thống phục vụ hành khách (passenger service system) của hãng bay để lấy dữ liệu vé.
4. GDS đồng thời gửi thông tin vé về trung tâm xử lý dữ liệu của BSP/ARC.
5. Trung tâm xử lý gửi báo cáo thanh toán (billing report) cho đại lý qua **BSPLink** hoặc **My ARC**.
6. Đại lý thanh toán cho ngân hàng thanh toán theo lịch — thường là **mỗi tuần một lần**.
7. Ngân hàng phân phối tiền về cho từng hãng bay tương ứng.

Ở đây BSP/ARC đóng vai trò trung tâm: họ không chỉ là nơi gom tiền mà còn là nơi **đối soát từng giao dịch** — vé phát hành cho hãng nào, do đại lý nào, giá bao nhiêu. Chỉ cần một lệch lạc nhỏ giữa vé GDS và dữ liệu BSP cũng sẽ phát sinh các thông báo ADM (Agency Debit Memo) mà đại lý cần xử lý.

### Kịch bản 2: Hãng bay là merchant of record

Trong trường hợp này, hành khách thanh toán **trực tiếp cho hãng bay** qua một cổng thanh toán trên hệ thống của đại lý, thay vì trả tiền cho đại lý. Tất nhiên, phương thức thanh toán của hành khách phải được hãng bay hỗ trợ.

Tiến trình tương tự, nhưng có vài khác biệt:

1. Đại lý gửi yêu cầu ticketing lên GDS.
2. GDS truy cập hệ thống phục vụ hành khách của hãng bay để lấy dữ liệu vé.
3. GDS gửi thông tin vé về trung tâm xử lý của BSP/ARC.
4. Trung tâm xử lý gửi báo cáo thanh toán cho đại lý (qua BSPLink hoặc My ARC).
5. Trung tâm xử lý gửi dữ liệu hóa đơn giao dịch cho bên xử lý thanh toán của hãng bay.
6. Bên xử lý thanh toán tính phí cho nhà phát hành thẻ của hành khách — hành khách trả tiền qua cổng của đại lý/OTA.
7. Bên xử lý thanh toán của hãng bay chuyển tiền về cho hãng.

Trong kịch bản này, hoa hồng đại lý được IATA hoặc ARC chi trả sau một khoảng thời gian nhất định, thay vì được trừ thẳng vào khoản quyết toán.

### Thanh toán qua NDC

Với các luồng thanh toán NDC không đi qua GDS, sự khác biệt không quá lớn: quy trình xử lý vẫn được đưa qua BSP/ARC. NDC chỉ thay đổi kênh đặt chỗ và phân phối vé, còn hạ tầng thanh toán và quyết toán vẫn nằm trong khuôn khổ hai hệ thống này.

## BSPLink và My ARC

Mỗi hệ thống đi kèm một cổng web riêng để đại lý và hãng bay trao đổi thông tin.

**BSPLink** — mọi đại lý được IATA công nhận đều được cấp quyền truy cập. Các tính năng chính:

- Báo cáo và thống kê thanh toán BSP.
- Nhận và khiếu nại **ADM/ACM** (Agency Debit/Credit Memo) — những thông báo kế toán hãng bay gửi cho đại lý khi cho rằng đại lý vi phạm điều khoản vé.
- Chức năng hoàn vé (refund).
- Kênh trao đổi với IATA và các hãng bay.

Vì hãng bay cũng có quyền truy cập BSPLink, mỗi hãng có thể quyết định để toàn bộ đại lý BSP phát hành vé của mình, hoặc tự tay chọn những đại lý được phép.

**My ARC** — tương tự BSP nhưng dành cho các đại lý được ARC công nhận. Bộ công cụ cũng khá giống:

- Báo cáo đại lý tương tác (IAR) và tổng hợp doanh số.
- Công cụ quản lý memo.
- Cổng xin cấp chứng nhận.
- Truy xuất tài liệu.

## Chứng nhận IATA BSP và ARC

Nhắc lại điểm quan trọng: **bạn phải được IATA hoặc ARC công nhận mới được phát hành vé thay cho hãng bay.** Ở Mỹ, bạn xin ARC. Ở thị trường còn lại, bạn cần IATA. Sau khi được công nhận, bạn phải trải qua quy trình rà soát và tái xác nhận hằng năm.

### Chứng nhận IATA

Trước dịch Covid-19, IATA đang dần triển khai ba hình thức công nhận mới, tất cả đều mở rộng từ chứng nhận ticketing tiêu chuẩn và ảnh hưởng trực tiếp đến quy trình BSP:

- **GoLite** — hình thức đơn giản, dành cho đại lý không làm merchant of record. Thay vào đó, hãng bay làm merchant hoặc đại lý dùng **IATA EasyPay** (ví điện tử cho đại lý). Vì không có thanh toán trả chậm, hình thức này không yêu cầu thẩm định tài chính khắt khe.
- **GoStandard** — cách công nhận truyền thống, phù hợp đa số đại lý; hỗ trợ mọi phương thức: đại lý làm merchant, hãng bay làm merchant, hoặc IATA EasyPay.
- **GoGlobal** — dành cho các đại lý lớn có nhiều văn phòng và nhiều luồng BSP cùng lúc, giúp tránh việc phải xin công nhận lại cho từng đại lý thành viên.

### Chứng nhận ARC

- **ARC Accredited Agency** — chứng nhận chuẩn cho đại lý du lịch tại Mỹ (và Puerto Rico, Quần đảo Virgin, American Samoa) muốn bán vé máy bay. Yêu cầu: hoàn thành khóa đào tạo My ARC, có EIN và giấy phép địa phương, có tài khoản ngân hàng chuyên dụng, đóng phí $2.300 cùng bảo lãnh/ký quỹ $20.000, và trải qua quy trình thẩm định có thể kéo dài tới 90 ngày.
- **ARC Verified Travel Consultant (VTC)** — lựa chọn không bán vé, giống TIDS của IATA, phù hợp để được ngành công nhận khi bạn bán các sản phẩm du lịch khác nhiều hơn vé máy bay.
- **ARC Corporate Travel Department (CTD)** — chứng nhận ticketing dành cho tổ chức mua vé cho nhân viên, hoạt động như một đại lý nội bộ thay vì thuê công ty quản lý du lịch.

## ARC vs IATAN

IATAN là chi nhánh của IATA đặt tại Mỹ. Vậy đại lý tại Mỹ có thể phát hành vé bằng chứng nhận IATAN không? Được, nhưng có một điều kiện: **bạn vẫn cần chứng nhận ARC** để ticketing. Nếu bạn được ARC công nhận, IATAN sẽ giữ cùng một mã số đại lý của bạn.

Ý tưởng ban đầu là ARC phụ trách các chuyến bay nội địa Mỹ, còn IATAN phục vụ du lịch quốc tế. Giờ đây các chuyến bay nội địa lẫn quốc tế đều chấp nhận ARC, nhưng IATAN vẫn là dấu hiệu công nhận quốc tế — nhiều đại lý giữ cả hai để được hưởng ưu đãi từ hãng bay.

## Các lựa chọn thay thế cần biết

- **Host agency** — đại lý có chứng nhận BSP/ARC cho phép các đại lý chưa có chứng nhận dùng chung mã số của mình, giảm tải rất nhiều thủ tục báo cáo và công nhận.
- **Air consolidator** — hoạt động theo mô hình bán buôn: mua vé với giá ưu đãi (private và published fare) với số lượng lớn. Đại lý hợp tác cùng consolidator thường dùng chứng chỉ GDS của consolidator để truy cập giá vé.
- **CLIA** — tập trung kết nối đại lý với các hãng tàu biển (cruise), phù hợp nếu bạn muốn đa dạng hóa sản phẩm bên cạnh vé máy bay.

## Tóm lại

Nếu bạn định làm ticketing, bạn **bắt buộc** phải có một trong hai chứng nhận, tùy thuộc thị trường: **ARC** nếu làm việc tại Mỹ, **BSP/IATA** cho phần còn lại của thế giới. Chúng không chỉ là thủ tục giấy tờ — BSP và ARC chính là hạ tầng khiến toàn bộ dòng tiền của ngành bán vé máy bay vận hành trơn tru, từ giao dịch nhỏ nhất của một đại lý đến khoản thanh toán hàng tuần về cho hàng trăm hãng bay.