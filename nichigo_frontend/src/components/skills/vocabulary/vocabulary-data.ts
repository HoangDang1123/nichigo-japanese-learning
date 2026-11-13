import type {
  ProgressMap,
  VocabularyRelation,
  VocabularyTopic,
  VocabularyWord,
} from "./vocabulary-types";

/**
 * Demo content only. NOT production data: there is no vocabulary API yet.
 * Row: [surface, kana, romaji (Hepburn), meaning, part of speech, example JA, example VI]
 */
type Row = readonly [string, string, string, string, string, string, string];

export const VOCABULARY_TOPICS: readonly VocabularyTopic[] = [
  { id: "greetings", title: "Chào hỏi", titleJa: "あいさつ", description: "Lời chào và cảm ơn dùng hằng ngày." },
  { id: "self-intro", title: "Giới thiệu bản thân", titleJa: "自己紹介", description: "Tên, nghề nghiệp, gia đình và sở thích." },
  { id: "school", title: "Trường học", titleJa: "学校", description: "Lớp học, đồ dùng và hoạt động học tập." },
  { id: "food", title: "Ăn uống", titleJa: "食べ物", description: "Món ăn, đồ uống và động từ ăn uống." },
  { id: "shopping", title: "Mua sắm", titleJa: "買い物", description: "Giá cả, cửa hàng và tiền bạc." },
  { id: "transport", title: "Đi lại", titleJa: "交通", description: "Phương tiện, nhà ga và lên xuống xe." },
  { id: "work", title: "Công việc", titleJa: "仕事", description: "Công ty, cuộc họp và đồng nghiệp." },
  { id: "travel", title: "Du lịch", titleJa: "旅行", description: "Khách sạn, sân bay và bản đồ." },
];

const ROWS: Record<string, readonly Row[]> = {
  greetings: [
    ["おはよう", "おはよう", "ohayō", "Chào buổi sáng", "Câu chào", "おはよう、田中さん。", "Chào buổi sáng, anh Tanaka."],
    ["こんにちは", "こんにちは", "konnichiwa", "Xin chào (ban ngày)", "Câu chào", "先生、こんにちは。", "Em chào thầy ạ."],
    ["こんばんは", "こんばんは", "konbanwa", "Chào buổi tối", "Câu chào", "皆さん、こんばんは。", "Chào buổi tối mọi người."],
    ["さようなら", "さようなら", "sayōnara", "Tạm biệt", "Câu chào", "では、さようなら。", "Vậy thì, tạm biệt nhé."],
    ["ありがとう", "ありがとう", "arigatō", "Cảm ơn", "Câu chào", "手伝ってくれて、ありがとう。", "Cảm ơn bạn đã giúp mình."],
    ["すみません", "すみません", "sumimasen", "Xin lỗi / Xin phép", "Câu chào", "すみません、駅はどこですか。", "Xin lỗi, nhà ga ở đâu ạ?"],
    ["おやすみなさい", "おやすみなさい", "oyasumi nasai", "Chúc ngủ ngon", "Câu chào", "もう遅いので、おやすみなさい。", "Muộn rồi nên chúc bạn ngủ ngon."],
    ["はじめまして", "はじめまして", "hajimemashite", "Rất vui được gặp (lần đầu)", "Câu chào", "はじめまして、よろしくお願いします。", "Rất vui được gặp, mong được giúp đỡ."],
    ["お元気ですか", "おげんきですか", "ogenki desu ka", "Bạn có khỏe không?", "Câu hỏi thăm", "お元気ですか。はい、元気です。", "Bạn khỏe không? Vâng, tôi khỏe."],
    ["いってきます", "いってきます", "ittekimasu", "Tôi đi đây (rời nhà)", "Câu chào", "いってきます。気をつけてね。", "Con đi đây ạ. – Đi cẩn thận nhé."],
    ["ただいま", "ただいま", "tadaima", "Tôi về rồi", "Câu chào", "ただいま。おかえりなさい。", "Con về rồi ạ. – Con về đấy à."],
    ["いただきます", "いただきます", "itadakimasu", "Xin mời (trước khi ăn)", "Câu chào", "手を合わせて、いただきます。", "Chắp tay và nói “itadakimasu”."],
  ],
  "self-intro": [
    ["私", "わたし", "watashi", "Tôi", "Đại từ", "私はベトナム人です。", "Tôi là người Việt Nam."],
    ["名前", "なまえ", "namae", "Tên", "Danh từ", "お名前は何ですか。", "Tên bạn là gì?"],
    ["学生", "がくせい", "gakusei", "Học sinh, sinh viên", "Danh từ", "私は大学の学生です。", "Tôi là sinh viên đại học."],
    ["会社員", "かいしゃいん", "kaishain", "Nhân viên công ty", "Danh từ", "兄は会社員です。", "Anh trai tôi là nhân viên công ty."],
    ["国", "くに", "kuni", "Đất nước", "Danh từ", "あなたの国はどこですか。", "Đất nước của bạn là ở đâu?"],
    ["歳", "さい", "sai", "Tuổi", "Hậu tố đếm", "私は二十歳です。", "Tôi hai mươi tuổi."],
    ["趣味", "しゅみ", "shumi", "Sở thích", "Danh từ", "趣味は音楽を聞くことです。", "Sở thích của tôi là nghe nhạc."],
    ["家族", "かぞく", "kazoku", "Gia đình", "Danh từ", "家族は四人です。", "Gia đình tôi có bốn người."],
  ],
  school: [
    ["学校", "がっこう", "gakkō", "Trường học", "Danh từ", "学校は八時に始まります。", "Trường bắt đầu lúc tám giờ."],
    ["先生", "せんせい", "sensei", "Thầy cô giáo", "Danh từ", "先生は優しいです。", "Thầy cô rất hiền."],
    ["教室", "きょうしつ", "kyōshitsu", "Phòng học", "Danh từ", "教室に机が三十あります。", "Trong phòng học có ba mươi cái bàn."],
    ["宿題", "しゅくだい", "shukudai", "Bài tập về nhà", "Danh từ", "宿題を毎日します。", "Tôi làm bài tập mỗi ngày."],
    ["試験", "しけん", "shiken", "Kỳ thi", "Danh từ", "来週、試験があります。", "Tuần sau có kỳ thi."],
    ["授業", "じゅぎょう", "jugyō", "Tiết học", "Danh từ", "午後の授業は英語です。", "Tiết học buổi chiều là tiếng Anh."],
    ["図書館", "としょかん", "toshokan", "Thư viện", "Danh từ", "図書館で本を借ります。", "Tôi mượn sách ở thư viện."],
    ["勉強", "べんきょう", "benkyō", "Việc học", "Danh từ / động từ suru", "毎晩、日本語を勉強します。", "Mỗi tối tôi học tiếng Nhật."],
    ["本", "ほん", "hon", "Sách", "Danh từ", "この本はおもしろいです。", "Cuốn sách này thú vị."],
    ["鉛筆", "えんぴつ", "enpitsu", "Bút chì", "Danh từ", "鉛筆を貸してください。", "Hãy cho tôi mượn bút chì."],
    ["辞書", "じしょ", "jisho", "Từ điển", "Danh từ", "わからない言葉は辞書で調べます。", "Từ nào không hiểu thì tra từ điển."],
    ["黒板", "こくばん", "kokuban", "Bảng đen", "Danh từ", "黒板に名前を書きます。", "Tôi viết tên lên bảng."],
    ["机", "つくえ", "tsukue", "Cái bàn học", "Danh từ", "机の上にノートがあります。", "Trên bàn có quyển vở."],
    ["椅子", "いす", "isu", "Cái ghế", "Danh từ", "椅子に座ってください。", "Xin hãy ngồi xuống ghế."],
    ["質問", "しつもん", "shitsumon", "Câu hỏi", "Danh từ / động từ suru", "質問があります。", "Tôi có câu hỏi."],
    ["答え", "こたえ", "kotae", "Câu trả lời, đáp án", "Danh từ", "答えは三番です。", "Đáp án là số ba."],
    ["問題", "もんだい", "mondai", "Bài toán, vấn đề", "Danh từ", "この問題は難しいです。", "Bài này khó."],
    ["読む", "よむ", "yomu", "Đọc", "Động từ", "毎朝、新聞を読みます。", "Mỗi sáng tôi đọc báo."],
    ["書く", "かく", "kaku", "Viết", "Động từ", "ノートに漢字を書きます。", "Tôi viết chữ Hán vào vở."],
    ["聞く", "きく", "kiku", "Nghe, hỏi", "Động từ", "先生の話をよく聞きます。", "Tôi chăm chú nghe thầy nói."],
    ["教える", "おしえる", "oshieru", "Dạy, chỉ cho", "Động từ", "友達に日本語を教えます。", "Tôi dạy tiếng Nhật cho bạn."],
    ["覚える", "おぼえる", "oboeru", "Nhớ, ghi nhớ", "Động từ", "新しい言葉を十個覚えました。", "Tôi đã nhớ mười từ mới."],
    ["休み", "やすみ", "yasumi", "Nghỉ, kỳ nghỉ", "Danh từ", "明日は学校が休みです。", "Ngày mai trường nghỉ."],
    ["入学", "にゅうがく", "nyūgaku", "Nhập học", "Danh từ / động từ suru", "四月に大学へ入学します。", "Tháng Tư tôi nhập học đại học."],
  ],
  food: [
    ["ご飯", "ごはん", "gohan", "Cơm, bữa ăn", "Danh từ", "ご飯を食べましょう。", "Chúng ta ăn cơm nhé."],
    ["水", "みず", "mizu", "Nước", "Danh từ", "水をください。", "Cho tôi xin nước."],
    ["お茶", "おちゃ", "ocha", "Trà", "Danh từ", "温かいお茶を飲みます。", "Tôi uống trà nóng."],
    ["肉", "にく", "niku", "Thịt", "Danh từ", "肉より魚が好きです。", "Tôi thích cá hơn thịt."],
    ["魚", "さかな", "sakana", "Cá", "Danh từ", "魚を焼いて食べます。", "Tôi nướng cá để ăn."],
    ["野菜", "やさい", "yasai", "Rau củ", "Danh từ", "毎日、野菜を食べます。", "Mỗi ngày tôi ăn rau."],
    ["食べる", "たべる", "taberu", "Ăn", "Động từ", "朝ご飯を食べました。", "Tôi đã ăn sáng."],
    ["飲む", "のむ", "nomu", "Uống", "Động từ", "コーヒーを飲みますか。", "Bạn có uống cà phê không?"],
  ],
  shopping: [
    ["店", "みせ", "mise", "Cửa hàng", "Danh từ", "あの店は安いです。", "Cửa hàng kia rẻ."],
    ["値段", "ねだん", "nedan", "Giá cả", "Danh từ", "値段を見てください。", "Hãy xem giá."],
    ["安い", "やすい", "yasui", "Rẻ", "Tính từ -i", "このかばんは安いです。", "Cái túi này rẻ."],
    ["高い", "たかい", "takai", "Đắt, cao", "Tính từ -i", "この時計は高いです。", "Chiếc đồng hồ này đắt."],
    ["買う", "かう", "kau", "Mua", "Động từ", "新しい靴を買います。", "Tôi mua đôi giày mới."],
    ["お金", "おかね", "okane", "Tiền", "Danh từ", "お金が足りません。", "Tôi không đủ tiền."],
  ],
  transport: [
    ["電車", "でんしゃ", "densha", "Tàu điện", "Danh từ", "電車で会社へ行きます。", "Tôi đi làm bằng tàu điện."],
    ["駅", "えき", "eki", "Nhà ga", "Danh từ", "駅の前で会いましょう。", "Gặp nhau trước nhà ga nhé."],
    ["バス", "バス", "basu", "Xe buýt", "Danh từ", "バスは十分で来ます。", "Xe buýt sẽ đến sau mười phút."],
    ["切符", "きっぷ", "kippu", "Vé", "Danh từ", "切符を一枚買います。", "Tôi mua một vé."],
    ["乗る", "のる", "noru", "Đi, lên (xe)", "Động từ", "次の電車に乗ります。", "Tôi lên chuyến tàu tiếp theo."],
    ["降りる", "おりる", "oriru", "Xuống (xe)", "Động từ", "新宿駅で降ります。", "Tôi xuống ở ga Shinjuku."],
  ],
  work: [
    ["会社", "かいしゃ", "kaisha", "Công ty", "Danh từ", "会社は東京にあります。", "Công ty nằm ở Tokyo."],
    ["仕事", "しごと", "shigoto", "Công việc", "Danh từ", "仕事は九時から五時までです。", "Công việc từ chín giờ đến năm giờ."],
    ["会議", "かいぎ", "kaigi", "Cuộc họp", "Danh từ", "午後に会議があります。", "Buổi chiều có cuộc họp."],
    ["同僚", "どうりょう", "dōryō", "Đồng nghiệp", "Danh từ", "同僚と昼ご飯を食べます。", "Tôi ăn trưa cùng đồng nghiệp."],
  ],
  travel: [
    ["旅行", "りょこう", "ryokō", "Du lịch", "Danh từ / động từ suru", "夏に日本を旅行します。", "Mùa hè tôi sẽ du lịch Nhật Bản."],
    ["ホテル", "ホテル", "hoteru", "Khách sạn", "Danh từ", "ホテルを予約しました。", "Tôi đã đặt khách sạn."],
    ["空港", "くうこう", "kūkō", "Sân bay", "Danh từ", "空港まで電車で行きます。", "Tôi đi tàu đến sân bay."],
    ["地図", "ちず", "chizu", "Bản đồ", "Danh từ", "地図を見て歩きます。", "Tôi vừa xem bản đồ vừa đi bộ."],
  ],
};

/**
 * Hand-curated example-sentence rōmaji (Hepburn). Deliberately small: each entry was checked
 * against the sentence's standard readings. Sentences not listed here have no reading toggle.
 * Needs content-team review before production use.
 */
const EXAMPLE_ROMAJI: Readonly<Record<string, string>> = {
  "greetings-02": "Sensei, konnichiwa.",
  "greetings-03": "Minasan, konbanwa.",
  "greetings-04": "Dewa, sayōnara.",
  "greetings-05": "Tetsudatte kurete, arigatō.",
  "greetings-06": "Sumimasen, eki wa doko desu ka.",
  "greetings-07": "Mō osoi node, oyasumi nasai.",
  "greetings-09": "Ogenki desu ka. Hai, genki desu.",
  "greetings-11": "Tadaima. Okaeri nasai.",
  "school-01": "Gakkō wa hachi-ji ni hajimarimasu.",
};

export const VOCABULARY_WORDS: readonly VocabularyWord[] = Object.entries(ROWS).flatMap(
  ([topicId, rows]) =>
    rows.map(([surface, reading, romaji, meaningVi, partOfSpeech, exampleJa, exampleVi], i) => ({
      id: wordId(topicId, i + 1),
      topicId,
      surface,
      reading,
      romaji,
      meaningVi,
      partOfSpeech,
      exampleJa,
      exampleVi,
      exampleRomaji: EXAMPLE_ROMAJI[wordId(topicId, i + 1)],
    }))
);

function wordId(topic: string, n: number): string {
  return `${topic}-${String(n).padStart(2, "0")}`;
}

const WORD_INDEX = new Map(VOCABULARY_WORDS.map((w) => [w.id, w]));

export function getWord(id: string): VocabularyWord | undefined {
  return WORD_INDEX.get(id);
}

export function getTopicWords(topicId: string): VocabularyWord[] {
  return VOCABULARY_WORDS.filter((w) => w.topicId === topicId);
}

/** Hand-authored relationships only; words without an entry simply have none. */
export const VOCABULARY_RELATIONS: readonly VocabularyRelation[] = [
  { a: wordId("greetings", 1), b: wordId("greetings", 2), type: "same-topic" },
  { a: wordId("greetings", 2), b: wordId("greetings", 3), type: "same-topic" },
  { a: wordId("greetings", 10), b: wordId("greetings", 11), type: "same-topic" },
  { a: wordId("greetings", 8), b: wordId("self-intro", 2), type: "collocation" },
  { a: wordId("greetings", 12), b: wordId("food", 7), type: "collocation" },
  { a: wordId("school", 1), b: wordId("school", 2), type: "collocation" },
  { a: wordId("school", 3), b: wordId("school", 13), type: "same-topic" },
  { a: wordId("school", 4), b: wordId("school", 5), type: "same-topic" },
  { a: wordId("school", 8), b: wordId("school", 4), type: "collocation" },
  { a: wordId("school", 18), b: wordId("school", 19), type: "collocation" },
  { a: wordId("school", 15), b: wordId("school", 16), type: "collocation" },
  { a: wordId("school", 9), b: wordId("school", 11), type: "same-topic" },
  { a: wordId("food", 1), b: wordId("food", 7), type: "collocation" },
  { a: wordId("food", 2), b: wordId("food", 8), type: "collocation" },
  { a: wordId("food", 3), b: wordId("food", 8), type: "collocation" },
  { a: wordId("food", 4), b: wordId("food", 5), type: "same-topic" },
  { a: wordId("food", 7), b: wordId("food", 8), type: "same-topic" },
  { a: wordId("shopping", 3), b: wordId("shopping", 4), type: "antonym" },
  { a: wordId("shopping", 2), b: wordId("shopping", 3), type: "collocation" },
  { a: wordId("shopping", 5), b: wordId("shopping", 6), type: "collocation" },
  { a: wordId("transport", 5), b: wordId("transport", 6), type: "antonym" },
  { a: wordId("transport", 1), b: wordId("transport", 2), type: "same-topic" },
  { a: wordId("transport", 4), b: wordId("transport", 5), type: "collocation" },
  { a: wordId("transport", 1), b: wordId("transport", 3), type: "same-topic" },
  { a: wordId("work", 1), b: wordId("work", 3), type: "same-topic" },
  { a: wordId("work", 2), b: wordId("work", 1), type: "collocation" },
  { a: wordId("travel", 2), b: wordId("travel", 3), type: "same-topic" },
  { a: wordId("travel", 4), b: wordId("travel", 1), type: "collocation" },
  { a: wordId("self-intro", 3), b: wordId("self-intro", 4), type: "same-topic" },
  { a: wordId("self-intro", 3), b: wordId("school", 1), type: "same-topic" },
  { a: wordId("self-intro", 4), b: wordId("work", 1), type: "same-topic" },
];

/** Demo scenarios for the pre-study review modal (0, fewer than 10, 10+ eligible). */
export type DemoScenario = "none" | "few" | "ten";

export const DEMO_SCENARIOS: readonly { key: DemoScenario; label: string; hint: string }[] = [
  { key: "none", label: "Chưa học từ nào", hint: "0 từ ôn tập — vào học thẳng" },
  { key: "few", label: "Đã học vài từ", hint: "4 từ ôn tập" },
  { key: "ten", label: "Đã học nhiều từ", hint: "10 từ ôn tập" },
];

/**
 * Seed progress per scenario. Every non-`new` word counts as "previously studied".
 * `ten` seeds 13 studied words so the 10-word cap and review-first priority are exercised.
 */
export function createDemoProgress(scenario: DemoScenario): ProgressMap {
  if (scenario === "none") return {};
  if (scenario === "few") {
    return {
      [wordId("greetings", 1)]: "learned",
      [wordId("greetings", 2)]: "review",
      [wordId("greetings", 5)]: "learning",
      [wordId("greetings", 6)]: "review",
    };
  }
  const seeded: Record<string, "learned" | "review" | "learning"> = {};
  for (let n = 1; n <= 6; n++) seeded[wordId("greetings", n)] = n % 2 === 0 ? "review" : "learned";
  for (let n = 1; n <= 4; n++) seeded[wordId("self-intro", n)] = n === 4 ? "learning" : "learned";
  for (let n = 1; n <= 3; n++) seeded[wordId("food", n)] = n === 1 ? "review" : "learning";
  return seeded;
}

/** Bookmarks are seeded independently from progress (includes `new` words on purpose). */
export function createDemoBookmarks(): Set<string> {
  return new Set([
    wordId("greetings", 5),
    wordId("school", 8),
    wordId("travel", 4),
    wordId("food", 4),
  ]);
}

/** Curated, hand-picked starter words for Explore when the search box is empty (one or two per topic). */
export const DISCOVERY_WORD_IDS: readonly string[] = [
  wordId("greetings", 2),
  wordId("greetings", 5),
  wordId("self-intro", 2),
  wordId("school", 1),
  wordId("school", 2),
  wordId("food", 1),
  wordId("shopping", 3),
  wordId("shopping", 4),
  wordId("transport", 2),
  wordId("work", 1),
  wordId("travel", 1),
];

export function getDiscoveryWords(): VocabularyWord[] {
  return DISCOVERY_WORD_IDS.map((id) => getWord(id)).filter((w): w is VocabularyWord => Boolean(w));
}
