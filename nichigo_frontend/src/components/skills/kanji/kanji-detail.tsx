"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { skillsApi } from "../../../api/skills";
import { EmptyState } from "../../states/empty-state";
import { ErrorState } from "../../states/error-state";
import shared from "../shared/skills-detail.module.css";
import { DETAIL_LOADING, loadKanjiDetail, type KanjiDetailState, type KanjiEntry } from "./kanji-data";
import { KanjiDetailSkeleton } from "./kanji-skeleton";
import styles from "./kanji.module.css";

/** Container: fetches the Item by canonical id on its own, so a direct URL needs no list state. */
export function KanjiDetail({ itemId }: { itemId: string }) {
  const [attempt, setAttempt] = React.useState(0);
  // The result is stored with the request it belongs to; anything else renders as loading, so no state is reset inside the effect.
  const key = `${itemId}#${attempt}`;
  const [result, setResult] = React.useState<{ key: string; state: KanjiDetailState } | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    loadKanjiDetail((id, signal) => skillsApi.item(id, signal), itemId, controller.signal).then(
      (next) => { if (!controller.signal.aborted) setResult({ key, state: next }); },
      () => { /* cancelled: a newer request or unmount owns the state */ },
    );
    return () => controller.abort();
  }, [itemId, key]);

  return <KanjiDetailView state={result?.key === key ? result.state : DETAIL_LOADING} onRetry={() => setAttempt((n) => n + 1)} />;
}

export function KanjiDetailView({ state, onRetry }: { state: KanjiDetailState; onRetry: () => void }) {
  const glyph = state.status === "success" ? state.entry.glyph : null;
  return (
    <div className={shared.page}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <ol>
          <li><Link href="/skills">Kỹ năng</Link></li>
          <li><Link href="/skills/kanji">Kanji</Link></li>
          {glyph && <li aria-current="page" lang="ja">{glyph}</li>}
        </ol>
      </nav>
      <Link href="/skills/kanji" className={`${shared.backNav} ${styles.backLink}`}>
        <ArrowLeft size={15} aria-hidden="true" />
        Quay lại danh sách Kanji
      </Link>

      {state.status === "loading" && <KanjiDetailSkeleton />}
      {state.status === "error" && <ErrorState title="Không thể tải chữ Kanji" description={state.message} onRetry={onRetry} />}
      {state.status === "not-found" && (
        <EmptyState
          title="Không tìm thấy chữ Kanji"
          description="Chữ này không tồn tại hoặc hiện chưa được xuất bản."
          action={<Link href="/skills/kanji" className={styles.button}>Về danh sách Kanji</Link>}
        />
      )}
      {state.status === "success" && <KanjiArticle entry={state.entry} />}
    </div>
  );
}

function ReadingSection({ id, title, ja, values }: { id: string; title: string; ja: string; values: string[] }) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 className={styles.sectionTitle} id={id}>{title} <span lang="ja">({ja})</span></h2>
      {values.length > 0 ? (
        <ul className={styles.readingList} lang="ja">{values.map((v, i) => <li key={`${v}-${i}`}>{v}</li>)}</ul>
      ) : (
        <p className={styles.noData}>Chưa có dữ liệu</p>
      )}
    </section>
  );
}

function KanjiArticle({ entry }: { entry: KanjiEntry }) {
  return (
    <article>
      <div className={styles.hero}>
        <h1 className={styles.heroGlyph} lang="ja">{entry.glyph}</h1>
        {entry.meaningVi ? <p className={styles.heroMeaning}>{entry.meaningVi}</p> : <p className={styles.noData}>Chưa có nghĩa tiếng Việt</p>}
      </div>
      <div className={styles.sections}>
        <ReadingSection id="kanji-on" title="Âm On" ja="音読み" values={entry.onReadings} />
        <ReadingSection id="kanji-kun" title="Âm Kun" ja="訓読み" values={entry.kunReadings} />
      </div>
    </article>
  );
}
