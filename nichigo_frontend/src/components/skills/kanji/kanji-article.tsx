import * as React from "react";
import Link from "next/link";
import { LearningTerm } from "../../learning/learning-term";
import type { KanjiDetailEntry, KanjiExample, KanjiWord } from "./kanji-data";
import { DemoBanner } from "./kanji-demo-banner";
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

function ExampleLine({ example }: { example: KanjiExample }) {
  return (
    <li className={styles.example}>
      <span lang="ja" className={styles.exampleJa}>
        {example.segments.length > 0
          ? example.segments.map((segment, i) => segment.reading
            ? <ruby key={i}>{segment.text}<rp>(</rp><rt>{segment.reading}</rt><rp>)</rp></ruby>
            : <React.Fragment key={i}>{segment.text}</React.Fragment>)
          : example.textJa}
      </span>
      {example.translationVi && <span className={styles.exampleVi}>{example.translationVi}</span>}
    </li>
  );
}

function WordItem({ word }: { word: KanjiWord }) {
  return (
    <li className={styles.word}>
      <p className={styles.wordHead}>
        <span lang="ja" className={styles.wordSurface}>{word.surface}</span>
        {word.reading && <span lang="ja" className={styles.wordReading}>（{word.reading}）</span>}
        {word.glossVi && <span className={styles.wordGloss}>{word.glossVi}</span>}
      </p>
      {word.examples.length > 0 && <ul className={styles.exampleList} aria-label={`Ví dụ với ${word.surface}`}>{word.examples.map((e) => <ExampleLine key={e.id} example={e} />)}</ul>}
    </li>
  );
}

/**
 * Learning order for one Kanji: recognise it, understand its readings, continue. Only data the API provides is shown.
 * Related words (with examples) appear only when the API returns them. Stroke order has no renderer in this slice, so
 * only a neutral note is shown. `demo` marks the development-only fallback entry.
 */
export function KanjiArticle({ entry, demo = false }: { entry: KanjiDetailEntry; demo?: boolean }) {
  const hasReadings = entry.onReadings.length > 0 || entry.kunReadings.length > 0;
  return (
    <article className={styles.steps}>
      {demo && <DemoBanner />}
      <section className={styles.step} aria-labelledby="kanji-step-1">
        <StepHeading step={1} id="kanji-step-1">Nhận biết chữ</StepHeading>
        <p className={styles.goal}>Hãy nhìn kỹ hình dạng chữ và ghi nhớ nghĩa của nó.</p>
        <div className={styles.hero}>
          <h1 className={styles.heroGlyph} lang="ja">{entry.glyph}</h1>
          {entry.meaningVi ? <p className={styles.heroMeaning}>{entry.meaningVi}</p> : <p className={styles.noData}>Chưa có nghĩa tiếng Việt</p>}
          <p className={styles.noData} data-stroke-order={entry.strokeOrderStatus}>
            {entry.strokeOrderStatus === "metadata_only"
              ? "Hướng dẫn nét viết chưa hiển thị được ở phiên bản này."
              : "Chưa có hướng dẫn nét viết cho chữ này."}
          </p>
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
        {entry.relatedVocabulary.length > 0 && (
          <section className={styles.section} aria-labelledby="kanji-words">
            <h3 className={styles.sectionTitle} id="kanji-words">Từ vựng có chứa chữ này</h3>
            <ul className={styles.wordList}>{entry.relatedVocabulary.map((word) => <WordItem key={word.id} word={word} />)}</ul>
          </section>
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
