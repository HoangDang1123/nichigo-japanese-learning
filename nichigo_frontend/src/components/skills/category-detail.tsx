import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import {
  MOCK_VOCAB_ITEMS,
  MOCK_GRAMMAR_ITEMS,
  MOCK_KANJI_ITEMS,
  SKILL_CATEGORIES,
  type SkillCategoryKey,
} from "./skills-mock-data";
import styles from "./skills-detail.module.css";

const DEMO_KEYS: SkillCategoryKey[] = ["vocabulary", "grammar", "kanji"];

export function isDetailCategory(key: string): key is SkillCategoryKey {
  return SKILL_CATEGORIES.some((c) => c.key === key && c.key !== "kana");
}

export function CategoryDetail({ categoryKey }: { categoryKey: SkillCategoryKey }) {
  const category = SKILL_CATEGORIES.find((c) => c.key === categoryKey);
  if (!category) return null;
  const isDemo = DEMO_KEYS.includes(categoryKey);

  return (
    <div className={styles.page}>
      <Link href="/skills" className={styles.backNav}>
        <ArrowLeft size={15} aria-hidden="true" />
        Kỹ năng
      </Link>

      <header className={styles.pageHeader}>
        <div className={styles.pageTitleRow}>
          <h1 className={styles.pageTitle}>{category.title}</h1>
          <span className={styles.pageJapaneseTitle} lang="ja">{category.subtitle}</span>
          {isDemo && <span className={styles.demoBadge}>Dữ liệu minh họa</span>}
        </div>
        <p className={styles.pageDescription}>{category.description}</p>
      </header>

      {categoryKey === "vocabulary" && (
        <div className={styles.vocabList} aria-label="Danh sách từ vựng minh họa">
          {MOCK_VOCAB_ITEMS.map((v) => (
            <article key={v.id} className={styles.vocabCard}>
              <div className={styles.vocabTop}>
                <span className={styles.vocabSurface} lang="ja">{v.surface}</span>
                <span className={styles.vocabTypeBadge}>{v.wordType}</span>
              </div>
              <div className={styles.vocabReadingArea}>
                <span lang="ja">{v.reading}</span>
                {v.hanViet && <span className={styles.vocabHanViet}>[{v.hanViet}]</span>}
              </div>
              <p className={styles.vocabMeaning}>{v.meaningVi}</p>
              <div className={styles.vocabSentenceArea}>
                <span className={styles.vocabSentenceJa} lang="ja">{v.exampleSentenceJa}</span>
                <span className={styles.vocabSentenceVi}>{v.exampleSentenceVi}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {categoryKey === "grammar" && (
        <div className={styles.grammarList} aria-label="Danh sách mẫu ngữ pháp minh họa">
          {MOCK_GRAMMAR_ITEMS.map((g) => (
            <article key={g.id} className={styles.grammarCard}>
              <div className={styles.grammarHeader}>
                <span className={styles.grammarPattern} lang="ja">{g.pattern}</span>
                <span className={styles.grammarMeaning}>{g.meaningVi}</span>
              </div>
              <p className={styles.grammarExplanation}>{g.explanationVi}</p>
              <div className={styles.grammarExampleBox}>
                <span className={styles.grammarExampleJa} lang="ja">{g.exampleJa}</span>
                <span className={styles.grammarExampleVi}>&rarr; {g.exampleVi}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {categoryKey === "kanji" && (
        <div className={styles.kanjiGrid} aria-label="Danh sách chữ Hán minh họa">
          {MOCK_KANJI_ITEMS.map((k) => (
            <article key={k.id} className={styles.kanjiCard}>
              <div className={styles.kanjiTop}>
                <div className={styles.kanjiGlyphBox} lang="ja">{k.glyph}</div>
                <div className={styles.kanjiInfo}>
                  <span className={styles.kanjiHanViet}>{k.hanViet}</span>
                  <span className={styles.kanjiMeaning}>{k.meaningVi}</span>
                  <span className={styles.kanjiStrokes}>{k.strokeCount} nét</span>
                </div>
              </div>
              <div className={styles.kanjiReadings}>
                <div className={styles.readingRow}>
                  <span className={styles.readingLabel}>On:</span>
                  <span className={styles.readingText} lang="ja">{k.onyomi}</span>
                </div>
                <div className={styles.readingRow}>
                  <span className={styles.readingLabel}>Kun:</span>
                  <span className={styles.readingText} lang="ja">{k.kunyomi}</span>
                </div>
              </div>
              <div className={styles.kanjiExample}>
                <span>Ví dụ:</span>
                <span className={styles.kanjiExampleWord} lang="ja">{k.exampleWord}</span>
                <span>— {k.exampleMeaning}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {!isDemo && (
        <div className={styles.unavailableNotice} role="status">
          <div className={styles.unavailableIcon} aria-hidden="true">
            <Lock size={24} />
          </div>
          <h2 className={styles.unavailableTitle}>
            {category.availability === "planned" ? "Sắp ra mắt" : "Chưa khả dụng"}
          </h2>
          <p className={styles.unavailableReason}>
            Nội dung cho kỹ năng này chưa được xuất bản. NichiGo không hiển thị
            dữ liệu giả lập thay cho nội dung học thật.
          </p>
        </div>
      )}
    </div>
  );
}
