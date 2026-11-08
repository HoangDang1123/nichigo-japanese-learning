-- A reviewed rights record is evidence for every revision that references it.
-- Preserve its reviewed metadata and record every clearance transition.
CREATE TABLE content_rights_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rights_id UUID NOT NULL REFERENCES content_rights(id) ON DELETE RESTRICT,
    clearance_status VARCHAR(16) NOT NULL CHECK (clearance_status IN ('unverified', 'cleared', 'revoked')),
    provenance JSONB NOT NULL CHECK (jsonb_typeof(provenance) = 'object'),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_content_rights_events_rights ON content_rights_events(rights_id, id);

CREATE FUNCTION guard_reviewed_rights() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.clearance_status IN ('cleared', 'revoked') AND
       (OLD.stable_key, OLD.origin_kind, OLD.source_label, OLD.source_url, OLD.attribution,
        OLD.permission_basis, OLD.evidence_ref, OLD.reviewed_at)
       IS DISTINCT FROM
       (NEW.stable_key, NEW.origin_kind, NEW.source_label, NEW.source_url, NEW.attribution,
        NEW.permission_basis, NEW.evidence_ref, NEW.reviewed_at) THEN
        RAISE EXCEPTION 'reviewed rights provenance is immutable; create a new rights record'
          USING ERRCODE = '55000';
    END IF;
    IF OLD.clearance_status = 'cleared' AND NEW.clearance_status NOT IN ('cleared', 'revoked') THEN
        RAISE EXCEPTION 'cleared rights may only remain cleared or be revoked'
          USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER rights_reviewed_provenance BEFORE UPDATE ON content_rights
    FOR EACH ROW EXECUTE FUNCTION guard_reviewed_rights();

CREATE FUNCTION record_rights_event() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.clearance_status IS DISTINCT FROM OLD.clearance_status THEN
        INSERT INTO content_rights_events(rights_id, clearance_status, provenance)
        VALUES (NEW.id, NEW.clearance_status,
                jsonb_build_object('stableKey', NEW.stable_key,
                  'originKind', NEW.origin_kind, 'sourceLabel', NEW.source_label,
                  'sourceUrl', NEW.source_url, 'attribution', NEW.attribution,
                  'permissionBasis', NEW.permission_basis, 'evidenceRef', NEW.evidence_ref,
                  'reviewedAt', NEW.reviewed_at));
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER rights_record_event AFTER INSERT OR UPDATE ON content_rights
    FOR EACH ROW EXECUTE FUNCTION record_rights_event();

CREATE FUNCTION reject_rights_event_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'rights history is immutable' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER rights_history_immutable BEFORE UPDATE OR DELETE ON content_rights_events
    FOR EACH ROW EXECUTE FUNCTION reject_rights_event_mutation();

-- Existing V4/V5 rows predate event capture; preserve their present evidence as a baseline.
INSERT INTO content_rights_events(rights_id, clearance_status, provenance)
SELECT id, clearance_status,
       jsonb_build_object('stableKey', stable_key,
         'originKind', origin_kind, 'sourceLabel', source_label,
         'sourceUrl', source_url, 'attribution', attribution,
         'permissionBasis', permission_basis, 'evidenceRef', evidence_ref,
         'reviewedAt', reviewed_at)
FROM content_rights;
