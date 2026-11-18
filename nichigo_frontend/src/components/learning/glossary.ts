/**
 * glossary.ts — Single source of truth for learning terminology explained by <LearningTerm>.
 *
 * Static educational copy of the interface (JPN-033 Kanji v2a). It is NOT a canonical Skills Item and is never
 * returned by the content API. Kana, Vocabulary and Grammar can reuse it later without duplicating text.
 *
 * Review: every entry starts as `pending`. An entry may become `reviewed` only after the Product Owner has approved
 * its wording, and then it must name who reviewed it and when (enforced by the glossary test).
 * Pure TypeScript: no React.
 */

export type TermId = "kanji" | "onyomi" | "kunyomi" | "furigana" | "dakuten" | "handakuten";

export type GlossaryReview =
  | { status: "pending" }
  | { status: "reviewed"; reviewedBy: string; reviewedAt: string };

export interface GlossaryExample {
  /** Japanese text of the example (rendered with lang="ja"). */
  ja: string;
  /** When set, the example is shown as ruby text: `base` with the small `reading` above it. */
  ruby?: { base: string; reading: string };
  /** One Vietnamese sentence that explains the example. */
  noteVi: string;
}

export interface GlossaryTerm {
  id: TermId;
  /** Simple Vietnamese name shown first. */
  labelVi: string;
  /** The Japanese term the learner will meet elsewhere. */
  ja: string;
  /** Kana reading of `ja`. */
  jaReading: string;
  /** Short plain-Vietnamese explanation (1–2 sentences). */
  explanationVi: string;
  example: GlossaryExample;
  review: GlossaryReview;
}

const pending: GlossaryReview = { status: "pending" };

export const GLOSSARY: Readonly<Record<TermId, GlossaryTerm>> = {
  kanji: {
    id: "kanji",
    labelVi: "Kanji",
    ja: "漢字",
    jaReading: "かんじ",
    explanationVi: "Kanji là chữ Hán được dùng trong tiếng Nhật. Mỗi chữ thường mang một ý nghĩa riêng.",
    example: { ja: "山", noteVi: "Chữ 山 nghĩa là “núi”." },
    review: pending,
  },
  onyomi: {
    id: "onyomi",
    labelVi: "Cách đọc theo âm Hán (On'yomi)",
    ja: "音読み",
    jaReading: "おんよみ",
    explanationVi: "Cách đọc có gốc từ âm Hán, thường gặp khi chữ nằm trong từ ghép gồm nhiều chữ Hán.",
    example: { ja: "富士山", noteVi: "Trong 富士山 (ふじさん), chữ 山 đọc là さん." },
    review: pending,
  },
  kunyomi: {
    id: "kunyomi",
    labelVi: "Cách đọc theo tiếng Nhật (Kun'yomi)",
    ja: "訓読み",
    jaReading: "くんよみ",
    explanationVi: "Cách đọc theo từ tiếng Nhật vốn có cho nghĩa của chữ, thường gặp khi chữ đứng một mình hoặc đi kèm chữ hiragana.",
    example: { ja: "山", noteVi: "Khi đứng một mình, 山 đọc là やま." },
    review: pending,
  },
  furigana: {
    id: "furigana",
    labelVi: "Furigana",
    ja: "振り仮名",
    jaReading: "ふりがな",
    explanationVi: "Furigana là những chữ kana nhỏ viết phía trên hoặc bên cạnh chữ Hán để cho biết cách đọc.",
    example: { ja: "山", ruby: { base: "山", reading: "やま" }, noteVi: "Chữ nhỏ やま phía trên 山 cho biết chữ này đọc là やま." },
    review: pending,
  },
  dakuten: {
    id: "dakuten",
    labelVi: "Dấu đục (Dakuten / Tenten)",
    ja: "濁点",
    jaReading: "だくてん",
    explanationVi: "Dakuten, còn gọi là tenten (てんてん), là hai nét nhỏ ゛ thêm vào chữ kana để đổi sang âm đục.",
    example: { ja: "か → が", noteVi: "か (ka) thêm ゛ thành が (ga)." },
    review: pending,
  },
  handakuten: {
    id: "handakuten",
    labelVi: "Dấu bán đục (Handakuten / Maru)",
    ja: "半濁点",
    jaReading: "はんだくてん",
    explanationVi: "Handakuten, còn gọi là maru (まる, nghĩa là “vòng tròn”), là vòng tròn nhỏ ゜. Dấu này chỉ đi với các chữ ở hàng は.",
    example: { ja: "は → ぱ", noteVi: "は (ha) thêm ゜ thành ぱ (pa)." },
    review: pending,
  },
};

export const TERM_IDS = Object.keys(GLOSSARY) as TermId[];

export function getTerm(id: TermId): GlossaryTerm {
  return GLOSSARY[id];
}
