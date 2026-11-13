"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { VOCABULARY_TOPICS } from "./vocabulary-data";
import { selectReviewWords, type ReviewOutcome } from "./vocabulary-logic";
import { ReviewModal } from "./review-modal";
import { StudySessionView } from "./study-session";
import { useVocabulary } from "./vocabulary-provider";
import styles from "./vocabulary.module.css";

const HOME = "/skills/vocabulary";

/**
 * /skills/vocabulary/study/[topicId]
 *
 * In-app navigation arrives with a session already created by Home (after its review modal).
 * A direct load / refresh has no in-memory session, so the same start rules run here:
 * no previously studied words -> start immediately, otherwise show the review modal.
 */
export function TopicStudy({ topicId }: { topicId: string }) {
  const router = useRouter();
  const { session, progress, beginSession, endSession } = useVocabulary();
  const topic = VOCABULARY_TOPICS.find((t) => t.id === topicId);
  const active = session && session.topicId === topicId ? session : null;

  // Computed once per mount so progress updates during the session cannot re-open the modal.
  const [reviewWords] = React.useState(() => selectReviewWords(progress));
  const needsReview = !active && reviewWords.length > 0;

  React.useEffect(() => {
    if (!active && reviewWords.length === 0) beginSession(topicId, "not-required");
  }, [active, reviewWords.length, beginSession, topicId]);

  const leave = () => {
    endSession();
    router.push(HOME);
  };

  const start = (outcome: ReviewOutcome) => beginSession(topicId, outcome);

  if (active) return <StudySessionView session={active} onExit={leave} />;

  return (
    <div className={styles.page}>
      <p className={styles.muted} role="status">
        {needsReview ? `Chuẩn bị học “${topic?.title ?? ""}”…` : "Đang mở bài học…"}
      </p>
      {needsReview && (
        <ReviewModal
          words={reviewWords}
          topicTitle={topic?.title ?? ""}
          onPassed={() => start("passed")}
          onSkip={() => start("skipped")}
          onExit={() => router.replace(HOME)}
        />
      )}
    </div>
  );
}
