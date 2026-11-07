-- JPN-020: editorial identities and immutable, version-pinned public content.
-- Public APIs read only revision tables. All timestamps are UTC instants.

CREATE TABLE content_rights (
    id UUID PRIMARY KEY,
    origin_kind VARCHAR(16) NOT NULL CHECK (origin_kind IN ('original', 'licensed')),
    source_label TEXT NOT NULL,
    source_url TEXT,
    attribution TEXT NOT NULL,
    permission_basis TEXT NOT NULL,
    evidence_ref TEXT,
    clearance_status VARCHAR(16) NOT NULL DEFAULT 'unverified'
        CHECK (clearance_status IN ('unverified', 'cleared', 'revoked')),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_paths (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title_vi TEXT NOT NULL,
    description_vi TEXT,
    rights_id UUID REFERENCES content_rights(id) ON DELETE RESTRICT,
    editorial_status VARCHAR(16) NOT NULL DEFAULT 'draft'
        CHECK (editorial_status IN ('draft', 'reviewed')),
    edit_version BIGINT NOT NULL DEFAULT 1 CHECK (edit_version > 0),
    published_revision INT CHECK (published_revision > 0),
    withdrawn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE path_stages (
    id UUID PRIMARY KEY,
    path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE RESTRICT,
    stable_key TEXT NOT NULL,
    position INT NOT NULL CHECK (position > 0),
    title_vi TEXT NOT NULL,
    description_vi TEXT,
    rights_id UUID REFERENCES content_rights(id) ON DELETE RESTRICT,
    UNIQUE (path_id, id), UNIQUE (path_id, stable_key), UNIQUE (path_id, position)
);

CREATE TABLE stage_chapters (
    id UUID PRIMARY KEY,
    stage_id UUID NOT NULL REFERENCES path_stages(id) ON DELETE RESTRICT,
    stable_key TEXT NOT NULL,
    position INT NOT NULL CHECK (position > 0),
    title_vi TEXT NOT NULL,
    description_vi TEXT,
    rights_id UUID REFERENCES content_rights(id) ON DELETE RESTRICT,
    UNIQUE (stage_id, id), UNIQUE (stage_id, stable_key), UNIQUE (stage_id, position)
);

CREATE TABLE lessons (
    id UUID PRIMARY KEY,
    stable_key TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    title_vi TEXT NOT NULL,
    summary_vi TEXT,
    rights_id UUID REFERENCES content_rights(id) ON DELETE RESTRICT,
    jlpt_level_code TEXT,
    communication_level_code TEXT,
    editorial_status VARCHAR(16) NOT NULL DEFAULT 'draft'
        CHECK (editorial_status IN ('draft', 'reviewed')),
    edit_version BIGINT NOT NULL DEFAULT 1 CHECK (edit_version > 0),
    published_revision INT CHECK (published_revision > 0),
    withdrawn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chapter_lessons (
    id UUID PRIMARY KEY,
    chapter_id UUID NOT NULL REFERENCES stage_chapters(id) ON DELETE RESTRICT,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
    position INT NOT NULL CHECK (position > 0),
    UNIQUE (chapter_id, lesson_id), UNIQUE (chapter_id, position)
);
CREATE INDEX ix_chapter_lessons_lesson ON chapter_lessons(lesson_id);

CREATE TABLE lesson_prerequisites (
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
    prerequisite_lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
    PRIMARY KEY (lesson_id, prerequisite_lesson_id),
    CHECK (lesson_id <> prerequisite_lesson_id)
);
CREATE INDEX ix_lesson_prerequisites_target ON lesson_prerequisites(prerequisite_lesson_id);

CREATE TABLE lesson_objectives (
    id UUID PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
    position INT NOT NULL CHECK (position > 0),
    kind VARCHAR(16) NOT NULL CHECK (kind IN ('can_do', 'knowledge')),
    text_vi TEXT NOT NULL,
    UNIQUE (lesson_id, position)
);

CREATE TABLE lesson_sections (
    id UUID PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
    position INT NOT NULL CHECK (position > 0),
    title_vi TEXT,
    UNIQUE (lesson_id, position)
);

CREATE TABLE content_items (
    id UUID PRIMARY KEY,
    stable_key TEXT NOT NULL UNIQUE,
    kind VARCHAR(16) NOT NULL CHECK (kind IN ('kana', 'vocabulary', 'grammar', 'kanji', 'example', 'dialogue')),
    display_text_ja TEXT,
    display_text_vi TEXT,
    payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    rights_id UUID REFERENCES content_rights(id) ON DELETE RESTRICT,
    jlpt_level_code TEXT,
    communication_level_code TEXT,
    editorial_status VARCHAR(16) NOT NULL DEFAULT 'draft'
        CHECK (editorial_status IN ('draft', 'reviewed')),
    edit_version BIGINT NOT NULL DEFAULT 1 CHECK (edit_version > 0),
    published_revision INT CHECK (published_revision > 0),
    withdrawn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_content_items_kind_key ON content_items(kind, stable_key);

CREATE TABLE content_item_tags (
    item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
    category VARCHAR(24) NOT NULL CHECK (category IN ('knowledge_domain', 'language_skill', 'topic')),
    code TEXT NOT NULL,
    PRIMARY KEY (item_id, category, code)
);
CREATE INDEX ix_content_item_tags_filter ON content_item_tags(category, code, item_id);

CREATE TABLE lesson_items (
    id UUID PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES lesson_sections(id) ON DELETE RESTRICT,
    item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
    position INT NOT NULL CHECK (position > 0),
    UNIQUE (section_id, position)
);
CREATE INDEX ix_lesson_items_item ON lesson_items(item_id);

CREATE TABLE media_assets (
    id UUID PRIMARY KEY,
    stable_key TEXT NOT NULL UNIQUE,
    media_kind VARCHAR(16) NOT NULL CHECK (media_kind IN ('audio', 'image', 'writing')),
    storage_key TEXT NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    alt_text_vi TEXT,
    transcript_vi TEXT,
    rights_id UUID REFERENCES content_rights(id) ON DELETE RESTRICT,
    editorial_status VARCHAR(16) NOT NULL DEFAULT 'draft'
        CHECK (editorial_status IN ('draft', 'reviewed')),
    edit_version BIGINT NOT NULL DEFAULT 1 CHECK (edit_version > 0),
    published_revision INT CHECK (published_revision > 0),
    withdrawn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE content_item_media (
    id UUID PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
    media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    role_code TEXT NOT NULL,
    position INT NOT NULL CHECK (position > 0),
    UNIQUE (item_id, role_code, position)
);

-- Frozen revisions. Relation tables contain only version-pinned references.
CREATE TABLE media_asset_revisions (
    media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    revision INT NOT NULL CHECK (revision > 0),
    media_kind VARCHAR(16) NOT NULL CHECK (media_kind IN ('audio', 'image', 'writing')),
    storage_key TEXT NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    alt_text_vi TEXT,
    transcript_vi TEXT,
    rights_id UUID NOT NULL REFERENCES content_rights(id) ON DELETE RESTRICT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sealed_at TIMESTAMPTZ,
    PRIMARY KEY (media_id, revision)
);
CREATE UNIQUE INDEX ux_media_revision_storage_key ON media_asset_revisions(storage_key);

CREATE TABLE content_item_revisions (
    item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
    revision INT NOT NULL CHECK (revision > 0),
    kind VARCHAR(16) NOT NULL CHECK (kind IN ('kana', 'vocabulary', 'grammar', 'kanji', 'example', 'dialogue')),
    display_text_ja TEXT,
    display_text_vi TEXT,
    payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    jlpt_level_code TEXT,
    communication_level_code TEXT,
    rights_id UUID NOT NULL REFERENCES content_rights(id) ON DELETE RESTRICT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sealed_at TIMESTAMPTZ,
    PRIMARY KEY (item_id, revision)
);
CREATE INDEX ix_item_revisions_kind ON content_item_revisions(kind, item_id, revision);

CREATE TABLE content_item_revision_tags (
    item_id UUID NOT NULL,
    item_revision INT NOT NULL,
    category VARCHAR(24) NOT NULL CHECK (category IN ('knowledge_domain', 'language_skill', 'topic')),
    code TEXT NOT NULL,
    PRIMARY KEY (item_id, item_revision, category, code),
    FOREIGN KEY (item_id, item_revision) REFERENCES content_item_revisions(item_id, revision) ON DELETE RESTRICT
);
CREATE INDEX ix_item_revision_tags_filter ON content_item_revision_tags(category, code, item_id, item_revision);

CREATE TABLE content_item_revision_media (
    item_id UUID NOT NULL,
    item_revision INT NOT NULL,
    position INT NOT NULL CHECK (position > 0),
    role_code TEXT NOT NULL,
    media_id UUID NOT NULL,
    media_revision INT NOT NULL,
    PRIMARY KEY (item_id, item_revision, position),
    FOREIGN KEY (item_id, item_revision) REFERENCES content_item_revisions(item_id, revision) ON DELETE RESTRICT,
    FOREIGN KEY (media_id, media_revision) REFERENCES media_asset_revisions(media_id, revision) ON DELETE RESTRICT
);
CREATE INDEX ix_item_revision_media_target ON content_item_revision_media(media_id, media_revision);

CREATE TABLE lesson_revisions (
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
    revision INT NOT NULL CHECK (revision > 0),
    title_vi TEXT NOT NULL,
    summary_vi TEXT,
    jlpt_level_code TEXT,
    communication_level_code TEXT,
    rights_id UUID NOT NULL REFERENCES content_rights(id) ON DELETE RESTRICT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sealed_at TIMESTAMPTZ,
    PRIMARY KEY (lesson_id, revision)
);

CREATE TABLE lesson_revision_objectives (
    lesson_id UUID NOT NULL,
    lesson_revision INT NOT NULL,
    position INT NOT NULL CHECK (position > 0),
    kind VARCHAR(16) NOT NULL CHECK (kind IN ('can_do', 'knowledge')),
    text_vi TEXT NOT NULL,
    PRIMARY KEY (lesson_id, lesson_revision, position),
    FOREIGN KEY (lesson_id, lesson_revision) REFERENCES lesson_revisions(lesson_id, revision) ON DELETE RESTRICT
);

CREATE TABLE lesson_revision_sections (
    lesson_id UUID NOT NULL,
    lesson_revision INT NOT NULL,
    section_id UUID NOT NULL,
    position INT NOT NULL CHECK (position > 0),
    title_vi TEXT,
    PRIMARY KEY (lesson_id, lesson_revision, section_id),
    UNIQUE (lesson_id, lesson_revision, position),
    FOREIGN KEY (lesson_id, lesson_revision) REFERENCES lesson_revisions(lesson_id, revision) ON DELETE RESTRICT
);

CREATE TABLE lesson_revision_items (
    lesson_id UUID NOT NULL,
    lesson_revision INT NOT NULL,
    section_id UUID NOT NULL,
    position INT NOT NULL CHECK (position > 0),
    item_id UUID NOT NULL,
    item_revision INT NOT NULL,
    PRIMARY KEY (lesson_id, lesson_revision, section_id, position),
    FOREIGN KEY (lesson_id, lesson_revision, section_id)
        REFERENCES lesson_revision_sections(lesson_id, lesson_revision, section_id) ON DELETE RESTRICT,
    FOREIGN KEY (item_id, item_revision)
        REFERENCES content_item_revisions(item_id, revision) ON DELETE RESTRICT
);
CREATE INDEX ix_lesson_revision_items_target ON lesson_revision_items(item_id, item_revision);

CREATE TABLE lesson_revision_prerequisites (
    lesson_id UUID NOT NULL,
    lesson_revision INT NOT NULL,
    prerequisite_lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
    PRIMARY KEY (lesson_id, lesson_revision, prerequisite_lesson_id),
    FOREIGN KEY (lesson_id, lesson_revision) REFERENCES lesson_revisions(lesson_id, revision) ON DELETE RESTRICT,
    CHECK (lesson_id <> prerequisite_lesson_id)
);

CREATE TABLE path_revisions (
    path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE RESTRICT,
    revision INT NOT NULL CHECK (revision > 0),
    title_vi TEXT NOT NULL,
    description_vi TEXT,
    rights_id UUID NOT NULL REFERENCES content_rights(id) ON DELETE RESTRICT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sealed_at TIMESTAMPTZ,
    PRIMARY KEY (path_id, revision)
);

CREATE TABLE path_revision_stages (
    path_id UUID NOT NULL,
    path_revision INT NOT NULL,
    stage_id UUID NOT NULL,
    position INT NOT NULL CHECK (position > 0),
    title_vi TEXT NOT NULL,
    description_vi TEXT,
    rights_id UUID NOT NULL REFERENCES content_rights(id) ON DELETE RESTRICT,
    PRIMARY KEY (path_id, path_revision, stage_id),
    UNIQUE (path_id, path_revision, position),
    FOREIGN KEY (path_id, path_revision) REFERENCES path_revisions(path_id, revision) ON DELETE RESTRICT,
    FOREIGN KEY (path_id, stage_id) REFERENCES path_stages(path_id, id) ON DELETE RESTRICT
);

CREATE TABLE path_revision_chapters (
    path_id UUID NOT NULL,
    path_revision INT NOT NULL,
    stage_id UUID NOT NULL,
    chapter_id UUID NOT NULL,
    position INT NOT NULL CHECK (position > 0),
    title_vi TEXT NOT NULL,
    description_vi TEXT,
    rights_id UUID NOT NULL REFERENCES content_rights(id) ON DELETE RESTRICT,
    PRIMARY KEY (path_id, path_revision, chapter_id),
    UNIQUE (path_id, path_revision, stage_id, position),
    UNIQUE (path_id, path_revision, stage_id, chapter_id),
    FOREIGN KEY (path_id, path_revision, stage_id)
        REFERENCES path_revision_stages(path_id, path_revision, stage_id) ON DELETE RESTRICT,
    FOREIGN KEY (stage_id, chapter_id) REFERENCES stage_chapters(stage_id, id) ON DELETE RESTRICT
);

CREATE TABLE path_revision_lessons (
    path_id UUID NOT NULL,
    path_revision INT NOT NULL,
    chapter_id UUID NOT NULL,
    position INT NOT NULL CHECK (position > 0),
    placement_id UUID NOT NULL REFERENCES chapter_lessons(id) ON DELETE RESTRICT,
    lesson_id UUID NOT NULL,
    lesson_revision INT NOT NULL,
    PRIMARY KEY (path_id, path_revision, chapter_id, position),
    UNIQUE (path_id, path_revision, placement_id),
    FOREIGN KEY (path_id, path_revision, chapter_id)
        REFERENCES path_revision_chapters(path_id, path_revision, chapter_id) ON DELETE RESTRICT,
    FOREIGN KEY (lesson_id, lesson_revision) REFERENCES lesson_revisions(lesson_id, revision) ON DELETE RESTRICT
);
CREATE INDEX ix_path_revision_lessons_target ON path_revision_lessons(lesson_id, lesson_revision);
ALTER TABLE chapter_lessons ADD CONSTRAINT uq_chapter_lesson_identity
    UNIQUE (id, chapter_id, lesson_id);
ALTER TABLE path_revision_lessons ADD CONSTRAINT fk_pinned_placement_identity
    FOREIGN KEY (placement_id, chapter_id, lesson_id)
    REFERENCES chapter_lessons(id, chapter_id, lesson_id) ON DELETE RESTRICT;

-- Pointers are added after revisions to avoid circular table-creation dependencies.
ALTER TABLE learning_paths ADD CONSTRAINT fk_path_publication
    FOREIGN KEY (id, published_revision) REFERENCES path_revisions(path_id, revision) ON DELETE RESTRICT;
ALTER TABLE lessons ADD CONSTRAINT fk_lesson_publication
    FOREIGN KEY (id, published_revision) REFERENCES lesson_revisions(lesson_id, revision) ON DELETE RESTRICT;
ALTER TABLE content_items ADD CONSTRAINT fk_item_publication
    FOREIGN KEY (id, published_revision) REFERENCES content_item_revisions(item_id, revision) ON DELETE RESTRICT;
ALTER TABLE media_assets ADD CONSTRAINT fk_media_publication
    FOREIGN KEY (id, published_revision) REFERENCES media_asset_revisions(media_id, revision) ON DELETE RESTRICT;

-- A revision is assembled inside one transaction, then sealed before its root pointer moves.
-- This allows JPN-022 to create related rows without allowing later insertion into history.
CREATE FUNCTION guard_revision_root() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE rights_status TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.sealed_at IS NOT NULL THEN
            RAISE EXCEPTION 'new revisions must begin unsealed' USING ERRCODE = '55000';
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND OLD.sealed_at IS NULL AND NEW.sealed_at IS NOT NULL
        AND (to_jsonb(OLD) - 'sealed_at') = (to_jsonb(NEW) - 'sealed_at') THEN
        SELECT clearance_status INTO rights_status FROM content_rights
          WHERE id = NEW.rights_id FOR SHARE;
        IF rights_status <> 'cleared' THEN
            RAISE EXCEPTION 'all publication rights must be cleared before sealing'
              USING ERRCODE = '55000';
        END IF;
        IF TG_TABLE_NAME = 'content_item_revisions' THEN
            IF EXISTS (
                SELECT 1 FROM content_item_revision_media im
                WHERE im.item_id = NEW.item_id AND im.item_revision = NEW.revision
                  AND NOT media_revision_public(im.media_id, im.media_revision)
            ) THEN
                RAISE EXCEPTION 'item references unavailable media' USING ERRCODE = '55000';
            END IF;
        ELSIF TG_TABLE_NAME = 'lesson_revisions' THEN
            IF EXISTS (
                SELECT 1 FROM lesson_revision_items li
                WHERE li.lesson_id = NEW.lesson_id AND li.lesson_revision = NEW.revision
                  AND NOT item_revision_public(li.item_id, li.item_revision)
            ) THEN
                RAISE EXCEPTION 'lesson references unavailable items' USING ERRCODE = '55000';
            END IF;
        ELSIF TG_TABLE_NAME = 'path_revisions' THEN
            IF EXISTS (SELECT 1 FROM path_revision_stages s JOIN content_rights r ON r.id = s.rights_id
                       WHERE s.path_id = NEW.path_id AND s.path_revision = NEW.revision
                         AND r.clearance_status <> 'cleared')
               OR EXISTS (SELECT 1 FROM path_revision_chapters c JOIN content_rights r ON r.id = c.rights_id
                          WHERE c.path_id = NEW.path_id AND c.path_revision = NEW.revision
                            AND r.clearance_status <> 'cleared')
               OR EXISTS (SELECT 1 FROM path_revision_lessons pl
                          WHERE pl.path_id = NEW.path_id AND pl.path_revision = NEW.revision
                            AND NOT lesson_revision_public(pl.lesson_id, pl.lesson_revision)) THEN
                RAISE EXCEPTION 'path references unavailable content or rights'
                  USING ERRCODE = '55000';
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'published revision roots are immutable except for sealing' USING ERRCODE = '55000';
END;
$$;

DO $$
DECLARE table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['media_asset_revisions', 'content_item_revisions',
        'lesson_revisions', 'path_revisions'] LOOP
        EXECUTE format('CREATE TRIGGER guard_revision BEFORE INSERT OR UPDATE OR DELETE ON %I '
            || 'FOR EACH ROW EXECUTE FUNCTION guard_revision_root()', table_name);
    END LOOP;
END;
$$;

CREATE FUNCTION guard_revision_child() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE is_unsealed BOOLEAN;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION 'published revision relationships are immutable' USING ERRCODE = '55000';
    END IF;
    IF TG_TABLE_NAME IN ('content_item_revision_tags', 'content_item_revision_media') THEN
        SELECT sealed_at IS NULL INTO is_unsealed FROM content_item_revisions
          WHERE item_id = NEW.item_id AND revision = NEW.item_revision FOR UPDATE;
    ELSIF TG_TABLE_NAME IN ('lesson_revision_objectives', 'lesson_revision_sections',
                            'lesson_revision_items', 'lesson_revision_prerequisites') THEN
        SELECT sealed_at IS NULL INTO is_unsealed FROM lesson_revisions
          WHERE lesson_id = NEW.lesson_id AND revision = NEW.lesson_revision FOR UPDATE;
    ELSE
        SELECT sealed_at IS NULL INTO is_unsealed FROM path_revisions
          WHERE path_id = NEW.path_id AND revision = NEW.path_revision FOR UPDATE;
    END IF;
    IF is_unsealed IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'revision must be unsealed to add relationships' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

DO $$
DECLARE table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'content_item_revision_tags', 'content_item_revision_media',
        'lesson_revision_objectives', 'lesson_revision_sections',
        'lesson_revision_items', 'lesson_revision_prerequisites',
        'path_revision_stages', 'path_revision_chapters', 'path_revision_lessons'
    ] LOOP
        EXECUTE format('CREATE TRIGGER guard_revision BEFORE INSERT OR UPDATE OR DELETE ON %I '
            || 'FOR EACH ROW EXECUTE FUNCTION guard_revision_child()', table_name);
    END LOOP;
END;
$$;

CREATE FUNCTION require_sealed_publication() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE is_sealed BOOLEAN;
BEGIN
    IF NEW.published_revision IS NULL OR
       (TG_OP = 'UPDATE' AND NEW.published_revision IS NOT DISTINCT FROM OLD.published_revision) THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.published_revision IS NOT NULL
       AND NEW.published_revision <= OLD.published_revision THEN
        RAISE EXCEPTION 'public revision pointers must advance' USING ERRCODE = '55000';
    END IF;
    IF TG_TABLE_NAME = 'learning_paths' THEN
        SELECT sealed_at IS NOT NULL INTO is_sealed FROM path_revisions
          WHERE path_id = NEW.id AND revision = NEW.published_revision;
    ELSIF TG_TABLE_NAME = 'lessons' THEN
        SELECT sealed_at IS NOT NULL INTO is_sealed FROM lesson_revisions
          WHERE lesson_id = NEW.id AND revision = NEW.published_revision;
    ELSIF TG_TABLE_NAME = 'content_items' THEN
        SELECT sealed_at IS NOT NULL INTO is_sealed FROM content_item_revisions
          WHERE item_id = NEW.id AND revision = NEW.published_revision;
    ELSE
        SELECT sealed_at IS NOT NULL INTO is_sealed FROM media_asset_revisions
          WHERE media_id = NEW.id AND revision = NEW.published_revision;
    END IF;
    IF is_sealed IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'public pointer requires a sealed revision of the same subject'
          USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

DO $$
DECLARE table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['learning_paths', 'lessons', 'content_items', 'media_assets'] LOOP
        EXECUTE format('CREATE TRIGGER sealed_public_pointer BEFORE INSERT OR UPDATE ON %I '
            || 'FOR EACH ROW EXECUTE FUNCTION require_sealed_publication()', table_name);
    END LOOP;
END;
$$;

CREATE FUNCTION reject_rights_reapproval() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.clearance_status = 'revoked' AND NEW.clearance_status <> 'revoked' THEN
        RAISE EXCEPTION 'revoked rights require a new review record' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER rights_no_silent_reapproval BEFORE UPDATE ON content_rights
    FOR EACH ROW EXECUTE FUNCTION reject_rights_reapproval();

-- Eligibility checks use exact revision dependencies; no draft table is a public source.
CREATE FUNCTION media_revision_public(p_media UUID, p_revision INT) RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM media_assets m JOIN media_asset_revisions mr
          ON mr.media_id = m.id AND mr.revision = p_revision
        JOIN content_rights r ON r.id = mr.rights_id
        WHERE m.id = p_media AND m.withdrawn_at IS NULL AND mr.sealed_at IS NOT NULL
          AND r.clearance_status = 'cleared'
    );
$$;

CREATE FUNCTION item_revision_public(p_item UUID, p_revision INT) RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM content_items i JOIN content_item_revisions ir
          ON ir.item_id = i.id AND ir.revision = p_revision
        JOIN content_rights r ON r.id = ir.rights_id
        WHERE i.id = p_item AND i.withdrawn_at IS NULL AND ir.sealed_at IS NOT NULL
          AND r.clearance_status = 'cleared'
          AND NOT EXISTS (
            SELECT 1 FROM content_item_revision_media im
            WHERE im.item_id = i.id AND im.item_revision = ir.revision
              AND NOT media_revision_public(im.media_id, im.media_revision)
          )
    );
$$;

CREATE FUNCTION lesson_revision_public(p_lesson UUID, p_revision INT) RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM lessons l JOIN lesson_revisions lr
          ON lr.lesson_id = l.id AND lr.revision = p_revision
        JOIN content_rights r ON r.id = lr.rights_id
        WHERE l.id = p_lesson AND l.withdrawn_at IS NULL AND lr.sealed_at IS NOT NULL
          AND r.clearance_status = 'cleared'
          AND NOT EXISTS (
            SELECT 1 FROM lesson_revision_items li
            WHERE li.lesson_id = l.id AND li.lesson_revision = lr.revision
              AND NOT item_revision_public(li.item_id, li.item_revision)
          )
    );
$$;

CREATE FUNCTION path_revision_public(p_path UUID, p_revision INT) RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM learning_paths p JOIN path_revisions pr
          ON pr.path_id = p.id AND pr.revision = p_revision
        JOIN content_rights r ON r.id = pr.rights_id
        WHERE p.id = p_path AND p.withdrawn_at IS NULL AND pr.sealed_at IS NOT NULL
          AND r.clearance_status = 'cleared'
          AND NOT EXISTS (
            SELECT 1 FROM path_revision_stages s JOIN content_rights sr ON sr.id = s.rights_id
            WHERE s.path_id = p.id AND s.path_revision = pr.revision
              AND sr.clearance_status <> 'cleared'
          )
          AND NOT EXISTS (
            SELECT 1 FROM path_revision_chapters c JOIN content_rights cr ON cr.id = c.rights_id
            WHERE c.path_id = p.id AND c.path_revision = pr.revision
              AND cr.clearance_status <> 'cleared'
          )
          AND NOT EXISTS (
            SELECT 1 FROM path_revision_lessons pl
            WHERE pl.path_id = p.id AND pl.path_revision = pr.revision
              AND NOT lesson_revision_public(pl.lesson_id, pl.lesson_revision)
          )
    );
$$;
