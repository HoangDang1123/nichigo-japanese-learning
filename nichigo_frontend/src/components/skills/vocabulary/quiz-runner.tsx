"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { Progress } from "@/components/ui";
import {
  ANSWER_FEEDBACK_MS,
  evaluateQuiz,
  initialQuizState,
  quizReducer,
  scheduleAdvance,
  type QuizResult,
} from "./vocabulary-logic";
import type { QuizQuestion } from "./vocabulary-types";
import styles from "./vocabulary-quiz.module.css";

interface QuizRunnerProps {
  questions: readonly QuizQuestion[];
  /** Called once when the last answer has been recorded and its feedback has been shown. */
  onFinish?: (result: QuizResult) => void;
  renderResult?: (result: QuizResult) => React.ReactNode;
  label: string;
}

/**
 * Shared multiple-choice runner (pre-study review and post-study check).
 *
 * Choosing an answer records it once, locks the options, shows correct/incorrect feedback
 * for ANSWER_FEEDBACK_MS and then advances on its own. There is no confirm button.
 * The runner stays mounted between questions (only the question group is re-keyed), so a
 * surrounding dialog is never remounted; focus moves to the new question heading instead.
 */
export function QuizRunner({ questions, onFinish, renderResult, label }: QuizRunnerProps) {
  const [state, dispatch] = React.useReducer(quizReducer, questions.length, initialQuizState);
  const promptId = React.useId();
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const skipFirstFocus = React.useRef(true);

  const result = React.useMemo(
    () => (state.finished ? evaluateQuiz(questions, state.answers) : null),
    [state.finished, state.answers, questions]
  );

  const onFinishRef = React.useRef(onFinish);
  React.useEffect(() => {
    onFinishRef.current = onFinish;
  });
  React.useEffect(() => {
    if (result) onFinishRef.current?.(result);
  }, [result]);

  // Auto-advance. The cleanup cancels the pending timer when the answer state changes,
  // when the quiz resets, or when the runner (or its dialog / page) unmounts.
  React.useEffect(() => {
    if (!state.submitted || state.finished) return;
    return scheduleAdvance(() => dispatch({ type: "next" }), ANSWER_FEEDBACK_MS);
  }, [state.submitted, state.finished, state.index]);

  // After advancing, move focus to the new question so keyboard / screen-reader users continue there.
  React.useEffect(() => {
    if (skipFirstFocus.current) {
      skipFirstFocus.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [state.index]);

  if (result) return <>{renderResult?.(result)}</>;

  const question = questions[state.index];
  if (!question) return null;
  const locked = state.submitted;
  const answeredCorrectly = state.selected === question.correctIndex;
  const correctLabel = question.choices[question.correctIndex].label;

  return (
    <div className={styles.quiz}>
      <div className={styles.quizProgress}>
        <p className={styles.quizCounter}>
          Câu {state.index + 1}/{questions.length}
        </p>
        <Progress
          value={state.index + (locked ? 1 : 0)}
          max={questions.length}
          label={`Tiến độ ${label}`}
          className={styles.quizBar}
        />
      </div>

      <div role="group" aria-labelledby={promptId} className={styles.fieldset} key={question.wordId}>
        <h3 id={promptId} className={styles.promptBlock} ref={headingRef} tabIndex={-1}>
          <span className={styles.legendHint}>Chọn nghĩa tiếng Việt đúng của từ</span>
          <span className={styles.prompt} lang="ja">{question.prompt}</span>
          {/* Always present so the block keeps one height; empty (and hidden) for kana-only words. */}
          <span
            className={styles.promptReading}
            lang="ja"
            aria-hidden={question.promptReading ? undefined : true}
          >
            {question.promptReading}
          </span>
        </h3>

        <div className={styles.choices}>
          {question.choices.map((choice, i) => {
            const isSelected = state.selected === i;
            const isCorrect = locked && i === question.correctIndex;
            const isWrong = locked && isSelected && i !== question.correctIndex;
            const cls = [
              styles.choice,
              isSelected ? styles.choiceSelected : "",
              isCorrect ? styles.choiceCorrect : "",
              isWrong ? styles.choiceWrong : "",
            ].join(" ");
            return (
              <button
                key={choice.id}
                type="button"
                className={cls}
                aria-disabled={locked || undefined}
                onClick={() => {
                  if (!locked) dispatch({ type: "answer", choice: i });
                }}
              >
                <span className={styles.choiceKey} aria-hidden="true">{i + 1}</span>
                <span className={styles.choiceLabel}>{choice.label}</span>
                {isCorrect && (
                  <>
                    <Check size={18} aria-hidden="true" className={styles.choiceIcon} />
                    <span className={styles.srOnly}>(đáp án đúng)</span>
                  </>
                )}
                {isWrong && (
                  <>
                    <X size={18} aria-hidden="true" className={styles.choiceIcon} />
                    <span className={styles.srOnly}>(bạn chọn, chưa đúng)</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reserved height: the status line never moves the choices or the content below. */}
      <p
        className={`${styles.feedback} ${locked ? (answeredCorrectly ? styles.feedbackOk : styles.feedbackBad) : ""}`}
        role="status"
      >
        {locked && (answeredCorrectly ? "Chính xác!" : `Chưa đúng. Đáp án đúng: ${correctLabel}`)}
      </p>
    </div>
  );
}
