"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, ClipboardCheck, Lock } from "lucide-react";
import { Button, Progress } from "@/components/ui";
import { VOCABULARY_TOPICS, getWord } from "./vocabulary-data";
import { QuizRunner } from "./quiz-runner";
import {
  buildQuiz,
  railItems,
  stateOf,
  type ReviewOutcome,
  type StudySession,
} from "./vocabulary-logic";
import {
  BookmarkButton,
  ExampleBlock,
  PronunciationButton,
  StateBadge,
  WordHeading,
} from "./vocabulary-parts";
import { useVocabulary } from "./vocabulary-provider";
import type { VocabularyWord } from "./vocabulary-types";
import styles from "./vocabulary.module.css";

const OUTCOME_NOTE: Record<ReviewOutcome, string | null> = {
  "not-required": null,
  passed: "Đã đạt phần ôn tập",
  skipped: "Đã bỏ qua phần ôn tập",
};

type HeadingRef = React.RefObject<HTMLHeadingElement | null>;

export function StudySessionView({ session, onExit }: { session: StudySession; onExit: () => void }) {
  const { dispatchSession: dispatch, finishCheck } = useVocabulary();
  const topic = VOCABULARY_TOPICS.find((t) => t.id === session.topicId);
  const groupIds = session.groups[session.groupIndex];
  const words = React.useMemo(
    () => groupIds.map((id) => getWord(id)).filter((w): w is VocabularyWord => Boolean(w)),
    [groupIds]
  );
  // Stable question set: a new array each render would re-trigger the quiz's onFinish.
  const questions = React.useMemo(() => buildQuiz(words), [words]);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    headingRef.current?.focus();
  }, [session.stage, session.groupIndex]);

  const outcomeNote = OUTCOME_NOTE[session.reviewOutcome];

  return (
    <div className={styles.page}>
      <div className={styles.sessionBar}>
        <button type="button" className={styles.backLink} onClick={onExit}>
          <ArrowLeft size={15} aria-hidden="true" />
          Thoát về Từ vựng
        </button>
        <p className={styles.sessionMeta}>
          {topic?.title} · Nhóm {session.groupIndex + 1}/{session.groups.length} · {groupIds.length} từ
          {outcomeNote && <span className={styles.outcomeChip}>{outcomeNote}</span>}
        </p>
      </div>

      {session.stage === "study" && <StudyStage session={session} words={words} headingRef={headingRef} />}
      {session.stage === "check" && (
        <section className={styles.panel} aria-labelledby="check-heading">
          <header className={styles.panelHeader}>
            <h1 id="check-heading" className={styles.panelTitle} ref={headingRef} tabIndex={-1}>
              Kiểm tra nhóm {session.groupIndex + 1}
            </h1>
            <p className={styles.panelDesc}>
              Gồm đúng {words.length} từ vừa học. Đạt ít nhất 80% để chuyển sang trạng thái “Đã học”.
            </p>
          </header>
          <QuizRunner
            key={`${session.groupIndex}-${session.stage}`}
            questions={questions}
            label="kiểm tra"
            onFinish={(result) => finishCheck(groupIds, result)}
          />
          <button type="button" className={styles.textButton} onClick={() => dispatch({ type: "back-to-study" })}>
            Xem lại các từ
          </button>
        </section>
      )}
      {session.stage === "result" && (
        <ResultStage session={session} words={words} headingRef={headingRef} onExit={onExit} />
      )}
    </div>
  );
}

function StudyStage({ session, words, headingRef }: { session: StudySession; words: VocabularyWord[]; headingRef: HeadingRef }) {
  const { progress, bookmarks, dispatchSession: dispatch, toggleBookmark, markViewed } = useVocabulary();
  const word = words[session.wordIndex];
  const isLast = session.wordIndex === words.length - 1;

  React.useEffect(() => {
    if (word) markViewed(word.id);
  }, [word, markViewed]);

  if (!word) return null;
  const rail = railItems(words, session.wordIndex, session.furthest);

  return (
    <div className={styles.studyWrap}>
    <div className={styles.studyLayout}>
      <section className={`${styles.panel} ${styles.studyPanel}`} aria-labelledby="study-heading">
        <header className={styles.studyHeader}>
          <div>
            <h1 id="study-heading" className={styles.panelTitleSm} ref={headingRef} tabIndex={-1}>
              Từ {session.wordIndex + 1}/{words.length}
            </h1>
            <Progress
              value={session.wordIndex + 1}
              max={words.length}
              label={`Tiến độ nhóm ${session.groupIndex + 1}`}
              className={styles.studyBar}
            />
          </div>
        </header>

        <article className={styles.wordCard} aria-label={`Từ vựng ${word.surface}`}>
          <div className={styles.wordTools}>
            {word.partOfSpeech && <span className={styles.pos}>{word.partOfSpeech}</span>}
            <span className={styles.toolSpacer} />
            <PronunciationButton word={word} />
            <BookmarkButton word={word} saved={bookmarks.has(word.id)} onToggle={toggleBookmark} />
          </div>
          <div className={styles.wordBody}>
            <WordHeading word={word} />
            <p className={styles.meaning}>{word.meaningVi}</p>
          </div>
          <ExampleBlock key={word.id} word={word} />
        </article>

        <div className={styles.controls}>
          <Button
            variant="outline"
            size="lg"
            onClick={() => dispatch({ type: "prev" })}
            disabled={session.wordIndex === 0}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Từ trước
          </Button>
          <span className={styles.controlsCount} aria-hidden="true">
            {session.wordIndex + 1} / {words.length}
          </span>
          {isLast ? (
            <Button size="lg" onClick={() => dispatch({ type: "start-check" })}>
              <ClipboardCheck size={16} aria-hidden="true" /> Kiểm tra nhóm này
            </Button>
          ) : (
            <Button size="lg" onClick={() => dispatch({ type: "next" })}>
              Từ tiếp theo <ArrowRight size={16} aria-hidden="true" />
            </Button>
          )}
        </div>
      </section>

      <aside className={styles.rail} aria-label="Các từ trong nhóm">
        <h2 className={styles.railTitle}>Nhóm {session.groupIndex + 1}</h2>
        <ol className={styles.railList}>
          {rail.map((item) =>
            item.kind === "upcoming" ? (
              <li key={item.position} className={`${styles.railItem} ${styles.railItemLocked}`}>
                <span data-col="word" className={styles.railPos}>Từ {item.position}</span>
                <span data-col="meaning" aria-hidden="true" />
                <span data-col="status" className={styles.railLocked}>
                  <Lock size={12} aria-hidden="true" /> Chưa mở
                </span>
              </li>
            ) : (
              <li
                key={item.word.id}
                className={`${styles.railItem} ${item.kind === "current" ? styles.railItemCurrent : ""}`}
                aria-current={item.kind === "current" ? "step" : undefined}
              >
                <span data-col="word" className={styles.railJa} lang="ja">{item.word.surface}</span>
                {item.kind === "visited" ? (
                  <span data-col="meaning" className={styles.railVi}>{item.word.meaningVi}</span>
                ) : (
                  <span data-col="meaning" aria-hidden="true" />
                )}
                <span data-col="status" className={styles.railStatus}>
                  {item.kind === "visited" ? (
                    <StateBadge state={stateOf(progress, item.word.id)} />
                  ) : (
                    <span className={styles.railNow}>Đang xem</span>
                  )}
                </span>
              </li>
            )
          )}
        </ol>
      </aside>
    </div>
    </div>
  );
}

function ResultStage({
  session,
  words,
  headingRef,
  onExit,
}: {
  session: StudySession;
  words: VocabularyWord[];
  headingRef: HeadingRef;
  onExit: () => void;
}) {
  const { progress, checkResult, dispatchSession: dispatch } = useVocabulary();
  if (!checkResult) return null;
  const hasNext = session.groupIndex < session.groups.length - 1;
  const passed = checkResult.passed;
  const needsReviewGroups = session.groupResults.filter((r) => r === "needs-review").length;

  return (
    <section className={styles.panel} aria-labelledby="result-heading">
      <header className={styles.panelHeader}>
        <h1 id="result-heading" className={styles.panelTitle} ref={headingRef} tabIndex={-1}>
          {passed ? "Bạn đã hoàn thành nhóm này" : "Nhóm này cần ôn lại"}
        </h1>
        <p className={styles.panelDesc}>
          {checkResult.correct}/{checkResult.total} câu đúng (cần {checkResult.required}).
          {" "}Trạng thái dưới đây là minh họa, chưa được lưu lại.
        </p>
      </header>

      {!passed && (
        <p className={styles.notice} role="status">
          Nhóm này <strong>chưa được tính là hoàn thành</strong>. Bạn vẫn có thể học tiếp nhóm sau, nhưng
          những từ trả lời sai vẫn ở trạng thái “Cần ôn” cho đến khi bạn vượt qua phần kiểm tra.
        </p>
      )}

      <ul className={styles.resultList}>
        {words.map((w) => (
          <li key={w.id} className={styles.resultRow}>
            <span className={styles.railJa} lang="ja">{w.surface}</span>
            <span className={styles.railVi}>{w.meaningVi}</span>
            <StateBadge state={stateOf(progress, w.id)} />
          </li>
        ))}
      </ul>

      {!hasNext && needsReviewGroups > 0 && (
        <p className={styles.notice} role="status">
          Đây là nhóm cuối. Còn {needsReviewGroups} nhóm cần ôn lại trong chủ đề này.
        </p>
      )}

      <div className={styles.controls}>
        {passed ? (
          <Button variant="outline" size="lg" onClick={() => dispatch({ type: "restart-group" })}>
            Học lại nhóm này
          </Button>
        ) : (
          <Button size="lg" onClick={() => dispatch({ type: "restart-group" })}>
            Học lại nhóm này
          </Button>
        )}
        {hasNext ? (
          <Button size="lg" variant={passed ? "primary" : "outline"} onClick={() => dispatch({ type: "next-group" })}>
            {passed ? "Học nhóm tiếp theo" : "Tiếp tục nhóm sau (chưa hoàn thành nhóm này)"}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        ) : (
          <Button size="lg" variant={passed ? "primary" : "outline"} onClick={onExit}>Về Từ vựng</Button>
        )}
      </div>
    </section>
  );
}
