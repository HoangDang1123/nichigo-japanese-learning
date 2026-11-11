/**
 * skills-mock-data.ts — Isolated mock data module for Skills Library UI
 *
 * NOTE FOR REVIEWERS & AGENTS:
 * This is DEMO/MOCK DATA created strictly for frontend visual and interaction prototyping.
 * It is NOT published curriculum content and must not be treated as production database records.
 * Real content will be integrated via JPN-020/022/023 published content adapters.
 */

export type SkillCategoryKey =
  | "kana"
  | "vocabulary"
  | "grammar"
  | "kanji"
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "flashcards"
  // Legacy keys: separate hiragana/katakana entries kept in LEGACY_SKILL_CATEGORIES (not used by the overview)
  | "hiragana"
  | "katakana";

export type SkillFilterGroup = "all" | "foundational" | "language-skills" | "review";

export type AvailabilityStatus = "demo" | "planned" | "unavailable";

export interface CategoryMeta {
  key: SkillCategoryKey;
  marker: string;
  markerFont: "sans" | "serif";
  title: string;
  subtitle: string;
  description: string;
  filterGroup: SkillFilterGroup;
  availability: AvailabilityStatus;
  href: string;
  accentClass: string;
  // Legacy fields, used only by the LEGACY_SKILL_CATEGORIES entries
  japaneseTitle?: string;
  isAvailable?: boolean;
}

export interface KanaItem {
  id: string;
  glyph: string;
  romaji: string;
  row: string;
  exampleWord: string;
  exampleReading: string;
  exampleMeaning: string;
  note?: string;
}

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

/**
 * SKILL_CATEGORIES — 9 overview cards for the new /skills page.
 * Legacy hiragana/katakana entries are kept below in LEGACY_SKILL_CATEGORIES.
 */
export const SKILL_CATEGORIES: CategoryMeta[] = [
  {
    key: "kana",
    marker: "あ",
    markerFont: "sans",
    title: "Bảng chữ cái",
    subtitle: "Hiragana · Katakana",
    description: "Nắm vững bảng âm Hiragana và Katakana — nền tảng đọc viết tiếng Nhật.",
    filterGroup: "foundational",
    availability: "demo",
    href: "/skills/kana",
    accentClass: "accentKana",
    japaneseTitle: "仮名",
    isAvailable: true,
  },
  {
    key: "vocabulary",
    marker: "語",
    markerFont: "serif",
    title: "Từ vựng",
    subtitle: "語彙",
    description: "Mở rộng vốn từ theo chủ đề với ngữ cảnh thực tế.",
    filterGroup: "foundational",
    availability: "demo",
    href: "/skills/vocabulary",
    accentClass: "accentVocabulary",
    japaneseTitle: "語彙",
    isAvailable: true,
  },
  {
    key: "grammar",
    marker: "文",
    markerFont: "serif",
    title: "Ngữ pháp",
    subtitle: "文法",
    description: "Nắm vững cấu trúc câu và cách dùng các mẫu cơ bản.",
    filterGroup: "foundational",
    availability: "demo",
    href: "/skills/grammar",
    accentClass: "accentGrammar",
    japaneseTitle: "文法",
    isAvailable: true,
  },
  {
    key: "kanji",
    marker: "漢",
    markerFont: "serif",
    title: "Kanji",
    subtitle: "漢字",
    description: "Làm quen với chữ Hán và cách đọc trong tiếng Nhật.",
    filterGroup: "foundational",
    availability: "demo",
    href: "/skills/kanji",
    accentClass: "accentKanji",
    japaneseTitle: "漢字",
    isAvailable: true,
  },
  {
    key: "listening",
    marker: "聞",
    markerFont: "serif",
    title: "Nghe hiểu",
    subtitle: "聴解",
    description: "Luyện nghe hội thoại và bài nghe ngắn, thực tế.",
    filterGroup: "language-skills",
    availability: "unavailable",
    href: "/skills/listening",
    accentClass: "accentListening",
    japaneseTitle: "聴解",
    isAvailable: false,
  },
  {
    key: "speaking",
    marker: "話",
    markerFont: "serif",
    title: "Nói",
    subtitle: "会話",
    description: "Luyện phát âm, phản xạ và giao tiếp cơ bản.",
    filterGroup: "language-skills",
    availability: "unavailable",
    href: "/skills/speaking",
    accentClass: "accentSpeaking",
    japaneseTitle: "会話",
    isAvailable: false,
  },
  {
    key: "reading",
    marker: "読",
    markerFont: "serif",
    title: "Đọc hiểu",
    subtitle: "読解",
    description: "Đọc hiểu đoạn văn và hội thoại tiếng Nhật đơn giản.",
    filterGroup: "language-skills",
    availability: "unavailable",
    href: "/skills/reading",
    accentClass: "accentReading",
    japaneseTitle: "読解",
    isAvailable: false,
  },
  {
    key: "writing",
    marker: "書",
    markerFont: "serif",
    title: "Viết",
    subtitle: "書く",
    description: "Luyện viết chữ, câu và đoạn ngắn theo cấu trúc.",
    filterGroup: "language-skills",
    availability: "unavailable",
    href: "/skills/writing",
    accentClass: "accentWriting",
    japaneseTitle: "書く",
    isAvailable: false,
  },
  {
    key: "flashcards",
    marker: "習",
    markerFont: "sans",
    title: "Flashcard",
    subtitle: "フラッシュカード",
    description: "Ghi nhớ từ vựng hiệu quả với thẻ học cá nhân hóa.",
    filterGroup: "review",
    availability: "planned",
    href: "/skills/flashcards",
    accentClass: "accentFlashcards",
    japaneseTitle: "フラッシュカード",
    isAvailable: false,
  },
];

// ---------------------------------------------------------------------------
// Legacy entries: not used by the overview or the Kana chart (preserved, not removed)
// ---------------------------------------------------------------------------
export const LEGACY_SKILL_CATEGORIES: CategoryMeta[] = [
  {
    key: "hiragana",
    marker: "あ",
    markerFont: "sans",
    title: "Chữ Hiragana",
    subtitle: "平仮名",
    description: "Bảng chữ mềm biểu âm cơ bản cho từ thuần Nhật và trợ từ.",
    filterGroup: "foundational",
    availability: "demo",
    href: "/skills/kana",
    accentClass: "accentKana",
    japaneseTitle: "平仮名",
    isAvailable: true,
  },
  {
    key: "katakana",
    marker: "ア",
    markerFont: "sans",
    title: "Chữ Katakana",
    subtitle: "片仮名",
    description: "Bảng chữ cứng dùng cho từ mượn quốc tế, tên riêng và nhấn mạnh.",
    filterGroup: "foundational",
    availability: "demo",
    href: "/skills/kana",
    accentClass: "accentKana",
    japaneseTitle: "片仮名",
    isAvailable: true,
  },
  {
    key: "vocabulary",
    marker: "言",
    markerFont: "sans",
    title: "Từ vựng N5",
    subtitle: "語彙",
    description: "Kho từ vựng thiết yếu cho giao tiếp hằng ngày và nền tảng sơ cấp.",
    filterGroup: "foundational",
    availability: "demo",
    href: "/skills/vocabulary",
    accentClass: "accentVocabulary",
    japaneseTitle: "語彙",
    isAvailable: true,
  },
  {
    key: "grammar",
    marker: "文",
    markerFont: "sans",
    title: "Ngữ pháp căn bản",
    subtitle: "文法",
    description: "Cấu trúc câu, mẫu hội thoại và trợ từ chuẩn xác cho người mới bắt đầu.",
    filterGroup: "foundational",
    availability: "demo",
    href: "/skills/grammar",
    accentClass: "accentGrammar",
    japaneseTitle: "文法",
    isAvailable: true,
  },
  {
    key: "kanji",
    marker: "漢",
    markerFont: "sans",
    title: "Chữ Hán N5",
    subtitle: "漢字",
    description: "Chữ Hán căn bản kèm âm Hán-Việt, âm On/Kun và từ ghép tiêu biểu.",
    filterGroup: "foundational",
    availability: "demo",
    href: "/skills/kanji",
    accentClass: "accentKanji",
    japaneseTitle: "漢字",
    isAvailable: true,
  },
  {
    key: "listening",
    marker: "音",
    markerFont: "sans",
    title: "Luyện nghe",
    subtitle: "聴解",
    description: "Luyện phản xạ âm điệu và hội thoại đời sống với ngữ âm tự nhiên.",
    filterGroup: "language-skills",
    availability: "unavailable",
    href: "/skills/listening",
    accentClass: "accentListening",
    japaneseTitle: "聴解",
    isAvailable: false,
  },
];

// ---------------------------------------------------------------------------
// Mock content data — UNCHANGED
// ---------------------------------------------------------------------------
export const MOCK_HIRAGANA_ITEMS: KanaItem[] = [
  // Hàng A
  { id: "h-a", glyph: "あ", romaji: "a", row: "A", exampleWord: "あめ", exampleReading: "ame", exampleMeaning: "mưa / kẹo" },
  { id: "h-i", glyph: "い", romaji: "i", row: "A", exampleWord: "いぬ", exampleReading: "inu", exampleMeaning: "con chó" },
  { id: "h-u", glyph: "う", romaji: "u", row: "A", exampleWord: "うみ", exampleReading: "umi", exampleMeaning: "biển" },
  { id: "h-e", glyph: "え", romaji: "e", row: "A", exampleWord: "えき", exampleReading: "eki", exampleMeaning: "nhà ga" },
  { id: "h-o", glyph: "お", romaji: "o", row: "A", exampleWord: "お茶", exampleReading: "ocha", exampleMeaning: "trà" },
  // Hàng Ka
  { id: "h-ka", glyph: "か", romaji: "ka", row: "Ka", exampleWord: "かさ", exampleReading: "kasa", exampleMeaning: "cái ô (dù)" },
  { id: "h-ki", glyph: "き", romaji: "ki", row: "Ka", exampleWord: "き", exampleReading: "ki", exampleMeaning: "cây cối" },
  { id: "h-ku", glyph: "く", romaji: "ku", row: "Ka", exampleWord: "くるま", exampleReading: "kuruma", exampleMeaning: "xe hơi" },
  { id: "h-ke", glyph: "け", romaji: "ke", row: "Ka", exampleWord: "けさ", exampleReading: "kesa", exampleMeaning: "sáng nay" },
  { id: "h-ko", glyph: "こ", romaji: "ko", row: "Ka", exampleWord: "こども", exampleReading: "kodomo", exampleMeaning: "trẻ em" },
  // Hàng Sa
  { id: "h-sa", glyph: "さ", romaji: "sa", row: "Sa", exampleWord: "さくら", exampleReading: "sakura", exampleMeaning: "hoa anh đào" },
  { id: "h-shi", glyph: "し", romaji: "shi", row: "Sa", exampleWord: "しろ", exampleReading: "shiro", exampleMeaning: "màu trắng" },
  { id: "h-su", glyph: "す", romaji: "su", row: "Sa", exampleWord: "すし", exampleReading: "sushi", exampleMeaning: "món sushi" },
  { id: "h-se", glyph: "せ", romaji: "se", row: "Sa", exampleWord: "せんせい", exampleReading: "sensei", exampleMeaning: "thầy cô giáo" },
  { id: "h-so", glyph: "そ", romaji: "so", row: "Sa", exampleWord: "そら", exampleReading: "sora", exampleMeaning: "bầu trời" },
  // Hàng Ta
  { id: "h-ta", glyph: "た", romaji: "ta", row: "Ta", exampleWord: "たまご", exampleReading: "tamago", exampleMeaning: "quả trứng" },
  { id: "h-chi", glyph: "ち", romaji: "chi", row: "Ta", exampleWord: "ちず", exampleReading: "chizu", exampleMeaning: "bản đồ" },
  { id: "h-tsu", glyph: "つ", romaji: "tsu", row: "Ta", exampleWord: "つき", exampleReading: "tsuki", exampleMeaning: "mặt trăng" },
  { id: "h-te", glyph: "て", romaji: "te", row: "Ta", exampleWord: "てがみ", exampleReading: "tegami", exampleMeaning: "bức thư" },
  { id: "h-to", glyph: "と", romaji: "to", row: "Ta", exampleWord: "ともだち", exampleReading: "tomodachi", exampleMeaning: "bạn bè" },
  // Hàng Na
  { id: "h-na", glyph: "な", romaji: "na", row: "Na", exampleWord: "なつ", exampleReading: "natsu", exampleMeaning: "mùa hè" },
  { id: "h-ni", glyph: "に", romaji: "ni", row: "Na", exampleWord: "にほん", exampleReading: "nihon", exampleMeaning: "Nhật Bản" },
  { id: "h-nu", glyph: "ぬ", romaji: "nu", row: "Na", exampleWord: "ぬいぐるみ", exampleReading: "nuigurumi", exampleMeaning: "thú nhồi bông" },
  { id: "h-ne", glyph: "ね", romaji: "ne", row: "Na", exampleWord: "ねこ", exampleReading: "neko", exampleMeaning: "con mèo" },
  { id: "h-no", glyph: "の", romaji: "no", row: "Na", exampleWord: "のみもの", exampleReading: "nomimono", exampleMeaning: "đồ uống" },
  // Hàng Ha
  { id: "h-ha", glyph: "は", romaji: "ha", row: "Ha", exampleWord: "はな", exampleReading: "hana", exampleMeaning: "hoa / mũi" },
  { id: "h-hi", glyph: "ひ", romaji: "hi", row: "Ha", exampleWord: "ひと", exampleReading: "hito", exampleMeaning: "con người" },
  { id: "h-fu", glyph: "ふ", romaji: "fu", row: "Ha", exampleWord: "ふね", exampleReading: "fune", exampleMeaning: "thuyền, tàu" },
  { id: "h-he", glyph: "へ", romaji: "he", row: "Ha", exampleWord: "へや", exampleReading: "heya", exampleMeaning: "căn phòng" },
  { id: "h-ho", glyph: "ほ", romaji: "ho", row: "Ha", exampleWord: "ほん", exampleReading: "hon", exampleMeaning: "sách" },
  // Hàng Ma
  { id: "h-ma", glyph: "ま", romaji: "ma", row: "Ma", exampleWord: "まち", exampleReading: "machi", exampleMeaning: "thị trấn, phố" },
  { id: "h-mi", glyph: "み", romaji: "mi", row: "Ma", exampleWord: "みず", exampleReading: "mizu", exampleMeaning: "nước" },
  { id: "h-mu", glyph: "む", romaji: "mu", row: "Ma", exampleWord: "むし", exampleReading: "mushi", exampleMeaning: "côn trùng" },
  { id: "h-me", glyph: "め", romaji: "me", row: "Ma", exampleWord: "めがね", exampleReading: "megane", exampleMeaning: "mắt kính" },
  { id: "h-mo", glyph: "も", romaji: "mo", row: "Ma", exampleWord: "もり", exampleReading: "mori", exampleMeaning: "khu rừng" },
  // Hàng Ya
  { id: "h-ya", glyph: "や", romaji: "ya", row: "Ya", exampleWord: "やま", exampleReading: "yama", exampleMeaning: "núi" },
  { id: "h-yu", glyph: "ゆ", romaji: "yu", row: "Ya", exampleWord: "ゆき", exampleReading: "yuki", exampleMeaning: "tuyết" },
  { id: "h-yo", glyph: "よ", romaji: "yo", row: "Ya", exampleWord: "よる", exampleReading: "yoru", exampleMeaning: "buổi tối, đêm" },
  // Hàng Ra
  { id: "h-ra", glyph: "ら", romaji: "ra", row: "Ra", exampleWord: "らいしゅう", exampleReading: "raishuu", exampleMeaning: "tuần sau" },
  { id: "h-ri", glyph: "り", romaji: "ri", row: "Ra", exampleWord: "りんご", exampleReading: "ringo", exampleMeaning: "quả táo" },
  { id: "h-ru", glyph: "る", romaji: "ru", row: "Ra", exampleWord: "るす", exampleReading: "rusu", exampleMeaning: "vắng nhà" },
  { id: "h-re", glyph: "れ", romaji: "re", row: "Ra", exampleWord: "れいぞうこ", exampleReading: "reizouko", exampleMeaning: "tủ lạnh" },
  { id: "h-ro", glyph: "ろ", romaji: "ro", row: "Ra", exampleWord: "ろうそく", exampleReading: "rousoku", exampleMeaning: "cây nến" },
  // Hàng Wa & N
  { id: "h-wa", glyph: "わ", romaji: "wa", row: "Wa", exampleWord: "わたし", exampleReading: "watashi", exampleMeaning: "tôi" },
  { id: "h-wo", glyph: "を", romaji: "wo", row: "Wa", exampleWord: "ほんをよむ", exampleReading: "hon-o-yomu", exampleMeaning: "(trợ từ chỉ tân ngữ)" },
  { id: "h-n", glyph: "ん", romaji: "n", row: "N", exampleWord: "にほん", exampleReading: "nihon", exampleMeaning: "âm mũi /n/ kết thúc" },
];

export const MOCK_KATAKANA_ITEMS: KanaItem[] = [
  // Hàng A
  { id: "k-a", glyph: "ア", romaji: "a", row: "A", exampleWord: "アイス", exampleReading: "aisu", exampleMeaning: "kem (ice cream)" },
  { id: "k-i", glyph: "イ", romaji: "i", row: "A", exampleWord: "インク", exampleReading: "inku", exampleMeaning: "mực in" },
  { id: "k-u", glyph: "ウ", romaji: "u", row: "A", exampleWord: "ウール", exampleReading: "uuru", exampleMeaning: "len" },
  { id: "k-e", glyph: "エ", romaji: "e", row: "A", exampleWord: "エアコン", exampleReading: "eakon", exampleMeaning: "máy điều hòa" },
  { id: "k-o", glyph: "オ", romaji: "o", row: "A", exampleWord: "オレンジ", exampleReading: "orenji", exampleMeaning: "quả cam" },
  // Hàng Ka
  { id: "k-ka", glyph: "カ", romaji: "ka", row: "Ka", exampleWord: "カメラ", exampleReading: "kamera", exampleMeaning: "máy ảnh" },
  { id: "k-ki", glyph: "キ", romaji: "ki", row: "Ka", exampleWord: "キー", exampleReading: "kii", exampleMeaning: "chìa khóa" },
  { id: "k-ku", glyph: "ク", romaji: "ku", row: "Ka", exampleWord: "クラス", exampleReading: "kurasu", exampleMeaning: "lớp học (class)" },
  { id: "k-ke", glyph: "ケ", romaji: "ke", row: "Ka", exampleWord: "ケーキ", exampleReading: "keeki", exampleMeaning: "bánh ngọt (cake)" },
  { id: "k-ko", glyph: "コ", romaji: "ko", row: "Ka", exampleWord: "コーヒー", exampleReading: "koohii", exampleMeaning: "cà phê (coffee)" },
  // Hàng Sa
  { id: "k-sa", glyph: "サ", romaji: "sa", row: "Sa", exampleWord: "サラダ", exampleReading: "sarada", exampleMeaning: "món salad" },
  { id: "k-shi", glyph: "シ", romaji: "shi", row: "Sa", exampleWord: "シャツ", exampleReading: "shatsu", exampleMeaning: "áo sơ mi (shirt)" },
  { id: "k-su", glyph: "ス", romaji: "su", row: "Sa", exampleWord: "スポーツ", exampleReading: "supootsu", exampleMeaning: "thể thao (sports)" },
  { id: "k-se", glyph: "セ", romaji: "se", row: "Sa", exampleWord: "セーター", exampleReading: "seetaa", exampleMeaning: "áo len (sweater)" },
  { id: "k-so", glyph: "ソ", romaji: "so", row: "Sa", exampleWord: "ソファ", exampleReading: "sofa", exampleMeaning: "ghế sofa" },
  // Hàng Ta
  { id: "k-ta", glyph: "タ", romaji: "ta", row: "Ta", exampleWord: "タクシー", exampleReading: "takushii", exampleMeaning: "taxi" },
  { id: "k-chi", glyph: "チ", romaji: "chi", row: "Ta", exampleWord: "チーズ", exampleReading: "chiizu", exampleMeaning: "phô mai (cheese)" },
  { id: "k-tsu", glyph: "ツ", romaji: "tsu", row: "Ta", exampleWord: "ツアー", exampleReading: "tsuaa", exampleMeaning: "chuyến du lịch (tour)" },
  { id: "k-te", glyph: "テ", romaji: "te", row: "Ta", exampleWord: "テレビ", exampleReading: "terebi", exampleMeaning: "ti vi (television)" },
  { id: "k-to", glyph: "ト", romaji: "to", row: "Ta", exampleWord: "トマト", exampleReading: "tomato", exampleMeaning: "quả cà chua (tomato)" },
  // Hàng Na
  { id: "k-na", glyph: "ナ", romaji: "na", row: "Na", exampleWord: "ナイフ", exampleReading: "naifu", exampleMeaning: "con dao (knife)" },
  { id: "k-ni", glyph: "ニ", romaji: "ni", row: "Na", exampleWord: "ニュース", exampleReading: "nyuusu", exampleMeaning: "tin tức (news)" },
  { id: "k-nu", glyph: "ヌ", romaji: "nu", row: "Na", exampleWord: "ヌードル", exampleReading: "nuudoru", exampleMeaning: "mì sợi (noodle)" },
  { id: "k-ne", glyph: "ネ", romaji: "ne", row: "Na", exampleWord: "ネクタイ", exampleReading: "nekutai", exampleMeaning: "cà vạt (necktie)" },
  { id: "k-no", glyph: "ノ", romaji: "no", row: "Na", exampleWord: "ノート", exampleReading: "nooto", exampleMeaning: "vở ghi chép (notebook)" },
  // Hàng Ha
  { id: "k-ha", glyph: "ハ", romaji: "ha", row: "Ha", exampleWord: "パン", exampleReading: "pan", exampleMeaning: "bánh mì" },
  { id: "k-hi", glyph: "ヒ", romaji: "hi", row: "Ha", exampleWord: "ヒーター", exampleReading: "hiitaa", exampleMeaning: "máy sưởi (heater)" },
  { id: "k-fu", glyph: "フ", romaji: "fu", row: "Ha", exampleWord: "フォーク", exampleReading: "fooku", exampleMeaning: "nĩa ăn (fork)" },
  { id: "k-he", glyph: "ヘ", romaji: "he", row: "Ha", exampleWord: "ヘルメット", exampleReading: "herumetto", exampleMeaning: "mũ bảo hiểm (helmet)" },
  { id: "k-ho", glyph: "ホ", romaji: "ho", row: "Ha", exampleWord: "ホテル", exampleReading: "hoteru", exampleMeaning: "khách sạn (hotel)" },
  // Hàng Ma
  { id: "k-ma", glyph: "マ", romaji: "ma", row: "Ma", exampleWord: "マスク", exampleReading: "masuku", exampleMeaning: "khẩu trang (mask)" },
  { id: "k-mi", glyph: "ミ", romaji: "mi", row: "Ma", exampleWord: "ミルク", exampleReading: "miruku", exampleMeaning: "sữa tươi (milk)" },
  { id: "k-mu", glyph: "ム", romaji: "mu", row: "Ma", exampleWord: "ムービー", exampleReading: "muubii", exampleMeaning: "phim ảnh (movie)" },
  { id: "k-me", glyph: "メ", romaji: "me", row: "Ma", exampleWord: "メール", exampleReading: "meeru", exampleMeaning: "thư điện tử (mail)" },
  { id: "k-mo", glyph: "モ", romaji: "mo", row: "Ma", exampleWord: "モデル", exampleReading: "moderu", exampleMeaning: "mô hình, người mẫu" },
  // Hàng Ya
  { id: "k-ya", glyph: "ヤ", romaji: "ya", row: "Ya", exampleWord: "ヤード", exampleReading: "yaado", exampleMeaning: "thước Anh (yard)" },
  { id: "k-yu", glyph: "ユ", romaji: "yu", row: "Ya", exampleWord: "ユーモア", exampleReading: "yuumoa", exampleMeaning: "sự hài hước (humour)" },
  { id: "k-yo", glyph: "ヨ", romaji: "yo", row: "Ya", exampleWord: "ヨーグルト", exampleReading: "yooguruto", exampleMeaning: "sữa chua (yogurt)" },
  // Hàng Ra
  { id: "k-ra", glyph: "ラ", romaji: "ra", row: "Ra", exampleWord: "ラジオ", exampleReading: "rajio", exampleMeaning: "đài radio" },
  { id: "k-ri", glyph: "リ", romaji: "ri", row: "Ra", exampleWord: "リーダー", exampleReading: "riidaa", exampleMeaning: "người lãnh đạo (leader)" },
  { id: "k-ru", glyph: "ル", romaji: "ru", row: "Ra", exampleWord: "ルール", exampleReading: "ruuru", exampleMeaning: "quy tắc (rule)" },
  { id: "k-re", glyph: "レ", romaji: "re", row: "Ra", exampleWord: "レストラン", exampleReading: "resutoran", exampleMeaning: "nhà hàng (restaurant)" },
  { id: "k-ro", glyph: "ロ", romaji: "ro", row: "Ra", exampleWord: "ロボット", exampleReading: "robotto", exampleMeaning: "người máy (robot)" },
  // Hàng Wa & N
  { id: "k-wa", glyph: "ワ", romaji: "wa", row: "Wa", exampleWord: "ワイン", exampleReading: "wain", exampleMeaning: "rượu vang (wine)" },
  { id: "k-wo", glyph: "ヲ", romaji: "wo", row: "Wa", exampleWord: "ヲ", exampleReading: "wo", exampleMeaning: "(chủ yếu trong văn bản cổ/mã)" },
  { id: "k-n", glyph: "ン", romaji: "n", row: "N", exampleWord: "パン", exampleReading: "pan", exampleMeaning: "âm mũi /n/ kết thúc" },
];

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
