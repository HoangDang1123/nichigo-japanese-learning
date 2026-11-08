package com.nichigo.api.contentimport;

import tools.jackson.core.JacksonException;
import tools.jackson.core.StreamReadConstraints;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.core.json.JsonFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import com.nichigo.api.contentimport.CanonicalContentValidator.CanonicalRecord;
import com.nichigo.api.contentimport.CanonicalContentValidator.Context;
import org.springframework.stereotype.Service;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BiConsumer;

/** Side-effect-free package validation shared by offline dry-run and transactional import. */
@Service
public final class ContentPackageValidator {
    public static final int MAX_PACKAGE_BYTES = 10 * 1024 * 1024;
    public static final int MAX_FILE_BYTES = 4 * 1024 * 1024;
    public static final int MAX_RECORDS = CanonicalContentValidator.MAX_RECORDS;
    public static final int MAX_REFERENCES = CanonicalContentValidator.MAX_REFERENCES;
    public static final int MAX_DIAGNOSTICS = CanonicalContentValidator.MAX_DIAGNOSTICS;
    private static final Map<String, List<String>> CSV_HEADERS = Map.of(
            "rights", List.of("key", "originKind", "sourceLabel", "sourceUrl", "attribution", "permissionBasis", "evidenceRef"),
            "items", List.of("key", "kind", "displayTextJa", "displayTextVi", "payload", "jlptLevelCode", "communicationLevelCode", "knowledgeDomains", "languageSkills", "topics", "rightsKey", "mediaRefs"),
            "media", List.of("key", "kind", "storageKey", "checksumSha256", "mimeType", "altTextVi", "transcriptVi", "rightsKey"));
    private static final Set<String> JSON_CELLS = Set.of("payload", "knowledgeDomains", "languageSkills", "topics", "mediaRefs");

    private final ObjectMapper mapper;
    private final ContentSchemaValidator schemas;
    private final CanonicalContentValidator canonical;

    public ContentPackageValidator() {
        JsonFactory factory = JsonFactory.builder().streamReadConstraints(StreamReadConstraints.builder()
                .maxNestingDepth(40).maxStringLength(4000).maxNumberLength(100).build())
                .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).build();
        mapper = new ObjectMapper(factory);
        schemas = new ContentSchemaValidator(mapper);
        canonical = new CanonicalContentValidator(mapper);
    }

    /** Input is a trusted caller-provided file map, not arbitrary paths to open or URLs to fetch. */
    public ValidationReport dryRun(Map<String, byte[]> files, ContentReferenceResolver resolver) {
        return parse(files, resolver).report();
    }

    /** Shares the strict parser with the transactional importer. Invalid records are never returned. */
    public ParsedPackage parse(Map<String, byte[]> files, ContentReferenceResolver resolver) {
        Context context = new Context();
        if (files == null || !files.containsKey("manifest.json")) {
            context.error("PACKAGE_MANIFEST_REQUIRED", "manifest.json", null, null, null, "", null);
            return invalid(context);
        }
        if (files.size() > 6) {
            context.error("PACKAGE_FILE_COUNT", "manifest.json", null, null, "files", "/files", null);
            return invalid(context);
        }
        long bytes = 0;
        for (Map.Entry<String, byte[]> file : files.entrySet()) {
            boolean safe = safePath(file.getKey());
            if (!safe) context.error("PACKAGE_UNSAFE_PATH", "manifest.json", null, null, "files", "", null);
            if (file.getValue() == null) context.error("PACKAGE_FILE_MISSING", safe ? file.getKey() : "manifest.json", null, null, null, "", null);
            else {
                bytes += file.getValue().length;
                if (file.getValue().length > MAX_FILE_BYTES)
                    context.error("PACKAGE_FILE_LIMIT", safe ? file.getKey() : "manifest.json", null, null, null, "", null);
            }
        }
        if (bytes > MAX_PACKAGE_BYTES)
            context.error("PACKAGE_SIZE_LIMIT", "manifest.json", null, null, null, "", null);
        if (!context.errors.isEmpty()) return invalid(context);

        JsonNode manifest = parseJson(files.get("manifest.json"), "manifest.json", context);
        if (manifest == null) return invalid(context);
        schemas.validate("manifest", manifest, "", issue(context, "manifest.json", null, null, null));
        if (!"1.0".equals(text(manifest, "schemaVersion")))
            context.error("PACKAGE_VERSION_UNSUPPORTED", "manifest.json", null, null, "schemaVersion", "/schemaVersion", null);
        if (!context.errors.isEmpty()) return invalid(context);

        Map<String, String> declared = new LinkedHashMap<>();
        for (JsonNode entry : manifest.path("files")) {
            String path = text(entry, "path"), type = text(entry, "type");
            if (path == null || type == null) continue;
            if (!safePath(path) || path.equals("manifest.json")) {
                context.error("PACKAGE_UNSAFE_PATH", "manifest.json", null, null, "files", "/files", null);
                continue;
            }
            if (!path.endsWith(CSV_HEADERS.containsKey(type) ? ".csv" : ".json"))
                context.error("PACKAGE_FORMAT_MISMATCH", "manifest.json", null, null, "files", "/files", null);
            if (declared.putIfAbsent(path, type) != null || declared.containsValue(type) &&
                    declared.entrySet().stream().filter(e -> e.getValue().equals(type)).count() > 1)
                context.error("PACKAGE_DUPLICATE_FILE", "manifest.json", null, null, "files", "/files", null);
            if (!files.containsKey(path)) context.error("PACKAGE_FILE_MISSING", path, null, null, null, "", null);
        }
        for (String path : files.keySet()) if (!path.equals("manifest.json") && !declared.containsKey(path))
            context.error("PACKAGE_UNDECLARED_FILE", path, null, null, null, "", null);
        if (!context.errors.isEmpty()) return invalid(context);

        Map<String, List<CanonicalRecord>> entries = new HashMap<>();
        for (String type : List.of("rights", "media", "items", "lessons", "paths")) {
            String path = declared.entrySet().stream().filter(e -> e.getValue().equals(type))
                    .map(Map.Entry::getKey).findFirst().orElse(null);
            if (path == null) continue;
            entries.put(type, CSV_HEADERS.containsKey(type)
                    ? parseCsv(files.get(path), path, type, context)
                    : parseArrayFile(files.get(path), path, type, context));
        }
        if (context.truncated) return invalid(context);
        canonical.validate(entries, resolver, context);
        ValidationReport report = context.report();
        return report.valid() ? new ParsedPackage(report, manifest, Map.copyOf(entries))
                : new ParsedPackage(report, null, Map.of());
    }

    private ParsedPackage invalid(Context context) {
        return new ParsedPackage(context.report(), null, Map.of());
    }

    public record ParsedPackage(ValidationReport report, JsonNode manifest,
                                Map<String, List<CanonicalRecord>> records) {}

    private List<CanonicalRecord> parseCsv(byte[] bytes, String file, String type, Context context) {
        String source = decode(bytes, file, context);
        if (source == null) return List.of();
        List<String> headers = CSV_HEADERS.get(type);
        StrictCsv.Result parsed = StrictCsv.parse(source, Set.copyOf(headers.stream()
                .filter(h -> switch (type) {
                    case "rights" -> List.of("key", "originKind", "sourceLabel", "attribution", "permissionBasis").contains(h);
                    case "media" -> List.of("key", "kind", "storageKey", "checksumSha256", "mimeType", "rightsKey").contains(h);
                    default -> List.of("key", "kind", "payload", "rightsKey").contains(h);
                }).toList()), Set.copyOf(headers), MAX_RECORDS);
        for (StrictCsv.Problem problem : parsed.problems())
            context.error(problem.code(), file, problem.line(), problem.record(), problem.field(), "", null);
        List<CanonicalRecord> rows = new ArrayList<>();
        for (StrictCsv.Row row : parsed.rows()) {
            ObjectNode node = mapper.createObjectNode();
            for (Map.Entry<String, String> cell : row.fields().entrySet()) {
                if (cell.getValue().isEmpty()) continue;
                if (JSON_CELLS.contains(cell.getKey())) {
                    try { node.set(cell.getKey(), mapper.readTree(cell.getValue())); }
                    catch (JacksonException ex) {
                        context.error("CSV_INVALID_JSON_CELL", file, row.line(), row.record(), cell.getKey(),
                                "/" + cell.getKey(), row.fields().get("key"));
                    }
                } else node.put(cell.getKey(), cell.getValue());
            }
            rows.add(new CanonicalRecord(file, row.line(), row.record(), "/" + (row.record() - 2), node));
        }
        return rows;
    }

    private List<CanonicalRecord> parseArrayFile(byte[] bytes, String file, String type, Context context) {
        JsonNode root = parseJson(bytes, file, context);
        if (root == null) return List.of();
        String arrayName = type;
        if (!root.isObject() || !root.has("schemaVersion") || !root.has(arrayName)
                || root.size() != 2 || !root.path(arrayName).isArray()) {
            context.error("PACKAGE_JSON_SHAPE", file, null, null, null, "", null);
            return List.of();
        }
        if (!"1.0".equals(text(root, "schemaVersion"))) {
            context.error("PACKAGE_VERSION_UNSUPPORTED", file, null, null, "schemaVersion", "/schemaVersion", null);
            return List.of();
        }
        if (root.path(arrayName).size() > MAX_RECORDS) {
            context.error("PACKAGE_RECORD_LIMIT", file, null, null, arrayName, "/" + arrayName, null);
            return List.of();
        }
        List<CanonicalRecord> result = new ArrayList<>();
        for (int i = 0; i < root.path(arrayName).size(); i++)
            result.add(new CanonicalRecord(file, null, i + 1, "/" + arrayName + "/" + i, root.path(arrayName).get(i)));
        return result;
    }

    private JsonNode parseJson(byte[] bytes, String file, Context context) {
        String source = decode(bytes, file, context);
        if (source == null) return null;
        try {
            JsonNode parsed = mapper.readTree(source);
            if (parsed == null || parsed.isMissingNode()) {
                context.error("JSON_INVALID", file, 1, null, null, "", null);
                return null;
            }
            return parsed;
        }
        catch (JacksonException ex) {
            Integer line = ex.getLocation() == null ? null : ex.getLocation().getLineNr();
            context.error(ex.getOriginalMessage().toLowerCase(java.util.Locale.ROOT).contains("duplicate")
                            ? "JSON_DUPLICATE_KEY" : "JSON_INVALID",
                    file, line, null, null, "", null);
            return null;
        }
    }

    private String decode(byte[] bytes, String file, Context context) {
        try { return StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT)
                .decode(ByteBuffer.wrap(bytes)).toString(); }
        catch (CharacterCodingException ex) {
            context.error("PACKAGE_INVALID_UTF8", file, null, null, null, "", null);
            return null;
        }
    }

    private static boolean safePath(String path) {
        return path != null && path.matches("[a-z][a-z0-9-]*\\.(csv|json)") && path.length() <= 80;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isTextual() ? value.asText() : null;
    }

    private BiConsumer<String, String> issue(Context context, String file, Integer line, Integer row, String key) {
        return (code, pointer) -> context.error(code, file, line, row,
                pointer.substring(pointer.lastIndexOf('/') + 1), pointer, key);
    }

}
