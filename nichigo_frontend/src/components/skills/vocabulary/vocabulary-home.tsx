"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Bookmark, Search } from "lucide-react";
import { Progress } from "@/components/ui";
import {
  DEMO_SCENARIOS,
  VOCABULARY_TOPICS,
  getTopicWords,
} from "./vocabulary-data";
import { selectReviewWords, topicProgress, type ReviewOutcome } from "./vocabulary-logic";
import { ReviewModal } from "./review-modal";
import { useVocabulary } from "./vocabulary-provider";
import type { VocabularyWord } from "./vocabulary-types";
import styles from "./vocabulary.module.css";

export function VocabularyHome() {
  const router = useRouter();
  const { progress, bookmarks, scenario, setScenario, beginSession } = useVocabulary();
  const [pendingReview, setPendingReview] = React.useState<{ topicId: string; words: VocabularyWord[] } | null>(null);

  const openSession = (topicId: string, outcome: ReviewOutcome) => {
    beginSession(topicId, outcome);
    setPendingReview(null);
    router.push(`/skills/vocabulary/study/${topicId}`);
  };

  const startTopic = (topicId: string) => {
    // Eligibility uses progress only. Bookmarks are intentionally not an input.
    const eligible = selectReviewWords(progress);
    if (eligible.length === 0) openSession(topicId, "not-required");
    else setPendingReview({ topicId, words: eligible });
  };

  const savedCount = bookmarks.size;
  const onScenarioChange = setScenario;
  const onStartTopic = startTopic;
  const reviewTopicTitle = pendingReview
    ? (VOCABULARY_TOPICS.find((t) => t.id === pendingReview.topicId)?.title ?? "")
    : "";

  return (
    <div className={styles.page}>
      <Link href="/skills" className={styles.backLink}>
        <ArrowLeft size={15} aria-hidden="true" />
        Kỹ năng
      </Link>

      <header className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <h1 className={styles.pageTitle}>Từ vựng</h1>
          <span className={styles.titleJa} lang="ja">語彙</span>
          <span className={styles.demoBadge}>Dữ liệu minh họa</span>
        </div>
        <p className={styles.pageDescription}>
          Học từ mới theo chủ đề, tìm kiếm từ bất kỳ hoặc xem lại những từ bạn đã lưu.
        </p>
      </header>

      <div className={styles.entryRow}>
        <Link href="/skills/vocabulary/explore" className={styles.entryCard}>
          <span className={styles.entryIcon} aria-hidden="true"><Search size={20} /></span>
          <span className={styles.entryText}>
            <span className={styles.entryTitle}>Khám phá từ vựng</span>
            <span className={styles.entryDesc}>Tìm theo chữ Nhật, kana, romaji hoặc nghĩa tiếng Việt.</span>
          </span>
          <ArrowRight size={18} aria-hidden="true" className={styles.entryArrow} />
        </Link>
        <Link href="/skills/vocabulary/saved" className={styles.entryCard}>
          <span className={styles.entryIcon} aria-hidden="true"><Bookmark size={20} /></span>
          <span className={styles.entryText}>
            <span className={styles.entryTitle}>Từ đã lưu</span>
            <span className={styles.entryDesc}>{savedCount} từ bạn đã đánh dấu để xem lại.</span>
          </span>
          <ArrowRight size={18} aria-hidden="true" className={styles.entryArrow} />
        </Link>
      </div>

      <section aria-labelledby="topics-heading" className={styles.section}>
        <h2 id="topics-heading" className={styles.sectionTitle}>Học theo chủ đề</h2>
        <ul className={styles.topicGrid}>
          {VOCABULARY_TOPICS.map((topic) => {
            const words = getTopicWords(topic.id);
            const p = topicProgress(progress, words.map((w) => w.id));
            return (
              <li key={topic.id} className={styles.topicCard}>
                <div className={styles.topicTop}>
                  <h3 className={styles.topicTitle}>{topic.title}</h3>
                  <span className={styles.topicJa} lang="ja">{topic.titleJa}</span>
                </div>
                <p className={styles.topicDesc}>{topic.description}</p>
                <p className={styles.topicMeta}>
                  {p.total} từ
                </p>
                <Progress
                  value={p.learned}
                  max={p.total}
                  label={`Đã học ${p.learned}/${p.total}`}
                  className={styles.topicBar}
                />
                <button
                  type="button"
                  className={styles.topicAction}
                  onClick={() => onStartTopic(topic.id)}
                  aria-label={`Học chủ đề ${topic.title}`}
                >
                  Học chủ đề
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <fieldset className={styles.demoPanel}>
        <legend className={styles.demoLegend}>
          <span className={styles.demoTag}>Công cụ demo</span>
          Giả lập lịch sử học để xem hộp ôn tập
        </legend>
        <p className={styles.demoNote}>
          Chỉ có trong bản thử giao diện, không phải tính năng dành cho người học. Đổi lựa chọn sẽ đặt lại
          tiến độ minh họa.
        </p>
        <div className={styles.demoOptions}>
          {DEMO_SCENARIOS.map((s) => (
            <label key={s.key} className={styles.demoOption}>
              <input
                type="radio"
                name="vocab-demo-scenario"
                checked={scenario === s.key}
                onChange={() => onScenarioChange(s.key)}
              />
              <span>
                <span className={styles.demoOptionLabel}>{s.label}</span>
                <span className={styles.demoOptionHint}>{s.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {pendingReview && (
        <ReviewModal
          words={pendingReview.words}
          topicTitle={reviewTopicTitle}
          onPassed={() => openSession(pendingReview.topicId, "passed")}
          onSkip={() => openSession(pendingReview.topicId, "skipped")}
          onExit={() => setPendingReview(null)}
        />
      )}
    </div>
  );
}
