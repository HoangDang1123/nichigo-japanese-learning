/**
 * skills-categories.ts — Skills category metadata (overview cards)
 *
 * Shared by the Skills overview and the category page (hence skills/shared/). Split out of the former skills-mock-data.ts (JPN-ARCH-004); content unchanged.
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
  /** Where an available screen gets its content. Omitted = demo data for "demo" screens. "api" = public Skills Content API. */
  contentSource?: "api";
  japaneseTitle?: string;
  isAvailable?: boolean;
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
    contentSource: "api",
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
