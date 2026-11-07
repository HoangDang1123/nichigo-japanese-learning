package com.nichigo.api.contentimport;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BiConsumer;

/** Validates normalized content records without requiring CSV, JSON files, or a CLI. */
public final class CanonicalContentValidator {
    public static final int MAX_RECORDS = 5000;
    public static final int MAX_REFERENCES = 20000;
    public static final int MAX_DIAGNOSTICS = 200;
    private static final List<String> FILE_TYPES = List.of("rights", "media", "items", "lessons", "paths");
    private final ContentSchemaValidator schemas;

    public CanonicalContentValidator(ObjectMapper mapper) {
        this.schemas = new ContentSchemaValidator(mapper);
    }

    public ValidationReport validate(Map<String, List<CanonicalRecord>> groups,
                                     ContentReferenceResolver resolver) {
        Context context = new Context();
        validate(groups, resolver, context);
        return context.report();
    }

    void validate(Map<String, List<CanonicalRecord>> groups, ContentReferenceResolver resolver, Context context) {
        if (groups == null || groups.entrySet().stream().anyMatch(group ->
                !FILE_TYPES.contains(group.getKey()) || group.getValue() == null ||
                group.getValue().stream().anyMatch(record -> record == null || record.node() == null ||
                        record.pointer() == null || record.file() == null))) {
            context.error("CONTENT_INVALID_RECORD_SET", "records", null, null, null, "", null);
            return;
        }
        validateEntries(groups, context);
        validateReferences(groups, resolver, context);
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isTextual() ? value.asText() : null;
    }

    private BiConsumer<String, String> issue(Context context, String file, Integer line, Integer row, String key) {
        return (code, pointer) -> context.error(code, file, line, row,
                pointer.substring(pointer.lastIndexOf('/') + 1), pointer, key);
    }

    private void validateEntries(Map<String, List<CanonicalRecord>> groups, Context context) {
        int total = groups.values().stream().mapToInt(List::size).sum();
        if (total > MAX_RECORDS) context.error("PACKAGE_RECORD_LIMIT", "manifest.json", null, null, null, "", null);
        for (String type : FILE_TYPES) {
            Set<String> keys = new HashSet<>();
            for (CanonicalRecord entry : groups.getOrDefault(type, List.of())) {
                JsonNode node = entry.node();
                String key = entry.key();
                schemas.validate(type.equals("items") ? "item" : type.equals("lessons") ? "lesson"
                        : type.equals("paths") ? "path" : type.equals("media") ? "media" : "rights",
                        node, entry.pointer(), issue(context, entry.file(), entry.line(), entry.row(), key));
                if (key != null && !keys.add(key)) error(context, "CONTENT_DUPLICATE_KEY", entry, "/key");
                if (type.equals("items")) validateItem(entry, context);
                if (type.equals("media")) validateMedia(entry, context);
                if (type.equals("rights")) validateRights(entry, context);
                if (type.equals("lessons")) validateLesson(entry, context);
                if (type.equals("paths")) validatePath(entry, context);
            }
        }
    }

    private void validateItem(CanonicalRecord entry, Context context) {
        JsonNode item = entry.node();
        String kind = text(item, "kind");
        if (kind != null && List.of("kana", "vocabulary", "grammar", "kanji", "example", "dialogue").contains(kind)) {
            schemas.validate(kind, item.path("payload"), entry.pointer() + "/payload",
                    issue(context, entry.file(), entry.line(), entry.row(), entry.key()));
            JsonNode payload = item.path("payload");
            if (kind.equals("kana") && payload.path("glyph").isTextual()) {
                String glyph = payload.path("glyph").asText();
                boolean hiragana = "hiragana".equals(text(payload, "script"));
                boolean katakana = "katakana".equals(text(payload, "script"));
                if (glyph.codePointCount(0, glyph.length()) > 8 || glyph.codePoints().anyMatch(cp ->
                        !(hiragana && cp >= 0x3040 && cp <= 0x309F)
                                && !(katakana && cp >= 0x30A0 && cp <= 0x30FF)))
                    error(context, "KANA_SCRIPT_MISMATCH", entry, "/payload/glyph");
            }
            if (kind.equals("kanji") && payload.path("glyph").isTextual()
                    && payload.path("glyph").asText().codePoints().anyMatch(cp ->
                    Character.UnicodeScript.of(cp) != Character.UnicodeScript.HAN))
                error(context, "KANJI_GLYPH_INVALID", entry, "/payload/glyph");
            if (kind.equals("kanji")) {
                duplicateStrings(payload.path("onReadings"), entry, "/payload/onReadings", context);
                duplicateStrings(payload.path("kunReadings"), entry, "/payload/kunReadings", context);
            }
        }
        duplicatePositions(item.path("mediaRefs"), entry, "/mediaRefs", "position", context);
        for (String tag : List.of("knowledgeDomains", "languageSkills", "topics"))
            duplicateStrings(item.path(tag), entry, "/" + tag, context);
    }

    private void validateMedia(CanonicalRecord entry, Context context) {
        JsonNode node = entry.node();
        String kind = text(node, "kind"), mime = text(node, "mimeType"), storage = text(node, "storageKey");
        if (storage != null && (storage.startsWith("/") || storage.contains("..") || storage.contains("\\")
                || storage.matches("(?i)^[a-z]+:.*")))
            error(context, "MEDIA_STORAGE_KEY_UNSAFE", entry, "/storageKey");
        if (kind != null && mime != null && !(switch (kind) {
            case "audio" -> List.of("audio/mpeg", "audio/ogg", "audio/wav").contains(mime);
            case "image" -> List.of("image/png", "image/jpeg", "image/webp", "image/svg+xml").contains(mime);
            case "writing" -> List.of("image/png", "image/svg+xml", "application/json").contains(mime);
            default -> false;
        })) error(context, "MEDIA_MIME_MISMATCH", entry, "/mimeType");
    }

    private void validateRights(CanonicalRecord entry, Context context) {
        JsonNode node = entry.node();
        String url = text(node, "sourceUrl");
        if (url != null && !url.matches("https://[^\\s]+"))
            error(context, "RIGHTS_SOURCE_URL_INVALID", entry, "/sourceUrl");
        if ("licensed".equals(text(node, "originKind")) && text(node, "evidenceRef") == null)
            error(context, "RIGHTS_EVIDENCE_REQUIRED", entry, "/evidenceRef");
    }

    private void validateLesson(CanonicalRecord entry, Context context) {
        JsonNode node = entry.node();
        duplicatePositions(node.path("objectives"), entry, "/objectives", "position", context);
        duplicatePositions(node.path("sections"), entry, "/sections", "position", context);
        duplicateKeys(node.path("sections"), entry, "/sections", context);
        for (int i = 0; i < node.path("sections").size(); i++)
            duplicatePositions(node.path("sections").get(i).path("items"), entry,
                    "/sections/" + i + "/items", "position", context);
        duplicateStrings(node.path("prerequisites"), entry, "/prerequisites", context);
        if (entry.key() != null) for (JsonNode prior : node.path("prerequisites"))
            if (prior.isTextual() && entry.key().equals(prior.asText()))
                error(context, "LESSON_SELF_PREREQUISITE", entry, "/prerequisites");
    }

    private void validatePath(CanonicalRecord entry, Context context) {
        JsonNode path = entry.node();
        duplicatePositions(path.path("stages"), entry, "/stages", "position", context);
        duplicateKeys(path.path("stages"), entry, "/stages", context);
        for (int si = 0; si < path.path("stages").size(); si++) {
            JsonNode stage = path.path("stages").get(si);
            String root = "/stages/" + si;
            duplicatePositions(stage.path("chapters"), entry, root + "/chapters", "position", context);
            duplicateKeys(stage.path("chapters"), entry, root + "/chapters", context);
            for (int ci = 0; ci < stage.path("chapters").size(); ci++) {
                JsonNode chapter = stage.path("chapters").get(ci);
                String child = root + "/chapters/" + ci + "/lessons";
                duplicatePositions(chapter.path("lessons"), entry, child, "position", context);
                duplicateKeys(chapter.path("lessons"), entry, child, context);
                Set<String> lessons = new HashSet<>();
                for (JsonNode placement : chapter.path("lessons")) {
                    String lessonKey = text(placement, "lessonKey");
                    if (lessonKey != null && !lessons.add(lessonKey))
                        error(context, "PATH_DUPLICATE_LESSON_PLACEMENT", entry, child);
                }
            }
        }
    }

    private void duplicatePositions(JsonNode array, CanonicalRecord entry, String suffix, String field, Context context) {
        if (!array.isArray()) return;
        Set<Long> seen = new HashSet<>();
        for (int i = 0; i < array.size(); i++) {
            JsonNode position = array.get(i).path(field);
            if (position.isIntegralNumber() && !seen.add(position.longValue()))
                error(context, "CONTENT_DUPLICATE_POSITION", entry, suffix + "/" + i + "/" + field);
        }
    }

    private void duplicateKeys(JsonNode array, CanonicalRecord entry, String suffix, Context context) {
        if (!array.isArray()) return;
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < array.size(); i++) {
            String key = text(array.get(i), "key");
            if (key != null && !seen.add(key))
                error(context, "CONTENT_DUPLICATE_KEY", entry, suffix + "/" + i + "/key");
        }
    }

    private void duplicateStrings(JsonNode array, CanonicalRecord entry, String suffix, Context context) {
        if (!array.isArray()) return;
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < array.size(); i++)
            if (array.get(i).isTextual() && !seen.add(array.get(i).asText()))
                error(context, "CONTENT_DUPLICATE_VALUE", entry, suffix + "/" + i);
    }

    private void error(Context context, String code, CanonicalRecord entry, String suffix) {
        String pointer = entry.pointer() + suffix;
        context.error(code, entry.file(), entry.line(), entry.row(),
                suffix.substring(suffix.lastIndexOf('/') + 1), pointer, entry.key());
    }

    private void validateReferences(Map<String, List<CanonicalRecord>> groups, ContentReferenceResolver resolver, Context context) {
        Map<String, CanonicalRecord> items = index(groups.getOrDefault("items", List.of()));
        Map<String, CanonicalRecord> lessons = index(groups.getOrDefault("lessons", List.of()));
        Map<String, CanonicalRecord> media = index(groups.getOrDefault("media", List.of()));
        Map<String, CanonicalRecord> rights = index(groups.getOrDefault("rights", List.of()));
        Set<String> itemKeys = new HashSet<>(items.keySet()), lessonKeys = new HashSet<>(lessons.keySet());
        Set<String> mediaKeys = new HashSet<>(media.keySet()), rightsKeys = new HashSet<>(rights.keySet());
        for (String type : FILE_TYPES) for (CanonicalRecord entry : groups.getOrDefault(type, List.of())) {
            add(rightsKeys, text(entry.node(), "rightsKey"));
            if (entry.node().has("payload")) {
                JsonNode payload = entry.node().path("payload");
                for (String field : List.of("exampleRefs", "itemRefs")) for (JsonNode ref : payload.path(field))
                    if (ref.isTextual()) add(itemKeys, ref.asText());
                for (JsonNode turn : payload.path("turns")) add(mediaKeys, text(turn, "audioKey"));
                for (JsonNode ref : entry.node().path("mediaRefs")) add(mediaKeys, text(ref, "mediaKey"));
            }
            if (entry.node().has("sections")) {
                for (JsonNode section : entry.node().path("sections"))
                    for (JsonNode ref : section.path("items")) add(itemKeys, text(ref, "itemKey"));
                for (JsonNode prior : entry.node().path("prerequisites"))
                    if (prior.isTextual()) add(lessonKeys, prior.asText());
            }
            if (entry.node().has("stages")) for (JsonNode stage : entry.node().path("stages")) {
                add(rightsKeys, text(stage, "rightsKey"));
                for (JsonNode chapter : stage.path("chapters")) {
                    add(rightsKeys, text(chapter, "rightsKey"));
                    for (JsonNode placement : chapter.path("lessons")) add(lessonKeys, text(placement, "lessonKey"));
                }
            }
        }
        int references = itemKeys.size() + lessonKeys.size() + mediaKeys.size() + rightsKeys.size();
        for (CanonicalRecord entry : groups.getOrDefault("items", List.of())) {
            JsonNode payload = entry.node().path("payload");
            references += entry.node().path("mediaRefs").size() + payload.path("exampleRefs").size()
                    + payload.path("itemRefs").size();
            for (JsonNode turn : payload.path("turns")) if (turn.has("audioKey")) references++;
        }
        for (CanonicalRecord entry : groups.getOrDefault("lessons", List.of())) {
            references += entry.node().path("prerequisites").size();
            for (JsonNode section : entry.node().path("sections")) references += section.path("items").size();
        }
        for (CanonicalRecord entry : groups.getOrDefault("paths", List.of()))
            for (JsonNode stage : entry.node().path("stages"))
                for (JsonNode chapter : stage.path("chapters")) references += chapter.path("lessons").size();
        if (references > MAX_REFERENCES) {
            context.error("PACKAGE_REFERENCE_LIMIT", "manifest.json", null, null, null, "", null);
            return;
        }
        ContentReferenceResolver.Snapshot existing;
        try {
            existing = resolver == null ? ContentReferenceResolver.Snapshot.empty() :
                    resolver.resolve(new ContentReferenceResolver.Request(itemKeys, lessonKeys, mediaKeys, rightsKeys));
        } catch (RuntimeException ex) {
            context.error("REFERENCE_LOOKUP_UNAVAILABLE", "manifest.json", null, null, null, "", null);
            return;
        }
        for (CanonicalRecord entry : groups.getOrDefault("items", List.of())) {
            String key = entry.key();
            if (key != null && existing.itemKinds().containsKey(key)
                    && !existing.itemKinds().get(key).equals(text(entry.node(), "kind")))
                error(context, "CONTENT_KIND_CONFLICT", entry, "/kind");
            JsonNode payload = entry.node().path("payload");
            for (String field : List.of("exampleRefs", "itemRefs")) {
                for (int i = 0; i < payload.path(field).size(); i++) {
                    JsonNode ref = payload.path(field).get(i);
                    if (!ref.isTextual()) continue;
                    String target = ref.asText();
                    reference(target, items, existing.itemKinds().keySet(), resolver, entry,
                            "/payload/" + field + "/" + i, context);
                    if (field.equals("exampleRefs")) {
                        String targetKind = items.containsKey(target) ? text(items.get(target).node(), "kind")
                                : existing.itemKinds().get(target);
                        if (targetKind != null && !targetKind.equals("example"))
                            error(context, "CONTENT_REFERENCE_KIND", entry, "/payload/" + field + "/" + i);
                    }
                }
            }
            for (int i = 0; i < entry.node().path("mediaRefs").size(); i++)
                reference(text(entry.node().path("mediaRefs").get(i), "mediaKey"), media,
                        existing.mediaKinds().keySet(), resolver, entry, "/mediaRefs/" + i + "/mediaKey", context);
            for (int i = 0; i < payload.path("turns").size(); i++) {
                String audio = text(payload.path("turns").get(i), "audioKey");
                if (audio != null) reference(audio, media, existing.mediaKinds().keySet(), resolver, entry,
                        "/payload/turns/" + i + "/audioKey", context);
            }
        }
        Map<String, Set<String>> graph = new HashMap<>(existing.lessonPrerequisites());
        for (CanonicalRecord entry : groups.getOrDefault("lessons", List.of())) {
            Set<String> priors = new HashSet<>();
            for (int i = 0; i < entry.node().path("prerequisites").size(); i++) {
                JsonNode ref = entry.node().path("prerequisites").get(i);
                if (!ref.isTextual()) continue;
                priors.add(ref.asText());
                reference(ref.asText(), lessons, existing.lessonKeys(), resolver, entry,
                        "/prerequisites/" + i, context);
            }
            if (entry.key() != null) graph.put(entry.key(), priors);
            for (int si = 0; si < entry.node().path("sections").size(); si++) {
                JsonNode section = entry.node().path("sections").get(si);
                for (int ii = 0; ii < section.path("items").size(); ii++)
                    reference(text(section.path("items").get(ii), "itemKey"), items,
                            existing.itemKinds().keySet(), resolver, entry,
                            "/sections/" + si + "/items/" + ii + "/itemKey", context);
            }
        }
        if (hasCycle(graph)) context.error("LESSON_PREREQUISITE_CYCLE", "lessons.json", null, null,
                "prerequisites", "/lessons", null);
        for (CanonicalRecord entry : groups.getOrDefault("paths", List.of())) {
            for (int si = 0; si < entry.node().path("stages").size(); si++) {
                JsonNode stage = entry.node().path("stages").get(si);
                for (int ci = 0; ci < stage.path("chapters").size(); ci++) {
                    JsonNode chapter = stage.path("chapters").get(ci);
                    for (int pi = 0; pi < chapter.path("lessons").size(); pi++)
                        reference(text(chapter.path("lessons").get(pi), "lessonKey"), lessons,
                                existing.lessonKeys(), resolver, entry,
                                "/stages/" + si + "/chapters/" + ci + "/lessons/" + pi + "/lessonKey", context);
                }
            }
        }
        for (String type : FILE_TYPES) for (CanonicalRecord entry : groups.getOrDefault(type, List.of())) {
            if (!entry.node().has("originKind")) {
                checkRight(text(entry.node(), "rightsKey"), entry, "/rightsKey", rights,
                        existing.rightsStatuses(), resolver, context);
                if (entry.node().has("stages")) for (int si = 0; si < entry.node().path("stages").size(); si++) {
                    JsonNode stage = entry.node().path("stages").get(si);
                    checkRight(text(stage, "rightsKey"), entry, "/stages/" + si + "/rightsKey",
                            rights, existing.rightsStatuses(), resolver, context);
                    for (int ci = 0; ci < stage.path("chapters").size(); ci++)
                        checkRight(text(stage.path("chapters").get(ci), "rightsKey"), entry,
                                "/stages/" + si + "/chapters/" + ci + "/rightsKey",
                                rights, existing.rightsStatuses(), resolver, context);
                }
            }
        }
    }

    private Map<String, CanonicalRecord> index(List<CanonicalRecord> entries) {
        Map<String, CanonicalRecord> result = new HashMap<>();
        for (CanonicalRecord entry : entries) if (entry.key() != null) result.putIfAbsent(entry.key(), entry);
        return result;
    }

    private static void add(Set<String> keys, String key) { if (key != null) keys.add(key); }

    private void reference(String key, Map<String, CanonicalRecord> local, Set<String> existing,
                           ContentReferenceResolver resolver, CanonicalRecord source, String suffix, Context context) {
        if (key == null || local.containsKey(key) || existing.contains(key)) return;
        if (resolver == null) context.warn("EXTERNAL_REFERENCE_UNRESOLVED", source.file(), source.line(),
                source.row(), suffix.substring(suffix.lastIndexOf('/') + 1), source.pointer() + suffix, source.key());
        else error(context, "CONTENT_REFERENCE_MISSING", source, suffix);
    }

    private void checkRight(String key, CanonicalRecord source, String suffix, Map<String, CanonicalRecord> local,
                            Map<String, String> existing, ContentReferenceResolver resolver, Context context) {
        if (key == null) return; // structural validation already reports a required field
        if (local.containsKey(key)) {
            context.warn("RIGHTS_REVIEW_REQUIRED", source.file(), source.line(), source.row(),
                    "rightsKey", source.pointer() + suffix, source.key());
        } else if (existing.containsKey(key)) {
            String status = existing.get(key);
            if (!"cleared".equals(status)) context.warn("RIGHTS_" + status.toUpperCase(), source.file(),
                    source.line(), source.row(), "rightsKey", source.pointer() + suffix, source.key());
        } else if (resolver == null) context.warn("EXTERNAL_RIGHTS_UNRESOLVED", source.file(),
                source.line(), source.row(), "rightsKey", source.pointer() + suffix, source.key());
        else error(context, "RIGHTS_REFERENCE_MISSING", source, suffix);
    }

    private boolean hasCycle(Map<String, Set<String>> graph) {
        Map<String, Integer> indegrees = new HashMap<>();
        for (Map.Entry<String, Set<String>> node : graph.entrySet()) {
            indegrees.putIfAbsent(node.getKey(), 0);
            for (String prior : node.getValue()) indegrees.merge(prior, 1, Integer::sum);
        }
        java.util.ArrayDeque<String> queue = new java.util.ArrayDeque<>();
        indegrees.forEach((key, count) -> { if (count == 0) queue.add(key); });
        int visited = 0;
        while (!queue.isEmpty()) {
            String current = queue.remove(); visited++;
            for (String prior : graph.getOrDefault(current, Set.of()))
                if (indegrees.merge(prior, -1, Integer::sum) == 0) queue.add(prior);
        }
        return visited != indegrees.size();
    }

    public record CanonicalRecord(String file, Integer line, Integer row, String pointer, JsonNode node) {
        public String key() { return text(node, "key"); }
    }

    static final class Context {
        final List<ValidationReport.Diagnostic> errors = new ArrayList<>();
        final List<ValidationReport.Diagnostic> warnings = new ArrayList<>();
        // Dry-run has no operator authorization, live publication locks, or revision sealing.
        boolean publicationReady = false;
        boolean truncated = false;
        void error(String code, String file, Integer line, Integer row, String field, String pointer, String key) {
            add(code, "error", file, line, row, field, pointer, key);
        }
        void warn(String code, String file, Integer line, Integer row, String field, String pointer, String key) {
            publicationReady = false;
            add(code, "warning", file, line, row, field, pointer, key);
        }
        private void add(String code, String severity, String file, Integer line, Integer row,
                         String field, String pointer, String key) {
            if (errors.size() + warnings.size() >= MAX_DIAGNOSTICS) { truncated = true; return; }
            String location = pointer == null || pointer.isEmpty() ? "this record" : pointer;
            String message = switch (code) {
                case "CONTENT_REQUIRED_FIELD" -> "Required field is missing at " + location + ".";
                case "CONTENT_INVALID_TYPE" -> "Field has the wrong type at " + location + ".";
                case "CONTENT_REFERENCE_MISSING", "RIGHTS_REFERENCE_MISSING" ->
                        "Reference does not resolve at " + location + ".";
                case "CONTENT_DUPLICATE_POSITION" -> "Sibling position is repeated at " + location + ".";
                case "CONTENT_DUPLICATE_KEY" -> "Stable key is repeated at " + location + ".";
                case "RIGHTS_REVIEW_REQUIRED" -> "Author-supplied rights need authorized review before publication.";
                case "RIGHTS_REVOKED" -> "Referenced rights have been revoked; publication is unavailable.";
                case "RIGHTS_UNVERIFIED" -> "Referenced rights are not cleared for publication.";
                case "EXTERNAL_REFERENCE_UNRESOLVED", "EXTERNAL_RIGHTS_UNRESOLVED" ->
                        "Offline validation cannot resolve this external reference at " + location + ".";
                default -> code.replace('_', ' ').toLowerCase() + " at " + location + ".";
            };
            var diagnostic = new ValidationReport.Diagnostic(code, severity, file, line, row,
                    field, pointer, key, message);
            (severity.equals("error") ? errors : warnings).add(diagnostic);
        }
        ValidationReport report() {
            Comparator<ValidationReport.Diagnostic> order = Comparator
                    .comparing(ValidationReport.Diagnostic::file, Comparator.nullsFirst(String::compareTo))
                    .thenComparing(ValidationReport.Diagnostic::row, Comparator.nullsFirst(Integer::compareTo))
                    .thenComparing(ValidationReport.Diagnostic::pointer, Comparator.nullsFirst(String::compareTo))
                    .thenComparing(ValidationReport.Diagnostic::code);
            errors.sort(order); warnings.sort(order);
            return new ValidationReport(errors.isEmpty() && !truncated, errors.isEmpty() && publicationReady && !truncated,
                    truncated, List.copyOf(errors), List.copyOf(warnings));
        }
    }
}
