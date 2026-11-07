package com.nichigo.api.content;

import com.nichigo.api.content.dto.PublicContentDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Every response is assembled from one repeatable PostgreSQL snapshot. */
@Service
public class PublicContentService {
    private static final Set<String> SKILL_KINDS = Set.of(
            "kana", "vocabulary", "grammar", "kanji", "example", "dialogue");
    private final PublicContentRepository repository;
    private final ObjectMapper objectMapper;

    public PublicContentService(PublicContentRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
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
        var chapterRows = repository.chapters(root.id(), root.revision());
        var placementRows = repository.placements(root.id(), root.revision());
        if (chapterRows.size() > 100 || placementRows.size() > 1000) {
            throw new IllegalStateException("Published path exceeds the bounded response contract.");
        }
        Map<UUID, List<PublicContentDtos.LessonSummary>> lessonsByChapter = new HashMap<>();
        for (var row : placementRows) {
            lessonsByChapter.computeIfAbsent(row.chapterId(), key -> new ArrayList<>())
                    .add(new PublicContentDtos.LessonSummary(row.lessonId(), row.placementId(),
                            row.lessonSlug(), row.position(), row.lessonRevision(),
                            row.title(), row.summary()));
        }
        Map<UUID, List<PublicContentDtos.Chapter>> chaptersByStage = new HashMap<>();
        for (var row : chapterRows) {
            chaptersByStage.computeIfAbsent(row.stageId(), key -> new ArrayList<>())
                    .add(new PublicContentDtos.Chapter(row.id(), row.position(), row.title(),
                            row.description(), List.copyOf(lessonsByChapter.getOrDefault(row.id(), List.of()))));
        }
        List<PublicContentDtos.Stage> stages = new ArrayList<>();
        var stageRows = repository.stages(root.id(), root.revision());
        if (stageRows.size() > 100) {
            throw new IllegalStateException("Published path exceeds the bounded response contract.");
        }
        for (var row : stageRows) {
            stages.add(new PublicContentDtos.Stage(row.id(), row.position(), row.title(),
                    row.description(), List.copyOf(chaptersByStage.getOrDefault(row.id(), List.of()))));
        }
        return new PublicContentDtos.Path(root.id(), root.slug(), root.title(),
                root.description(), root.revision(), List.copyOf(stages));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public PublicContentDtos.Lesson lesson(String slug) {
        var root = repository.publishedLesson(slug).orElseThrow(ContentNotFoundException::new);
        var sectionRows = repository.sections(root.id(), root.revision());
        var itemRows = repository.lessonItems(root.id(), root.revision());
        if (sectionRows.size() > 100 || itemRows.size() > 1000) {
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
        for (var row : itemRows) {
            var media = mediaByItem.getOrDefault(new ItemPosition(row.sectionId(), row.position()), List.of());
            var item = new PublicContentDtos.Item(row.itemId(), row.stableKey(), row.itemRevision(),
                    row.kind(), row.displayJa(), row.displayVi(), parsePayload(row.payload()),
                    List.copyOf(media));
            itemsBySection.computeIfAbsent(row.sectionId(), key -> new ArrayList<>())
                    .add(new PublicContentDtos.LessonItem(row.itemId(), row.position(), item));
        }
        List<PublicContentDtos.Section> sections = new ArrayList<>();
        for (var row : sectionRows) {
            sections.add(new PublicContentDtos.Section(row.id(), row.position(), row.title(),
                    List.copyOf(itemsBySection.getOrDefault(row.id(), List.of()))));
        }
        var objectiveRows = repository.objectives(root.id(), root.revision());
        if (objectiveRows.size() > 1000) {
            throw new IllegalStateException("Published lesson exceeds the bounded response contract.");
        }
        var objectives = objectiveRows.stream()
                .map(row -> new PublicContentDtos.Objective(row.position(), row.kind(), row.text()))
                .toList();
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

    private void validatePage(int limit, String after) {
        if (limit < 1 || limit > 50 || (after != null && after.length() > 200)) {
            throw new InvalidContentQueryException("Use limit 1–50 and a cursor of at most 200 characters.");
        }
    }

    private record ItemPosition(UUID sectionId, int position) {}
}
