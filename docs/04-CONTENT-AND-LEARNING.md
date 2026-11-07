# Chiến lược nội dung và mô hình học tập Nichigo

**Trạng thái:** Hướng **Nichigo Hybrid** đã được Product Owner đồng ý và ghi tại [ADR-014](02-DECISIONS.md). Cấu trúc curriculum, ví dụ và hành vi Railway bên dưới là **PROPOSED**, chưa được phê duyệt để triển khai. Các lựa chọn còn thiếu nằm ở mục **OPEN**. Tài liệu này là nguồn mô tả curriculum; [PRD](01-PRD.md) giữ phạm vi sản phẩm, [kiến trúc](03-ARCHITECTURE.md) giữ mô hình hệ thống, còn [backlog](05-BACKLOG.md) giữ ticket và phụ thuộc.

## JPN-021 — Định dạng biên soạn nội dung (nhánh tính năng)

Gói dữ liệu phẳng có `manifest.json` phiên bản `1.0`; manifest khai báo tối đa một file cho mỗi loại `rights`, `media`, `items`, `lessons`, `paths`. Rights, Media và Item dùng CSV UTF-8 với cột cố định; Lesson và Path dùng JSON UTF-8 với `schemaVersion` và mảng cùng tên loại. [Hợp đồng biên soạn](../contracts/02-CONTENT-PACKAGE-CONTRACT.md) ghi chính xác tên trường, giới hạn và mã lỗi; `content/schemas/v1` là schema máy đọc được. Chỉ `1.0` được hỗ trợ; phiên bản khác bị từ chối, không được tự suy diễn cách nâng cấp.

Sáu `Item.kind` hiện có là `kana`, `vocabulary`, `grammar`, `kanji`, `example`, `dialogue`. Tối thiểu, mỗi Item cần `key`, `kind`, `payload`, `rightsKey`; payload cần lần lượt `script/glyph/reading`, `surface/reading/glossVi`, `pattern/explanationVi`, `glyph/meaningVi`, `textJa/translationVi`, hoặc `turns`. Một Item có khóa ổn định có thể được tham chiếu từ nhiều Lesson. Lesson cần `key`, `slug`, `titleVi`, `rightsKey`, `objectives`, `sections`; mỗi Section có khóa và các Item được sắp theo `position`. Path cần `key`, `titleVi`, `rightsKey`, `stages`; mỗi Stage chứa Chapter, mỗi Chapter chứa placement tham chiếu Lesson bằng khóa ổn định. Đây là cấu trúc dữ liệu biên soạn, không phê duyệt số Stage, syllabus hay quy tắc Railway station.

Khóa ngoài có dạng chữ thường, chữ số và dấu gạch nối, bắt đầu bằng chữ cái; giữ nguyên khóa khi sửa nội dung để tái sử dụng và đối chiếu phiên bản. Khóa Item/Lesson/Media là toàn cục theo loại; khóa Rights là toàn cục; Section chỉ duy nhất trong Lesson và placement chỉ duy nhất trong Chapter. `position` là thứ tự hiển thị, không phải định danh. Gói có thể tham chiếu bản ghi cùng gói hoặc bản ghi đã có; tra cứu cơ sở dữ liệu là chỉ đọc. Gói khai báo Rights mới chỉ cung cấp nguồn, ghi công, cơ sở quyền và tham chiếu bằng chứng; nó không thể tự đặt trạng thái `cleared`. `valid` nghĩa là cấu trúc hợp lệ, **không** nghĩa là `publicationReady`. Dry-run hiện luôn báo `publicationReady: false`. Cần biên tập viên kiểm tra tiếng Nhật/tiếng Việt, nguồn gốc, giấy phép và tài sản media trước khi xuất bản; JPN-022 chịu trách nhiệm thao tác xuất bản có thẩm quyền. Ví dụ trong `content/examples/v1/valid` là dữ liệu minh họa do NichiGo tạo, không sao chép nội dung giáo trình.

## APPROVED — Định hướng Nichigo Hybrid

Nichigo kết hợp giao tiếp tiếng Nhật thực tế với kiến thức ngôn ngữ có trình tự và chuẩn bị cho phạm vi JLPT N5 ban đầu. Irodori là **khung tham khảo** cho tình huống đời sống, mục tiêu Can-do và hoạt động giao tiếp. Minna no Nihongo là **khung tham khảo** cho tiến trình ngữ pháp, kiến thức tiên quyết và bài tập có cấu trúc. Cả hai **không phải kho dữ liệu nội dung** để sao chép. Nichigo tự xây curriculum, mã định danh Lesson và thư viện nội dung dùng chung; mô hình có thể mở rộng sau N5 nhưng N4+ không thuộc MVP hiện tại.

Không suy ra cấp độ JF/CEFR tương đương trực tiếp với cấp độ JLPT. Không sao chép bài học, giải thích, bài tập, âm thanh hay hình ảnh của giáo trình vào Nichigo khi chưa xác minh quyền sử dụng cụ thể. Việc dùng tài liệu tham khảo để kiểm tra kiến thức không thay thế kiểm tra nguồn, giấy phép và độ chính xác ngôn ngữ trước khi xuất bản. Hướng Hybrid không phải cam kết curriculum đã được chuyên gia chứng nhận hoặc bao phủ toàn bộ N5.

**Nguyên tắc Learn by Building:** trải nghiệm tự học của người sáng lập giúp tìm vấn đề và hình thành giả thuyết UX, không chứng minh một thứ tự học phù hợp cho tất cả người học. Dữ kiện ngôn ngữ, ví dụ, phát âm và nét viết cần được kiểm chứng từ nguồn đáng tin cậy trước khi xuất bản.

## PROPOSED — Cấu trúc học tập

`Learning Path → Stage → Chapter → Lesson` là phân cấp **khái niệm**, chưa quyết định mỗi cấp phải có bảng dữ liệu riêng. Learning Path là hành trình mặc định có thứ tự cho người mới. Người học vẫn có thể duyệt Skills và vào Practice độc lập; không buộc mọi hoạt động đi qua Learning Path.

| Stage | Vai trò đề xuất | Giới hạn diễn giải |
| --- | --- | --- |
| **0 — Foundation** | Hệ chữ viết, phát âm, Hiragana và Katakana. | Giai đoạn nhập môn, không phải một cấp JLPT/CEFR chính thức. |
| **1 — Introduction** | Chào hỏi, giới thiệu bản thân, cấu trúc câu cơ bản và tương tác thường ngày. | Kết hợp mục tiêu giao tiếp với kiến thức tiên quyết. |
| **2 — N5 Foundation** | Từ vựng, ngữ pháp, kanji nền tảng, nghe và đọc trong ngữ cảnh thực tế. | Chỉ gắn nhãn N5 sau khi đối chiếu nội dung được duyệt. |
| **3 — N5 Consolidation** | Giao tiếp tích hợp, ôn kiến thức và bài tập mở đầu theo phong cách JLPT. | Thi thử JLPT đầy đủ vẫn ngoài MVP nếu chưa được duyệt. |

**Chapter** nhóm các Lesson theo chủ đề giao tiếp, mục tiêu học hoặc kỹ năng nền tảng. Hiragana, Katakana, Chào hỏi và giới thiệu, Tự giới thiệu, Sinh hoạt hằng ngày, Ăn uống và mua sắm là **ví dụ nhóm**, không phải danh mục hoặc thứ tự đã duyệt. Chapter về hệ chữ viết hoàn toàn hợp lệ dù không xoay quanh một tình huống giao tiếp. Thứ tự Chapter cần cân bằng mục tiêu Can-do và kiến thức ngữ pháp tiên quyết. Chapter có thể có hoạt động ôn tập; việc Chapter Review có bắt buộc hay không còn **OPEN**.

**Lesson** là đơn vị chính của việc học có hướng dẫn và tiến độ hoàn thành bài. Mỗi Lesson *có thể* có mục tiêu học hoặc Can-do, nội dung có thứ tự, từ vựng/ngữ pháp, kana/kanji, hoạt động nghe/đọc/viết/nói, bài tập, kiểm tra kiến thức và tiêu chí hoàn thành phù hợp. Không yêu cầu tất cả loại nội dung trong từng Lesson. Một Lesson có thể ưu tiên giao tiếp, chữ viết hoặc ngữ pháp theo mục tiêu của nó; đánh giá sự cân bằng ở cấp Chapter và Stage, không áp tỷ lệ 50/50 cứng cho từng Lesson. **Hoàn thành Lesson không tự động chứng minh đã thành thạo mọi từ vựng hoặc điểm ngữ pháp trong Lesson.** Thời lượng 5–15 phút chỉ là giả thuyết UX, chưa phải yêu cầu được duyệt.

## PROPOSED — Skills, Practice và đánh giá

Skills là lối vào học/ôn độc lập, không phải cấp con của Learning Path. Các cách phân loại dưới đây phục vụ thiết kế curriculum, **không xác nhận tất cả đã triển khai hoặc nằm trong MVP**:

| Nhóm | Khái niệm |
| --- | --- |
| **Knowledge domains** | Kana, Vocabulary, Grammar, Kanji. |
| **Language skills** | Listening, Reading, Writing, Speaking. |
| **Practice modes** | Flashcards, Quiz, Review, Mini Games. |
| **Assessments** | Lesson Check, Chapter Review, Stage Review, JLPT Practice. |

Lesson, Skills và Practice cùng tham chiếu bản ghi nội dung chuẩn cho kana, từ vựng, ngữ pháp, kanji, ví dụ và media được duyệt; không nhân bản nội dung chuẩn theo màn hình. Kết quả hoàn thành Lesson và mức luyện tập/thành thạo từng item cần là hai mô hình khác nhau. Thuật toán mastery và review chưa được quyết định.

## PROPOSED — Quy trình thiết kế Lesson

1. Xác định mục tiêu giao tiếp hoặc mục tiêu kiến thức có thể quan sát được.
2. Chọn từ vựng, ngữ pháp, hệ chữ viết và kỹ năng cần cho mục tiêu đó.
3. Kiểm tra kiến thức tiên quyết và thứ tự hợp lý trong Chapter/Stage.
4. Đối chiếu phạm vi kiến thức JLPT dự kiến, nhưng không tuyên bố tương đương JF/CEFR hoặc bao phủ N5 khi chưa xác minh.
5. Thiết kế hoạt động theo ngữ cảnh và kiểm tra kiến thức phù hợp; không buộc một cấu trúc cố định cho mọi Lesson.
6. Rà soát tính đúng đắn ngôn ngữ, nguồn tham chiếu, ghi công và quyền sử dụng từng văn bản/media.
7. Kiểm tra dữ liệu và xuất bản qua quy trình import đã lên kế hoạch: bản nháp → rà soát nguồn/quyền và ngôn ngữ → validation/dry-run → thao tác publish được kiểm soát → lưu vết phiên bản.

JPN-021 hiện kiểm tra khóa ổn định và trùng lặp, trường bắt buộc, tham chiếu, thứ tự, chu trình tiên quyết, định dạng kana/kanji và metadata nguồn/quyền; dry-run trả lỗi theo dòng mà không ghi dữ liệu. JPN-022 vẫn phải cung cấp batch ID, import idempotent, review có thẩm quyền và thao tác publish rõ ràng.

**Ma trận minh họa — chưa duyệt, không phải syllabus hoặc nội dung để xuất bản:**

| Stage | Chapter | Lesson | Can-do / mục tiêu | Từ vựng | Ngữ pháp | Kỹ năng | Tham chiếu JLPT | Tiên quyết | Nguồn tham chiếu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Hiragana | Nhận biết âm và chữ đầu tiên | Nhận ra một số ký tự Hiragana đã học. | Chưa ấn định | Không bắt buộc | Đọc, nghe; viết nếu có asset được duyệt | Nhập môn; chưa gán N5 | Không | Cần xác minh nguồn ngôn ngữ và quyền asset. |
| 1 | Chào hỏi và giới thiệu | Chào hỏi trong tình huống đơn giản | Chọn lời chào phù hợp với một ngữ cảnh đã học. | Chưa ấn định | Cấu trúc cần xác định sau khi kiểm tra tiên quyết | Nghe, nói, đọc tùy thiết kế | Chưa đối chiếu N5 | Nội dung Stage 0 phù hợp | Irodori cho khung Can-do, Minna no Nihongo cho trình tự kiến thức; không lấy nội dung. |

Số lượng bài, thứ tự, mục tiêu cụ thể và mức JLPT của từng dòng vẫn cần chuyên môn nội dung và duyệt của Product Owner. Không suy rộng ma trận này thành toàn bộ N5.

## PROPOSED — Tác động lên Railway Journey

[JPN-030](implementation/JPN-030-learning-path.md) hiện là UI preview với các biến thể station minh họa, chưa được nối vào curriculum hay tiến độ thật. Giữ nguyên hướng hình ảnh đã được duyệt và **không đổi hành vi UI trong công việc tài liệu này**.

- **Phương án A:** station đại diện Chapter; chọn station có thể hiện các Lesson trong vùng thông tin hiện có hoặc Chapter Canvas. Có hành động rõ để tiếp tục Lesson kế tiếp và điều hướng Stage dễ hiểu.
- **Phương án B:** station tiếp tục đại diện Lesson, được nhóm trực quan theo Chapter.

Mức station là Chapter hay Lesson vẫn **OPEN**. Nếu hiển thị tiến độ Chapter sau này, chỉ tổng hợp từ tiến độ Lesson đã xác minh; không tự tạo giá trị hoàn thành, ôn tập, chuỗi học hay mastery trong Railway.

## PROPOSED — Tác động lên mô hình nội dung

Đợt thiết kế [JPN-020](05-BACKLOG.md) đã chọn cách biểu diễn Stage/Chapter và thứ tự Chapter–Lesson; định danh Lesson ổn định, độc lập số bài trong giáo trình; tham chiếu nội dung chuẩn dùng lại; mục tiêu Can-do; quan hệ tiên quyết; metadata JLPT và metadata mức giao tiếp **tách biệt**; nguồn gốc, giấy phép, trạng thái review/xuất bản; và ranh giới giữa tiến độ hoàn thành Lesson với luyện tập/mastery từng item. Mỗi item chuẩn cần có khóa ổn định, loại nội dung, phiên bản, mức học thích hợp, văn bản/cách đọc/bản dịch khi phù hợp, ví dụ nếu cần, nguồn/giấy phép và trạng thái duyệt/xuất bản. Phân biệt `introductory` với `N5`; không tự gán tương đương giữa các thang mức. Đây là nhu cầu khái niệm, **không phải syllabus hoặc API mới đã duyệt**. [Kiến trúc](03-ARCHITECTURE.md) phân biệt mô hình sơ bộ với V4 đã merge; tiến độ người học vẫn chưa có migration.

**Cập nhật kỹ thuật JPN-020/JPN-021:** V4 đã merge với bảng định danh Path/Stage/Chapter/Lesson và Content Item dùng lại, có thứ tự quan hệ rõ ràng; API công khai chỉ đọc revision đã niêm phong và tham chiếu đúng revision của Item/Media. Quyền sử dụng được kiểm tra lại khi đọc; thu hồi quyền làm nội dung liên quan không còn được phát công khai. JPN-021 trên nhánh hiện tại kiểm tra payload và gói biên soạn, nhưng không publish. Nền tảng kỹ thuật này **không duyệt** Stage/Chapter syllabus, số lượng Lesson, cách gán station Railway, điều kiện mở khóa hoặc bao phủ N5; chưa có dữ liệu bài học được duyệt.

## Phạm vi MVP và các quyết định OPEN

Vertical slice ban đầu vẫn là học Hiragana nền tảng, quiz, phản hồi và tiến độ lưu được, đi cùng các yêu cầu guest/account hiện có trong [PRD](01-PRD.md). Gợi ý cũ về bộ chữ đầu, audio quyền rõ ràng, minh họa nét viết và 5–10 câu hỏi **chưa được duyệt về số lượng hoặc asset**. Không thêm N4+, thi thử đầy đủ, Mini Games hay thuật toán ôn nâng cao vào MVP bằng tài liệu này.

Product Owner cần quyết định trước khi chốt thiết kế/triển khai:

1. Số lượng và thứ tự Chapter, Lesson chính thức.
2. Syllabus Chapter và mức bao phủ N5 đã được kiểm chứng.
3. Cách mở khóa và có thực thi điều kiện tiên quyết hay không.
4. Chapter Review có bắt buộc hay không.
5. Railway station đại diện Chapter hay Lesson.
6. Tiêu chí hoàn thành Lesson và Chapter.
7. Mức theo dõi mastery và thuật toán review.
8. Quyền sử dụng nội dung, giấy phép và tính sẵn có của audio/hình/nét viết đã được rà soát.

## UX: spotlight tutorial steps (proposed)
1. Highlight main 'Start learning' / learning path CTA.
2. Highlight free skill selection.
3. Highlight lesson continue/progress affordance.
4. Highlight Help / replay tour control.
Each step targets an actual DOM selector/test ID; overlay dims rest of UI; popover arrow anchors to highlighted element; Back/Next/Skip, step indicator/progress; focus and viewport handling. Tour is about **how to use the web**, not an assessment of learner level.
