# JPN-023 — First learning content pilot

## Scope and status

This ticket adds an original, AI-assisted beginner content **draft** in [`content/packages/nichigo-intro-v1`](../../content/packages/nichigo-intro-v1). It uses JPN-021 package schema `1.0` and the existing JPN-022 operator pipeline. It changes no frontend, API, database schema, or historical migration. The pilot is technically tested in a disposable PostgreSQL database; **no qualified human language or Rights review has occurred, and no production release is authorized**. The test-only operator reviews below demonstrate the mechanism, not editorial or legal approval.

Package key `nichigo-intro-v1`, package version `1.0.0`, locale `vi`. Its manifest declares `rights.csv`, `items.csv`, `lessons.json`, and `paths.json`. There is no `media.csv`: no reviewed audio, images, stroke order, or storage metadata exist.

## Inventory and learning structure

| Entity | Count | Detail |
| --- | ---: | --- |
| Path | 1 | `nichigo-beginner-introduction` |
| Stage | 1 | Foundation |
| Chapters | 2 | Hiragana fundamentals; first communication |
| Lessons | 3 | Hiragana vowels; greetings; self-introduction |
| Canonical Items | 14 | 5 kana, 6 vocabulary, 1 grammar, 1 example, 1 dialogue |
| Rights provenance | 1 | `nichigo-intro-original-v1`, imported unverified |
| Media | 0 | Deliberately omitted |

The Path orders `intro-hiragana-vowels` in Chapter 1, then `intro-japanese-greetings` and `intro-self-introduction` in Chapter 2. Lesson 1 asks learners to recognize あ・い・う・え・お and associate them with a/i/u/e/o; it does not claim Hiragana mastery. Lesson 2 distinguishes time-of-day greetings from a polite expression of thanks. Lesson 3 identifies an opening, name sentence, and closing in a short first-meeting exchange. It uses a displayed Katakana personal name without assuming the learner can read Katakana. Lesson 3 lists the greetings lesson as a prerequisite.

Each Item has one stable key. Lesson placements reference those keys and Path placements reference Lesson keys; display positions are separate from identity. The grammar Item and its example reference each other by stable key. The package assigns `introductory` communication level to Lessons only. It makes **no JLPT N5 certification or full-syllabus claim** and contains no blanket JLPT tags.

## Provenance and human review matrix

All pedagogical wording, explanations, and dialogue are newly drafted for this package with AI assistance. The Rights row describes an original *proposal* and explicitly says formal review is pending. Japanese forms and basic usage were cross-checked against these Japan Foundation references, without copying their lesson text, dialogues, exercises, images, or audio:

- **JF-S**: [Irodori Starter, Lesson 1](https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_L01.pdf), for the first five Hiragana vowels and introductory language.
- **JF-W**: [Irodori Starter word list](https://www.irodori.jpf.go.jp/assets/data/wordlist_X.pdf), for the selected common expressions and their beginner contexts.
- **JF-M**: [Marugoto Starter Activities contents](https://marugoto.jpf.go.jp/en/assets/docs/about/starter_activities_contents_en.pdf), for the broad first-meeting/self-introduction context. The package's sample dialogue is original.

The table is an editorial review queue, **not a record of human sign-off**. Every row remains `Pending human Japanese editor`. “Reading” for grammar, examples, and dialogue is an editorial aid; those Item kinds do not have a reading field in schema v1.0.

| Stable key / kind | Japanese; reading | Vietnamese meaning, intended usage and objective | Assumption / source | Review question | Language review |
| --- | --- | --- | --- | --- | --- |
| `hiragana-a` / kana | あ; a | Nhận chữ và ghép âm a. | No earlier script knowledge; JF-S. | Confirm beginner pronunciation guidance. | Pending human editor |
| `hiragana-i` / kana | い; i | Nhận chữ và ghép âm i. | No earlier script knowledge; JF-S. | Confirm beginner pronunciation guidance. | Pending human editor |
| `hiragana-u` / kana | う; u | Nhận chữ và ghép âm u. | No earlier script knowledge; JF-S. | Confirm Vietnamese learner guidance for Japanese /u/. | Pending human editor |
| `hiragana-e` / kana | え; e | Nhận chữ và ghép âm e. | No earlier script knowledge; JF-S. | Confirm beginner pronunciation guidance. | Pending human editor |
| `hiragana-o` / kana | お; o | Nhận chữ và ghép âm o. | No earlier script knowledge; JF-S. | Confirm beginner pronunciation guidance. | Pending human editor |
| `ohayou-gozaimasu` / vocabulary | おはようございます; same kana, `ohayō gozaimasu` | Chào buổi sáng; polite morning greeting, distinct from thanks. | Expression recognition only; JF-W. | Check time-of-day and register wording. | Pending human editor |
| `konnichiwa` / vocabulary | こんにちは; `konnichiwa` | Xin chào ban ngày; final は is pronounced `wa`. | Full Hiragana decoding not required; JF-W. | Check orthographic reading presentation. | Pending human editor |
| `konbanwa` / vocabulary | こんばんは; `konbanwa` | Chào buổi tối; final は is pronounced `wa`. | Full Hiragana decoding not required; JF-W. | Check orthographic reading presentation. | Pending human editor |
| `arigatou-gozaimasu` / vocabulary | ありがとうございます; `arigatō gozaimasu` | Cảm ơn lịch sự, not a time-of-day greeting. | Expression recognition only; JF-W. | Check politeness explanation. | Pending human editor |
| `hajimemashite` / vocabulary | はじめまして; same kana | Opening when first meeting someone. | Greetings lesson as prerequisite; JF-M. | Check first-meeting limitation and Vietnamese gloss. | Pending human editor |
| `yoroshiku-onegaishimasu` / vocabulary | よろしくおねがいします; same kana | Contextual, polite close to a self-introduction; Vietnamese “rất mong được làm quen” is approximate. | First-meeting context; JF-M. | Human editor must approve contextual translation and register. | Pending human editor |
| `watashi-wa-name-desu` / grammar | わたしは［名前］です; `watashi wa [namae] desu` | Simple “Tôi là [tên]” pattern; は is topic particle, pronounced `wa`. | Fixed beginner pattern; JF-M. | Check whether the explanation is appropriately simple. | Pending human editor |
| `watashi-wa-an-desu` / example | わたしはアンです。; `watashi wa An desu` | Original named example applying the pattern. | アン is an illustrative Katakana name, not taught here; JF-M context. | Check natural name rendering and Vietnamese transliteration. | Pending human editor |
| `first-introduction-dialogue` / dialogue | はじめまして。わたしはアンです。…; first-meeting exchange | Original two-person exchange identifies opening, name sentence, and closing. | アン/ビン are illustrative names; JF-M context. | Check natural dialogue, Katakana names, and Vietnamese turns. | Pending human editor |

Open curriculum choices: whether to add pronunciation support, the timing of a full Hiragana/Katakana sequence, whether to teach name spellings before this dialogue, and later vocabulary/grammar coverage. No audio means this package supports visual reading and expression recognition, not listening practice. Future expansions should create reviewed content and media with their own Rights records; they should not turn this pilot into an inferred N5 syllabus.

## Verification in a disposable PostgreSQL 17 database

On 2026-11-08, the package was tested against a local `postgres:17-alpine` container bound to loopback port 55423, database `jpn023`, and dedicated `jpn023_content_test` schema. `DB_URL` explicitly used `currentSchema=jpn023_content_test`. Credentials and operator token were test-only and generated/used locally; no production credential or review evidence was used. A separate `jpn021_suite` schema in the same disposable container ran the backend suite. Flyway applied V1–V8 successfully on a fresh schema. This environment is not a production release target.

| Check | Command or method | Result |
| --- | --- | --- |
| Offline package validation | `.\nichigo_backend\scripts\content-operator.ps1 validate .\content\packages\nichigo-intro-v1` | Exit 0; `valid=true`, zero errors, 21 expected `RIGHTS_REVIEW_REQUIRED` warnings; `publicationReady=false`. |
| Database dry-run | Same operator script, `dry-run`, with isolated `DB_URL` | Exit 0; same validity and expected Rights warnings; no writes. |
| Import and exact retry | Operator `import <package> --confirm`, twice | First `applied`; batch `45fe1e74-e6ac-4ee4-885a-9abe2d1cc3a2`, 14 Items, 3 Lessons, 1 Path, 1 Rights, 0 Media. Retry `already_applied` with the same batch ID and no new entities. |
| Test-only review gates | Operator `rights review` and `language review` | Rights marked `cleared` in the disposable schema; all 14 Items, 3 Lessons, and 1 Path reviewed at edit version 1 by test operator. These actions are **not human approval**. |
| Exact-pin publication | Operator `preview` then `publish` | 14 Item revisions 1, 3 Lesson revisions 1 pinned to their exact Item revisions, and Path revision 1 pinned to exact Lesson revisions. Path publication audit contains all three revision-1 pins. |
| Public HTTP reads | `GET /api/v1/learning-paths`, Path, three Lessons, placement Lessons, and `/skills/{type}/items` | One Path → one Stage → two ordered Chapters → three ordered Lessons; expected Item order and revision 1 throughout. Skills counts: kana 5, vocabulary 6, grammar 1, example 1, dialogue 1. No private Rights/operator fields in Lesson responses. |
| Draft isolation | Imported the repository's synthetic valid sample into same disposable schema, without review/publication | Its Path and Lesson returned 404; public Path list still contained only the pilot. |
| Revocation and immutable history | Test-only Rights `revoked`, then public reads and read-only SQL counts | Public Path list and kana Skills list became empty; direct pilot Path returned 404. The 14 Item, 3 Lesson, and 1 Path revision rows plus 18 publication audit rows remained present. |
| Package integrity | Strict UTF-8, reference, duplicate-key, missing-media and filler-marker script | Passed; all Item/placement/prerequisite references resolve, no replacement characters, no fake media. The `［名前］` marker is an intentional grammar teaching slot. |
| Backend suite | `cd nichigo_backend; .\mvnw.cmd -q verify '-DforkCount=0'` with isolated `DB_URL` and memory-limited JVM | Exit 0; 59 tests, 0 failures, 0 errors, 0 skipped across 11 Surefire reports. The default forked attempt first failed from local native-memory exhaustion; no test assertion failed. |

The JPN-022 CLI is a local operator tool, not an HTTP upload or review API. The walkthrough used its authenticated commands; no manual SQL inserted published revisions. Read-only SQL was used only to inspect counts and migration state. Test-only reviews and publication occurred solely in the disposable database. GitHub Actions status is recorded on the PR, separately from local checks.

## Frontend handoff

Anti's Skills UI can consume **released** data from existing routes: `GET /api/v1/learning-paths`, `GET /api/v1/learning-paths/{slug}`, `GET /api/v1/learning-paths/{pathSlug}/placements/{placementId}/lesson`, `GET /api/v1/lessons/{slug}`, and `GET /api/v1/skills/{type}/items`. Types supported by this pilot are `kana`, `vocabulary`, `grammar`, `example`, and `dialogue`; the Skills listing is keyed by Item kind and currently sorted by stable key, while Lesson and Path placements supply editorial order. The public DTOs are in `PublicContentDtos`; Lessons include objectives, sections, and pinned Item payloads. Do not assume the local test publication exists in production. Until qualified Rights and language review, owner acceptance, and controlled release, the correct UI state is an honest empty/unavailable state. There are no audio, handwriting, quiz, or practice assets from this ticket.

## Completion boundary

Implemented: package and this note. Tested: checks above in a disposable database. Human language review: pending for every Item, all Lesson text, and the Path outline. Human Rights review: pending for the original draft and its source/permission claims. Owner curriculum acceptance: pending. Production publication and release: not performed. Frontend integration and rendered Lesson/Skills UI: assigned separately to Anti.
