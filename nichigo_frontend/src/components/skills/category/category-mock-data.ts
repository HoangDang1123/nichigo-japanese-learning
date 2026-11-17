/**
 * category-mock-data.ts — Vocabulary, Grammar and Kanji demo items for the category detail page
 *
 * Owned by the category detail page. Vocabulary and Grammar have their own feature data under ./vocabulary and ./grammar; these older lists are still rendered for Kanji
 * and kept for the legacy skills-library. Split out of the former skills-mock-data.ts (JPN-ARCH-004); content unchanged.
 * This is DEMO/MOCK DATA created strictly for frontend visual and interaction prototyping.
 * It is NOT published curriculum content and must not be treated as production database records.
 * Real content will be integrated via JPN-020/022/023 published content adapters.
 */

export interface VocabItem {
  id: string;
  surface: string;
  reading: string;
  hanViet?: string;
  meaningVi: string;
  wordType: string;
  exampleSentenceJa: string;
  exampleSentenceVi: string;
}

export interface GrammarItem {
  id: string;
  pattern: string;
  meaningVi: string;
  explanationVi: string;
  exampleJa: string;
  exampleFurigana: string;
  exampleVi: string;
}

export interface KanjiItem {
  id: string;
  glyph: string;
  hanViet: string;
  meaningVi: string;
  onyomi: string;
  kunyomi: string;
  strokeCount: number;
  exampleWord: string;
  exampleReading: string;
  exampleMeaning: string;
}

export const MOCK_VOCAB_ITEMS: VocabItem[] = [
  {
    id: "v-01",
    surface: "こんにちは",
    reading: "konnichiwa",
    meaningVi: "Xin chào (chào ban ngày thông dụng)",
    wordType: "Chào hỏi",
    exampleSentenceJa: "先生、こんにちは。",
    exampleSentenceVi: "Em chào thầy/cô ạ.",
  },
  {
    id: "v-02",
    surface: "ありがとう",
    reading: "arigatou",
    meaningVi: "Cảm ơn",
    wordType: "Cảm ơn",
    exampleSentenceJa: "手伝ってくれて、ありがとう。",
    exampleSentenceVi: "Cảm ơn bạn đã giúp đỡ mình.",
  },
  {
    id: "v-03",
    surface: "先生",
    reading: "せんせい",
    hanViet: "TIÊN SINH",
    meaningVi: "Thầy giáo, cô giáo, bác sĩ",
    wordType: "Danh từ",
    exampleSentenceJa: "田中先生は日本語を教えます。",
    exampleSentenceVi: "Thầy Tanaka dạy tiếng Nhật.",
  },
  {
    id: "v-04",
    surface: "学生",
    reading: "がくせい",
    hanViet: "HỌC SINH",
    meaningVi: "Học sinh, sinh viên",
    wordType: "Danh từ",
    exampleSentenceJa: "わたしはベトナムの学生です。",
    exampleSentenceVi: "Tôi là sinh viên Việt Nam.",
  },
  {
    id: "v-05",
    surface: "日本語",
    reading: "にほんご",
    hanViet: "NHẬT BẢN NGỮ",
    meaningVi: "Tiếng Nhật",
    wordType: "Danh từ",
    exampleSentenceJa: "毎朝、日本語を勉強します。",
    exampleSentenceVi: "Mỗi sáng, tôi đều học tiếng Nhật.",
  },
  {
    id: "v-06",
    surface: "本",
    reading: "ほん",
    hanViet: "BẢN / BỔN",
    meaningVi: "Cuốn sách",
    wordType: "Danh từ",
    exampleSentenceJa: "これは日本語の本です。",
    exampleSentenceVi: "Đây là cuốn sách tiếng Nhật.",
  },
  {
    id: "v-07",
    surface: "水",
    reading: "みず",
    hanViet: "THỦY",
    meaningVi: "Nước lọc, nước uống",
    wordType: "Danh từ",
    exampleSentenceJa: "冷たい水を一杯ください。",
    exampleSentenceVi: "Cho tôi xin một ly nước lạnh.",
  },
  {
    id: "v-08",
    surface: "食べる",
    reading: "たべる",
    hanViet: "THỰC",
    meaningVi: "Ăn",
    wordType: "Động từ",
    exampleSentenceJa: "朝ごはんを一緒に食べましょう。",
    exampleSentenceVi: "Chúng ta cùng ăn bữa sáng nhé.",
  },
  {
    id: "v-09",
    surface: "行く",
    reading: "いく",
    hanViet: "HÀNH",
    meaningVi: "Đi",
    wordType: "Động từ",
    exampleSentenceJa: "明日、学校へ行きます。",
    exampleSentenceVi: "Ngày mai tôi sẽ đến trường.",
  },
  {
    id: "v-10",
    surface: "友達",
    reading: "ともだち",
    hanViet: "HỮU ĐẠT",
    meaningVi: "Bạn bè",
    wordType: "Danh từ",
    exampleSentenceJa: "友達と映画を見に行きます。",
    exampleSentenceVi: "Tôi đi xem phim cùng bạn bè.",
  },
];

export const MOCK_GRAMMAR_ITEMS: GrammarItem[] = [
  {
    id: "g-01",
    pattern: "N1 は N2 です",
    meaningVi: "N1 là N2",
    explanationVi: "Mẫu câu khẳng định cơ bản nhất trong tiếng Nhật. Trợ từ は đánh dấu chủ đề, です đóng vai trò vị ngữ lịch sự.",
    exampleJa: "わたしは学生です。",
    exampleFurigana: "わたし は がくせい です。",
    exampleVi: "Tôi là học sinh / sinh viên.",
  },
  {
    id: "g-02",
    pattern: "N1 は N2 ではありません",
    meaningVi: "N1 không phải là N2",
    explanationVi: "Mẫu câu phủ định lịch sự tương ứng của N1 は N2 です. Trong văn nói thân mật có thể dùng じゃありません.",
    exampleJa: "わたしは先生ではありません。",
    exampleFurigana: "わたし は せんせい で は ありません。",
    exampleVi: "Tôi không phải là thầy/cô giáo.",
  },
  {
    id: "g-03",
    pattern: "N1 は N2 ですか",
    meaningVi: "N1 có phải là N2 không?",
    explanationVi: "Câu hỏi nghi vấn cơ bản. Trợ từ か được đặt ở cuối câu để tạo thành câu hỏi, không cần đổi trật tự từ.",
    exampleJa: "あなたは学生ですか。",
    exampleFurigana: "あなた は がくせい です か。",
    exampleVi: "Bạn có phải là học sinh không?",
  },
  {
    id: "g-04",
    pattern: "N1 の N2",
    meaningVi: "N2 của N1 / N2 thuộc N1",
    explanationVi: "Trợ từ の dùng để nối hai danh từ, thể hiện quan hệ sở hữu, xuất xứ, thuộc tính hoặc giải thích thêm cho danh từ đứng sau.",
    exampleJa: "これはわたしの本です。",
    exampleFurigana: "これ は わたし の ほん です。",
    exampleVi: "Đây là cuốn sách của tôi.",
  },
  {
    id: "g-05",
    pattern: "N を V-ます",
    meaningVi: "Làm hành động V đối với tân ngữ N",
    explanationVi: "Trợ từ を (đọc là /o/) dùng để liên kết đối tượng chịu tác động trực tiếp của ngoại động từ trong câu.",
    exampleJa: "毎朝、お茶を飲みます。",
    exampleFurigana: "まいあさ、おちゃ を のみます。",
    exampleVi: "Mỗi sáng tôi đều uống trà.",
  },
];

export const MOCK_KANJI_ITEMS: KanjiItem[] = [
  {
    id: "kj-01",
    glyph: "日",
    hanViet: "NHẬT",
    meaningVi: "Mặt trời, ngày",
    onyomi: "ニチ, ジツ",
    kunyomi: "ひ, -か",
    strokeCount: 4,
    exampleWord: "日本",
    exampleReading: "にほん (Nihon)",
    exampleMeaning: "Nước Nhật",
  },
  {
    id: "kj-02",
    glyph: "月",
    hanViet: "NGUYỆT",
    meaningVi: "Mặt trăng, tháng",
    onyomi: "ゲツ, ガツ",
    kunyomi: "つき",
    strokeCount: 4,
    exampleWord: "一月",
    exampleReading: "いちがつ (Ichigatsu)",
    exampleMeaning: "Tháng một",
  },
  {
    id: "kj-03",
    glyph: "木",
    hanViet: "MỘC",
    meaningVi: "Cây cối, gỗ",
    onyomi: "モク, ボク",
    kunyomi: "き, こ-",
    strokeCount: 4,
    exampleWord: "木曜日",
    exampleReading: "もくようび (Mokuyoubi)",
    exampleMeaning: "Thứ năm",
  },
  {
    id: "kj-04",
    glyph: "人",
    hanViet: "NHÂN",
    meaningVi: "Người, con người",
    onyomi: "ジン, ニン",
    kunyomi: "ひと, -り",
    strokeCount: 2,
    exampleWord: "日本人",
    exampleReading: "にほんじん (Nihonjin)",
    exampleMeaning: "Người Nhật",
  },
  {
    id: "kj-05",
    glyph: "本",
    hanViet: "BẢN / BỔN",
    meaningVi: "Gốc rễ, sách, cội nguồn",
    onyomi: "ホン",
    kunyomi: "もと",
    strokeCount: 5,
    exampleWord: "日本語",
    exampleReading: "にほんご (Nihongo)",
    exampleMeaning: "Tiếng Nhật",
  },
  {
    id: "kj-06",
    glyph: "水",
    hanViet: "THỦY",
    meaningVi: "Nước",
    onyomi: "スイ",
    kunyomi: "みず",
    strokeCount: 4,
    exampleWord: "水曜日",
    exampleReading: "すいようび (Suiyoubi)",
    exampleMeaning: "Thứ tư",
  },
  {
    id: "kj-07",
    glyph: "火",
    hanViet: "HỎA",
    meaningVi: "Lửa",
    onyomi: "カ",
    kunyomi: "ひ, ほ-",
    strokeCount: 4,
    exampleWord: "火曜日",
    exampleReading: "かようび (Kayoubi)",
    exampleMeaning: "Thứ ba",
  },
  {
    id: "kj-08",
    glyph: "金",
    hanViet: "KIM",
    meaningVi: "Vàng, kim loại, tiền",
    onyomi: "キン, コン",
    kunyomi: "かね, かな-",
    strokeCount: 8,
    exampleWord: "お金",
    exampleReading: "おかね (Okane)",
    exampleMeaning: "Tiền bạc",
  },
];
