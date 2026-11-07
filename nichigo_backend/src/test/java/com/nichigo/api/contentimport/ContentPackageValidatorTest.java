package com.nichigo.api.contentimport;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ContentPackageValidatorTest {
    private final ContentPackageValidator validator = new ContentPackageValidator();

    private Map<String, byte[]> valid() {
        Map<String, byte[]> packageFiles = new HashMap<>();
        Path root = Path.of("..", "content", "examples", "v1", "valid");
        for (String name : new String[]{"manifest.json", "rights.csv", "items.csv", "lessons.json", "paths.json"}) {
            try { packageFiles.put(name, Files.readAllBytes(root.resolve(name))); }
            catch (IOException ex) { throw new AssertionError(ex); }
        }
        return packageFiles;
    }

    private Map<String, byte[]> edit(String file, String old, String replacement) {
        Map<String, byte[]> files = valid();
        String source = new String(files.get(file), StandardCharsets.UTF_8);
        assertTrue(source.contains(old), old);
        files.put(file, source.replace(old, replacement).getBytes(StandardCharsets.UTF_8));
        return files;
    }

    private void expect(String code, Map<String, byte[]> files) {
        ValidationReport report = validator.dryRun(files, null);
        assertTrue(report.errors().stream().anyMatch(d -> d.code().equals(code)), () -> report.toString());
    }

    private void expectResolved(String code, Map<String, byte[]> files) {
        ContentReferenceResolver empty = request -> ContentReferenceResolver.Snapshot.empty();
        ValidationReport report = validator.dryRun(files, empty);
        assertTrue(report.errors().stream().anyMatch(d -> d.code().equals(code)), () -> report.toString());
    }

    private Map<String, byte[]> item(String kind, String payload) {
        Map<String, byte[]> files = valid();
        String csv = "key,kind,payload,rightsKey,displayTextJa,displayTextVi\n"
                + "kana-a," + kind + ",\"" + payload.replace("\"", "\"\"") + "\",original-sample,あ,\n";
        files.put("items.csv", csv.getBytes(StandardCharsets.UTF_8));
        return files;
    }

    @Test void validOriginalPackageAndNoClearanceClaim() { // VAL-01, REF-01/09, RGT-21/24, DRY-01/03
        Map<String, byte[]> files = valid();
        ValidationReport report = validator.dryRun(files, null);
        assertTrue(report.valid(), report.toString());
        assertFalse(report.publicationReady());
        assertTrue(report.warnings().stream().anyMatch(d -> d.code().equals("RIGHTS_REVIEW_REQUIRED")));
        assertEquals(report, validator.dryRun(files, null));
    }

    @Test void canonicalKindShapes() { // VAL-02–15
        Map<String, String> valid = Map.of(
                "kana", "{\"script\":\"hiragana\",\"glyph\":\"きゃ\",\"reading\":\"kya\"}",
                "vocabulary", "{\"surface\":\"なまえ\",\"reading\":\"なまえ\",\"glossVi\":\"tên\"}",
                "grammar", "{\"pattern\":\"X は Y です\",\"explanationVi\":\"Mẫu câu tự giới thiệu.\"}",
                "kanji", "{\"glyph\":\"日\",\"meaningVi\":\"ngày\",\"onReadings\":[\"ニチ\"]}",
                "example", "{\"textJa\":\"わたしはリンです。\",\"translationVi\":\"Tôi là Linh.\"}",
                "dialogue", "{\"turns\":[{\"speaker\":\"A\",\"textJa\":\"こんにちは。\"}]}");
        for (var entry : valid.entrySet()) {
            ValidationReport report = validator.dryRun(item(entry.getKey(), entry.getValue()), null);
            assertTrue(report.valid(), entry.getKey() + ": " + report);
        }
        expect("CONTENT_REQUIRED_FIELD", item("kana", "{\"script\":\"hiragana\",\"reading\":\"a\"}"));
        expect("CONTENT_REQUIRED_FIELD", item("vocabulary", "{\"surface\":\"なまえ\",\"reading\":\"なまえ\"}"));
        expect("CONTENT_REQUIRED_FIELD", item("grammar", "{\"pattern\":\"X は Y です\"}"));
        expect("CONTENT_INVALID_TYPE", item("kanji", "{\"glyph\":\"日\",\"meaningVi\":\"ngày\",\"onReadings\":[2]}"));
        expect("CONTENT_REQUIRED_FIELD", item("example", "{\"textJa\":\"こんにちは。\"}"));
        expect("CONTENT_REQUIRED_FIELD", item("dialogue", "{\"turns\":[{\"speaker\":\"A\"}]}"));
        expect("CONTENT_UNSUPPORTED_VALUE", item("quiz", "{}"));
        expect("CONTENT_INVALID_TYPE", item("kana", "[]"));
        assertTrue(validator.dryRun(item("vocabulary", "{\"surface\":\"ねこ\",\"reading\":\"ねこ\",\"glossVi\":\"mèo\",\"usageNoteVi\":\"Danh từ.\"}"), null).valid());
    }

    @Test void csvParsingAndJsonSafety() { // PAR-01–12, COMP-04/05
        String header = "key,originKind,sourceLabel,attribution,permissionBasis,evidenceRef\n";
        Map<String, byte[]> files = valid();
        files.put("rights.csv", (header + "original-sample,original,\"NichiGo, original\",\"Team \"\"NichiGo\"\"\",\"Original\nillustrative\",\n")
                .getBytes(StandardCharsets.UTF_8));
        assertTrue(validator.dryRun(files, null).valid());
        expect("CSV_DUPLICATE_HEADER", edit("rights.csv", "key,originKind", "key,key"));
        expect("CSV_MISSING_HEADER", edit("rights.csv", "key,originKind", "key,sourceLabel"));
        expect("CSV_UNCLOSED_QUOTE", edit("rights.csv", "original-sample,original", "original-sample,\"original"));
        expect("JSON_INVALID", edit("lessons.json", "\"schemaVersion\": \"1.0\"", "\"schemaVersion\": "));
        expect("JSON_DUPLICATE_KEY", edit("manifest.json", "\"locale\": \"vi\"", "\"locale\": \"vi\", \"locale\": \"vi\""));
        expect("JSON_INVALID", edit("manifest.json", "\n}", "\n}{\"trailing\":true}"));
        expect("PACKAGE_VERSION_UNSUPPORTED", edit("manifest.json", "\"1.0\"", "\"2.0\""));
        files = valid(); files.put("items.csv", new byte[]{(byte) 0xC3, (byte) 0x28});
        expect("PACKAGE_INVALID_UTF8", files);
        files = valid(); files.put("items.csv", new byte[ContentPackageValidator.MAX_FILE_BYTES + 1]);
        expect("PACKAGE_FILE_LIMIT", files);
        files = valid(); files.put("../items.csv", files.remove("items.csv"));
        expect("PACKAGE_UNSAFE_PATH", files);
        files = edit("lessons.json", "\"titleVi\": \"Nhận biết chữ あ\"", "\"titleVi\": 3");
        expect("CONTENT_INVALID_TYPE", files);
        String nested = "[".repeat(41) + "0" + "]".repeat(41);
        expect("JSON_INVALID", edit("lessons.json", "\"sections\": [{", "\"extra\": " + nested + ", \"sections\": [{"));
    }

    @Test void referencesOrderingCyclesAndReuse() { // REF-02–11
        expectResolved("CONTENT_REFERENCE_MISSING", edit("lessons.json", "\"itemKey\": \"kana-a\"", "\"itemKey\": \"missing-item\""));
        Map<String, byte[]> files = valid();
        String items = new String(files.get("items.csv"), StandardCharsets.UTF_8);
        files.put("items.csv", (items + items.lines().skip(1).findFirst().orElseThrow() + "\n").getBytes(StandardCharsets.UTF_8));
        expect("CONTENT_DUPLICATE_KEY", files);
        expect("CONTENT_DUPLICATE_POSITION", edit("lessons.json",
                "\"objectives\": [{\"position\": 1, \"kind\": \"knowledge\", \"textVi\": \"Nhận ra chữ あ.\"}]",
                "\"objectives\": [{\"position\": 1, \"kind\": \"knowledge\", \"textVi\": \"Nhận ra chữ あ.\"},"
                        + "{\"position\": 1, \"kind\": \"can_do\", \"textVi\": \"Nhận ra chữ.\"}]"));
    }

    @Test void rightsAndMediaNeverSelfClear() { // RGT-22/23/26/27/28, COMP-06
        expect("CONTENT_REQUIRED_FIELD", edit("items.csv", "original-sample,あ,", ",あ,"));
        expect("CSV_UNKNOWN_HEADER", edit("rights.csv", "key,originKind", "clearanceStatus,key,originKind"));
        ValidationReport report = validator.dryRun(valid(), null);
        assertFalse(report.toString().contains("evidenceRef="));
    }

    @Test void noUploadControllerIsPartOfValidator() { // COMP-07
        assertEquals(Set.of("dryRun"), Set.of(ContentPackageValidator.class.getDeclaredMethods()).stream()
                .map(java.lang.reflect.Method::getName).filter(name -> name.equals("dryRun")).collect(java.util.stream.Collectors.toSet()));
    }

    @Test void strictParsingReportsFileAndRowWithoutAcceptingMalformedInput() {
        ValidationReport csv = validator.dryRun(edit("rights.csv", "original-sample,original",
                "original-sample,\"original\"junk"), null);
        assertFalse(csv.valid());
        assertTrue(csv.errors().stream().anyMatch(d -> d.code().equals("CSV_MALFORMED")
                && d.file().equals("rights.csv") && d.line() == 2 && d.row() == 2), csv.toString());
        expect("CSV_UNKNOWN_HEADER", edit("items.csv", "key,kind,payload", "privateNote,key,kind,payload"));
        expect("CONTENT_UNKNOWN_FIELD", edit("lessons.json", "\"slug\": \"intro-kana-a\"",
                "\"slug\": \"intro-kana-a\", \"privateNote\": \"hidden\""));
        expect("JSON_DUPLICATE_KEY", edit("lessons.json", "\"key\": \"intro-kana-a\"",
                "\"key\": \"intro-kana-a\", \"key\": \"intro-kana-a\""));
    }

    @Test void prerequisiteCyclesAndMissingReferencesAreRejected() {
        Map<String, byte[]> files = valid();
        String lessons = """
                {"schemaVersion":"1.0","lessons":[
                  {"key":"lesson-a","slug":"lesson-a","titleVi":"A","rightsKey":"original-sample",
                   "objectives":[],"sections":[],"prerequisites":["lesson-b"]},
                  {"key":"lesson-b","slug":"lesson-b","titleVi":"B","rightsKey":"original-sample",
                   "objectives":[],"sections":[],"prerequisites":["lesson-a"]}
                ]}
                """;
        files.put("lessons.json", lessons.getBytes(StandardCharsets.UTF_8));
        expect("LESSON_PREREQUISITE_CYCLE", files);
        expectResolved("CONTENT_REFERENCE_MISSING", edit("paths.json",
                "\"lessonKey\": \"intro-kana-a\"", "\"lessonKey\": \"missing-lesson\""));
    }

    @Test void mediaAndRightsValidationCannotClaimClearance() {
        expect("RIGHTS_EVIDENCE_REQUIRED", edit("rights.csv", "original-sample,original,",
                "original-sample,licensed,"));
        Map<String, byte[]> files = valid();
        String manifest = new String(files.get("manifest.json"), StandardCharsets.UTF_8)
                .replace("\"files\": [", "\"files\": [{\"path\":\"media.csv\",\"type\":\"media\"},");
        files.put("manifest.json", manifest.getBytes(StandardCharsets.UTF_8));
        String header = "key,kind,storageKey,checksumSha256,mimeType,rightsKey\n";
        String checksum = "a".repeat(64);
        files.put("media.csv", (header + "audio-a,audio,media/audio-a," + checksum
                + ",image/png,original-sample\n").getBytes(StandardCharsets.UTF_8));
        expect("MEDIA_MIME_MISMATCH", files);
        files.put("media.csv", (header + "audio-a,audio,../private," + checksum
                + ",audio/mpeg,original-sample\n").getBytes(StandardCharsets.UTF_8));
        expect("MEDIA_STORAGE_KEY_UNSAFE", files);
        ValidationReport report = validator.dryRun(files, null);
        assertFalse(report.publicationReady());
    }

    @Test void csvDiagnosticsPreservePhysicalLineAndLogicalRecord() {
        Map<String, byte[]> files = valid();
        String csv = "key,originKind,sourceLabel,attribution,permissionBasis,evidenceRef\n"
                + "original-sample,original,\"NichiGo\nsource\",Author,Original,\n"
                + "another,original,Label,Author,Original\n";
        files.put("rights.csv", csv.getBytes(StandardCharsets.UTF_8));
        ValidationReport report = validator.dryRun(files, null);
        assertTrue(report.errors().stream().anyMatch(d -> d.code().equals("CSV_COLUMN_COUNT")
                && d.line() == 4 && d.row() == 3), report.toString());
    }

    @Test void boundsMultipleErrorsAndKeepsReportsDeterministic() {
        Map<String, byte[]> files = valid();
        StringBuilder csv = new StringBuilder("key,kind,payload,rightsKey\n");
        for (int index = 0; index < 250; index++)
            csv.append("item-").append(index).append(",kana,{},original-sample\n");
        files.put("items.csv", csv.toString().getBytes(StandardCharsets.UTF_8));
        ValidationReport report = validator.dryRun(files, null);
        assertFalse(report.valid());
        assertTrue(report.truncated());
        assertEquals(ContentPackageValidator.MAX_DIAGNOSTICS, report.errors().size() + report.warnings().size());
        assertEquals(report, validator.dryRun(files, null));

        files = valid();
        for (String name : new String[]{"rights.csv", "items.csv", "lessons.json"})
            files.put(name, new byte[3_600_000]);
        expect("PACKAGE_SIZE_LIMIT", files);
        expect("CONTENT_PATTERN", edit("manifest.json", "\"path\": \"items.csv\"",
                "\"path\": \"../items.csv\""));
        expect("PACKAGE_VERSION_UNSUPPORTED", edit("lessons.json", "\"schemaVersion\": \"1.0\"",
                "\"schemaVersion\": \"2.0\""));
    }

    @Test void oneCanonicalItemCanBeReusedByMultipleLessons() {
        Map<String, byte[]> files = valid();
        String lessons = """
                {"schemaVersion":"1.0","lessons":[
                  {"key":"lesson-a","slug":"lesson-a","titleVi":"A","rightsKey":"original-sample",
                   "objectives":[],"sections":[{"key":"section-a","position":1,
                   "items":[{"position":1,"itemKey":"kana-a"}]}]},
                  {"key":"lesson-b","slug":"lesson-b","titleVi":"B","rightsKey":"original-sample",
                   "objectives":[],"sections":[{"key":"section-b","position":1,
                   "items":[{"position":1,"itemKey":"kana-a"}]}]}
                ]}
                """;
        files.put("lessons.json", lessons.getBytes(StandardCharsets.UTF_8));
        ValidationReport report = validator.dryRun(files, null);
        assertTrue(report.valid(), report.toString());
        expect("LESSON_SELF_PREREQUISITE", edit("lessons.json", "\"objectives\":",
                "\"prerequisites\":[\"intro-kana-a\"], \"objectives\":"));
    }
}
