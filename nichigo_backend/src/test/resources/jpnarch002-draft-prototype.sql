-- Run only after the JPN-020 fixture and V1-V7 in a disposable schema.
-- Each model exercises the same editorial operations and rolls back all writes.
-- This is an architectural comparison, not a production importer/publisher.

-- A: relational working draft. Imported Item 1 is already used by Lesson 1.
BEGIN;
INSERT INTO lessons(id,stable_key,slug,title_vi,rights_id)
VALUES (benchmark_uuid('proto-a-lesson',1),'proto-a-lesson','proto-a-lesson','Draft',benchmark_uuid('rights',0));
INSERT INTO lesson_sections(id,lesson_id,position,stable_key)
VALUES (benchmark_uuid('proto-a-section',1),benchmark_uuid('proto-a-lesson',1),1,'first'),
       (benchmark_uuid('proto-a-section',2),benchmark_uuid('proto-a-lesson',1),2,'second');
INSERT INTO lesson_items(id,section_id,item_id,position)
VALUES (benchmark_uuid('proto-a-entry',1),benchmark_uuid('proto-a-section',1),benchmark_uuid('item',1),1),
       (benchmark_uuid('proto-a-entry',2),benchmark_uuid('proto-a-section',1),benchmark_uuid('item',2),2);
UPDATE content_items SET payload='{"glyph":"edited"}'::jsonb, edit_version=edit_version+1
WHERE id=benchmark_uuid('item',1) AND edit_version=1;
UPDATE lesson_sections SET position=3 WHERE id=benchmark_uuid('proto-a-section',1);
UPDATE lesson_sections SET position=1 WHERE id=benchmark_uuid('proto-a-section',2);
UPDATE lesson_sections SET position=2 WHERE id=benchmark_uuid('proto-a-section',1);
UPDATE lesson_items SET position=3 WHERE id=benchmark_uuid('proto-a-entry',1);
UPDATE lesson_items SET position=1 WHERE id=benchmark_uuid('proto-a-entry',2);
UPDATE lesson_items SET position=2 WHERE id=benchmark_uuid('proto-a-entry',1);
UPDATE chapter_lessons SET position=11
WHERE chapter_id=benchmark_uuid('chapter',1) AND position=1;
INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id)
VALUES (benchmark_uuid('lesson',1),2,'Revised',benchmark_uuid('rights',0));
INSERT INTO lesson_revision_sections(lesson_id,lesson_revision,section_id,position,title_vi)
SELECT lesson_id,2,section_id,position,title_vi FROM lesson_revision_sections
WHERE lesson_id=benchmark_uuid('lesson',1) AND lesson_revision=1;
INSERT INTO lesson_revision_items(lesson_id,lesson_revision,section_id,position,item_id,item_revision)
SELECT lesson_id,2,section_id,position,item_id,item_revision FROM lesson_revision_items
WHERE lesson_id=benchmark_uuid('lesson',1) AND lesson_revision=1;
UPDATE lesson_revisions SET sealed_at=now() WHERE lesson_id=benchmark_uuid('lesson',1) AND revision=2;
UPDATE lessons SET published_revision=2 WHERE id=benchmark_uuid('lesson',1) AND published_revision=1;
SELECT 'relational' AS model,
       (SELECT count(*) FROM lesson_items WHERE section_id=benchmark_uuid('proto-a-section',1)) AS draft_item_refs,
       (SELECT count(*) FROM path_revision_lessons WHERE lesson_id=benchmark_uuid('lesson',1)
        AND lesson_revision=1) AS paths_still_pinning_v1,
       (SELECT published_revision FROM lessons WHERE id=benchmark_uuid('lesson',1)) AS current_lesson_revision;
ROLLBACK;

-- B: JSONB working documents; the same relational published revision remains authoritative.
BEGIN;
CREATE TEMP TABLE draft_documents(subject_type TEXT NOT NULL, subject_id UUID NOT NULL,
    edit_version BIGINT NOT NULL, document JSONB NOT NULL, PRIMARY KEY(subject_type,subject_id)) ON COMMIT DROP;
INSERT INTO lessons(id,stable_key,slug,title_vi,rights_id)
VALUES (benchmark_uuid('proto-b-lesson',1),'proto-b-lesson','proto-b-lesson','Draft',benchmark_uuid('rights',0));
INSERT INTO draft_documents(subject_type,subject_id,edit_version,document)
VALUES ('lesson',benchmark_uuid('proto-b-lesson',1),1,
    '{"sections":[{"key":"first","position":1,"items":[{"position":1,"itemKey":"bench-item-000001"},{"position":2,"itemKey":"bench-item-000002"}]},{"key":"second","position":2,"items":[]}]}'),
    ('path',benchmark_uuid('path',1),1,
    '{"placements":[{"key":"first","position":1,"lessonKey":"bench-lesson-1"}]}');
UPDATE content_items SET payload='{"glyph":"edited"}'::jsonb, edit_version=edit_version+1
WHERE id=benchmark_uuid('item',1) AND edit_version=1;
UPDATE draft_documents SET edit_version=2,
    document='{"sections":[{"key":"second","position":1,"items":[]},{"key":"first","position":2,"items":[{"position":1,"itemKey":"bench-item-000002"},{"position":2,"itemKey":"bench-item-000001"}]}]}'::jsonb
WHERE subject_type='lesson' AND subject_id=benchmark_uuid('proto-b-lesson',1) AND edit_version=1;
UPDATE draft_documents SET edit_version=2,
    document='{"placements":[{"key":"first","position":11,"lessonKey":"bench-lesson-1"}]}'::jsonb
WHERE subject_type='path' AND subject_id=benchmark_uuid('path',1) AND edit_version=1;
INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id)
VALUES (benchmark_uuid('lesson',1),2,'Revised',benchmark_uuid('rights',0));
INSERT INTO lesson_revision_sections(lesson_id,lesson_revision,section_id,position,title_vi)
SELECT lesson_id,2,section_id,position,title_vi FROM lesson_revision_sections
WHERE lesson_id=benchmark_uuid('lesson',1) AND lesson_revision=1;
INSERT INTO lesson_revision_items(lesson_id,lesson_revision,section_id,position,item_id,item_revision)
SELECT lesson_id,2,section_id,position,item_id,item_revision FROM lesson_revision_items
WHERE lesson_id=benchmark_uuid('lesson',1) AND lesson_revision=1;
UPDATE lesson_revisions SET sealed_at=now() WHERE lesson_id=benchmark_uuid('lesson',1) AND revision=2;
UPDATE lessons SET published_revision=2 WHERE id=benchmark_uuid('lesson',1) AND published_revision=1;
SELECT 'jsonb' AS model,
       (SELECT count(*) FROM draft_documents d
        CROSS JOIN LATERAL jsonb_array_elements(d.document->'sections') s
        CROSS JOIN LATERAL jsonb_array_elements(s->'items') i
        WHERE d.subject_type='lesson' AND d.subject_id=benchmark_uuid('proto-b-lesson',1)) AS draft_item_refs,
       (SELECT count(*) FROM path_revision_lessons WHERE lesson_id=benchmark_uuid('lesson',1)
        AND lesson_revision=1) AS paths_still_pinning_v1,
       (SELECT published_revision FROM lessons WHERE id=benchmark_uuid('lesson',1)) AS current_lesson_revision;
ROLLBACK;
