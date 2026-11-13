"use client";

import * as React from "react";
import {
  createDemoBookmarks,
  createDemoProgress,
  getTopicWords,
  type DemoScenario,
} from "./vocabulary-data";
import {
  applyCheckResult,
  createSession,
  markEncountered,
  sessionReducer,
  toggleBookmark as toggleBookmarkSet,
  type QuizResult,
  type ReviewOutcome,
  type SessionAction,
  type StudySession,
} from "./vocabulary-logic";
import type { ProgressMap } from "./vocabulary-types";

/**
 * In-memory prototype state shared by every /skills/vocabulary route.
 *
 * Lifetime: this provider is mounted by `app/skills/vocabulary/layout.tsx`, which Next.js
 * keeps mounted across client-side navigation between its child routes (Home, Explore,
 * Saved, Study). State therefore survives in-app navigation and browser Back/Forward,
 * but is reset by a full page load or refresh and when leaving /skills/vocabulary.
 * Nothing is persisted and no API is called.
 *
 * Progress, bookmarks, the active session and the demo scenario stay independent.
 */
interface VocabularyContextValue {
  progress: ProgressMap;
  bookmarks: ReadonlySet<string>;
  scenario: DemoScenario;
  session: StudySession | null;
  checkResult: QuizResult | null;
  setScenario: (s: DemoScenario) => void;
  toggleBookmark: (wordId: string) => void;
  beginSession: (topicId: string, outcome: ReviewOutcome) => void;
  dispatchSession: (action: SessionAction) => void;
  endSession: () => void;
  markViewed: (wordId: string) => void;
  finishCheck: (groupIds: string[], result: QuizResult) => void;
}

const VocabularyContext = React.createContext<VocabularyContextValue | null>(null);

export function VocabularyProvider({ children }: { children: React.ReactNode }) {
  const [scenario, setScenarioState] = React.useState<DemoScenario>("ten");
  const [progress, setProgress] = React.useState<ProgressMap>(() => createDemoProgress("ten"));
  const [bookmarks, setBookmarks] = React.useState<ReadonlySet<string>>(() => createDemoBookmarks());
  const [session, setSession] = React.useState<StudySession | null>(null);
  const [checkResult, setCheckResult] = React.useState<QuizResult | null>(null);

  // Stable callbacks: effects in study views depend on them.
  const setScenario = React.useCallback((next: DemoScenario) => {
    setScenarioState(next);
    setProgress(createDemoProgress(next));
  }, []);
  const toggleBookmark = React.useCallback(
    (wordId: string) => setBookmarks((b) => toggleBookmarkSet(b, wordId)),
    []
  );
  const beginSession = React.useCallback((topicId: string, outcome: ReviewOutcome) => {
    setCheckResult(null);
    setSession(createSession(topicId, getTopicWords(topicId).map((w) => w.id), outcome));
  }, []);
  const dispatchSession = React.useCallback(
    (action: SessionAction) => setSession((s) => (s ? sessionReducer(s, action) : s)),
    []
  );
  const endSession = React.useCallback(() => {
    setSession(null);
    setCheckResult(null);
  }, []);
  const markViewed = React.useCallback(
    (wordId: string) => setProgress((p) => markEncountered(p, wordId)),
    []
  );
  const finishCheck = React.useCallback((groupIds: string[], result: QuizResult) => {
    setProgress((p) => applyCheckResult(p, groupIds, result.correctWordIds));
    setCheckResult(result);
    setSession((s) => (s ? sessionReducer(s, { type: "finish-check", passed: result.passed }) : s));
  }, []);

  const value = React.useMemo<VocabularyContextValue>(
    () => ({
      progress,
      bookmarks,
      scenario,
      session,
      checkResult,
      setScenario,
      toggleBookmark,
      beginSession,
      dispatchSession,
      endSession,
      markViewed,
      finishCheck,
    }),
    [progress, bookmarks, scenario, session, checkResult, setScenario, toggleBookmark, beginSession, dispatchSession, endSession, markViewed, finishCheck]
  );

  return <VocabularyContext.Provider value={value}>{children}</VocabularyContext.Provider>;
}

export function useVocabulary(): VocabularyContextValue {
  const ctx = React.useContext(VocabularyContext);
  if (!ctx) throw new Error("useVocabulary must be used inside VocabularyProvider");
  return ctx;
}
