# Content Strategy & Learning Model

## Product principle: Learn by Building
Founder learning experience is used to discover friction, create hypotheses, and prioritize features. It is **not** evidence that a personal sequence is pedagogically optimal for all learners. Language facts, examples, pronunciation, and stroke order require credible source checks before publication.

## Proposed stages (not expert-certified)
- Stage 0: orientation, Japanese writing systems, sounds, Hiragana and Katakana.
- Stage 1: greetings, self-introduction, basic sentence structures and context vocabulary.
- Stage 2: foundational N5 vocabulary, grammar, basic kanji, listening/reading.
- Stage 3: N5 consolidation and exam-style practice; full mock tests are post-MVP unless approved.

## Lesson design
A lesson has `objective`, ordered `lesson_items`, optional vocabulary/grammar/kana/kanji/audio/writing segments, short exercise and completion rule. Not every lesson needs every segment. Skills library reuses canonical items.

## First vertical slice
Suggested lesson: Hiragana first set (e.g. あいうえお), sound playback with rights-cleared files or verified alternatives, recognition, optional stroke order visual, 5–10 question quiz, saved progress. **The exact item count and assets are proposed, not approved.**

## Content quality workflow
Draft → source attribution/rights check → language accuracy review → import validation/dry-run → publish → revision audit. Use public/reference resources for verification but do not copy proprietary explanations, images, audio, or stroke assets without rights.

## Metadata requirements
Each content item: stable external ID, language level, type, text/reading/translation, examples (if relevant), source/license attribution, reviewer/review status, publication status, version. Distinguish `N5` from `introductory` where needed.

## Import and publication
CSV for flat content entities; JSON for lessons and nested relationships. Validation must check unique keys, required fields, valid references, accepted kana/kanji formats where applicable, no dangling lesson items, and provenance. Dry-run outputs row-level errors. Publish requires explicit operator action and audited batch ID.

## UX: spotlight tutorial steps (proposed)
1. Highlight main 'Start learning' / learning path CTA.
2. Highlight free skill selection.
3. Highlight lesson continue/progress affordance.
4. Highlight Help / replay tour control.
Each step targets an actual DOM selector/test ID; overlay dims rest of UI; popover arrow anchors to highlighted element; Back/Next/Skip, step indicator/progress; focus and viewport handling. Tour is about **how to use the web**, not an assessment of learner level.
