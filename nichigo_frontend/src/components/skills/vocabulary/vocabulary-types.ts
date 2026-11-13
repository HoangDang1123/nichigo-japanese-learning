/**
 * Vocabulary prototype types (frontend-only, demo data).
 * Word content, learning progress, bookmarks and quiz/session state are
 * deliberately separate models and must never be conflated.
 */

/** Learning state of one word. `new` = never studied. */
export type LearningState = "new" | "learning" | "review" | "learned";

/** Static word content. Contains no progress or bookmark information. */
export interface VocabularyWord {
  id: string;
  topicId: string;
  /** Written form (may contain kanji). */
  surface: string;
  /** Kana reading. */
  reading: string;
  /** Standard (Hepburn) romaji. Not IPA. */
  romaji: string;
  meaningVi: string;
  partOfSpeech?: string;
  exampleJa: string;
  exampleVi: string;
  /**
   * Curated Hepburn rōmaji of the WHOLE example sentence. Optional: only present where the
   * reading was checked by hand. Never generated from kanji; absent = no reading toggle.
   */
  exampleRomaji?: string;
}

export interface VocabularyTopic {
  id: string;
  title: string;
  titleJa: string;
  description: string;
}

export type RelationType = "same-topic" | "collocation" | "synonym" | "antonym";

/** Hand-authored pair; displayed symmetrically from either word. */
export interface VocabularyRelation {
  a: string;
  b: string;
  type: RelationType;
}

/** Learning progress keyed by word id (absent = `new`). */
export type ProgressMap = Readonly<Record<string, LearningState>>;

/** Bookmark state, independent from progress. */
export type BookmarkSet = ReadonlySet<string>;

export interface QuizQuestion {
  wordId: string;
  prompt: string;
  promptReading?: string;
  choices: { id: string; label: string }[];
  correctIndex: number;
}
