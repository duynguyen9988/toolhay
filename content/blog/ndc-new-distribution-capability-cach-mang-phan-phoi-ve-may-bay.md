---
title: "NDC – New Distribution Capability: Cuộc cách mạng phân phối vé máy bay"
date: 2026-09-19
description: "NDC là gì, vì sao IATA xây dựng chuẩn này, cách hãng bay phát hành giá vé động (offer & order) đến đại lý qua API, và tác động của nó đến quy trình thanh toán BSP/ARC."
topic: "Hàng không"
---

Trong [bài viết về BSP và ARC](/blog/bsp-arc-va-van-hanh-ticketing-hang-khong/), chúng ta đã thấy cụm từ **NDC** xuất hiện ở phần thanh toán: *"với các luồng thanh toán NDC không đi qua GDS, quy trình xử lý vẫn được đưa qua BSP/ARC"*. Nhưng NDC thực sự là gì, vì sao nó được gọi là "cuộc cách mạng phân phối" của ngành hàng không, và nó thay đổi cơ chế đặt vé mà hành khách, đại lý và hãng bay đã quen hàng chục năm như thế nào?

## NDC là gì?

**NDC – New Distribution Capability** (Năng lực Phân phối Mới) là chuẩn dữ liệu dựa trên **XML/API** do **IATA** phát triển từ năm 2012, nhằm thay thế chuẩn giao tiếp **EDIFACT** — giao thức đã gắn bó với ngành từ thập niên 1970, khi vé máy bay vẫn còn là tờ giấy carbon nhiều lớp.

Khác với cách cũ — nơi hãng bay chỉ "đẩy" một bảng giá tĩnh (published fares) vào GDS để đại lý tự tìm kiếm — NDC cho phép **hãng bay chủ động phát hành "offer" (lời chào) theo thời gian thực** cho từng khách hàng, qua API, đến đúng kênh bán (đại lý, OTA, doanh nghiệp, aggregator) mà không cần bê nguyên kho dữ liệu vào GDS.

## Vì sao ngành cần NDC?

Hệ thống cũ (GDS + EDIFACT) có một giới hạn căn bản: nó sinh ra để **tìm vé rẻ nhất**, không phải để **bán trải nghiệm**. Hàng chục năm qua, khi muốn bán thêm chỗ ngồi rộng, hành lý ký gửi, suất ăn, bảo hiểm hay nâng hạng, hãng bay gần như "bó tay" trong khung dữ liệu cũ:

- **Nội dung không đầy đủ**: nhiều sản phẩm phụ (ancillaries) không hiển thị được ở GDS truyền thống, nên đại lý không bán được.
- **So sánh vé méo mó**: giá tại GDS có thể không phản ánh đúng tổng chi phí thực tế sau khi cộng phụ phí.
- **Giá vé tĩnh**: hãng khó điều chỉnh giá linh hoạt cho từng phân khúc khách, từng kênh, từng thời điểm theo ý mình.
- **Chi phí phân phối cao**: mỗi giao dịch qua GDS phát sinh phí booking fee mà hãng phải trả — động lực lớn để hãng kiểm soát lại kênh phân phối.

NDC ra đời để giải bài toán đó: hãng lấy lại quyền **"nhìn thấy khách hàng"** và **"quyết định giá"**, đại lý nhận được nhiều nội dung hơn, còn khách hàng thấy đúng những gì hãng muốn bán.

## Dòng chảy "Offer & Order": thay đổi bản chất đặt vé

Điểm khác biệt về triết lý của NDC nằm ở hai khái niệm **offer** và **order**:

- **Offer (lời chào)**: là gói sản phẩm do hãng bay "đẻ ra" theo yêu cầu — gồm giá, hành trình, các dịch vụ đi kèm, điều kiện hoàn đổi. Mỗi offer có một mã riêng (Offer ID) và có **thời hạn hiệu lực**.
- **Order (đơn hàng)**: khi đại lý hoặc khách chấp nhận offer, hãng xác nhận tạo thành order — một "hợp đồng" giữa hãng và khách, thay thế cho khái niệm **PNR + vé** cũ.

Quy trình giao tiếp NDC theo từng bước:

1. Đại lý gửi yêu cầu tìm kiếm qua API NDC (danh sách chuyến bay, ngày đi, số khách).
2. Hãng bay (hoặc aggregator thay mặt hãng) trả về một hoặc nhiều **offer** với giá và dịch vụ động, đúng khách, đúng thời điểm.
3. Đại lý chọn offer, gửi yêu cầu **tạo order**.
4. Hãng xác nhận order, phát hành vé điện tử.
5. Về phía xử lý tiền, giao dịch **vẫn được đưa qua BSP/ARC** như phân tích ở bài trước — NDC đổi kênh phân phối và định dạng dữ liệu, không đổi hạ tầng thanh toán.

## NDC không nhất thiết "bỏ qua" GDS

Có một hiểu lầm phổ biến: NDC = chống GDS. Thực tế tinh tế hơn:

- **Kết nối trực tiếp (direct connect)**: đại lý tích hợp API của từng hãng — thường là các đại lý lớn, có đội ngũ kỹ thuật (ở Mỹ còn có mô hình **Agency NDC – ANA**, đại lý ký thỏa thuận trực tiếp với hãng).
- **Qua aggregator**: các GDS cũ **đã chuyển mình thành aggregator NDC** (Amadeus NDC-X, Sabre, Travelport) — họ đóng vai trò trung gian tập hợp offer từ nhiều hãng và đẩy về workspace đại lý vốn quen dùng. Như vậy GDS không biến mất, mà đổi vai từ "kho giá tĩnh" thành "ống dẫn offer động".

Điều này quan trọng với đại lý: làm việc với NDC qua aggregator có thể tránh được việc phải tích hợp riêng lẻ với hàng chục hãng — nhưng đồng nghĩa phải chấp nhận thêm một lớp trung gian, và phí GDS trước đây giờ dịch chuyển thành chi phí của hạ tầng NDC.

## Chuyện tiền trong NDC

Với [bài phân tích hoàn tiền](/blog/hoan-tien-ve-may-bay-quy-trinh-va-dong-tien/), ta biết dòng tiền mua và hoàn đều chạy theo kênh đã giao dịch. Trong NDC:

- **Thanh toán** vẫn đặt trên nền BSP/ARC: hãng phát hành offer, đại lý bán, khoản tiền được báo cáo và bù trừ qua hệ thống quen thuộc — IATA đã liên tục chuẩn hoá để NDC hoạt động "trơn" với BSP.
- **Hoàn/đổi vé NDC** về mặt nghiệp vụ sát với "order refund/order change" — trạng thái đơn hàng cập nhật theo thời gian thực, minh bạch hơn PNR cũ. Giống như bài trước đã chỉ rõ: giỏi nhất là minh bạch, nhưng thời gian tiền về vẫn phụ thuộc chu kỳ bù trừ định kỳ.
- Các phương thức thanh toán thay thế (ví: ví IATA, UATP, thẻ hãng phát hành) được đưa vào chuẩn để hãng giảm chi phí xử lý thẻ.

Rủi ro kế toán **theo chiều ngược**: khi dữ liệu offer/order sai lệch giữa hãng và đại lý, các bút toán **ADM/ACM** vẫn có thể phát sinh — nhưng trong môi trường NDC, dữ liệu gần thời gian thực hơn nên khiếu nại thường dễ truy vết hơn.

## Lợi ích và thách thức

**Với hãng bay:**
- Tự do **định giá động** theo cầu, theo khách, theo kênh.
- Bán được toàn bộ **dịch vụ phụ trợ** — một trong những nguồn doanh thu tăng nhanh nhất ngành hàng không.
- Giảm phụ thuộc và phí phân phối vào GDS; sở hữu dữ liệu hành vi khách.

**Với đại lý và OTA:**
- Nhận **nội dung đầy đủ và chính xác hơn**, từ đó tư vấn tốt hơn và bán được nhiều "phụ kiện" hơn.
- Tích hợp một lần qua aggregator là có thể bán cho nhiều hãng.
- Phải **đầu tư kỹ thuật và đào tạo**: quy trình, workspace, xử lý lỗi API, khác biệt giữa các phiên bản NDC.

**Thách thức chung:**
- Chi phí và công sức chuyển đổi lớn cho toàn ngành, nhất là với đại lý nhỏ.
- Sự **không đồng nhất giữa các hãng**: mỗi hãng triển khai NDC theo phiên bản và cách riêng (các chuẩn liên tục phát hành phiên bản mới), khiến aggregator và đại lý phải theo dõi liên tục.
- Vấn đề **cạnh tranh công bằng**: tại Hoa Kỳ, Bộ Giao thông (DOT) đã siết chặt yêu cầu hãng không được dùng NDC để phân biệt đối xử giá vé giữa các kênh bán — một điểm nóng của ngành trong những năm gần đây.

## NDC ở Việt Nam

Trong bối cảnh trong nước, các hãng hàng không Việt Nam đã và đang theo lộ trình triển khai NDC cho kênh đại lý — đưa giá vé và phụ phí hãng trực tiếp về hệ thống booking của đại lý qua API. Với đại lý nội địa, thực tế hiện nay vẫn là "song song": GDS truyền thống vẫn phục vụ phần lớn giao dịch, còn NDC dần mở rộng qua aggregator và kết nối trực tiếp với hãng lớn.

## Tương lai của NDC

IATA vẫn tiếp tục phát hành các phiên bản chuẩn mới (từ NDC 18.x, 20.x đến 21.3 và các bản mới hơn) cùng lộ trình **ONE Order** — gộp luôn cả báo cáo thanh toán vào một "order" duy nhất, bước tiếp theo sau NDC nhằm dọn luôn tầng lưu trữ dữ liệu. Xu hướng rõ ràng: **offer/order sẽ là ngôn ngữ chung**, aggregator thay GDS, và thanh toán vẫn dựa trên nền BSP/ARC.

## Tóm lại

NDC không phải là "một tính năng" mà là **đổi nền tảng cách ngành bán vé**: từ tìm kiếm bảng giá tĩnh sang **giao dịch offer theo thời gian thực**, từ PNR sang order, từ dữ liệu EDIFACT sang API. Với hãng bay, đó là quyền tự do thương mại. Với đại lý, đó là nội dung phong phú hơn nhưng kèm chi phí chuyển đổi. Và với hành khách, đó là lý do vì sao cùng một chuyến bay, giá hiển thị có thể khác nhau từng giây — và vì sao hạ tầng tiền bạc phía sau (BSP/ARC) vẫn lặng lẽ vận hành như hôm nào.