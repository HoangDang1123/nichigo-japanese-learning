/** Optional future artwork for an example sentence. The UI is complete without it. */
export interface GrammarIllustration {
  src: string;
  alt: string;
  caption?: string;
}

export interface GrammarCategory {
  id: string;
  titleVi: string;
  titleJa?: string;
  descriptionVi: string;
}

export interface GrammarExample {
  /** Stable id, unique across the whole collection. */
  id: string;
  ja: string;
  vi: string;
  /** Verified Hepburn romaji. Omit when no verified reading exists; never derive it from kanji. */
  romaji?: string;
  illustration?: GrammarIllustration;
}

/** One annotated component of a grammar structure, e.g. a particle or a verb stem. */
export interface GrammarStructurePart {
  text: string;
  /** Vietnamese label explaining the component. */
  noteVi?: string;
}

export interface GrammarStructure {
  parts: GrammarStructurePart[];
  /** Optional Vietnamese remark about the structure as a whole. */
  remarkVi?: string;
}

export type GrammarNoteKind = "usage" | "mistake" | "compare";

export interface GrammarNote {
  kind: GrammarNoteKind;
  textVi: string;
}

export interface GrammarPattern {
  id: string;
  /** Japanese pattern as displayed, e.g. "N1 は N2 です". */
  pattern: string;
  meaningVi: string;
  categoryId: string;
  structure: GrammarStructure;
  /** One entry per paragraph. */
  explanationVi: string[];
  examples: GrammarExample[];
  usageNotes?: GrammarNote[];
  /** Ids of related patterns, declared explicitly. */
  relatedIds?: string[];
}
