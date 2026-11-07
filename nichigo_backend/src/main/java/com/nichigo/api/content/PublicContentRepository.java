package com.nichigo.api.content;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Fixed-count, ordered JDBC reads over immutable published revisions. */
@Repository
public class PublicContentRepository {
    private final JdbcTemplate jdbc;

    public PublicContentRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record PathHead(UUID id, String slug, int revision, String title, String description,
                           String presentation) {}
    public record StageRow(UUID id, int position, String title, String description) {}
    public record ChapterRow(UUID id, UUID stageId, int position, String title, String description) {}
    public record PlacementRow(UUID chapterId, UUID placementId, UUID lessonId, String lessonSlug,
                               int position, int lessonRevision, String title, String summary) {}
    public record LessonHead(UUID id, String slug, int revision, String title, String summary,
                             String presentation) {}
    public record ObjectiveRow(int position, String kind, String text) {}
    public record SectionRow(UUID id, int position, String title) {}
    public record ItemRow(UUID sectionId, int position, UUID itemId, String stableKey,
                          int itemRevision, String kind, String displayJa, String displayVi,
                          String payload) {}
    public record MediaRow(UUID sectionId, int itemPosition, UUID mediaId, int revision,
                           String kind, String role, String mimeType, String altTextVi,
                           String transcriptVi) {}
    public record SkillRow(UUID id, String key, int revision, String kind,
                           String displayJa, String displayVi) {}

    public List<PathHead> publishedPaths(String after, int fetchSize) {
        return jdbc.query("""
                SELECT p.id, p.slug, pr.revision, pr.title_vi, pr.description_vi,
                       NULL::text AS presentation
                FROM learning_paths p JOIN path_revisions pr
                  ON pr.path_id = p.id AND pr.revision = p.published_revision
                WHERE p.slug > ? AND path_revision_public(p.id, pr.revision)
                ORDER BY p.slug LIMIT ?
                """, (rs, n) -> pathHead(rs), after, fetchSize);
    }

    public Optional<PathHead> publishedPath(String slug) {
        return jdbc.query("""
                SELECT p.id, p.slug, pr.revision, pr.title_vi, pr.description_vi,
                       pr.presentation::text AS presentation
                FROM learning_paths p JOIN path_revisions pr
                  ON pr.path_id = p.id AND pr.revision = p.published_revision
                WHERE p.slug = ? AND path_revision_public(p.id, pr.revision)
                """, (rs, n) -> pathHead(rs), slug).stream().findFirst();
    }

    private PathHead pathHead(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new PathHead(rs.getObject("id", UUID.class), rs.getString("slug"),
                rs.getInt("revision"), rs.getString("title_vi"), rs.getString("description_vi"),
                rs.getString("presentation"));
    }

    public List<StageRow> stages(UUID pathId, int revision) {
        return jdbc.query("""
                SELECT (stage->>'id')::uuid AS stage_id,
                       (stage->>'position')::int AS position,
                       stage->>'titleVi' AS title_vi,
                       stage->>'descriptionVi' AS description_vi
                FROM path_revisions pr
                CROSS JOIN LATERAL jsonb_array_elements(pr.presentation->'stages') stage
                WHERE pr.path_id = ? AND pr.revision = ?
                ORDER BY position LIMIT 101
                """, (rs, n) -> new StageRow(rs.getObject("stage_id", UUID.class),
                rs.getInt("position"), rs.getString("title_vi"), rs.getString("description_vi")),
                pathId, revision);
    }

    public List<ChapterRow> chapters(UUID pathId, int revision) {
        return jdbc.query("""
                SELECT (chapter->>'id')::uuid AS chapter_id,
                       (stage->>'id')::uuid AS stage_id,
                       (chapter->>'position')::int AS position,
                       chapter->>'titleVi' AS title_vi,
                       chapter->>'descriptionVi' AS description_vi
                FROM path_revisions pr
                CROSS JOIN LATERAL jsonb_array_elements(pr.presentation->'stages') stage
                CROSS JOIN LATERAL jsonb_array_elements(stage->'chapters') chapter
                WHERE pr.path_id = ? AND pr.revision = ?
                ORDER BY stage_id, position LIMIT 101
                """, (rs, n) -> new ChapterRow(rs.getObject("chapter_id", UUID.class),
                rs.getObject("stage_id", UUID.class), rs.getInt("position"),
                rs.getString("title_vi"), rs.getString("description_vi")), pathId, revision);
    }

    public List<PlacementRow> placements(UUID pathId, int revision) {
        return jdbc.query("""
                SELECT pl.chapter_id, pl.placement_id, pl.lesson_id, l.slug,
                       pl.position, pl.lesson_revision, lr.title_vi, lr.summary_vi
                FROM path_revision_lessons pl
                JOIN lesson_revisions lr ON lr.lesson_id = pl.lesson_id AND lr.revision = pl.lesson_revision
                JOIN lessons l ON l.id = pl.lesson_id
                WHERE pl.path_id = ? AND pl.path_revision = ?
                ORDER BY pl.chapter_id, pl.position LIMIT 1001
                """, (rs, n) -> new PlacementRow(rs.getObject("chapter_id", UUID.class),
                rs.getObject("placement_id", UUID.class), rs.getObject("lesson_id", UUID.class),
                rs.getString("slug"), rs.getInt("position"), rs.getInt("lesson_revision"),
                rs.getString("title_vi"), rs.getString("summary_vi")), pathId, revision);
    }

    public Optional<LessonHead> publishedLesson(String slug) {
        return jdbc.query("""
                SELECT l.id, l.slug, lr.revision, lr.title_vi, lr.summary_vi,
                       lr.presentation::text AS presentation
                FROM lessons l JOIN lesson_revisions lr
                  ON lr.lesson_id = l.id AND lr.revision = l.published_revision
                WHERE l.slug = ? AND lesson_revision_public(l.id, lr.revision)
                """, (rs, n) -> new LessonHead(rs.getObject("id", UUID.class), rs.getString("slug"),
                rs.getInt("revision"), rs.getString("title_vi"), rs.getString("summary_vi"),
                rs.getString("presentation")),
                slug).stream().findFirst();
    }

    public Optional<LessonHead> lessonAtPublishedPlacement(String pathSlug, UUID placementId) {
        return jdbc.query("""
                SELECT l.id, l.slug, lr.revision, lr.title_vi, lr.summary_vi,
                       lr.presentation::text AS presentation
                FROM learning_paths p
                JOIN path_revision_lessons pl
                  ON pl.path_id = p.id AND pl.path_revision = p.published_revision
                JOIN lesson_revisions lr
                  ON lr.lesson_id = pl.lesson_id AND lr.revision = pl.lesson_revision
                JOIN lessons l ON l.id = pl.lesson_id
                WHERE p.slug = ? AND pl.placement_id = ?
                  AND path_revision_public(p.id, p.published_revision)
                  AND lesson_revision_public(l.id, lr.revision)
                """, (rs, n) -> new LessonHead(rs.getObject("id", UUID.class), rs.getString("slug"),
                rs.getInt("revision"), rs.getString("title_vi"), rs.getString("summary_vi"),
                rs.getString("presentation")),
                pathSlug, placementId).stream().findFirst();
    }

    public List<ObjectiveRow> objectives(UUID lessonId, int revision) {
        return jdbc.query("""
                SELECT (objective->>'position')::int AS position,
                       objective->>'kind' AS kind, objective->>'textVi' AS text_vi
                FROM lesson_revisions lr
                CROSS JOIN LATERAL jsonb_array_elements(lr.presentation->'objectives') objective
                WHERE lr.lesson_id = ? AND lr.revision = ? ORDER BY position LIMIT 1001
                """, (rs, n) -> new ObjectiveRow(rs.getInt("position"), rs.getString("kind"),
                rs.getString("text_vi")), lessonId, revision);
    }

    public List<SectionRow> sections(UUID lessonId, int revision) {
        return jdbc.query("""
                SELECT (section->>'id')::uuid AS section_id,
                       (section->>'position')::int AS position,
                       section->>'titleVi' AS title_vi
                FROM lesson_revisions lr
                CROSS JOIN LATERAL jsonb_array_elements(lr.presentation->'sections') section
                WHERE lr.lesson_id = ? AND lr.revision = ? ORDER BY position LIMIT 101
                """, (rs, n) -> new SectionRow(rs.getObject("section_id", UUID.class),
                rs.getInt("position"), rs.getString("title_vi")), lessonId, revision);
    }

    public List<ItemRow> lessonItems(UUID lessonId, int revision) {
        return jdbc.query("""
                SELECT li.section_id, li.position, li.item_id, i.stable_key,
                       li.item_revision, ir.kind, ir.display_text_ja, ir.display_text_vi,
                       ir.payload::text AS payload
                FROM lesson_revision_items li
                JOIN content_item_revisions ir ON ir.item_id = li.item_id AND ir.revision = li.item_revision
                JOIN content_items i ON i.id = li.item_id
                WHERE li.lesson_id = ? AND li.lesson_revision = ?
                ORDER BY li.section_id, li.position LIMIT 1001
                """, (rs, n) -> new ItemRow(rs.getObject("section_id", UUID.class),
                rs.getInt("position"), rs.getObject("item_id", UUID.class), rs.getString("stable_key"),
                rs.getInt("item_revision"), rs.getString("kind"), rs.getString("display_text_ja"),
                rs.getString("display_text_vi"), rs.getString("payload")), lessonId, revision);
    }

    public List<MediaRow> lessonMedia(UUID lessonId, int revision) {
        return jdbc.query("""
                SELECT li.section_id, li.position AS item_position, im.media_id, im.media_revision,
                       mr.media_kind, im.role_code, mr.mime_type, mr.alt_text_vi, mr.transcript_vi
                FROM lesson_revision_items li
                JOIN content_item_revision_media im
                  ON im.item_id = li.item_id AND im.item_revision = li.item_revision
                JOIN media_asset_revisions mr
                  ON mr.media_id = im.media_id AND mr.revision = im.media_revision
                WHERE li.lesson_id = ? AND li.lesson_revision = ?
                ORDER BY li.section_id, li.position, im.position LIMIT 5001
                """, (rs, n) -> new MediaRow(rs.getObject("section_id", UUID.class),
                rs.getInt("item_position"), rs.getObject("media_id", UUID.class),
                rs.getInt("media_revision"), rs.getString("media_kind"), rs.getString("role_code"),
                rs.getString("mime_type"), rs.getString("alt_text_vi"),
                rs.getString("transcript_vi")), lessonId, revision);
    }

    public List<SkillRow> skills(String kind, String after, int fetchSize) {
        return jdbc.query("""
                SELECT i.id, i.stable_key, ir.revision, ir.kind,
                       ir.display_text_ja, ir.display_text_vi
                FROM content_items i JOIN content_item_revisions ir
                  ON ir.item_id = i.id AND ir.revision = i.published_revision
                WHERE ir.kind = ? AND i.stable_key > ?
                  AND item_revision_public(i.id, ir.revision)
                ORDER BY i.stable_key LIMIT ?
                """, (rs, n) -> new SkillRow(rs.getObject("id", UUID.class), rs.getString("stable_key"),
                rs.getInt("revision"), rs.getString("kind"), rs.getString("display_text_ja"),
                rs.getString("display_text_vi")), kind, after, fetchSize);
    }
}
