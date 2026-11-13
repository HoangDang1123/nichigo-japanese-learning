"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { QuizRunner } from "./quiz-runner";
import {
  RETRY_COUNTDOWN_SECONDS,
  buildQuiz,
  tickCountdown,
  type QuizResult,
} from "./vocabulary-logic";
import type { VocabularyWord } from "./vocabulary-types";
import styles from "./vocabulary-quiz.module.css";

interface ReviewModalProps {
  words: readonly VocabularyWord[];
  topicTitle: string;
  onPassed: () => void;
  /** Skipping never marks the review as passed. */
  onSkip: () => void;
  /** Esc / close button: return to the Vocabulary page without starting the session. */
  onExit: () => void;
}

export function ReviewModal({ words, topicTitle, onPassed, onSkip, onExit }: ReviewModalProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  const [attempt, setAttempt] = React.useState(0);
  const questions = React.useMemo(() => buildQuiz(words), [words]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      if (opener && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(e) => {
        e.preventDefault();
        onExit();
      }}
    >
      <div className={styles.modalInner}>
        <header className={styles.modalHeader}>
          <div>
            <p className={styles.modalEyebrow}>Trước khi học “{topicTitle}”</p>
            <h2 id={titleId} className={styles.modalTitle}>Ôn lại những từ đã học</h2>
            <p id={descId} className={styles.modalDesc}>
              {words.length} từ bạn đã học trước đây. Đạt ít nhất 80% để vượt qua phần ôn tập.
            </p>
          </div>
          <button type="button" className={styles.modalClose} onClick={onExit} aria-label="Thoát ôn tập và quay lại Từ vựng">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
        <QuizRunner
          key={attempt}
          questions={questions}
          label="ôn tập"
          renderResult={(result) => (
            <ReviewResult
              result={result}
              onPassed={onPassed}
              onSkip={onSkip}
              onRetry={() => setAttempt((n) => n + 1)}
            />
          )}
        />
        </div>
      </div>
    </dialog>
  );
}

function ReviewResult({
  result,
  onPassed,
  onSkip,
  onRetry,
}: {
  result: QuizResult;
  onPassed: () => void;
  onSkip: () => void;
  onRetry: () => void;
}) {
  const [remaining, setRemaining] = React.useState(result.passed ? 0 : RETRY_COUNTDOWN_SECONDS);
  const titleRef = React.useRef<HTMLHeadingElement>(null);

  // The last answer button unmounts when the result appears; keep keyboard focus inside the dialog.
  React.useEffect(() => {
    titleRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (result.passed) return;
    const timer = window.setInterval(() => setRemaining(tickCountdown), 1000);
    return () => window.clearInterval(timer);
  }, [result.passed]);

  if (result.passed) {
    return (
      <div className={styles.result}>
        <h3 className={styles.resultTitle} ref={titleRef} tabIndex={-1}>Đạt yêu cầu ôn tập</h3>
        <p className={styles.resultScore}>
          {result.correct}/{result.total} câu đúng <span>(cần {result.required})</span>
        </p>
        <div className={styles.resultActions}>
          <Button size="lg" onClick={onPassed} autoFocus>Bắt đầu học từ mới</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.result}>
      <h3 className={styles.resultTitle} ref={titleRef} tabIndex={-1}>Chưa đạt yêu cầu</h3>
      <p className={styles.resultScore}>
        {result.correct}/{result.total} câu đúng <span>(cần {result.required})</span>
      </p>
      <section aria-label="Các câu trả lời chưa đúng" className={styles.missSection}>
        {/* Scrollable region: focusable so keyboard users can scroll it. */}
        <ul className={styles.missList} tabIndex={0} aria-label={`${result.incorrect.length} câu trả lời chưa đúng`}>
          {result.incorrect.map(({ question, chosen }) => (
            <li key={question.wordId} className={styles.missItem}>
              <span className={styles.missJa} lang="ja">{question.prompt}</span>
              <span>
                <span className={styles.missCorrect}>{question.choices[question.correctIndex].label}</span>
                <span className={styles.missChosen}>
                  {chosen === null ? "Chưa trả lời" : `Bạn chọn: ${question.choices[chosen].label}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <div className={styles.resultActions}>
        <Button size="lg" onClick={onRetry} disabled={remaining > 0}>
          {remaining > 0 ? `Làm lại sau ${remaining} giây` : "Làm lại"}
        </Button>
        <Button size="lg" variant="outline" onClick={onSkip}>Bỏ qua và tiếp tục học</Button>
      </div>
      <p className={styles.countdownNote} role="timer" aria-live="off">
        {remaining > 0
          ? "Hãy xem lại các từ ở trên trong lúc chờ."
          : "Bạn có thể làm lại ngay bây giờ."}
      </p>
      <p className={styles.skipNote}>Bỏ qua sẽ không được tính là đã đạt phần ôn tập.</p>
    </div>
  );
}
