package com.nichigo.api.content;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class SkillsContentRepository {
    private static final String PUBLIC_ITEMS = """
            FROM content_items i JOIN content_item_revisions r
              ON r.item_id = i.id AND r.revision = i.published_revision
            WHERE r.kind IN ('kana', 'vocabulary', 'grammar', 'kanji')
              AND item_revision_public(i.id, r.revision)
            """;
    private static final String FIELDS = """
            SELECT i.id, i.stable_key, r.revision, r.kind,
                   r.display_text_ja, r.display_text_vi, r.payload::text
            """;
    private final JdbcTemplate jdbc;

    public SkillsContentRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record Row(UUID id, String key, int revision, String kind,
                      String displayJa, String displayVi, String payload) {}
    public record Count(String kind, int count) {}
    public record Stroke(UUID id, int revision, String mimeType, String altTextVi) {}

    private Row row(java.sql.ResultSet rs, int number) throws java.sql.SQLException {
        return new Row(rs.getObject(1, UUID.class), rs.getString(2), rs.getInt(3),
                rs.getString(4), rs.getString(5), rs.getString(6), rs.getString(7));
    }

    public List<Count> counts() {
        return jdbc.query("""
                SELECT r.kind, count(*)
                """ + PUBLIC_ITEMS + " GROUP BY r.kind", (rs, n) ->
                new Count(rs.getString(1), rs.getInt(2)));
    }

    public List<Row> list(String type, String q, String after, int fetchSize) {
        return jdbc.query(FIELDS + PUBLIC_ITEMS + """
                  AND (?::text IS NULL OR r.kind = ?)
                  AND i.stable_key > ?
                  AND (?::text IS NULL OR strpos(lower(coalesce(r.display_text_ja, '')), lower(?)) > 0
                       OR strpos(lower(coalesce(r.display_text_vi, '')), lower(?)) > 0)
                ORDER BY i.stable_key LIMIT ?
                """, this::row, type, type, after, q, q, q, fetchSize);
    }

    public Optional<Row> detail(UUID id) {
        return jdbc.query(FIELDS + PUBLIC_ITEMS + " AND i.id = ?", this::row, id)
                .stream().findFirst();
    }

    public List<Row> pinnedTargets(UUID sourceId, int sourceRevision, String role, String targetKind) {
        return jdbc.query("""
                SELECT t.id, t.stable_key, r.revision, r.kind,
                       r.display_text_ja, r.display_text_vi, r.payload::text
                FROM content_item_revision_edges e
                JOIN content_items t ON t.id=e.target_item_id
                JOIN content_item_revisions r ON r.item_id=t.id AND r.revision=e.target_revision
                WHERE e.source_item_id=? AND e.source_revision=? AND e.role_code=?
                  AND r.kind=? AND t.published_revision IS NOT NULL
                  AND item_revision_public(t.id, r.revision)
                ORDER BY e.position
                """, this::row, sourceId, sourceRevision, role, targetKind);
    }

    public Optional<Stroke> stroke(UUID itemId, int itemRevision) {
        return jdbc.query("""
                SELECT m.id, mr.revision, mr.mime_type, mr.alt_text_vi
                FROM content_item_revision_media e
                JOIN media_assets m ON m.id=e.media_id
                JOIN media_asset_revisions mr ON mr.media_id=m.id AND mr.revision=e.media_revision
                WHERE e.item_id=? AND e.item_revision=? AND e.role_code='stroke-order'
                  AND mr.media_kind='writing' AND media_revision_public(m.id,mr.revision)
                ORDER BY e.position LIMIT 1
                """, (rs,n) -> new Stroke(rs.getObject(1,UUID.class),rs.getInt(2),rs.getString(3),rs.getString(4)),
                itemId,itemRevision).stream().findFirst();
    }

    public List<Row> cards(String type, String after, int fetchSize) {
        return jdbc.query(FIELDS + PUBLIC_ITEMS + """
                  AND (?::text IS NULL OR r.kind = ?)
                  AND i.stable_key > ?
                  AND length(btrim(CASE r.kind
                       WHEN 'vocabulary' THEN r.payload->>'surface'
                       WHEN 'grammar' THEN r.payload->>'pattern'
                       ELSE r.payload->>'glyph' END)) > 0
                  AND length(btrim(CASE r.kind
                       WHEN 'kana' THEN r.payload->>'reading'
                       WHEN 'vocabulary' THEN r.payload->>'glossVi'
                       WHEN 'grammar' THEN r.payload->>'explanationVi'
                       ELSE r.payload->>'meaningVi' END)) > 0
                ORDER BY i.stable_key LIMIT ?
                """, this::row, type, type, after, fetchSize);
    }
}
