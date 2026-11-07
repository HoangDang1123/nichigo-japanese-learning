-- V8 proved historical presentation parity. This migration validates every
-- document again before retiring only presentation tables/columns.
CREATE FUNCTION presentation_keys_valid(p_doc JSONB, p_allowed TEXT[]) RETURNS BOOLEAN
LANGUAGE SQL IMMUTABLE AS $$
    SELECT jsonb_typeof(p_doc) = 'object' AND NOT EXISTS (
        SELECT 1 FROM jsonb_object_keys(p_doc) key WHERE NOT key = ANY(p_allowed));
$$;

CREATE FUNCTION validate_lesson_presentation(p_lesson UUID, p_revision INT, p_doc JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE objective JSONB; section JSONB; section_id UUID;
        seen_objectives INT[] := '{}'; seen_sections INT[] := '{}'; seen_ids UUID[] := '{}';
        position_value INT;
BEGIN
    IF NOT presentation_keys_valid(p_doc, ARRAY['schemaVersion','objectives','sections'])
       OR p_doc->>'schemaVersion' <> '1.0'
       OR jsonb_typeof(p_doc->'objectives') <> 'array'
       OR jsonb_typeof(p_doc->'sections') <> 'array'
       OR jsonb_array_length(p_doc->'objectives') > 1000
       OR jsonb_array_length(p_doc->'sections') > 100 THEN
        RAISE EXCEPTION 'invalid lesson presentation' USING ERRCODE='23514';
    END IF;
    FOR objective IN SELECT value FROM jsonb_array_elements(p_doc->'objectives') LOOP
        IF NOT presentation_keys_valid(objective, ARRAY['position','kind','textVi'])
           OR jsonb_typeof(objective->'position') <> 'number'
           OR (objective->>'position') !~ '^[1-9][0-9]*$'
           OR objective->>'kind' NOT IN ('can_do','knowledge')
           OR jsonb_typeof(objective->'textVi') <> 'string'
           OR length(trim(objective->>'textVi')) = 0
           OR length(objective->>'textVi') > 4000 THEN
            RAISE EXCEPTION 'invalid lesson objective' USING ERRCODE='23514';
        END IF;
        position_value := (objective->>'position')::INT;
        IF position_value = ANY(seen_objectives) THEN
            RAISE EXCEPTION 'duplicate lesson objective position' USING ERRCODE='23505';
        END IF;
        seen_objectives := array_append(seen_objectives, position_value);
    END LOOP;
    FOR section IN SELECT value FROM jsonb_array_elements(p_doc->'sections') LOOP
        IF NOT presentation_keys_valid(section, ARRAY['id','position','titleVi'])
           OR jsonb_typeof(section->'id') <> 'string'
           OR jsonb_typeof(section->'position') <> 'number'
           OR (section->>'position') !~ '^[1-9][0-9]*$'
           OR (section ? 'titleVi' AND jsonb_typeof(section->'titleVi') NOT IN ('string','null'))
           OR length(section->>'titleVi') > 4000 THEN
            RAISE EXCEPTION 'invalid lesson section' USING ERRCODE='23514';
        END IF;
        section_id := (section->>'id')::UUID;
        position_value := (section->>'position')::INT;
        IF section_id = ANY(seen_ids) OR position_value = ANY(seen_sections) THEN
            RAISE EXCEPTION 'duplicate lesson section identity or position' USING ERRCODE='23505';
        END IF;
        seen_ids := array_append(seen_ids, section_id);
        seen_sections := array_append(seen_sections, position_value);
    END LOOP;
    IF EXISTS (SELECT 1 FROM lesson_revision_items li
               WHERE li.lesson_id=p_lesson AND li.lesson_revision=p_revision
                 AND NOT li.section_id = ANY(seen_ids))
       OR (SELECT count(*) FROM lesson_revision_items li
           WHERE li.lesson_id=p_lesson AND li.lesson_revision=p_revision) > 1000
       OR (SELECT count(*) FROM lesson_revision_items li
           JOIN content_item_revision_media im ON im.item_id=li.item_id
            AND im.item_revision=li.item_revision
           WHERE li.lesson_id=p_lesson AND li.lesson_revision=p_revision) > 5000 THEN
        RAISE EXCEPTION 'lesson item pin has no layout section or exceeds limit' USING ERRCODE='23514';
    END IF;
    IF EXISTS (
        SELECT 1 FROM lesson_revision_prerequisites lp
        JOIN lessons prerequisite ON prerequisite.id=lp.prerequisite_lesson_id
        WHERE lp.lesson_id=p_lesson AND lp.lesson_revision=p_revision
          AND (prerequisite.published_revision IS NULL OR NOT lesson_revision_public(
               prerequisite.id,prerequisite.published_revision))
    ) THEN
        RAISE EXCEPTION 'lesson prerequisite is unavailable' USING ERRCODE='23514';
    END IF;
    IF EXISTS (
        WITH RECURSIVE walk(target, seen) AS (
            SELECT prerequisite_lesson_id, ARRAY[p_lesson,prerequisite_lesson_id]
            FROM lesson_revision_prerequisites
            WHERE lesson_id=p_lesson AND lesson_revision=p_revision
            UNION ALL
            SELECT next.prerequisite_lesson_id, walk.seen || next.prerequisite_lesson_id
            FROM walk JOIN lessons current_lesson ON current_lesson.id=walk.target
            JOIN lesson_revision_prerequisites next ON next.lesson_id=current_lesson.id
              AND next.lesson_revision=current_lesson.published_revision
            WHERE walk.target <> p_lesson AND
              (NOT next.prerequisite_lesson_id = ANY(walk.seen)
               OR next.prerequisite_lesson_id=p_lesson)
        ) SELECT 1 FROM walk WHERE target=p_lesson
    ) THEN
        RAISE EXCEPTION 'lesson prerequisite cycle' USING ERRCODE='23514';
    END IF;
END;
$$;

CREATE FUNCTION validate_path_presentation(p_path UUID, p_revision INT, p_doc JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE stage JSONB; chapter JSONB; v_stage_id UUID; v_chapter_id UUID;
        stage_positions INT[] := '{}'; stage_ids UUID[] := '{}';
        chapter_positions INT[]; chapter_ids UUID[] := '{}'; position_value INT;
        chapter_total INT := 0;
BEGIN
    IF NOT presentation_keys_valid(p_doc, ARRAY['schemaVersion','stages'])
       OR p_doc->>'schemaVersion' <> '1.0'
       OR jsonb_typeof(p_doc->'stages') <> 'array'
       OR jsonb_array_length(p_doc->'stages') > 100 THEN
        RAISE EXCEPTION 'invalid path presentation' USING ERRCODE='23514';
    END IF;
    FOR stage IN SELECT value FROM jsonb_array_elements(p_doc->'stages') LOOP
        IF NOT presentation_keys_valid(stage, ARRAY['id','position','titleVi','descriptionVi','chapters'])
           OR jsonb_typeof(stage->'id') <> 'string'
           OR jsonb_typeof(stage->'position') <> 'number'
           OR (stage->>'position') !~ '^[1-9][0-9]*$'
           OR jsonb_typeof(stage->'titleVi') <> 'string'
           OR length(trim(stage->>'titleVi')) = 0
           OR length(stage->>'titleVi') > 4000
           OR (stage ? 'descriptionVi' AND jsonb_typeof(stage->'descriptionVi') NOT IN ('string','null'))
           OR jsonb_typeof(stage->'chapters') <> 'array' THEN
            RAISE EXCEPTION 'invalid path stage' USING ERRCODE='23514';
        END IF;
        v_stage_id := (stage->>'id')::UUID;
        position_value := (stage->>'position')::INT;
        IF v_stage_id = ANY(stage_ids) OR position_value = ANY(stage_positions)
           OR NOT EXISTS (SELECT 1 FROM path_revision_stages s
                          WHERE s.path_id=p_path AND s.path_revision=p_revision
                            AND s.stage_id=v_stage_id) THEN
            RAISE EXCEPTION 'duplicate or missing path stage' USING ERRCODE='23514';
        END IF;
        stage_ids := array_append(stage_ids, v_stage_id);
        stage_positions := array_append(stage_positions, position_value);
        chapter_positions := '{}';
        FOR chapter IN SELECT value FROM jsonb_array_elements(stage->'chapters') LOOP
            IF NOT presentation_keys_valid(chapter, ARRAY['id','position','titleVi','descriptionVi'])
               OR jsonb_typeof(chapter->'id') <> 'string'
               OR jsonb_typeof(chapter->'position') <> 'number'
               OR (chapter->>'position') !~ '^[1-9][0-9]*$'
               OR jsonb_typeof(chapter->'titleVi') <> 'string'
               OR length(trim(chapter->>'titleVi')) = 0
               OR length(chapter->>'titleVi') > 4000
               OR (chapter ? 'descriptionVi' AND jsonb_typeof(chapter->'descriptionVi') NOT IN ('string','null')) THEN
                RAISE EXCEPTION 'invalid path chapter' USING ERRCODE='23514';
            END IF;
            v_chapter_id := (chapter->>'id')::UUID;
            position_value := (chapter->>'position')::INT;
            IF v_chapter_id = ANY(chapter_ids) OR position_value = ANY(chapter_positions)
               OR NOT EXISTS (SELECT 1 FROM path_revision_chapters c
                              WHERE c.path_id=p_path AND c.path_revision=p_revision
                                AND c.stage_id=v_stage_id AND c.chapter_id=v_chapter_id) THEN
                RAISE EXCEPTION 'duplicate or missing path chapter' USING ERRCODE='23514';
            END IF;
            chapter_ids := array_append(chapter_ids, v_chapter_id);
            chapter_positions := array_append(chapter_positions, position_value);
            chapter_total := chapter_total + 1;
        END LOOP;
    END LOOP;
    IF cardinality(stage_ids) <> (SELECT count(*) FROM path_revision_stages s
                                  WHERE s.path_id=p_path AND s.path_revision=p_revision)
       OR chapter_total <> (SELECT count(*) FROM path_revision_chapters c
                            WHERE c.path_id=p_path AND c.path_revision=p_revision)
       OR (SELECT count(*) FROM path_revision_lessons pl
           WHERE pl.path_id=p_path AND pl.path_revision=p_revision) > 1000 THEN
        RAISE EXCEPTION 'path presentation omits dependencies or exceeds limit' USING ERRCODE='23514';
    END IF;
END;
$$;

CREATE FUNCTION validate_presentation_before_seal() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.sealed_at IS NULL AND NEW.sealed_at IS NOT NULL THEN
        IF TG_TABLE_NAME='lesson_revisions' THEN
            PERFORM validate_lesson_presentation(NEW.lesson_id, NEW.revision, NEW.presentation);
        ELSE
            PERFORM validate_path_presentation(NEW.path_id, NEW.revision, NEW.presentation);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_presentation BEFORE UPDATE OF sealed_at ON lesson_revisions
    FOR EACH ROW EXECUTE FUNCTION validate_presentation_before_seal();
CREATE TRIGGER validate_presentation BEFORE UPDATE OF sealed_at ON path_revisions
    FOR EACH ROW EXECUTE FUNCTION validate_presentation_before_seal();

-- Validate populated V4-V7 history before replacing the old presentation source.
DO $$ DECLARE row_data RECORD;
BEGIN
    FOR row_data IN SELECT lesson_id, revision, presentation FROM lesson_revisions LOOP
        PERFORM validate_lesson_presentation(row_data.lesson_id,row_data.revision,row_data.presentation);
    END LOOP;
    FOR row_data IN SELECT path_id, revision, presentation FROM path_revisions LOOP
        PERFORM validate_path_presentation(row_data.path_id,row_data.revision,row_data.presentation);
    END LOOP;
END; $$;

-- Section ID remains on the authoritative relational Item pin, while its
-- presentation and order live only in lesson_revisions.presentation.
DO $$ DECLARE fk_name TEXT;
BEGIN
    SELECT con.conname INTO fk_name FROM pg_constraint con
    WHERE con.conrelid='lesson_revision_items'::regclass
      AND con.confrelid='lesson_revision_sections'::regclass AND con.contype='f';
    IF fk_name IS NULL THEN RAISE EXCEPTION 'missing old section foreign key'; END IF;
    EXECUTE format('ALTER TABLE lesson_revision_items DROP CONSTRAINT %I',fk_name);
END; $$;
ALTER TABLE lesson_revision_items ADD CONSTRAINT fk_lesson_item_revision_root
    FOREIGN KEY (lesson_id,lesson_revision) REFERENCES lesson_revisions(lesson_id,revision)
    ON DELETE RESTRICT;
DROP TABLE lesson_revision_objectives;
DROP TABLE lesson_revision_sections;

-- Stage/Chapter rows retain identity, rights and FK protection. JSONB alone
-- owns their title, description and presentation order.
ALTER TABLE path_revision_chapters DROP COLUMN position, DROP COLUMN title_vi,
    DROP COLUMN description_vi;
ALTER TABLE path_revision_stages DROP COLUMN position, DROP COLUMN title_vi,
    DROP COLUMN description_vi;

-- Layout may be assembled after relational pins while the root is unsealed.
-- Once sealed, the existing root guard still rejects all mutation.
CREATE OR REPLACE FUNCTION guard_revision_root() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE rights_status TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.sealed_at IS NOT NULL THEN
            RAISE EXCEPTION 'new revisions must begin unsealed' USING ERRCODE='55000';
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME IN ('lesson_revisions','path_revisions')
        AND OLD.sealed_at IS NULL AND NEW.sealed_at IS NULL
        AND (to_jsonb(OLD) - 'presentation') = (to_jsonb(NEW) - 'presentation') THEN
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND OLD.sealed_at IS NULL AND NEW.sealed_at IS NOT NULL
        AND (to_jsonb(OLD) - 'sealed_at') = (to_jsonb(NEW) - 'sealed_at') THEN
        SELECT clearance_status INTO rights_status FROM content_rights
          WHERE id=NEW.rights_id FOR SHARE;
        IF rights_status <> 'cleared' THEN
            RAISE EXCEPTION 'all publication rights must be cleared before sealing' USING ERRCODE='55000';
        END IF;
        IF TG_TABLE_NAME='content_item_revisions' THEN
            IF EXISTS (SELECT 1 FROM content_item_revision_media im
                       WHERE im.item_id=NEW.item_id AND im.item_revision=NEW.revision
                         AND NOT media_revision_public(im.media_id,im.media_revision)) THEN
                RAISE EXCEPTION 'item references unavailable media' USING ERRCODE='55000';
            END IF;
        ELSIF TG_TABLE_NAME='lesson_revisions' THEN
            IF EXISTS (SELECT 1 FROM lesson_revision_items li
                       WHERE li.lesson_id=NEW.lesson_id AND li.lesson_revision=NEW.revision
                         AND NOT item_revision_public(li.item_id,li.item_revision)) THEN
                RAISE EXCEPTION 'lesson references unavailable items' USING ERRCODE='55000';
            END IF;
        ELSIF TG_TABLE_NAME='path_revisions' THEN
            IF EXISTS (SELECT 1 FROM path_revision_stages s JOIN content_rights r ON r.id=s.rights_id
                       WHERE s.path_id=NEW.path_id AND s.path_revision=NEW.revision
                         AND r.clearance_status <> 'cleared')
               OR EXISTS (SELECT 1 FROM path_revision_chapters c JOIN content_rights r ON r.id=c.rights_id
                          WHERE c.path_id=NEW.path_id AND c.path_revision=NEW.revision
                            AND r.clearance_status <> 'cleared')
               OR EXISTS (SELECT 1 FROM path_revision_lessons pl
                          WHERE pl.path_id=NEW.path_id AND pl.path_revision=NEW.revision
                            AND NOT lesson_revision_public(pl.lesson_id,pl.lesson_revision)) THEN
                RAISE EXCEPTION 'path references unavailable content or rights' USING ERRCODE='55000';
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'published revision roots are immutable except for unsealed layout and sealing'
      USING ERRCODE='55000';
END;
$$;
