package com.nichigo.api.content;

import com.nichigo.api.contentimport.CanonicalContentValidator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

/** Validation and locking primitive for a future authenticated JPN-022 publisher. */
@Service
public class PublishedContentPublicationBoundary {
    private final JdbcTemplate jdbc;
    private final CanonicalContentValidator canonical;

    public PublishedContentPublicationBoundary(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.canonical = new CanonicalContentValidator(mapper);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void validateLesson(UUID lessonId, int revision, long expectedEditVersion, String presentation) {
        canonical.validatePublishedLessonPresentation(presentation);
        requireExpectedVersion("lessons", "id", lessonId, revision, expectedEditVersion);
        lockRights("""
                SELECT lr.rights_id FROM lesson_revisions lr
                WHERE lr.lesson_id=? AND lr.revision=?
                UNION SELECT ir.rights_id FROM lesson_revision_items li
                  JOIN content_item_revisions ir ON ir.item_id=li.item_id AND ir.revision=li.item_revision
                WHERE li.lesson_id=? AND li.lesson_revision=?
                UNION SELECT mr.rights_id FROM lesson_revision_items li
                  JOIN content_item_revision_media im ON im.item_id=li.item_id AND im.item_revision=li.item_revision
                  JOIN media_asset_revisions mr ON mr.media_id=im.media_id AND mr.revision=im.media_revision
                WHERE li.lesson_id=? AND li.lesson_revision=?
                """, lessonId, revision, 3);
        requireStoredPresentation("lesson_revisions", "lesson_id", lessonId, revision, presentation);
        jdbc.query("SELECT validate_lesson_presentation(?,?,?::jsonb)", rs -> null,
                lessonId, revision, presentation);
        Boolean eligible = jdbc.queryForObject("""
                SELECT l.withdrawn_at IS NULL AND r.clearance_status='cleared'
                  AND NOT EXISTS (SELECT 1 FROM lesson_revision_items li
                    WHERE li.lesson_id=lr.lesson_id AND li.lesson_revision=lr.revision
                      AND NOT item_revision_public(li.item_id,li.item_revision))
                FROM lesson_revisions lr JOIN lessons l ON l.id=lr.lesson_id
                JOIN content_rights r ON r.id=lr.rights_id
                WHERE lr.lesson_id=? AND lr.revision=?
                """, Boolean.class, lessonId, revision);
        if (!Boolean.TRUE.equals(eligible)) invalid();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void validatePath(UUID pathId, int revision, long expectedEditVersion, String presentation) {
        canonical.validatePublishedPathPresentation(presentation);
        requireExpectedVersion("learning_paths", "id", pathId, revision, expectedEditVersion);
        lockRights("""
                SELECT pr.rights_id FROM path_revisions pr WHERE pr.path_id=? AND pr.revision=?
                UNION SELECT s.rights_id FROM path_revision_stages s
                  WHERE s.path_id=? AND s.path_revision=?
                UNION SELECT c.rights_id FROM path_revision_chapters c
                  WHERE c.path_id=? AND c.path_revision=?
                UNION SELECT lr.rights_id FROM path_revision_lessons pl
                  JOIN lesson_revisions lr ON lr.lesson_id=pl.lesson_id AND lr.revision=pl.lesson_revision
                  WHERE pl.path_id=? AND pl.path_revision=?
                UNION SELECT ir.rights_id FROM path_revision_lessons pl
                  JOIN lesson_revision_items li ON li.lesson_id=pl.lesson_id AND li.lesson_revision=pl.lesson_revision
                  JOIN content_item_revisions ir ON ir.item_id=li.item_id AND ir.revision=li.item_revision
                  WHERE pl.path_id=? AND pl.path_revision=?
                UNION SELECT mr.rights_id FROM path_revision_lessons pl
                  JOIN lesson_revision_items li ON li.lesson_id=pl.lesson_id AND li.lesson_revision=pl.lesson_revision
                  JOIN content_item_revision_media im ON im.item_id=li.item_id AND im.item_revision=li.item_revision
                  JOIN media_asset_revisions mr ON mr.media_id=im.media_id AND mr.revision=im.media_revision
                  WHERE pl.path_id=? AND pl.path_revision=?
                """, pathId, revision, 6);
        requireStoredPresentation("path_revisions", "path_id", pathId, revision, presentation);
        jdbc.query("SELECT validate_path_presentation(?,?,?::jsonb)", rs -> null,
                pathId, revision, presentation);
        Boolean eligible = jdbc.queryForObject("""
                SELECT p.withdrawn_at IS NULL AND r.clearance_status='cleared'
                  AND NOT EXISTS (SELECT 1 FROM path_revision_stages s
                    JOIN content_rights sr ON sr.id=s.rights_id
                    WHERE s.path_id=pr.path_id AND s.path_revision=pr.revision
                      AND sr.clearance_status <> 'cleared')
                  AND NOT EXISTS (SELECT 1 FROM path_revision_chapters c
                    JOIN content_rights cr ON cr.id=c.rights_id
                    WHERE c.path_id=pr.path_id AND c.path_revision=pr.revision
                      AND cr.clearance_status <> 'cleared')
                  AND NOT EXISTS (SELECT 1 FROM path_revision_lessons pl
                    WHERE pl.path_id=pr.path_id AND pl.path_revision=pr.revision
                      AND NOT lesson_revision_public(pl.lesson_id,pl.lesson_revision))
                FROM path_revisions pr JOIN learning_paths p ON p.id=pr.path_id
                JOIN content_rights r ON r.id=pr.rights_id
                WHERE pr.path_id=? AND pr.revision=?
                """, Boolean.class, pathId, revision);
        if (!Boolean.TRUE.equals(eligible)) invalid();
    }

    private void requireExpectedVersion(String table, String idColumn, UUID id,
                                        int revision, long expectedEditVersion) {
        // Table and column names are fixed internal constants, never caller input.
        var rows = jdbc.query("SELECT edit_version,published_revision FROM " + table
                        + " WHERE " + idColumn + "=? FOR UPDATE",
                (rs, n) -> new Version(rs.getLong(1), rs.getObject(2, Integer.class)), id);
        if (rows.size() != 1 || rows.getFirst().editVersion() != expectedEditVersion
                || (rows.getFirst().publishedRevision() != null
                    && revision <= rows.getFirst().publishedRevision())) invalid();
    }

    private void requireStoredPresentation(String table, String idColumn, UUID id,
                                           int revision, String presentation) {
        Boolean matching = jdbc.queryForObject("SELECT sealed_at IS NULL AND presentation=?::jsonb FROM "
                + table + " WHERE " + idColumn + "=? AND revision=?",
                Boolean.class, presentation, id, revision);
        if (!Boolean.TRUE.equals(matching)) invalid();
    }

    private void lockRights(String unionQuery, UUID id, int revision, int branches) {
        String sql = "SELECT r.id FROM content_rights r WHERE r.id IN (" + unionQuery
                + ") ORDER BY r.id FOR SHARE";
        Object[] parameters = new Object[branches * 2];
        for (int i = 0; i < branches; i++) {
            parameters[i * 2] = id;
            parameters[i * 2 + 1] = revision;
        }
        jdbc.query(sql, (rs, n) -> rs.getObject(1, UUID.class), parameters);
    }

    private static void invalid() {
        throw new IllegalStateException("Publication candidate is stale or invalid.");
    }

    private record Version(long editVersion, Integer publishedRevision) {}
}
