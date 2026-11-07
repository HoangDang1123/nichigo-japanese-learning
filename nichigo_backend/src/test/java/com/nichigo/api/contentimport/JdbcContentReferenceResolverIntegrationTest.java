package com.nichigo.api.contentimport;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Run only with DB_URL pointing to a disposable PostgreSQL schema. */
@SpringBootTest
class JdbcContentReferenceResolverIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ContentReferenceResolver resolver;
    private final ContentPackageValidator validator = new ContentPackageValidator();

    private void requireIsolatedSchema() {
        String schema = jdbc.queryForObject("SELECT current_schema()", String.class);
        assertNotNull(schema);
        assertTrue(schema.startsWith("jpn021_"), "Refusing to insert test fixtures outside an isolated schema");
    }

    private Map<String, byte[]> example() throws Exception {
        Map<String, byte[]> files = new HashMap<>();
        Path source = Path.of("..", "content", "examples", "v1", "valid");
        for (String name : new String[]{"manifest.json", "rights.csv", "items.csv", "lessons.json", "paths.json"})
            files.put(name, Files.readAllBytes(source.resolve(name)));
        return files;
    }

    private void replace(Map<String, byte[]> files, String file, String from, String to) {
        String source = new String(files.get(file), StandardCharsets.UTF_8);
        assertTrue(source.contains(from), from);
        files.put(file, source.replace(from, to).getBytes(StandardCharsets.UTF_8));
    }

    private void expectError(Map<String, byte[]> files, String code) {
        ValidationReport report = validator.dryRun(files, resolver);
        assertTrue(report.errors().stream().anyMatch(d -> d.code().equals(code)), report.toString());
    }

    @Test void resolvesExistingIdentitiesAndLeavesEditorialDataUntouched() throws Exception {
        requireIsolatedSchema();
        UUID clear = rights("db-clear", "cleared");
        rights("db-unverified", "unverified");
        rights("db-revoked", "revoked");
        UUID item = UUID.randomUUID(), lesson = UUID.randomUUID(), media = UUID.randomUUID();
        jdbc.update("INSERT INTO content_items(id,stable_key,kind,payload,rights_id) VALUES(?,?,'kana','{}'::jsonb,?)",
                item, "db-item", clear);
        jdbc.update("INSERT INTO lessons(id,stable_key,slug,title_vi,rights_id) VALUES(?,?,?,?,?)",
                lesson, "db-lesson", "db-lesson", "Test lesson", clear);
        jdbc.update("INSERT INTO media_assets(id,stable_key,media_kind,storage_key,checksum_sha256,mime_type,rights_id) " +
                        "VALUES(?,?,'audio',?,?,'audio/mpeg',?)",
                media, "db-media", "test/db-media", "a".repeat(64), clear);
        long itemCount = count("content_items"), lessonCount = count("lessons"), mediaCount = count("media_assets");
        long rightsCount = count("content_rights");

        ContentReferenceResolver.Snapshot snapshot = resolver.resolve(new ContentReferenceResolver.Request(
                Set.of("db-item", "missing-item"), Set.of("db-lesson", "missing-lesson"),
                Set.of("db-media", "missing-media"),
                Set.of("db-clear", "db-unverified", "db-revoked", "missing-rights")));
        assertEquals("kana", snapshot.itemKinds().get("db-item"));
        assertFalse(snapshot.itemKinds().containsKey("missing-item"));
        assertTrue(snapshot.lessonKeys().contains("db-lesson"));
        assertFalse(snapshot.lessonKeys().contains("missing-lesson"));
        assertEquals("audio", snapshot.mediaKinds().get("db-media"));
        assertFalse(snapshot.mediaKinds().containsKey("missing-media"));
        assertEquals("cleared", snapshot.rightsStatuses().get("db-clear"));
        assertEquals("unverified", snapshot.rightsStatuses().get("db-unverified"));
        assertEquals("revoked", snapshot.rightsStatuses().get("db-revoked"));
        assertFalse(snapshot.rightsStatuses().containsKey("missing-rights"));

        Map<String, byte[]> local = example();
        assertTrue(validator.dryRun(local, resolver).valid(), "Package-local references must resolve first");
        assertFalse(validator.dryRun(local, null).publicationReady(), "Offline validation cannot clear rights");

        Map<String, byte[]> external = example();
        external.remove("rights.csv");
        replace(external, "manifest.json", "    {\"path\": \"rights.csv\", \"type\": \"rights\"},\n", "");
        for (String file : new String[]{"items.csv", "lessons.json", "paths.json"})
            replace(external, file, "original-sample", "db-clear");
        assertTrue(validator.dryRun(external, resolver).valid());
        assertFalse(validator.dryRun(external, null).publicationReady());
        Map<String, byte[]> existingItem = withReplacement(external, "lessons.json",
                "\"itemKey\": \"kana-a\"", "\"itemKey\": \"db-item\"");
        assertTrue(validator.dryRun(existingItem, resolver).valid());
        Map<String, byte[]> existingLesson = withReplacement(external, "paths.json",
                "\"lessonKey\": \"intro-kana-a\"", "\"lessonKey\": \"db-lesson\"");
        assertTrue(validator.dryRun(existingLesson, resolver).valid());
        expectError(withReplacement(external, "lessons.json", "\"itemKey\": \"kana-a\"",
                "\"itemKey\": \"missing-item\""), "CONTENT_REFERENCE_MISSING");
        expectError(withReplacement(external, "paths.json", "\"lessonKey\": \"intro-kana-a\"",
                "\"lessonKey\": \"missing-lesson\""), "CONTENT_REFERENCE_MISSING");
        expectError(withReplacement(external, "items.csv", "db-clear", "missing-rights"), "RIGHTS_REFERENCE_MISSING");
        for (String status : new String[]{"unverified", "revoked"}) {
            Map<String, byte[]> changed = withReplacement(external, "items.csv", "db-clear", "db-" + status);
            ValidationReport report = validator.dryRun(changed, resolver);
            assertFalse(report.publicationReady());
            assertTrue(report.warnings().stream().anyMatch(d -> d.code().equals("RIGHTS_" + status.toUpperCase())), report.toString());
        }
        Map<String, byte[]> missingMedia = withMediaReference(external, "missing-media");
        expectError(missingMedia, "CONTENT_REFERENCE_MISSING");
        assertTrue(validator.dryRun(withMediaReference(external, "db-media"), resolver).valid());

        ByteArrayOutputStream cliOutput = new ByteArrayOutputStream();
        assertEquals(0, ContentDryRunCli.run(new String[]{Path.of("..", "content", "examples", "v1", "valid").toString()},
                new PrintStream(cliOutput, true, StandardCharsets.UTF_8)));
        assertTrue(cliOutput.toString(StandardCharsets.UTF_8).contains("\"publicationReady\":false"));

        assertEquals(itemCount, count("content_items"));
        assertEquals(lessonCount, count("lessons"));
        assertEquals(mediaCount, count("media_assets"));
        assertEquals(rightsCount, count("content_rights"));
        assertEquals(1L, jdbc.queryForObject("SELECT edit_version FROM content_items WHERE id=?", Long.class, item));
        assertNull(jdbc.queryForObject("SELECT published_revision FROM content_items WHERE id=?", Integer.class, item));
    }

    private UUID rights(String key, String status) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO content_rights(id,stable_key,origin_kind,source_label,attribution,permission_basis,clearance_status) " +
                        "VALUES(?,?,'original','Test source','Test author','Test basis',?)", id, key, status);
        return id;
    }

    private long count(String table) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class);
    }

    private Map<String, byte[]> withReplacement(Map<String, byte[]> original, String file, String from, String to) {
        Map<String, byte[]> copy = new HashMap<>(original);
        replace(copy, file, from, to);
        return copy;
    }

    private Map<String, byte[]> withMediaReference(Map<String, byte[]> original, String mediaKey) {
        Map<String, byte[]> copy = new HashMap<>(original);
        String source = new String(copy.get("items.csv"), StandardCharsets.UTF_8).stripTrailing();
        String[] lines = source.split("\\R");
        assertEquals(2, lines.length);
        String json = "[{\"position\":1,\"role\":\"audio\",\"mediaKey\":\"" + mediaKey + "\"}]";
        copy.put("items.csv", (lines[0] + ",mediaRefs\n" + lines[1] + ",\"" +
                json.replace("\"", "\"\"") + "\"\n").getBytes(StandardCharsets.UTF_8));
        return copy;
    }
}
