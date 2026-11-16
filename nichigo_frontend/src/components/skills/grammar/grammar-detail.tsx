import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getGrammarCategory, getRelatedPatterns } from "./grammar-data";
import {
  DemoBadge,
  ExampleList,
  GrammarStructureBlock,
  RelatedPatterns,
  UsageNotes,
} from "./grammar-parts";
import type { GrammarPattern } from "./grammar-types";
import styles from "./grammar.module.css";

/** Single-column editorial notebook. Optional sections render only when content exists. */
export function GrammarDetail({ pattern }: { pattern: GrammarPattern }) {
  const category = getGrammarCategory(pattern.categoryId);
  const related = getRelatedPatterns(pattern);
  const notes = pattern.usageNotes ?? [];

  return (
    <article className={`${styles.page} ${styles.detailPage}`}>
      <nav aria-label="Điều hướng" className={styles.breadcrumb}>
        <Link href="/skills/grammar" className={styles.backLink}>
          <ArrowLeft size={15} aria-hidden="true" />
          Ngữ pháp
        </Link>
        {category && <span className={styles.breadcrumbCurrent}>{category.titleVi}</span>}
      </nav>

      <header className={styles.detailHeader}>
        <h1 className={styles.detailPattern} lang="ja">{pattern.pattern}</h1>
        <p className={styles.detailMeaning}>{pattern.meaningVi}</p>
        <DemoBadge />
      </header>

      <section className={styles.block} aria-labelledby="grammar-structure">
        <h2 id="grammar-structure" className={styles.blockTitle}>Cấu trúc</h2>
        <GrammarStructureBlock structure={pattern.structure} />
      </section>

      <section className={styles.block} aria-labelledby="grammar-explanation">
        <h2 id="grammar-explanation" className={styles.blockTitle}>Giải thích và cách dùng</h2>
        <div className={styles.prose}>
          {pattern.explanationVi.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>
      </section>

      {pattern.examples.length > 0 && (
        <section className={styles.block} aria-labelledby="grammar-examples">
          <h2 id="grammar-examples" className={styles.blockTitle}>Câu ví dụ</h2>
          <ExampleList examples={pattern.examples} />
        </section>
      )}

      {notes.length > 0 && (
        <section className={styles.block} aria-labelledby="grammar-notes">
          <h2 id="grammar-notes" className={styles.blockTitle}>Lưu ý</h2>
          <UsageNotes notes={notes} />
        </section>
      )}

      {related.length > 0 && (
        <section className={styles.block} aria-labelledby="grammar-related">
          <h2 id="grammar-related" className={styles.blockTitle}>Mẫu ngữ pháp liên quan</h2>
          <RelatedPatterns patterns={related} />
        </section>
      )}
    </article>
  );
}
