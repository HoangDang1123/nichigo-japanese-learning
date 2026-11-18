import * as React from "react";
import Link from "next/link";
import { LearningTerm } from "../../learning/learning-term";
import type { KanjiEntry } from "./kanji-data";
import styles from "./kanji.module.css";

function ReadingGroup({ id, title, hint, values }: { id: string; title: string; hint: React.ReactNode; values: string[] }) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h3 className={styles.sectionTitle} id={id}>{title}</h3>
      <p className={styles.hint}>{hint}</p>
      {values.length > 0 ? (
        <ul className={styles.readingList} lang="ja">{values.map((v, i) => <li key={`${v}-${i}`}>{v}</li>)}</ul>
      ) : (
        <p className={styles.noData}>Chưa có dữ liệu cho cách đọc này.</p>
      )}
    </section>
  );
}

function StepHeading({ step, id, children }: { step: number; id: string; children: React.ReactNode }) {
  return (
    <h2 className={styles.stepTitle} id={id}>
      <span className={styles.stepNumber} aria-hidden="true">{step}</span>
      {children}
    </h2>
  );
}

/**
 * Learning order for one Kanji: recognise it, understand its readings, continue. Only data the API provides is shown.
 * Stroke order, related words and example sentences have no data source yet and are deliberately not rendered.
 */
export function KanjiArticle({ entry }: { entry: KanjiEntry }) {
  const hasReadings = entry.onReadings.length > 0 || entry.kunReadings.length > 0;
  return (
    <article className={styles.steps}>
      <section className={styles.step} aria-labelledby="kanji-step-1">
        <StepHeading step={1} id="kanji-step-1">Nhận biết chữ</StepHeading>
        <p className={styles.goal}>Hãy nhìn kỹ hình dạng chữ và ghi nhớ nghĩa của nó.</p>
        <div className={styles.hero}>
          <h1 className={styles.heroGlyph} lang="ja">{entry.glyph}</h1>
          {entry.meaningVi ? <p className={styles.heroMeaning}>{entry.meaningVi}</p> : <p className={styles.noData}>Chưa có nghĩa tiếng Việt</p>}
        </div>
      </section>

      <section className={styles.step} aria-labelledby="kanji-step-2">
        <StepHeading step={2} id="kanji-step-2">Hiểu cách đọc</StepHeading>
        <p className={styles.goal}>
          Một chữ Kanji có thể đọc khác nhau tùy từ chứa nó. Trong sách cho người mới, cách đọc thường được ghi bằng{" "}
          <LearningTerm term="furigana" /> nhỏ phía trên chữ.
        </p>
        {hasReadings ? (
          <div className={styles.sections}>
            <ReadingGroup
              id="kanji-on"
              title="Cách đọc theo âm Hán"
              values={entry.onReadings}
              hint={<>Gọi là <LearningTerm term="onyomi">On&apos;yomi</LearningTerm> (<span lang="ja">音読み</span>). Thường gặp trong từ ghép nhiều chữ Hán.</>}
            />
            <ReadingGroup
              id="kanji-kun"
              title="Cách đọc theo tiếng Nhật"
              values={entry.kunReadings}
              hint={<>Gọi là <LearningTerm term="kunyomi">Kun&apos;yomi</LearningTerm> (<span lang="ja">訓読み</span>). Thường gặp khi chữ đứng một mình.</>}
            />
          </div>
        ) : (
          <p className={styles.noData}>Chưa có dữ liệu cách đọc cho chữ này.</p>
        )}
        <p className={styles.hint}>Cách dùng như trên chỉ là xu hướng thường gặp, không phải quy tắc tuyệt đối. Gặp từ mới, hãy kiểm tra lại cách đọc của từ đó.</p>
      </section>

      <section className={styles.step} aria-labelledby="kanji-step-3">
        <StepHeading step={3} id="kanji-step-3">Tiếp tục học</StepHeading>
        <p className={styles.goal}>Khi đã nhận ra chữ này và hiểu cách đọc, hãy quay lại danh sách để học một chữ Kanji khác.</p>
        <Link href="/skills/kanji" className={styles.primaryLink}>Học chữ Kanji khác</Link>
      </section>
    </article>
  );
}
