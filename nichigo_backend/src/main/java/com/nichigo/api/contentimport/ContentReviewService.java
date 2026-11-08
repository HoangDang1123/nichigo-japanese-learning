package com.nichigo.api.contentimport;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Explicit legal and language review actions. Neither import nor parsing grants approval. */
@Service
public class ContentReviewService {
    private final JdbcTemplate db;
    public ContentReviewService(JdbcTemplate db) { this.db = db; }

    @Transactional
    public long reviewRights(String key, String transition, ContentOperatorAuth.Principal operator) {
        require(operator);
        if (!List.of("cleared","revoked").contains(transition)) throw new IllegalArgumentException("Unsupported Rights transition.");
        List<Map<String,Object>> rows = db.queryForList("SELECT id,clearance_status,origin_kind,source_label,permission_basis,evidence_ref FROM content_rights WHERE stable_key=? FOR UPDATE",key);
        if (rows.size()!=1) throw new IllegalArgumentException("Rights key not found.");
        Map<String,Object> row=rows.getFirst();
        String prior=(String)row.get("clearance_status");
        if (!(prior.equals("unverified")&&transition.equals("cleared") || prior.equals("cleared")&&transition.equals("revoked")))
            throw new IllegalStateException("Invalid Rights transition.");
        if (row.get("source_label")==null || row.get("permission_basis")==null
                || "licensed".equals(row.get("origin_kind")) && row.get("evidence_ref")==null)
            throw new IllegalStateException("Rights provenance is incomplete.");
        UUID id=(UUID)row.get("id");
        db.update("UPDATE content_rights SET clearance_status=?, reviewed_at=CASE WHEN ?='cleared' THEN now() ELSE reviewed_at END,updated_at=now() WHERE id=?",transition,transition,id);
        Long event=db.queryForObject("SELECT max(id) FROM content_rights_events WHERE rights_id=?",Long.class,id);
        db.update("INSERT INTO content_rights_review_audit(id,rights_id,rights_event_id,operator_id,clearance_status) VALUES (?,?,?,?,?)",UUID.randomUUID(),id,event,operator.id(),transition);
        return event;
    }

    @Transactional
    public long reviewLanguage(String kind,String key,long expectedVersion,ContentOperatorAuth.Principal operator) {
        require(operator);
        String table=switch(kind){case "media"->"media_assets";case "item"->"content_items";case "lesson"->"lessons";case "path"->"learning_paths";default->throw new IllegalArgumentException("Unknown content kind.");};
        String column=kind.equals("path")?"slug":"stable_key";
        List<Map<String,Object>> rows=db.queryForList("SELECT id,edit_version FROM "+table+" WHERE "+column+"=? FOR UPDATE",key);
        if (rows.size()!=1 || ((Number)rows.getFirst().get("edit_version")).longValue()!=expectedVersion)
            throw new IllegalStateException("Candidate is absent or stale.");
        UUID id=(UUID)rows.getFirst().get("id");
        db.update("INSERT INTO content_language_reviews(id,entity_kind,entity_id,edit_version,reviewer_id) VALUES (?,?,?,?,?) ON CONFLICT (entity_kind,entity_id,edit_version) DO NOTHING",UUID.randomUUID(),kind,id,expectedVersion,operator.id());
        db.update("UPDATE "+table+" SET editorial_status='reviewed' WHERE id=?",id);
        return expectedVersion;
    }

    static void require(ContentOperatorAuth.Principal operator) {
        if(operator==null) throw new SecurityException("Operator authentication required.");
    }
}
