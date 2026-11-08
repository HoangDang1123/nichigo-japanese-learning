package com.nichigo.api.content;

import com.nichigo.api.content.dto.PublicContentDtos;
import com.nichigo.api.contentimport.CanonicalContentValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.UUID;

/** Every response is assembled from one repeatable PostgreSQL snapshot. */
@Service
public class PublicContentService {
    private static final Set<String> SKILL_KINDS = Set.of(
            "kana", "vocabulary", "grammar", "kanji", "example", "dialogue");
    private final PublicContentRepository repository;
    private final ObjectMapper objectMapper;
    private final CanonicalContentValidator contentValidator;

    public PublicContentService(PublicContentRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.contentValidator = new CanonicalContentValidator(objectMapper);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public PublicContentDtos.PathList paths(int limit, String after) {
        validatePage(limit, after);
        var rows = repository.publishedPaths(after == null ? "" : after, limit + 1);
        boolean more = rows.size() > limit;
        var page = rows.subList(0, Math.min(limit, rows.size()));
        var paths = page.stream().map(row -> new PublicContentDtos.PathSummary(
                row.id(), row.slug(), row.title(), row.revision())).toList();
        return new PublicContentDtos.PathList(paths, more ? page.getLast().slug() : null);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public PublicContentDtos.Path path(String slug) {
        var root = repository.publishedPath(slug).orElseThrow(ContentNotFoundException::new);
        JsonNode presentation = contentValidator.validatePublishedPathPresentation(root.presentation());
        var placementRows = repository.placements(root.id(), root.revision());
        if (placementRows.size() > 1000) {
            throw new IllegalStateException("Published path exceeds the bounded response contract.");
        }
        Map<UUID, List<PublicContentDtos.LessonSummary>> lessonsByChapter = new HashMap<>();
        for (var row : placementRows) {
            lessonsByChapter.computeIfAbsent(row.chapterId(), key -> new ArrayList<>())
                    .add(new PublicContentDtos.LessonSummary(row.lessonId(), row.placementId(),
                            row.lessonSlug(), row.position(), row.lessonRevision(),
                            row.title(), row.summary()));
        }
        Set<UUID> chapterIds = new HashSet<>();
        Set<PublicContentRepository.LayoutKey> layoutKeys = new HashSet<>();
        List<PublicContentDtos.Stage> stages = new ArrayList<>();
        for (JsonNode stage : presentation.path("stages")) {
            UUID stageId = UUID.fromString(stage.path("id").asText());
            List<PublicContentDtos.Chapter> chapters = new ArrayList<>();
            for (JsonNode chapter : stage.path("chapters")) {
                UUID chapterId = UUID.fromString(chapter.path("id").asText());
                chapterIds.add(chapterId);
                layoutKeys.add(new PublicContentRepository.LayoutKey(stageId, chapterId));
                chapters.add(new PublicContentDtos.Chapter(chapterId, chapter.path("position").asInt(),
                        chapter.path("titleVi").asText(), optionalText(chapter, "descriptionVi"),
                        List.copyOf(lessonsByChapter.getOrDefault(chapterId, List.of()))));
            }
            if (chapters.isEmpty()) layoutKeys.add(new PublicContentRepository.LayoutKey(stageId, null));
            chapters.sort(Comparator.comparingInt(PublicContentDtos.Chapter::position));
            stages.add(new PublicContentDtos.Stage(stageId, stage.path("position").asInt(),
                    stage.path("titleVi").asText(), optionalText(stage, "descriptionVi"),
                    List.copyOf(chapters)));
        }
        if (!chapterIds.containsAll(lessonsByChapter.keySet())
                || !layoutKeys.equals(new HashSet<>(repository.pathLayoutKeys(root.id(), root.revision()))))
            throw new IllegalStateException("Published Path layout does not match relational dependencies.");
        stages.sort(Comparator.comparingInt(PublicContentDtos.Stage::position));
        return new PublicContentDtos.Path(root.id(), root.slug(), root.title(),
                root.description(), root.revision(), List.copyOf(stages));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public PublicContentDtos.Lesson lesson(String slug) {
        var root = repository.publishedLesson(slug).orElseThrow(ContentNotFoundException::new);
        return assembleLesson(root);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public PublicContentDtos.Lesson lessonAtPlacement(String pathSlug, String placementId) {
        UUID id;
        try {
            id = UUID.fromString(placementId);
        } catch (IllegalArgumentException ex) {
            throw new ContentNotFoundException();
        }
        var root = repository.lessonAtPublishedPlacement(pathSlug, id)
                .orElseThrow(ContentNotFoundException::new);
        return assembleLesson(root);
    }

    private PublicContentDtos.Lesson assembleLesson(PublicContentRepository.LessonHead root) {
        JsonNode presentation = contentValidator.validatePublishedLessonPresentation(root.presentation());
        var itemRows = repository.lessonItems(root.id(), root.revision());
        if (itemRows.size() > 1000) {
            throw new IllegalStateException("Published lesson exceeds the bounded response contract.");
        }
        Map<ItemPosition, List<PublicContentDtos.Media>> mediaByItem = new HashMap<>();
        var mediaRows = repository.lessonMedia(root.id(), root.revision());
        if (mediaRows.size() > 5000) {
            throw new IllegalStateException("Published lesson exceeds the bounded response contract.");
        }
        for (var row : mediaRows) {
            mediaByItem.computeIfAbsent(new ItemPosition(row.sectionId(), row.itemPosition()),
                    key -> new ArrayList<>()).add(new PublicContentDtos.Media(row.mediaId(),
                    row.revision(), row.kind(), row.role(), row.mimeType(),
                    row.altTextVi(), row.transcriptVi()));
        }
        Map<UUID, List<PublicContentDtos.LessonItem>> itemsBySection = new HashMap<>();
        Set<UUID> sectionIds = new HashSet<>();
        for (JsonNode section : presentation.path("sections"))
            sectionIds.add(UUID.fromString(section.path("id").asText()));
        for (var row : itemRows) {
            if (!sectionIds.contains(row.sectionId())) {
                throw new IllegalStateException("Published Item pin has no layout Section.");
            }
            var media = mediaByItem.getOrDefault(new ItemPosition(row.sectionId(), row.position()), List.of());
            var item = new PublicContentDtos.Item(row.itemId(), row.stableKey(), row.itemRevision(),
                    row.kind(), row.displayJa(), row.displayVi(), parsePayload(row.payload()),
                    List.copyOf(media));
            itemsBySection.computeIfAbsent(row.sectionId(), key -> new ArrayList<>())
                    .add(new PublicContentDtos.LessonItem(row.itemId(), row.position(), item));
        }
        List<PublicContentDtos.Section> sections = new ArrayList<>();
        for (JsonNode section : presentation.path("sections")) {
            UUID id = UUID.fromString(section.path("id").asText());
            sections.add(new PublicContentDtos.Section(id, section.path("position").asInt(),
                    optionalText(section, "titleVi"),
                    List.copyOf(itemsBySection.getOrDefault(id, List.of()))));
        }
        sections.sort(Comparator.comparingInt(PublicContentDtos.Section::position));
        List<PublicContentDtos.Objective> objectives = new ArrayList<>();
        for (JsonNode objective : presentation.path("objectives"))
            objectives.add(new PublicContentDtos.Objective(objective.path("position").asInt(),
                    objective.path("kind").asText(), objective.path("textVi").asText()));
        objectives.sort(Comparator.comparingInt(PublicContentDtos.Objective::position));
        return new PublicContentDtos.Lesson(root.id(), root.slug(), root.revision(),
                root.title(), root.summary(), objectives, List.copyOf(sections));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public PublicContentDtos.SkillItems skills(String type, int limit, String after) {
        if (!SKILL_KINDS.contains(type)) throw new InvalidContentQueryException("Unknown skill type.");
        validatePage(limit, after);
        var rows = repository.skills(type, after == null ? "" : after, limit + 1);
        boolean more = rows.size() > limit;
        var page = rows.subList(0, Math.min(limit, rows.size()));
        var items = page.stream().map(row -> new PublicContentDtos.SkillItem(row.id(),
                row.key(), row.revision(), row.kind(), row.displayJa(), row.displayVi())).toList();
        return new PublicContentDtos.SkillItems(items, more ? page.getLast().key() : null);
    }

    private JsonNode parsePayload(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (Exception ex) {
            throw new IllegalStateException("Published content payload is invalid.", ex);
        }
    }

    private String optionalText(JsonNode node, String field) {
        return node.has(field) ? node.get(field).asText() : null;
    }

    private void validatePage(int limit, String after) {
        if (limit < 1 || limit > 50 || (after != null && after.length() > 200)) {
            throw new InvalidContentQueryException("Use limit 1–50 and a cursor of at most 200 characters.");
        }
    }

    private record ItemPosition(UUID sectionId, int position) {}
}
