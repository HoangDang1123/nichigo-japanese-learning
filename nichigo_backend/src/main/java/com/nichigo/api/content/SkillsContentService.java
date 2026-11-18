package com.nichigo.api.content;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class SkillsContentService {
    private static final List<String> KINDS = List.of("kana", "vocabulary", "grammar", "kanji");
    private static final List<String> LANGUAGE_SKILLS = List.of("listening", "speaking", "reading", "writing");
    private static final Set<String> KIND_SET = Set.copyOf(KINDS);
    private final SkillsContentRepository repository;
    private final ObjectMapper json;

    public SkillsContentService(SkillsContentRepository repository, ObjectMapper json) {
        this.repository = repository;
        this.json = json;
    }

    public record DirectorySkill(String type, String availability, Integer itemCount) {}
    public record DirectoryGroup(String id, List<DirectorySkill> skills) {}
    public record Directory(List<DirectoryGroup> groups) {}
    public record Item(UUID id, String key, int revision, String kind,
                       String displayTextJa, String displayTextVi, JsonNode payload) {}
    public record ItemPage(List<Item> items, String nextCursor) {}
    public record Flashcard(UUID id, String key, int revision, String kind,
                            String front, String back, String reading) {}
    public record FlashcardPage(List<Flashcard> cards, String nextCursor) {}
    public record KanjiExample(UUID id, String key, int revision, String textJa,
                               String translationVi, JsonNode segments) {}
    public record KanjiVocabulary(UUID id, String key, int revision, String surface,
                                  String reading, String glossVi, List<KanjiExample> examples) {}
    public record StrokeOrder(String status, UUID mediaId, Integer revision,
                              String mimeType, String altTextVi) {}
    public record KanjiDetail(UUID id, String key, int revision, String glyph, String meaningVi,
                              JsonNode onReadings, JsonNode kunReadings,
                              List<KanjiVocabulary> relatedVocabulary, StrokeOrder strokeOrder) {}

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Directory directory() {
        Map<String, Integer> counts = repository.counts().stream()
                .collect(java.util.stream.Collectors.toMap(SkillsContentRepository.Count::kind,
                        SkillsContentRepository.Count::count));
        var foundation = KINDS.stream().map(kind -> {
            int count = counts.getOrDefault(kind, 0);
            return new DirectorySkill(kind, count > 0 ? "available" : "no_published_content", count);
        }).toList();
        var language = LANGUAGE_SKILLS.stream().map(kind ->
                new DirectorySkill(kind, "feature_unavailable", null)).toList();
        return new Directory(List.of(new DirectoryGroup("foundation-knowledge", foundation),
                new DirectoryGroup("language-skills", language)));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ItemPage items(String type, String q, int limit, String after) {
        validate(type, limit, after);
        if (q != null && q.length() > 100) throw new InvalidContentQueryException("Search is limited to 100 characters.");
        String search = q == null || q.isBlank() ? null : q.strip();
        var rows = repository.list(type, search, after == null ? "" : after, limit + 1);
        var page = rows.subList(0, Math.min(limit, rows.size()));
        return new ItemPage(page.stream().map(this::item).toList(),
                rows.size() > limit ? page.getLast().key() : null);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Item item(String rawId) {
        UUID id;
        try { id = UUID.fromString(rawId); }
        catch (IllegalArgumentException ex) { throw new ContentNotFoundException(); }
        return repository.detail(id).map(this::item).orElseThrow(ContentNotFoundException::new);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public KanjiDetail kanjiDetail(String rawId) {
        UUID id;
        try { id = UUID.fromString(rawId); }
        catch (IllegalArgumentException ex) { throw new ContentNotFoundException(); }
        SkillsContentRepository.Row kanji = repository.detail(id)
                .filter(row -> row.kind().equals("kanji")).orElseThrow(ContentNotFoundException::new);
        JsonNode source = payload(kanji);
        List<KanjiVocabulary> vocabulary = repository.pinnedTargets(id, kanji.revision(),
                "related-vocabulary", "vocabulary").stream().map(row -> {
            JsonNode word = payload(row);
            List<KanjiExample> examples = repository.pinnedTargets(row.id(), row.revision(),
                    "example", "example").stream().filter(example -> {
                JsonNode data = payload(example);
                return ExampleFurigana.readyForKanjiDetail(data);
            }).map(example -> {
                JsonNode data = payload(example);
                return new KanjiExample(example.id(), example.key(), example.revision(),
                        data.path("textJa").asText(), data.path("translationVi").asText(), data.path("segments"));
            }).toList();
            return new KanjiVocabulary(row.id(), row.key(), row.revision(),
                    word.path("surface").asText(), word.path("reading").asText(),
                    word.path("glossVi").asText(), examples);
        }).toList();
        StrokeOrder stroke = repository.stroke(id, kanji.revision())
                .map(media -> new StrokeOrder("metadata_only", media.id(), media.revision(),
                        media.mimeType(), media.altTextVi()))
                .orElseGet(() -> new StrokeOrder("unavailable", null, null, null, null));
        return new KanjiDetail(id, kanji.key(), kanji.revision(), source.path("glyph").asText(),
                source.path("meaningVi").asText(), source.path("onReadings"),
                source.path("kunReadings"), vocabulary, stroke);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public FlashcardPage flashcards(String type, int limit, String after) {
        validate(type, limit, after);
        var rows = repository.cards(type, after == null ? "" : after, limit + 1);
        var page = rows.subList(0, Math.min(limit, rows.size()));
        return new FlashcardPage(page.stream().map(this::card).toList(),
                rows.size() > limit ? page.getLast().key() : null);
    }

    private Item item(SkillsContentRepository.Row row) {
        return new Item(row.id(), row.key(), row.revision(), row.kind(), row.displayJa(),
                row.displayVi(), publicPayload(row));
    }

    private JsonNode publicPayload(SkillsContentRepository.Row row) {
        JsonNode source = payload(row);
        ObjectNode result = json.createObjectNode();
        String[] fields = switch (row.kind()) {
            case "kana" -> new String[]{"script", "glyph", "reading"};
            case "vocabulary" -> new String[]{"surface", "reading", "glossVi", "usageNoteVi"};
            case "grammar" -> new String[]{"pattern", "explanationVi", "usageNoteVi"};
            case "kanji" -> new String[]{"glyph", "meaningVi", "onReadings", "kunReadings"};
            default -> throw new IllegalStateException("Unsupported published Skills kind.");
        };
        for (String field : fields) if (source.has(field)) result.set(field, source.get(field));
        return result;
    }

    private Flashcard card(SkillsContentRepository.Row row) {
        JsonNode payload = payload(row);
        return switch (row.kind()) {
            case "kana" -> new Flashcard(row.id(), row.key(), row.revision(), row.kind(),
                    payload.path("glyph").asText(), payload.path("reading").asText(), null);
            case "vocabulary" -> new Flashcard(row.id(), row.key(), row.revision(), row.kind(),
                    payload.path("surface").asText(), payload.path("glossVi").asText(),
                    payload.path("reading").asText(null));
            case "grammar" -> new Flashcard(row.id(), row.key(), row.revision(), row.kind(),
                    payload.path("pattern").asText(), payload.path("explanationVi").asText(), null);
            case "kanji" -> new Flashcard(row.id(), row.key(), row.revision(), row.kind(),
                    payload.path("glyph").asText(), payload.path("meaningVi").asText(), null);
            default -> throw new IllegalStateException("Unsupported published Skills kind.");
        };
    }

    private JsonNode payload(SkillsContentRepository.Row row) {
        try { return json.readTree(row.payload()); }
        catch (Exception ex) { throw new IllegalStateException("Published content payload is invalid.", ex); }
    }

    private void validate(String type, int limit, String after) {
        if (type != null && !KIND_SET.contains(type))
            throw new InvalidContentQueryException("Unknown skill type.");
        if (limit < 1 || limit > 50 || (after != null && after.length() > 200))
            throw new InvalidContentQueryException("Use limit 1–50 and a cursor of at most 200 characters.");
    }
}
