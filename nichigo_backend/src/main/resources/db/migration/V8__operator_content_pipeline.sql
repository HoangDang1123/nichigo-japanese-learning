-- JPN-022 adds operator attribution without changing V4-V7 publication history.
-- Failed imports roll back and have no durable batch row; successful batches are immutable.
CREATE TABLE content_import_batches (
    id UUID PRIMARY KEY,
    package_key TEXT NOT NULL,
    package_version TEXT NOT NULL,
    checksum_sha256 CHAR(64) NOT NULL CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
    operator_id TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'applied' CHECK (status = 'applied'),
    error_summary TEXT CHECK (error_summary IS NULL),
    entity_counts JSONB NOT NULL CHECK (jsonb_typeof(entity_counts) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (package_key, package_version)
);

-- An existing editorial identity can be changed by an import only if the same
-- package owns it and its edit_version still equals the last imported value.
CREATE TABLE content_editorial_ownership (
    entity_kind VARCHAR(16) NOT NULL CHECK (entity_kind IN ('media','item','lesson','path')),
    entity_id UUID NOT NULL,
    package_key TEXT NOT NULL,
    last_package_version TEXT NOT NULL,
    last_edit_version BIGINT NOT NULL CHECK (last_edit_version > 0),
    PRIMARY KEY (entity_kind, entity_id)
);
CREATE INDEX ix_content_editorial_ownership_package ON content_editorial_ownership(package_key);

-- Language review is separate from legal Rights clearance. It expires whenever
-- the editable root's version changes; historical approvals are retained.
CREATE TABLE content_language_reviews (
    id UUID PRIMARY KEY,
    entity_kind VARCHAR(16) NOT NULL CHECK (entity_kind IN ('media','item','lesson','path')),
    entity_id UUID NOT NULL,
    edit_version BIGINT NOT NULL CHECK (edit_version > 0),
    reviewer_id TEXT NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (entity_kind, entity_id, edit_version)
);

CREATE TABLE content_rights_review_audit (
    id UUID PRIMARY KEY,
    rights_id UUID NOT NULL REFERENCES content_rights(id) ON DELETE RESTRICT,
    rights_event_id BIGINT NOT NULL UNIQUE REFERENCES content_rights_events(id) ON DELETE RESTRICT,
    operator_id TEXT NOT NULL,
    clearance_status VARCHAR(16) NOT NULL CHECK (clearance_status IN ('cleared','revoked')),
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE content_publication_audit (
    id UUID PRIMARY KEY,
    entity_kind VARCHAR(16) NOT NULL CHECK (entity_kind IN ('media','item','lesson','path')),
    entity_id UUID NOT NULL,
    revision INT NOT NULL CHECK (revision > 0),
    edit_version BIGINT NOT NULL CHECK (edit_version > 0),
    operator_id TEXT NOT NULL,
    selected_pins JSONB NOT NULL CHECK (jsonb_typeof(selected_pins) = 'object'),
    published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (entity_kind, entity_id, revision),
    UNIQUE (entity_kind, entity_id, edit_version)
);
CREATE INDEX ix_content_publication_audit_entity ON content_publication_audit(entity_kind, entity_id, revision DESC);

CREATE FUNCTION reject_content_audit_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'operator audit history is immutable' USING ERRCODE='55000';
END;
$$;
CREATE TRIGGER import_batch_immutable BEFORE UPDATE OR DELETE ON content_import_batches
    FOR EACH ROW EXECUTE FUNCTION reject_content_audit_mutation();
CREATE TRIGGER language_review_immutable BEFORE UPDATE OR DELETE ON content_language_reviews
    FOR EACH ROW EXECUTE FUNCTION reject_content_audit_mutation();
CREATE TRIGGER rights_review_audit_immutable BEFORE UPDATE OR DELETE ON content_rights_review_audit
    FOR EACH ROW EXECUTE FUNCTION reject_content_audit_mutation();
CREATE TRIGGER publication_audit_immutable BEFORE UPDATE OR DELETE ON content_publication_audit
    FOR EACH ROW EXECUTE FUNCTION reject_content_audit_mutation();

-- Import can reorder stable editorial identities in one transaction. Constraints
-- stay immediate for ordinary writers; only the importer explicitly defers them.
ALTER TABLE lesson_sections DROP CONSTRAINT lesson_sections_lesson_id_position_key;
ALTER TABLE lesson_sections ADD CONSTRAINT lesson_sections_lesson_id_position_key
    UNIQUE (lesson_id, position) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE lesson_items DROP CONSTRAINT lesson_items_section_id_position_key;
ALTER TABLE lesson_items ADD CONSTRAINT lesson_items_section_id_position_key
    UNIQUE (section_id, position) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE path_stages DROP CONSTRAINT path_stages_path_id_position_key;
ALTER TABLE path_stages ADD CONSTRAINT path_stages_path_id_position_key
    UNIQUE (path_id, position) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE stage_chapters DROP CONSTRAINT stage_chapters_stage_id_position_key;
ALTER TABLE stage_chapters ADD CONSTRAINT stage_chapters_stage_id_position_key
    UNIQUE (stage_id, position) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE chapter_lessons DROP CONSTRAINT chapter_lessons_chapter_id_position_key;
ALTER TABLE chapter_lessons ADD CONSTRAINT chapter_lessons_chapter_id_position_key
    UNIQUE (chapter_id, position) DEFERRABLE INITIALLY IMMEDIATE;
