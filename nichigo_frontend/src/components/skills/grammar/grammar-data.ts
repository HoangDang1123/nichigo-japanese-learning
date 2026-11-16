import type { GrammarCategory, GrammarPattern } from "./grammar-types";

/**
 * Illustrative demo data for the Grammar UI prototype. It has NOT been reviewed or approved for
 * publishing and must be replaced by published content before release.
 * Romaji is present only where the reading was written by hand and checked; other examples omit it.
 */
export const GRAMMAR_DEMO_NOTICE = "Dữ liệu minh họa, chưa được duyệt để xuất bản";

export const GRAMMAR_CATEGORIES: readonly GrammarCategory[] = [
  { id: "basic", titleVi: "Câu cơ bản", titleJa: "基本文型", descriptionVi: "Cấu trúc câu đơn giản nhất." },
  { id: "particles", titleVi: "Trợ từ", titleJa: "助詞", descriptionVi: "Từ nhỏ đánh dấu vai trò trong câu." },
  { id: "verbs", titleVi: "Động từ", titleJa: "動詞", descriptionVi: "Chia và dùng động từ." },
  { id: "adjectives", titleVi: "Tính từ", titleJa: "形容詞", descriptionVi: "Miêu tả sự vật, sự việc." },
  { id: "time", titleVi: "Thời gian", titleJa: "時間", descriptionVi: "Diễn đạt thời điểm và quá khứ." },
];

export const GRAMMAR_PATTERNS: readonly GrammarPattern[] = [
  {
    id: "n1-wa-n2-desu",
    pattern: "N1 は N2 です",
    meaningVi: "N1 là N2",
    categoryId: "basic",
    structure: {
      parts: [
        { text: "N1", noteVi: "Chủ đề của câu" },
        { text: "は", noteVi: "Trợ từ chủ đề, đọc là “wa”" },
        { text: "N2", noteVi: "Danh từ nói về N1" },
        { text: "です", noteVi: "Kết câu lịch sự" },
      ],
    },
    explanationVi: [
      "Mẫu câu cơ bản nhất để giới thiệu hoặc xác định một người hay một vật. Danh từ đứng trước は là chủ đề, phần phía sau là thông tin về chủ đề đó.",
      "です làm câu lịch sự và kết thúc câu khẳng định. Trong hội thoại, chủ đề thường được lược bỏ nếu người nghe đã hiểu.",
    ],
    examples: [
      { id: "n1-wa-n2-desu-1", ja: "わたしは学生です。", romaji: "Watashi wa gakusei desu.", vi: "Tôi là học sinh." },
      { id: "n1-wa-n2-desu-2", ja: "田中さんは先生です。", romaji: "Tanaka-san wa sensei desu.", vi: "Anh Tanaka là giáo viên." },
    ],
    usageNotes: [
      { kind: "usage", textVi: "Trợ từ は viết là は nhưng đọc là “wa”." },
      { kind: "usage", textVi: "Khi ngữ cảnh đã rõ, có thể nói gọn: 学生です。(Tôi là học sinh.)" },
    ],
    relatedIds: ["n1-wa-n2-ja-arimasen", "no-possessive"],
  },
  {
    id: "n1-wa-n2-ja-arimasen",
    pattern: "N1 は N2 じゃありません",
    meaningVi: "N1 không phải là N2",
    categoryId: "basic",
    structure: {
      parts: [
        { text: "N1", noteVi: "Chủ đề" },
        { text: "は", noteVi: "Trợ từ chủ đề" },
        { text: "N2", noteVi: "Danh từ bị phủ định" },
        { text: "じゃありません", noteVi: "Phủ định lịch sự" },
      ],
      remarkVi: "Trong văn viết hoặc ngữ cảnh trang trọng, じゃ được thay bằng では.",
    },
    explanationVi: ["Dạng phủ định của N1 は N2 です. Dùng khi muốn nói N1 không phải là N2."],
    examples: [
      { id: "n1-wa-n2-ja-arimasen-1", ja: "わたしは先生じゃありません。", vi: "Tôi không phải là giáo viên." },
      { id: "n1-wa-n2-ja-arimasen-2", ja: "これは本じゃありません。", vi: "Đây không phải là quyển sách." },
    ],
    relatedIds: ["n1-wa-n2-desu"],
  },
  {
    id: "no-possessive",
    pattern: "N1 の N2",
    meaningVi: "N2 của N1",
    categoryId: "particles",
    structure: {
      parts: [
        { text: "N1", noteVi: "Danh từ bổ nghĩa" },
        { text: "の", noteVi: "Nối hai danh từ" },
        { text: "N2", noteVi: "Danh từ chính" },
      ],
    },
    explanationVi: [
      "の nối hai danh từ để diễn tả sở hữu, nguồn gốc hoặc phân loại. Danh từ phía sau の là danh từ chính, danh từ phía trước bổ nghĩa cho nó.",
      "Thứ tự trong tiếng Nhật ngược với tiếng Việt: “sách của tôi” là わたしの本.",
    ],
    examples: [
      { id: "no-possessive-1", ja: "これはわたしの本です。", romaji: "Kore wa watashi no hon desu.", vi: "Đây là quyển sách của tôi." },
      { id: "no-possessive-2", ja: "日本語の先生はやさしいです。", romaji: "Nihongo no sensei wa yasashii desu.", vi: "Giáo viên tiếng Nhật rất hiền." },
    ],
    usageNotes: [
      { kind: "mistake", textVi: "Dễ đảo ngược thứ tự theo tiếng Việt. Hãy nhớ danh từ chính luôn đứng sau の." },
    ],
    relatedIds: ["n1-wa-n2-desu"],
  },
  {
    id: "o-object",
    pattern: "N を V",
    meaningVi: "Làm V với N (tân ngữ)",
    categoryId: "particles",
    structure: {
      parts: [
        { text: "N", noteVi: "Tân ngữ, đối tượng của hành động" },
        { text: "を", noteVi: "Trợ từ tân ngữ, đọc là “o”" },
        { text: "V", noteVi: "Động từ tác động" },
      ],
    },
    explanationVi: [
      "を đánh dấu đối tượng trực tiếp của hành động, tương ứng với phần “cái gì” đứng sau động từ trong tiếng Việt.",
    ],
    examples: [
      { id: "o-object-1", ja: "水を飲みます。", romaji: "Mizu o nomimasu.", vi: "Tôi uống nước." },
      { id: "o-object-2", ja: "パンを食べます。", romaji: "Pan o tabemasu.", vi: "Tôi ăn bánh mì." },
    ],
    usageNotes: [{ kind: "usage", textVi: "を chỉ dùng làm trợ từ và đọc là “o”." }],
    relatedIds: ["de-place", "masu-form"],
  },
  {
    id: "de-place",
    pattern: "N で V",
    meaningVi: "Làm V tại N / bằng N",
    categoryId: "particles",
    structure: {
      parts: [
        { text: "N", noteVi: "Nơi chốn hoặc phương tiện" },
        { text: "で", noteVi: "Trợ từ chỉ nơi diễn ra hành động hoặc phương tiện" },
        { text: "V", noteVi: "Động từ" },
      ],
    },
    explanationVi: [
      "で chỉ nơi diễn ra một hành động, hoặc phương tiện, công cụ dùng để thực hiện hành động.",
      "Cùng một trợ từ diễn đạt hai ý khác nhau, nên cần dựa vào danh từ đứng trước để phân biệt.",
    ],
    examples: [
      { id: "de-place-1", ja: "学校で日本語を勉強します。", romaji: "Gakkō de nihongo o benkyō shimasu.", vi: "Tôi học tiếng Nhật ở trường." },
      { id: "de-place-2", ja: "バスで行きます。", romaji: "Basu de ikimasu.", vi: "Tôi đi bằng xe buýt." },
    ],
    usageNotes: [
      { kind: "compare", textVi: "に chỉ nơi tồn tại hoặc đích đến (学校に行きます), còn で chỉ nơi hành động diễn ra (学校で勉強します)." },
    ],
    relatedIds: ["o-object"],
  },
  {
    id: "ni-time",
    pattern: "時間 に V",
    meaningVi: "Làm V vào lúc ...",
    categoryId: "particles",
    structure: {
      parts: [
        { text: "時間", noteVi: "Thời điểm cụ thể (giờ, thứ, ngày)" },
        { text: "に", noteVi: "Trợ từ chỉ thời điểm" },
        { text: "V", noteVi: "Động từ" },
      ],
    },
    explanationVi: ["に đặt sau thời điểm cụ thể để nói hành động xảy ra vào lúc đó."],
    examples: [{ id: "ni-time-1", ja: "七時に起きます。", romaji: "Shichi-ji ni okimasu.", vi: "Tôi thức dậy lúc bảy giờ." }],
    usageNotes: [
      { kind: "mistake", textVi: "Không dùng に sau các từ chỉ thời gian chung như 今日, 毎日, 昨日." },
    ],
  },
  {
    id: "masu-form",
    pattern: "V ます / V ません",
    meaningVi: "Làm / không làm V (lịch sự)",
    categoryId: "verbs",
    structure: {
      parts: [
        { text: "V語幹", noteVi: "Gốc động từ" },
        { text: "ます", noteVi: "Khẳng định lịch sự" },
        { text: "ません", noteVi: "Phủ định lịch sự" },
      ],
      remarkVi: "Gốc động từ chia theo nhóm động từ trước khi thêm ます.",
    },
    explanationVi: [
      "Dạng lịch sự của động từ ở hiện tại hoặc tương lai. Dùng trong hội thoại hằng ngày với người mới quen hoặc người lớn tuổi.",
      "Phủ định lịch sự thay ます bằng ません.",
    ],
    examples: [
      { id: "masu-form-1", ja: "毎日コーヒーを飲みます。", romaji: "Mainichi kōhī o nomimasu.", vi: "Hằng ngày tôi uống cà phê." },
      { id: "masu-form-2", ja: "お酒は飲みません。", romaji: "O-sake wa nomimasen.", vi: "Tôi không uống rượu." },
    ],
    relatedIds: ["o-object", "mashita"],
  },
  {
    id: "te-kudasai",
    pattern: "V て ください",
    meaningVi: "Hãy làm V",
    categoryId: "verbs",
    structure: {
      parts: [
        { text: "Vて", noteVi: "Dạng て của động từ" },
        { text: "ください", noteVi: "Lời nhờ vả lịch sự" },
      ],
      remarkVi: "Cách chia dạng て phụ thuộc vào nhóm động từ.",
    },
    explanationVi: ["Dùng để nhờ hoặc yêu cầu lịch sự người khác làm một việc gì đó."],
    examples: [
      { id: "te-kudasai-1", ja: "少し待ってください。", vi: "Xin hãy đợi một chút." },
      { id: "te-kudasai-2", ja: "ここに名前を書いてください。", vi: "Xin hãy viết tên vào đây." },
    ],
    usageNotes: [
      { kind: "usage", textVi: "Phù hợp khi nhờ vả thông thường. Với người trên, thường dùng các cách nói khiêm nhường hơn." },
    ],
  },
  {
    id: "i-adjective",
    pattern: "A い です / A くないです",
    meaningVi: "Tính từ い: khẳng định và phủ định",
    categoryId: "adjectives",
    structure: {
      parts: [
        { text: "A い", noteVi: "Tính từ kết thúc bằng い" },
        { text: "です", noteVi: "Khẳng định lịch sự" },
        { text: "A くないです", noteVi: "Đổi い cuối thành くない để phủ định" },
      ],
    },
    explanationVi: [
      "Tính từ い đứng trực tiếp trước です để tạo câu lịch sự, không cần động từ nối như trong tiếng Việt.",
      "Phủ định bằng cách đổi い cuối thành くない rồi thêm です.",
    ],
    examples: [
      { id: "i-adjective-1", ja: "この料理はおいしいです。", romaji: "Kono ryōri wa oishii desu.", vi: "Món ăn này ngon." },
      { id: "i-adjective-2", ja: "この料理は高くないです。", romaji: "Kono ryōri wa takakunai desu.", vi: "Món ăn này không đắt." },
    ],
    usageNotes: [
      { kind: "mistake", textVi: "いい (tốt) là ngoại lệ: phủ định là よくないです, không phải いくないです." },
    ],
    relatedIds: ["na-adjective"],
  },
  {
    id: "na-adjective",
    pattern: "A な N / A です",
    meaningVi: "Tính từ な bổ nghĩa danh từ",
    categoryId: "adjectives",
    structure: {
      parts: [
        { text: "A", noteVi: "Tính từ な (phần gốc)" },
        { text: "な", noteVi: "Thêm な khi bổ nghĩa danh từ" },
        { text: "N", noteVi: "Danh từ được bổ nghĩa" },
      ],
      remarkVi: "Khi đứng cuối câu, tính từ な đi với です và không có な.",
    },
    explanationVi: ["Tính từ な cần な khi đứng trước danh từ, nhưng không cần khi làm vị ngữ trước です."],
    examples: [
      { id: "na-adjective-1", ja: "静かな町です。", vi: "Đây là một thị trấn yên tĩnh." },
      { id: "na-adjective-2", ja: "この町は静かです。", vi: "Thị trấn này yên tĩnh." },
    ],
    relatedIds: ["i-adjective"],
  },
  {
    id: "kara-made",
    pattern: "N1 から N2 まで",
    meaningVi: "Từ N1 đến N2",
    categoryId: "time",
    structure: {
      parts: [
        { text: "N1", noteVi: "Điểm bắt đầu" },
        { text: "から", noteVi: "Từ" },
        { text: "N2", noteVi: "Điểm kết thúc" },
        { text: "まで", noteVi: "Đến" },
      ],
    },
    explanationVi: ["Diễn đạt khoảng thời gian hoặc khoảng cách từ điểm bắt đầu đến điểm kết thúc."],
    examples: [
      { id: "kara-made-1", ja: "九時から五時まで働きます。", romaji: "Ku-ji kara go-ji made hatarakimasu.", vi: "Tôi làm việc từ chín giờ đến năm giờ." },
    ],
    usageNotes: [
      { kind: "usage", textVi: "から và まで có thể dùng riêng: 九時から là “từ chín giờ”, 五時まで là “đến năm giờ”." },
    ],
  },
  {
    id: "mashita",
    pattern: "V ました / V ませんでした",
    meaningVi: "Đã làm / đã không làm V",
    categoryId: "time",
    structure: {
      parts: [
        { text: "V語幹", noteVi: "Gốc động từ" },
        { text: "ました", noteVi: "Quá khứ khẳng định lịch sự" },
        { text: "ませんでした", noteVi: "Quá khứ phủ định lịch sự" },
      ],
    },
    explanationVi: [
      "Dạng quá khứ lịch sự của động từ. Thường đi cùng từ chỉ thời gian trong quá khứ như 昨日 (hôm qua).",
    ],
    examples: [
      { id: "mashita-1", ja: "昨日、本を読みました。", romaji: "Kinō, hon o yomimashita.", vi: "Hôm qua tôi đã đọc sách." },
    ],
    relatedIds: ["masu-form"],
  },
];

export function getGrammarCategory(id: string): GrammarCategory | undefined {
  return GRAMMAR_CATEGORIES.find((c) => c.id === id);
}

export function getGrammarPattern(id: string): GrammarPattern | undefined {
  return GRAMMAR_PATTERNS.find((p) => p.id === id);
}

/** Resolves only explicitly declared relations; unknown ids are skipped. */
export function getRelatedPatterns(pattern: GrammarPattern): GrammarPattern[] {
  return (pattern.relatedIds ?? []).flatMap((id) => {
    const related = getGrammarPattern(id);
    return related ? [related] : [];
  });
}
