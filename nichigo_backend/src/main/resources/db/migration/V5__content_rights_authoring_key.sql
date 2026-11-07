-- JPN-021: optional stable authoring key for resolving existing rights records.
-- Legacy V4 records remain addressable by UUID internally but cannot be selected by an import key.
ALTER TABLE content_rights ADD COLUMN stable_key TEXT;
ALTER TABLE content_rights ADD CONSTRAINT ck_content_rights_stable_key
    CHECK (stable_key IS NULL OR stable_key ~ '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$');
CREATE UNIQUE INDEX ux_content_rights_stable_key ON content_rights(stable_key)
    WHERE stable_key IS NOT NULL;

-- Stable section/placement keys are needed to reconcile reordered imports without
-- treating a presentation position or a generated UUID as the authoring identity.
ALTER TABLE lesson_sections ADD COLUMN stable_key TEXT;
ALTER TABLE lesson_sections ADD CONSTRAINT ck_lesson_sections_stable_key
    CHECK (stable_key IS NULL OR stable_key ~ '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$');
CREATE UNIQUE INDEX ux_lesson_sections_authoring_key ON lesson_sections(lesson_id, stable_key)
    WHERE stable_key IS NOT NULL;

ALTER TABLE chapter_lessons ADD COLUMN stable_key TEXT;
ALTER TABLE chapter_lessons ADD CONSTRAINT ck_chapter_lessons_stable_key
    CHECK (stable_key IS NULL OR stable_key ~ '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$');
CREATE UNIQUE INDEX ux_chapter_lessons_authoring_key ON chapter_lessons(chapter_id, stable_key)
    WHERE stable_key IS NOT NULL;
