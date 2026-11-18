"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { skillsApi } from "../../../api/skills";
import { EmptyState } from "../../states/empty-state";
import { ErrorState } from "../../states/error-state";
import shared from "../shared/skills-detail.module.css";
import { KanjiArticle } from "./kanji-article";
import { DETAIL_LOADING, loadKanjiDetail, type KanjiDetailState } from "./kanji-data";
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

