-- Published layout contains presentation only. Exact Item/Lesson/Media pins and
-- Stage/Chapter rights remain relational and are never copied into these documents.
ALTER TABLE lesson_revisions ADD COLUMN presentation JSONB;
ALTER TABLE path_revisions ADD COLUMN presentation JSONB;

-- Existing sealed history is immutable to application writes. Backfill under the
-- migration's DDL lock, then immediately restore the historical guard triggers.
ALTER TABLE lesson_revisions DISABLE TRIGGER guard_revision;
UPDATE lesson_revisions lr SET presentation = jsonb_build_object(
    'schemaVersion', '1.0',
    'objectives', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('position', o.position, 'kind', o.kind,
                                           'textVi', o.text_vi) ORDER BY o.position)
        FROM lesson_revision_objectives o
        WHERE o.lesson_id = lr.lesson_id AND o.lesson_revision = lr.revision
    ), '[]'::jsonb),
    'sections', COALESCE((
        SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', s.section_id,
                                           'position', s.position, 'titleVi', s.title_vi)) ORDER BY s.position)
        FROM lesson_revision_sections s
        WHERE s.lesson_id = lr.lesson_id AND s.lesson_revision = lr.revision
    ), '[]'::jsonb)
);
ALTER TABLE lesson_revisions ENABLE TRIGGER guard_revision;

ALTER TABLE path_revisions DISABLE TRIGGER guard_revision;
UPDATE path_revisions pr SET presentation = jsonb_build_object(
    'schemaVersion', '1.0',
    'stages', COALESCE((
        SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
            'id', s.stage_id, 'position', s.position, 'titleVi', s.title_vi,
            'descriptionVi', s.description_vi,
            'chapters', COALESCE((
                SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                    'id', c.chapter_id, 'position', c.position, 'titleVi', c.title_vi,
                    'descriptionVi', c.description_vi)) ORDER BY c.position)
                FROM path_revision_chapters c
                WHERE c.path_id = s.path_id AND c.path_revision = s.path_revision
                  AND c.stage_id = s.stage_id
            ), '[]'::jsonb))) ORDER BY s.position)
        FROM path_revision_stages s
        WHERE s.path_id = pr.path_id AND s.path_revision = pr.revision
    ), '[]'::jsonb)
);
ALTER TABLE path_revisions ENABLE TRIGGER guard_revision;

ALTER TABLE lesson_revisions ALTER COLUMN presentation SET NOT NULL;
ALTER TABLE path_revisions ALTER COLUMN presentation SET NOT NULL;
ALTER TABLE lesson_revisions ALTER COLUMN presentation SET DEFAULT
    '{"schemaVersion":"1.0","objectives":[],"sections":[]}'::jsonb;
ALTER TABLE path_revisions ALTER COLUMN presentation SET DEFAULT
    '{"schemaVersion":"1.0","stages":[]}'::jsonb;
ALTER TABLE lesson_revisions ADD CONSTRAINT ck_lesson_presentation_object
    CHECK (jsonb_typeof(presentation) = 'object');
ALTER TABLE path_revisions ADD CONSTRAINT ck_path_presentation_object
    CHECK (jsonb_typeof(presentation) = 'object');

-- Fail the migration before any destructive step if the backfill changed counts,
-- positions, titles, or stable Section/Stage/Chapter identities.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM lesson_revisions lr
        WHERE jsonb_array_length(lr.presentation->'objectives') <>
              (SELECT count(*) FROM lesson_revision_objectives o
               WHERE o.lesson_id=lr.lesson_id AND o.lesson_revision=lr.revision)
           OR jsonb_array_length(lr.presentation->'sections') <>
              (SELECT count(*) FROM lesson_revision_sections s
               WHERE s.lesson_id=lr.lesson_id AND s.lesson_revision=lr.revision)
           OR EXISTS (
              SELECT 1 FROM lesson_revision_sections s
              WHERE s.lesson_id=lr.lesson_id AND s.lesson_revision=lr.revision
                AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(lr.presentation->'sections') v
                                WHERE v->>'id'=s.section_id::text
                                  AND (v->>'position')::int=s.position
                                  AND v->>'titleVi' IS NOT DISTINCT FROM s.title_vi))
           OR EXISTS (
              SELECT 1 FROM lesson_revision_objectives o
              WHERE o.lesson_id=lr.lesson_id AND o.lesson_revision=lr.revision
                AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(lr.presentation->'objectives') v
                                WHERE (v->>'position')::int=o.position
                                  AND v->>'kind'=o.kind AND v->>'textVi'=o.text_vi))
    ) THEN RAISE EXCEPTION 'lesson presentation backfill mismatch'; END IF;
    IF EXISTS (
        SELECT 1 FROM path_revisions pr
        WHERE jsonb_array_length(pr.presentation->'stages') <>
              (SELECT count(*) FROM path_revision_stages s
               WHERE s.path_id=pr.path_id AND s.path_revision=pr.revision)
           OR EXISTS (
              SELECT 1 FROM path_revision_stages s
              WHERE s.path_id=pr.path_id AND s.path_revision=pr.revision
                AND NOT EXISTS (
                    SELECT 1 FROM jsonb_array_elements(pr.presentation->'stages') v
                    WHERE v->>'id'=s.stage_id::text AND (v->>'position')::int=s.position
                      AND v->>'titleVi'=s.title_vi
                      AND v->>'descriptionVi' IS NOT DISTINCT FROM s.description_vi
                      AND jsonb_array_length(v->'chapters') =
                          (SELECT count(*) FROM path_revision_chapters c
                           WHERE c.path_id=s.path_id AND c.path_revision=s.path_revision
                             AND c.stage_id=s.stage_id)
                      AND NOT EXISTS (
                          SELECT 1 FROM path_revision_chapters c
                          WHERE c.path_id=s.path_id AND c.path_revision=s.path_revision
                            AND c.stage_id=s.stage_id AND NOT EXISTS (
                                SELECT 1 FROM jsonb_array_elements(v->'chapters') ch
                                WHERE ch->>'id'=c.chapter_id::text
                                  AND (ch->>'position')::int=c.position
                                  AND ch->>'titleVi'=c.title_vi
                                  AND ch->>'descriptionVi' IS NOT DISTINCT FROM c.description_vi))))
    ) THEN RAISE EXCEPTION 'path presentation backfill mismatch'; END IF;
END;
$$;
