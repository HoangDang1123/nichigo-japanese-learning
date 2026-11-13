import { VOCABULARY_RELATIONS, VOCABULARY_WORDS, getWord } from "./vocabulary-data";
import type {
  LearningState,
  ProgressMap,
  QuizQuestion,
  RelationType,
  VocabularyWord,
} from "./vocabulary-types";

/**
 * Pure, replaceable learning rules for the frontend prototype.
 * Nothing here persists anything; a real learning API can replace these functions.
 */

export const GROUP_SIZE = 10;
export const PASS_RATIO = 0.8;
export const RETRY_COUNTDOWN_SECONDS = 30;

export function stateOf(progress: ProgressMap, wordId: string): LearningState {
  return progress[wordId] ?? "new";
}

/** Split into groups of at most `size` (24 words -> 10, 10, 4). */
export function chunkWords<T>(items: readonly T[], size = GROUP_SIZE): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

/** Number of correct answers required: ceil(questionCount * 0.8). */
export function passThreshold(questionCount: number): number {
  return Math.ceil(questionCount * PASS_RATIO);
}

export function didPass(correct: number, questionCount: number): boolean {
  return questionCount > 0 && correct >= passThreshold(questionCount);
}

const REVIEW_PRIORITY: Record<LearningState, number> = {
  review: 0,
  learning: 1,
  learned: 2,
  new: 99,
};

/**
 * Words eligible for the pre-study review. Rules:
 *  - only words previously studied (state !== "new");
 *  - bookmarks are NOT an input, so they never qualify a word;
 *  - words of the topic being started that are still `new` are excluded by the first rule;
 *  - needs-review words first, then learning, then learned; capped at `limit`.
 */
export function selectReviewWords(
  progress: ProgressMap,
  limit = GROUP_SIZE,
  words: readonly VocabularyWord[] = VOCABULARY_WORDS
): VocabularyWord[] {
  return words
    .map((word, order) => ({ word, order, state: stateOf(progress, word.id) }))
    .filter((e) => e.state !== "new")
    .sort((a, b) => REVIEW_PRIORITY[a.state] - REVIEW_PRIORITY[b.state] || a.order - b.order)
    .slice(0, limit)
    .map((e) => e.word);
}

/** Viewing a word in a study session only marks `new` as `learning`. Never "learned". */
export function markEncountered(progress: ProgressMap, wordId: string): ProgressMap {
  return stateOf(progress, wordId) === "new" ? { ...progress, [wordId]: "learning" } : progress;
}

/**
 * Provisional post-check transition.
 *  - correct word, group passed  -> learned
 *  - correct word, group failed  -> learning (not yet passed a check)
 *  - incorrect word              -> review
 */
export function applyCheckResult(
  progress: ProgressMap,
  groupWordIds: readonly string[],
  correctWordIds: ReadonlySet<string>
): ProgressMap {
  const passed = didPass(correctWordIds.size, groupWordIds.length);
  const next: Record<string, LearningState> = { ...progress };
  for (const id of groupWordIds) {
    if (!correctWordIds.has(id)) next[id] = "review";
    else next[id] = passed ? "learned" : "learning";
  }
  return next;
}

export function topicProgress(progress: ProgressMap, wordIds: readonly string[]) {
  const learned = wordIds.filter((id) => stateOf(progress, id) === "learned").length;
  const studied = wordIds.filter((id) => stateOf(progress, id) !== "new").length;
  return { total: wordIds.length, learned, studied };
}

// ── Quiz construction ───────────────────────────────────────────────────────

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic multiple-choice question: Japanese prompt -> Vietnamese meaning.
 * Up to four choices; distractors have a different meaning and prefer the same topic.
 */
export function buildQuestion(
  word: VocabularyWord,
  pool: readonly VocabularyWord[] = VOCABULARY_WORDS
): QuizQuestion {
  const candidates = pool
    .filter((w) => w.id !== word.id && w.meaningVi !== word.meaningVi)
    .sort(
      (a, b) =>
        Number(b.topicId === word.topicId) - Number(a.topicId === word.topicId) ||
        hash(word.id + a.id) - hash(word.id + b.id)
    );
  const seen = new Set([word.meaningVi]);
  const distractors: VocabularyWord[] = [];
  for (const c of candidates) {
    if (seen.has(c.meaningVi)) continue;
    seen.add(c.meaningVi);
    distractors.push(c);
    if (distractors.length === 3) break;
  }
  const options = [word, ...distractors];
  const correctIndex = hash(word.id) % options.length;
  const choices = options.filter((o) => o.id !== word.id);
  choices.splice(correctIndex, 0, word);
  return {
    wordId: word.id,
    prompt: word.surface,
    promptReading: word.surface !== word.reading ? word.reading : undefined,
    choices: choices.map((c) => ({ id: c.id, label: c.meaningVi })),
    correctIndex,
  };
}

export function buildQuiz(words: readonly VocabularyWord[]): QuizQuestion[] {
  return words.map((w) => buildQuestion(w));
}

// ── Quiz state machine (shared by review modal and knowledge check) ─────────

export interface QuizState {
  index: number;
  selected: number | null;
  submitted: boolean;
  finished: boolean;
  /** Answer per question (choice index) or null if not yet answered. */
  answers: (number | null)[];
}

/** Feedback is shown this long after an answer before the quiz advances on its own. */
export const ANSWER_FEEDBACK_MS = 600;

export type QuizAction =
  | { type: "answer"; choice: number }
  | { type: "next" }
  | { type: "reset"; count: number };

export function initialQuizState(count: number): QuizState {
  return {
    index: 0,
    selected: null,
    submitted: false,
    finished: count === 0,
    answers: Array.from({ length: count }, () => null),
  };
}

/**
 * Choosing an answer records it exactly once and locks the question (`submitted`).
 * Further `answer` actions for the same question are ignored, so double clicks and rapid
 * keyboard input can neither change nor duplicate an answer. `next` only advances a
 * question that has been answered, so it can never skip one.
 */
export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "answer": {
      if (state.submitted || state.finished) return state;
      const answers = state.answers.slice();
      answers[state.index] = action.choice;
      return { ...state, answers, selected: action.choice, submitted: true };
    }
    case "next": {
      if (!state.submitted || state.finished) return state;
      const last = state.index >= state.answers.length - 1;
      return last
        ? { ...state, finished: true }
        : { ...state, index: state.index + 1, selected: null, submitted: false };
    }
    case "reset":
      return initialQuizState(action.count);
  }
}

/** Schedules `onAdvance` once after `ms`; the returned function cancels it (use as effect cleanup). */
export function scheduleAdvance(onAdvance: () => void, ms: number = ANSWER_FEEDBACK_MS): () => void {
  let active = true;
  const id = setTimeout(() => {
    if (active) onAdvance();
  }, ms);
  return () => {
    active = false;
    clearTimeout(id);
  };
}

export interface QuizResult {
  total: number;
  correct: number;
  required: number;
  passed: boolean;
  correctWordIds: Set<string>;
  incorrect: { question: QuizQuestion; chosen: number | null }[];
}

export function evaluateQuiz(questions: readonly QuizQuestion[], answers: readonly (number | null)[]): QuizResult {
  const correctWordIds = new Set<string>();
  const incorrect: QuizResult["incorrect"] = [];
  questions.forEach((q, i) => {
    if (answers[i] === q.correctIndex) correctWordIds.add(q.wordId);
    else incorrect.push({ question: q, chosen: answers[i] ?? null });
  });
  return {
    total: questions.length,
    correct: correctWordIds.size,
    required: passThreshold(questions.length),
    passed: didPass(correctWordIds.size, questions.length),
    correctWordIds,
    incorrect,
  };
}

export function tickCountdown(seconds: number): number {
  return Math.max(0, seconds - 1);
}

// ── Study session state machine ─────────────────────────────────────────────

export type ReviewOutcome = "not-required" | "passed" | "skipped";

export interface StudySession {
  topicId: string;
  groups: string[][];
  groupIndex: number;
  wordIndex: number;
  stage: "study" | "check" | "result";
  reviewOutcome: ReviewOutcome;
  /** Furthest word index reached in the current group (words after it are still hidden). */
  furthest: number;
  /** Check outcome per group. Continuing past a failed group never marks it completed. */
  groupResults: ("passed" | "needs-review" | null)[];
}

export type SessionAction =
  | { type: "prev" }
  | { type: "next" }
  | { type: "start-check" }
  | { type: "back-to-study" }
  | { type: "finish-check"; passed: boolean }
  | { type: "next-group" }
  | { type: "restart-group" };

export function createSession(topicId: string, wordIds: readonly string[], reviewOutcome: ReviewOutcome): StudySession {
  const groups = chunkWords(wordIds);
  return {
    topicId,
    groups,
    groupIndex: 0,
    wordIndex: 0,
    stage: "study",
    reviewOutcome,
    furthest: 0,
    groupResults: groups.map(() => null),
  };
}

export function sessionReducer(s: StudySession, a: SessionAction): StudySession {
  const groupSize = s.groups[s.groupIndex]?.length ?? 0;
  switch (a.type) {
    case "prev":
      return s.stage === "study" && s.wordIndex > 0 ? { ...s, wordIndex: s.wordIndex - 1 } : s;
    case "next":
      // Next only moves through the group; the check is an explicit separate step.
      return s.stage === "study" && s.wordIndex < groupSize - 1
        ? { ...s, wordIndex: s.wordIndex + 1, furthest: Math.max(s.furthest, s.wordIndex + 1) }
        : s;
    case "start-check":
      return s.stage === "study" ? { ...s, stage: "check" } : s;
    case "back-to-study":
      return s.stage === "check" ? { ...s, stage: "study", wordIndex: 0 } : s;
    case "finish-check": {
      if (s.stage !== "check") return s;
      const groupResults = s.groupResults.slice();
      groupResults[s.groupIndex] = a.passed ? "passed" : "needs-review";
      return { ...s, stage: "result", groupResults };
    }
    case "next-group":
      return s.stage === "result" && s.groupIndex < s.groups.length - 1
        ? { ...s, groupIndex: s.groupIndex + 1, wordIndex: 0, furthest: 0, stage: "study" }
        : s;
    case "restart-group":
      return s.stage === "result" ? { ...s, wordIndex: 0, furthest: 0, stage: "study" } : s;
  }
}

export type RailItem =
  | { kind: "current"; position: number; word: VocabularyWord }
  | { kind: "visited"; position: number; word: VocabularyWord }
  /** Deliberately carries no word data: upcoming content must not reach the DOM. */
  | { kind: "upcoming"; position: number };

/** Sidebar model for a study group: only reached words expose their content. */
export function railItems(words: readonly VocabularyWord[], wordIndex: number, furthest: number): RailItem[] {
  return words.map((word, i) => {
    if (i === wordIndex) return { kind: "current", position: i + 1, word };
    if (i <= furthest) return { kind: "visited", position: i + 1, word };
    return { kind: "upcoming", position: i + 1 };
  });
}

// ── Search & relations ──────────────────────────────────────────────────────

/** Lowercase, strip diacritics (ō -> o, Vietnamese marks) so "ohayo" matches "ohayō". */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
}

export function searchWords(query: string, words: readonly VocabularyWord[]): VocabularyWord[] {
  const q = normalizeSearch(query);
  if (!q) return [...words];
  return words.filter((w) =>
    [w.surface, w.reading, w.romaji, w.meaningVi].some((field) => normalizeSearch(field).includes(q))
  );
}

export const RELATION_LABELS: Record<RelationType, string> = {
  "same-topic": "Cùng chủ đề",
  collocation: "Thường đi với",
  synonym: "Đồng nghĩa",
  antonym: "Trái nghĩa",
};

const RELATION_ORDER: RelationType[] = ["collocation", "synonym", "antonym", "same-topic"];

export interface RelatedGroup {
  type: RelationType;
  label: string;
  words: VocabularyWord[];
}

/** Only authored relations are returned; empty groups are omitted. */
export function relatedWords(wordId: string): RelatedGroup[] {
  const byType = new Map<RelationType, VocabularyWord[]>();
  for (const r of VOCABULARY_RELATIONS) {
    const otherId = r.a === wordId ? r.b : r.b === wordId ? r.a : null;
    const other = otherId ? getWord(otherId) : undefined;
    if (!other) continue;
    byType.set(r.type, [...(byType.get(r.type) ?? []), other]);
  }
  return RELATION_ORDER.filter((t) => byType.has(t)).map((type) => ({
    type,
    label: RELATION_LABELS[type],
    words: byType.get(type)!,
  }));
}

// ── Bookmarks (independent from progress) ───────────────────────────────────

export function toggleBookmark(bookmarks: ReadonlySet<string>, wordId: string): Set<string> {
  const next = new Set(bookmarks);
  if (next.has(wordId)) next.delete(wordId);
  else next.add(wordId);
  return next;
}

export const STATE_LABELS: Record<LearningState, string> = {
  new: "Mới",
  learning: "Đang học",
  review: "Cần ôn",
  learned: "Đã học",
};
