import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  VOCABULARY_TOPICS,
  VOCABULARY_WORDS,
  createDemoBookmarks,
  createDemoProgress,
  getDiscoveryWords,
  getTopicWords,
} from "./vocabulary-data";
import {
  ANSWER_FEEDBACK_MS,
  RETRY_COUNTDOWN_SECONDS,
  applyCheckResult,
  buildQuestion,
  buildQuiz,
  chunkWords,
  createSession,
  evaluateQuiz,
  initialQuizState,
  markEncountered,
  normalizeSearch,
  passThreshold,
  quizReducer,
  railItems,
  relatedWords,
  scheduleAdvance,
  searchWords,
  selectReviewWords,
  sessionReducer,
  stateOf,
  tickCountdown,
  toggleBookmark,
} from "./vocabulary-logic";

test("topics: every topic has words, ids are unique, school has 24", () => {
  assert.equal(new Set(VOCABULARY_WORDS.map((w) => w.id)).size, VOCABULARY_WORDS.length);
  for (const t of VOCABULARY_TOPICS) assert.ok(getTopicWords(t.id).length > 0, t.id);
  assert.equal(getTopicWords("school").length, 24);
});

test("grouping: 24 words -> 10, 10, 4", () => {
  const ids = getTopicWords("school").map((w) => w.id);
  assert.deepEqual(chunkWords(ids).map((g) => g.length), [10, 10, 4]);
  assert.deepEqual(createSession("school", ids, "not-required").groups.map((g) => g.length), [10, 10, 4]);
  assert.equal(chunkWords([]).length, 0);
});

test("pass threshold is ceil(n * 0.8)", () => {
  assert.equal(passThreshold(10), 8);
  assert.equal(passThreshold(4), 4);
  assert.equal(passThreshold(3), 3);
  assert.equal(passThreshold(5), 4);
  assert.equal(passThreshold(1), 1);
});

test("review eligibility: 0 / fewer than 10 / capped at 10", () => {
  assert.equal(selectReviewWords(createDemoProgress("none")).length, 0);
  assert.equal(selectReviewWords(createDemoProgress("few")).length, 4);
  assert.equal(selectReviewWords(createDemoProgress("ten")).length, 10);
});

test("review eligibility: never new words, never bookmark-driven, review state first", () => {
  const progress = createDemoProgress("ten");
  const picked = selectReviewWords(progress);
  assert.ok(picked.every((w) => stateOf(progress, w.id) !== "new"));
  const bookmarkedNew = [...createDemoBookmarks()].filter((id) => stateOf(progress, id) === "new");
  assert.ok(bookmarkedNew.length > 0);
  assert.ok(picked.every((w) => !bookmarkedNew.includes(w.id)));
  const states = picked.map((w) => stateOf(progress, w.id));
  assert.ok(states.lastIndexOf("review") < states.indexOf("learned"));
  assert.equal(selectReviewWords({}).length, 0);
});

test("quiz questions: one per word, 4 distinct choices, correct present, deterministic", () => {
  const words = getTopicWords("greetings").slice(0, 10);
  const quiz = buildQuiz(words);
  assert.equal(quiz.length, 10);
  for (const q of quiz) {
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices.map((c) => c.label)).size, 4);
    assert.equal(q.choices[q.correctIndex].id, q.wordId);
  }
  assert.deepEqual(buildQuestion(words[0]), buildQuestion(words[0]));
});

function runQuiz(correctFlags: boolean[]) {
  const words = getTopicWords("greetings").slice(0, correctFlags.length);
  const questions = buildQuiz(words);
  let state = initialQuizState(questions.length);
  correctFlags.forEach((ok, i) => {
    const q = questions[i];
    const wrong = (q.correctIndex + 1) % q.choices.length;
    state = quizReducer(state, { type: "answer", choice: ok ? q.correctIndex : wrong });
    state = quizReducer(state, { type: "next" });
  });
  return { state, questions, result: evaluateQuiz(questions, state.answers) };
}

test("quiz reducer: an answer is recorded once; next needs an answer; finishes after the last", () => {
  const questions = buildQuiz(getTopicWords("greetings").slice(0, 2));
  let s = initialQuizState(2);
  assert.equal(quizReducer(s, { type: "next" }), s); // cannot skip an unanswered question
  s = quizReducer(s, { type: "answer", choice: 1 });
  assert.deepEqual([s.submitted, s.selected, s.answers[0]], [true, 1, 1]);
  // double click / rapid input: later answers for the same question are ignored
  assert.equal(quizReducer(s, { type: "answer", choice: 2 }), s);
  s = quizReducer(s, { type: "next" });
  assert.deepEqual([s.index, s.submitted, s.selected, s.finished], [1, false, null, false]);
  assert.equal(quizReducer(s, { type: "next" }), s); // a second "next" cannot skip question 2
  s = quizReducer(s, { type: "answer", choice: 0 });
  s = quizReducer(s, { type: "next" });
  assert.equal(s.finished, true);
  assert.equal(quizReducer(s, { type: "answer", choice: 0 }), s);
  assert.equal(quizReducer(s, { type: "next" }), s); // no double-advance past the end
  assert.deepEqual(s.answers, [1, 0]);
  assert.equal(evaluateQuiz(questions, s.answers).total, 2);
});

test("auto-advance: fires exactly once after the delay and never after cancellation", async () => {
  assert.equal(ANSWER_FEEDBACK_MS, 600);
  let fired = 0;
  scheduleAdvance(() => fired++, 15);
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(fired, 1);
  const cancel = scheduleAdvance(() => fired++, 15);
  cancel(); // unmount / modal closed / quiz reset
  cancel();
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(fired, 1);
});

test("auto-advance: a full quiz of answer -> advance yields the result with no skipped or doubled questions", () => {
  const questions = buildQuiz(getTopicWords("greetings").slice(0, 10));
  let s = initialQuizState(10);
  for (let i = 0; i < 10; i++) {
    s = quizReducer(s, { type: "answer", choice: questions[i].correctIndex });
    s = quizReducer(s, { type: "answer", choice: 0 }); // rapid second input
    s = quizReducer(s, { type: "next" });
    s = quizReducer(s, { type: "next" }); // stale/duplicate timer
    assert.equal(s.index, Math.min(i + 1, 9));
  }
  assert.equal(s.finished, true);
  const result = evaluateQuiz(questions, s.answers);
  assert.equal(result.correct, 10);
  assert.equal(result.passed, true);
});

test("quiz result: 8/10 passes, 7/10 fails with incorrect list", () => {
  const pass = runQuiz([true, true, true, true, true, true, true, true, false, false]).result;
  assert.equal(pass.correct, 8);
  assert.equal(pass.passed, true);
  const fail = runQuiz([true, true, true, true, true, true, true, false, false, false]).result;
  assert.equal(fail.passed, false);
  assert.equal(fail.incorrect.length, 3);
  assert.equal(fail.required, 8);
});

test("countdown: 30s, ticks down, never below zero", () => {
  assert.equal(RETRY_COUNTDOWN_SECONDS, 30);
  let n = RETRY_COUNTDOWN_SECONDS;
  let ticks = 0;
  while (n > 0) {
    n = tickCountdown(n);
    ticks++;
  }
  assert.equal(ticks, 30);
  assert.equal(tickCountdown(0), 0);
});

test("session: next stays inside the group; check is an explicit step", () => {
  const ids = getTopicWords("greetings").map((w) => w.id); // 12 -> 10 + 2
  let s = createSession("greetings", ids, "skipped");
  assert.equal(s.reviewOutcome, "skipped");
  for (let i = 0; i < 20; i++) s = sessionReducer(s, { type: "next" });
  assert.equal(s.wordIndex, 9);
  assert.equal(s.stage, "study");
  s = sessionReducer(s, { type: "prev" });
  assert.equal(s.wordIndex, 8);
  s = sessionReducer(s, { type: "start-check" });
  assert.equal(s.stage, "check");
  assert.equal(sessionReducer(s, { type: "next" }), s);
  s = sessionReducer(s, { type: "finish-check", passed: true });
  s = sessionReducer(s, { type: "next-group" });
  assert.deepEqual([s.groupIndex, s.wordIndex, s.stage], [1, 0, "study"]);
  const last = sessionReducer(sessionReducer(s, { type: "start-check" }), { type: "finish-check", passed: true });
  assert.equal(last.stage, "result");
  assert.equal(sessionReducer(last, { type: "next-group" }), last); // final group
});

test("learning states: viewing never masters; check result sets learned/learning/review", () => {
  assert.equal(markEncountered({}, "a").a, "learning");
  assert.equal(markEncountered({ a: "review" }, "a").a, "review");
  assert.equal(markEncountered({ a: "learned" }, "a").a, "learned");
  const group = ["a", "b", "c", "d", "e"];
  const passed = applyCheckResult({}, group, new Set(["a", "b", "c", "d"]));
  assert.deepEqual(group.map((id) => passed[id]), ["learned", "learned", "learned", "learned", "review"]);
  const failed = applyCheckResult({}, group, new Set(["a", "b", "c"]));
  assert.deepEqual(group.map((id) => failed[id]), ["learning", "learning", "learning", "review", "review"]);
});

test("search: Japanese, kana, romaji and Vietnamese, diacritic-insensitive", () => {
  assert.equal(normalizeSearch("Ōhayō"), "ohayo");
  const hits = (q: string) => searchWords(q, VOCABULARY_WORDS).map((w) => w.surface);
  assert.ok(hits("学校").includes("学校"));
  assert.ok(hits("がくせい").includes("学生"));
  assert.ok(hits("ohayo").includes("おはよう"));
  assert.ok(hits("cam on").includes("ありがとう"));
  assert.ok(hits("Cảm ơn").includes("ありがとう"));
  assert.equal(hits("zzzzqq").length, 0);
  assert.equal(searchWords("  ", VOCABULARY_WORDS).length, VOCABULARY_WORDS.length);
});

test("related words: only authored relations, symmetric, labelled", () => {
  const cheap = VOCABULARY_WORDS.find((w) => w.surface === "安い")!;
  const groups = relatedWords(cheap.id);
  const anto = groups.find((g) => g.type === "antonym");
  assert.equal(anto?.label, "Trái nghĩa");
  assert.deepEqual(anto?.words.map((w) => w.surface), ["高い"]);
  assert.ok(!groups.some((g) => g.type === "synonym"));
  const expensive = VOCABULARY_WORDS.find((w) => w.surface === "高い")!;
  assert.deepEqual(relatedWords(expensive.id).find((g) => g.type === "antonym")?.words.map((w) => w.surface), ["安い"]);
  const lonely = VOCABULARY_WORDS.find((w) => w.surface === "椅子")!;
  assert.deepEqual(relatedWords(lonely.id), []);
});

test("bookmarks are independent from learning progress", () => {
  const progress = createDemoProgress("ten");
  const bookmarks = createDemoBookmarks();
  const target = "school-08";
  assert.equal(stateOf(progress, target), "new");
  assert.ok(bookmarks.has(target));
  const unsaved = toggleBookmark(bookmarks, target);
  assert.ok(!unsaved.has(target));
  assert.ok(bookmarks.has(target), "original set is not mutated");
  assert.equal(stateOf(progress, target), "new");
  const learned = applyCheckResult(progress, ["school-01"], new Set(["school-01"]));
  assert.equal(learned["school-01"], "learned");
  assert.ok(!bookmarks.has("school-01"));
});

test("saved empty state: removing every bookmark yields an empty set", () => {
  let b: ReadonlySet<string> = createDemoBookmarks();
  for (const id of [...b]) b = toggleBookmark(b, id);
  assert.equal(b.size, 0);
  assert.equal(VOCABULARY_WORDS.filter((w) => b.has(w.id)).length, 0);
});

test("demo data consistency: counts add up, seeds reference real words", () => {
  const total = VOCABULARY_TOPICS.reduce((n, t) => n + getTopicWords(t.id).length, 0);
  assert.equal(total, VOCABULARY_WORDS.length);
  const ids = new Set(VOCABULARY_WORDS.map((w) => w.id));
  for (const s of ["few", "ten"] as const) {
    for (const id of Object.keys(createDemoProgress(s))) assert.ok(ids.has(id), id);
  }
  for (const id of createDemoBookmarks()) assert.ok(ids.has(id), id);
});

// ── Phase 1.1 ───────────────────────────────────────────────────────────────

function walk(session: ReturnType<typeof createSession>, actions: ("next" | "prev")[]) {
  return actions.reduce((s, type) => sessionReducer(s, { type }), session);
}

test("study rail: upcoming words expose no content, only a position", () => {
  const words = getTopicWords("school").slice(0, 10);
  const items = railItems(words, 0, 0);
  assert.equal(items[0].kind, "current");
  for (const item of items.slice(1)) {
    assert.equal(item.kind, "upcoming");
    assert.deepEqual(Object.keys(item).sort(), ["kind", "position"]); // no word, surface or meaning
  }
  assert.deepEqual(items.slice(1, 4).map((i) => i.position), [2, 3, 4]);
  const leaked = JSON.stringify(items.slice(1));
  for (const w of words) assert.ok(!leaked.includes(w.meaningVi) && !leaked.includes(w.surface));
});

test("study rail: visited words stay visible when navigating back and forward", () => {
  const ids = getTopicWords("school").map((w) => w.id);
  const words = ids.slice(0, 10).map((id) => getTopicWords("school").find((w) => w.id === id)!);
  let s = walk(createSession("school", ids, "not-required"), ["next", "next", "next"]);
  assert.deepEqual([s.wordIndex, s.furthest], [3, 3]);
  let kinds = railItems(words, s.wordIndex, s.furthest).map((i) => i.kind);
  assert.deepEqual(kinds.slice(0, 5), ["visited", "visited", "visited", "current", "upcoming"]);
  s = walk(s, ["prev", "prev"]);
  assert.deepEqual([s.wordIndex, s.furthest], [1, 3]); // going back does not re-hide visited words
  kinds = railItems(words, s.wordIndex, s.furthest).map((i) => i.kind);
  assert.deepEqual(kinds.slice(0, 5), ["visited", "current", "visited", "visited", "upcoming"]);
  s = walk(s, ["next", "next", "next"]);
  assert.equal(s.furthest, 4);
  // Visiting never marks words learned.
  let progress = {};
  for (const w of words.slice(0, 4)) progress = markEncountered(progress, w.id);
  assert.ok(Object.values(progress).every((v) => v === "learning"));
});

test("study rail: restarting or advancing a group hides words again", () => {
  const ids = getTopicWords("school").map((w) => w.id);
  let s = walk(createSession("school", ids, "not-required"), ["next", "next"]);
  s = sessionReducer(sessionReducer(sessionReducer(s, { type: "start-check" }), { type: "finish-check", passed: true }), { type: "next-group" });
  assert.equal(s.furthest, 0);
});

test("failed check: can continue, group is not marked completed, wrong words stay in review", () => {
  const ids = getTopicWords("school").map((w) => w.id);
  let s = createSession("school", ids, "not-required");
  s = sessionReducer(sessionReducer(s, { type: "start-check" }), { type: "finish-check", passed: false });
  assert.equal(s.groupResults[0], "needs-review");
  assert.deepEqual(s.groupResults.slice(1), [null, null]);
  s = sessionReducer(s, { type: "next-group" }); // continuing is allowed
  assert.equal(s.groupIndex, 1);
  assert.equal(s.groupResults[0], "needs-review"); // still not completed
  const group = s.groups[0];
  const failed = applyCheckResult({}, group, new Set(group.slice(0, 3)));
  for (const id of group.slice(3)) assert.equal(failed[id], "review");
  for (const id of group.slice(0, 3)) assert.notEqual(failed[id], "learned");
  // A passing check still never marks incorrect words learned.
  const passed = applyCheckResult({}, group, new Set(group.slice(0, 8)));
  assert.deepEqual(group.slice(8).map((id) => passed[id]), ["review", "review"]);
  assert.ok(group.slice(0, 8).every((id) => passed[id] === "learned"));
});

test("explore discovery: curated, small, real words, no filters", () => {
  const words = getDiscoveryWords();
  assert.ok(words.length >= 8 && words.length <= 12);
  assert.equal(new Set(words.map((w) => w.id)).size, words.length);
  assert.ok(new Set(words.map((w) => w.topicId)).size >= 5); // spread across topics
  assert.ok(words.some((w) => relatedWords(w.id).length > 0));
});

test("review modal layout contract: bounded height, only the miss list scrolls, text updated", () => {
  const css = readFileSync(join(__dirname, "../../../../src/components/skills/vocabulary/vocabulary-quiz.module.css"), "utf8");
  assert.match(css, /\.modal \{[^}]*max-height: calc\(100dvh - 2rem\)/);
  assert.match(css, /\.missList \{[^}]*overflow-y: auto/);
  assert.match(css, /\.modalBody \{[^}]*min-height: 0/);
  assert.doesNotMatch(css, /\.modalInner \{[^}]*overflow-y: auto/);
  const tsx = readFileSync(join(__dirname, "../../../../src/components/skills/vocabulary/review-modal.tsx"), "utf8");
  assert.match(tsx, /vượt qua phần ôn tập/);
  assert.doesNotMatch(tsx, /bắt đầu bài mới\./);
  // Skip stays available during the countdown: it is never tied to `remaining`.
  assert.match(tsx, /onClick=\{onSkip\}>Bỏ qua và tiếp tục học/);
});
