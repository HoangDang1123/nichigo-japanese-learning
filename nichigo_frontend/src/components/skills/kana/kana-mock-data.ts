/**
 * kana-mock-data.ts — Kana demo items
 *
 * Owned by the Kana reference. Split out of the former skills-mock-data.ts (JPN-ARCH-004); content unchanged.
 * This is DEMO/MOCK DATA created strictly for frontend visual and interaction prototyping.
 * It is NOT published curriculum content and must not be treated as production database records.
 * Real content will be integrated via JPN-020/022/023 published content adapters.
 */

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
