-- JPN-033: ordered canonical Item relationships with exact published revision pins.
CREATE TABLE content_item_edges (
    source_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
    target_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
    role_code TEXT NOT NULL CHECK (role_code IN ('related-vocabulary', 'example')),
    position INT NOT NULL CHECK (position > 0),
    PRIMARY KEY (source_item_id, role_code, target_item_id),
    UNIQUE (source_item_id, role_code, position),
    CHECK (source_item_id <> target_item_id)
);

CREATE TABLE content_item_revision_edges (
    source_item_id UUID NOT NULL,
    source_revision INT NOT NULL,
    target_item_id UUID NOT NULL,
    target_revision INT NOT NULL,
    role_code TEXT NOT NULL CHECK (role_code IN ('related-vocabulary', 'example')),
    position INT NOT NULL CHECK (position > 0),
    PRIMARY KEY (source_item_id, source_revision, role_code, position),
    UNIQUE (source_item_id, source_revision, role_code, target_item_id),
    FOREIGN KEY (source_item_id, source_revision)
        REFERENCES content_item_revisions(item_id, revision) ON DELETE RESTRICT,
    FOREIGN KEY (target_item_id, target_revision)
        REFERENCES content_item_revisions(item_id, revision) ON DELETE RESTRICT,
    CHECK (source_item_id <> target_item_id)
);
CREATE INDEX ix_item_revision_edges_target ON content_item_revision_edges(target_item_id, target_revision);

CREATE FUNCTION guard_item_edge_kind() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE source_kind TEXT; target_kind TEXT;
BEGIN
    SELECT kind INTO source_kind FROM content_items WHERE id = NEW.source_item_id;
    SELECT kind INTO target_kind FROM content_items WHERE id = NEW.target_item_id;
    IF NOT ((NEW.role_code = 'related-vocabulary' AND source_kind = 'kanji' AND target_kind = 'vocabulary')
        OR (NEW.role_code = 'example' AND source_kind = 'vocabulary' AND target_kind = 'example')) THEN
        RAISE EXCEPTION 'invalid Item relationship kinds' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER item_edge_kind BEFORE INSERT OR UPDATE ON content_item_edges
    FOR EACH ROW EXECUTE FUNCTION guard_item_edge_kind();
CREATE TRIGGER item_revision_edge_kind BEFORE INSERT OR UPDATE ON content_item_revision_edges
    FOR EACH ROW EXECUTE FUNCTION guard_item_edge_kind();
CREATE OR REPLACE FUNCTION guard_revision_child() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE is_unsealed BOOLEAN;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION 'published revision relationships are immutable' USING ERRCODE = '55000';
    END IF;
    IF TG_TABLE_NAME IN ('content_item_revision_tags', 'content_item_revision_media', 'content_item_revision_edges') THEN
        SELECT sealed_at IS NULL INTO is_unsealed FROM content_item_revisions
          WHERE item_id = COALESCE(to_jsonb(NEW)->>'source_item_id', to_jsonb(NEW)->>'item_id')::UUID
            AND revision = COALESCE((to_jsonb(NEW)->>'source_revision')::INT,
                                    (to_jsonb(NEW)->>'item_revision')::INT) FOR UPDATE;
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
CREATE TRIGGER guard_revision BEFORE INSERT OR UPDATE OR DELETE ON content_item_revision_edges
    FOR EACH ROW EXECUTE FUNCTION guard_revision_child();

-- Writing guidance is optional only for Kanji's stroke-order role. Every other
-- pinned Media dependency retains the existing all-or-nothing Rights behavior.
CREATE OR REPLACE FUNCTION item_revision_public(p_item UUID, p_revision INT) RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM content_items i JOIN content_item_revisions ir
          ON ir.item_id = i.id AND ir.revision = p_revision
        JOIN content_rights r ON r.id = ir.rights_id
        WHERE i.id = p_item AND i.withdrawn_at IS NULL AND ir.sealed_at IS NOT NULL
          AND r.clearance_status = 'cleared'
          AND NOT EXISTS (
            SELECT 1 FROM content_item_revision_media im
            JOIN media_asset_revisions mr ON mr.media_id = im.media_id AND mr.revision = im.media_revision
            WHERE im.item_id = i.id AND im.item_revision = ir.revision
              AND NOT (ir.kind = 'kanji' AND im.role_code = 'stroke-order' AND mr.media_kind = 'writing')
              AND NOT media_revision_public(im.media_id, im.media_revision)
          )
    );
$$;

-- V7's set-based Path check also inspects Media directly, so apply the same
-- narrow optional-stroke exception there without changing other Media gates.
CREATE OR REPLACE FUNCTION path_revision_public(p_path UUID, p_revision INT) RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM learning_paths p
        JOIN path_revisions pr ON pr.path_id = p.id AND pr.revision = p_revision
        LEFT JOIN content_rights root_rights ON root_rights.id = pr.rights_id
        WHERE p.id = p_path AND p.withdrawn_at IS NULL
          AND pr.sealed_at IS NOT NULL
          AND root_rights.clearance_status = 'cleared'
          AND NOT EXISTS (
              SELECT 1 FROM path_revision_stages s
              LEFT JOIN content_rights r ON r.id = s.rights_id
              WHERE s.path_id = p.id AND s.path_revision = pr.revision
                AND r.clearance_status IS DISTINCT FROM 'cleared'
          )
          AND NOT EXISTS (
              SELECT 1 FROM path_revision_chapters c
              LEFT JOIN content_rights r ON r.id = c.rights_id
              WHERE c.path_id = p.id AND c.path_revision = pr.revision
                AND r.clearance_status IS DISTINCT FROM 'cleared'
          )
          AND NOT EXISTS (
              SELECT 1 FROM path_revision_lessons pl
              JOIN lessons l ON l.id = pl.lesson_id
              JOIN lesson_revisions lr ON lr.lesson_id = pl.lesson_id
                   AND lr.revision = pl.lesson_revision
              LEFT JOIN content_rights r ON r.id = lr.rights_id
              WHERE pl.path_id = p.id AND pl.path_revision = pr.revision
                AND (l.withdrawn_at IS NOT NULL OR lr.sealed_at IS NULL
                     OR r.clearance_status IS DISTINCT FROM 'cleared')
          )
          AND NOT EXISTS (
              SELECT 1 FROM path_revision_lessons pl
              JOIN lesson_revision_items li ON li.lesson_id = pl.lesson_id
                   AND li.lesson_revision = pl.lesson_revision
              JOIN content_items i ON i.id = li.item_id
              JOIN content_item_revisions ir ON ir.item_id = li.item_id
                   AND ir.revision = li.item_revision
              LEFT JOIN content_rights r ON r.id = ir.rights_id
              WHERE pl.path_id = p.id AND pl.path_revision = pr.revision
                AND (i.withdrawn_at IS NOT NULL OR ir.sealed_at IS NULL
                     OR r.clearance_status IS DISTINCT FROM 'cleared')
          )
          AND NOT EXISTS (
              SELECT 1 FROM path_revision_lessons pl
              JOIN lesson_revision_items li ON li.lesson_id = pl.lesson_id
                   AND li.lesson_revision = pl.lesson_revision
              JOIN content_item_revisions ir ON ir.item_id = li.item_id AND ir.revision = li.item_revision
              JOIN content_item_revision_media im ON im.item_id = li.item_id
                   AND im.item_revision = li.item_revision
              JOIN media_assets m ON m.id = im.media_id
              JOIN media_asset_revisions mr ON mr.media_id = im.media_id
                   AND mr.revision = im.media_revision
              LEFT JOIN content_rights r ON r.id = mr.rights_id
              WHERE pl.path_id = p.id AND pl.path_revision = pr.revision
                AND NOT (ir.kind = 'kanji' AND im.role_code = 'stroke-order' AND mr.media_kind = 'writing')
                AND (m.withdrawn_at IS NOT NULL OR mr.sealed_at IS NULL
                     OR r.clearance_status IS DISTINCT FROM 'cleared')
          )
    );
$$;
