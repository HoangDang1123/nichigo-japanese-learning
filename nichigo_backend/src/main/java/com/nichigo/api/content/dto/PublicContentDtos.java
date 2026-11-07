package com.nichigo.api.content.dto;

import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.UUID;

/** Public content contracts contain no editor drafts, rights evidence, or learner progress. */
public final class PublicContentDtos {
    private PublicContentDtos() {}

    public record PathList(List<PathSummary> paths, String nextCursor) {}
    public record PathSummary(UUID id, String slug, String title, int revision) {}
    public record Path(UUID id, String slug, String title, String description, int revision,
                       List<Stage> stages) {}
    public record Stage(UUID id, int position, String title, String description,
                        List<Chapter> chapters) {}
    public record Chapter(UUID id, int position, String title, String description,
                          List<LessonSummary> lessons) {}
    public record LessonSummary(UUID id, UUID placementId, String slug, int position,
                                int revision, String title, String summary) {}

    public record Lesson(UUID id, String slug, int revision, String title, String summary,
                         List<Objective> objectives, List<Section> sections) {}
    public record Objective(int position, String kind, String text) {}
    public record Section(UUID id, int position, String title, List<LessonItem> items) {}
    public record LessonItem(UUID id, int position, Item content) {}
    public record Item(UUID id, String key, int revision, String kind,
                       String displayTextJa, String displayTextVi, JsonNode payload,
                       List<Media> media) {}
    public record Media(UUID id, int revision, String kind, String role,
                        String mimeType, String altTextVi, String transcriptVi) {}
    public record SkillItems(List<SkillItem> items, String nextCursor) {}
    public record SkillItem(UUID id, String key, int revision, String kind,
                            String displayTextJa, String displayTextVi) {}
}
