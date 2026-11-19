package com.nichigo.api.contentimport;

import com.nichigo.api.content.SkillsContentService;
import com.nichigo.api.content.StrokeAssetService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class KanjiContentPilotIntegrationTest {
    private static final Path PILOT = Path.of("..", "content", "pilots", "jpn-033-kanji-v2b");
    private static final String[] GLYPHS = {"yama", "kawa", "hito"};
    private static final Map<String, List<String>> WORDS = Map.of(
            "yama", List.of("yama", "kazan"),
            "kawa", List.of("kawa", "ogawa"),
            "hito", List.of("hito", "nihonjin"));

    @TempDir static Path storageRoot;
    @DynamicPropertySource static void storage(DynamicPropertyRegistry registry) {
        registry.add("nichigo.stroke.storage-root", () -> storageRoot.toString());
    }

    @Autowired ContentPackageValidator validator;
    @Autowired ContentImportService importer;
    @Autowired ContentReviewService reviews;
    @Autowired ContentPublicationService publisher;
    @Autowired StrokeAssetService strokeAssets;
    @Autowired SkillsContentService skills;
    @Autowired JdbcTemplate db;
    @Autowired MockMvc mvc;

    @Test void packageFlowsThroughReviewPublishSkillsAndRevocation() throws Exception {
        Map<String, byte[]> packageFiles = packageFiles();
        var principal = operator();
        assertTrue(validator.dryRun(packageFiles, null).valid());
        assertFalse(validator.dryRun(packageFiles, null).publicationReady());
        assertEquals("applied", importer.apply(packageFiles, principal).status());
        assertEquals("already_applied", importer.apply(packageFiles, principal).status());

        String firstKanji = "pilot-kanji-yama";
        assertThrows(IllegalStateException.class,
                () -> publisher.publish("item", firstKanji, 1, Map.of(), principal));

        for (String slug : GLYPHS) {
            reviews.reviewRights("rights-pilot-kanji-" + slug, "cleared", principal);
            reviews.reviewRights("rights-pilot-stroke-" + slug, "cleared", principal);
            reviews.reviewLanguage("item", "pilot-kanji-" + slug, 1, principal);
            reviews.reviewLanguage("media", "pilot-stroke-" + slug, 1, principal);
            for (String word : WORDS.get(slug)) {
                reviews.reviewRights("rights-pilot-vocab-" + word, "cleared", principal);
                reviews.reviewRights("rights-pilot-example-" + word, "cleared", principal);
                reviews.reviewLanguage("item", "pilot-vocab-" + word, 1, principal);
                reviews.reviewLanguage("item", "pilot-example-" + word, 1, principal);
            }
        }
        byte[] yamaAsset = Files.readAllBytes(PILOT.resolve("stroke-fixtures").resolve("yama.json"));
        strokeAssets.ingest("pilot-stroke-yama", firstKanji, yamaAsset, principal);
        publisher.publish("media", "pilot-stroke-yama", 1, Map.of(), principal);
        IllegalStateException vocabularyGate = assertThrows(IllegalStateException.class,
                () -> publisher.publish("item", firstKanji, 1,
                        Map.of("item:pilot-vocab-yama", 1, "item:pilot-vocab-kazan", 1,
                                "pilot-stroke-yama", 1), principal));
        assertTrue(vocabularyGate.getMessage().contains("related Item revision"));

        for (String slug : GLYPHS) {
            for (String word : WORDS.get(slug)) {
                String example = "pilot-example-" + word;
                String vocabulary = "pilot-vocab-" + word;
                publisher.publish("item", example, 1, Map.of(), principal);
                assertEquals(java.util.Set.of("item:" + example),
                        publisher.preview("item", vocabulary).requiredPins().keySet());
                publisher.publish("item", vocabulary, 1, Map.of("item:" + example, 1), principal);
            }
        }

        for (String slug : GLYPHS) {
            String kanji = "pilot-kanji-" + slug;
            String media = "pilot-stroke-" + slug;
            byte[] asset = Files.readAllBytes(PILOT.resolve("stroke-fixtures").resolve(slug + ".json"));
            String hash = java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(asset));
            assertEquals(hash, db.queryForObject("SELECT checksum_sha256 FROM media_assets WHERE stable_key=?", String.class, media));
            if (!slug.equals("yama")) publisher.publish("media", media, 1, Map.of(), principal);
            Map<String, Integer> pins = new LinkedHashMap<>();
            for (String word : WORDS.get(slug)) pins.put("item:pilot-vocab-" + word, 1);
            pins.put(media, 1);
            assertEquals(pins.keySet(), publisher.preview("item", kanji).requiredPins().keySet());
            if (!slug.equals("yama")) {
                assertThrows(IllegalStateException.class,
                        () -> publisher.publish("item", kanji, 1, pins, principal));
                strokeAssets.ingest(media, kanji, asset, principal);
            }
            publisher.publish("item", kanji, 1, pins, principal);

            UUID id = db.queryForObject("SELECT id FROM content_items WHERE stable_key=?", UUID.class, kanji);
            var detail = skills.kanjiDetail(id.toString());
            assertEquals(WORDS.get(slug).stream().map(word -> "pilot-vocab-" + word).toList(),
                    detail.relatedVocabulary().stream().map(SkillsContentService.KanjiVocabulary::key).toList());
            for (var word : detail.relatedVocabulary()) {
                assertEquals(1, word.revision());
                assertEquals(1, word.examples().size());
                assertEquals("pilot-example-" + word.key().substring("pilot-vocab-".length()),
                        word.examples().getFirst().key());
                assertEquals(1, word.examples().getFirst().revision());
                assertTrue(word.examples().getFirst().segments().get(0).path("reading").asText().length() > 0);
            }
            assertEquals("metadata_only", detail.strokeOrder().status());
            mvc.perform(get("/api/v1/skills/kanji/{id}", id))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.storageKey").doesNotExist());
            mvc.perform(get("/api/v1/skills/kanji/{id}/stroke-asset", id))
                    .andExpect(status().isOk())
                    .andExpect(content().bytes(asset))
                    .andExpect(header().string("Cache-Control", "no-store"));
            assertEquals(2, db.queryForObject(
                    "SELECT count(*) FROM content_item_revision_edges WHERE source_item_id=? AND source_revision=1",
                    Integer.class, id));
            assertEquals(List.of(1, 1), db.query(
                    "SELECT target_revision FROM content_item_revision_edges WHERE source_item_id=? AND source_revision=1 ORDER BY position",
                    (rs, row) -> rs.getInt(1), id));
            assertEquals(1, db.queryForObject(
                    "SELECT media_revision FROM content_item_revision_media WHERE item_id=? AND item_revision=1 AND role_code='stroke-order'",
                    Integer.class, id));
        }

        UUID yama = db.queryForObject("SELECT id FROM content_items WHERE stable_key=?", UUID.class, firstKanji);
        reviews.reviewRights("rights-pilot-example-yama", "revoked", principal);
        assertTrue(skills.kanjiDetail(yama.toString()).relatedVocabulary().getFirst().examples().isEmpty());
        assertEquals(1, skills.kanjiDetail(yama.toString()).relatedVocabulary().get(1).examples().size());
        reviews.reviewRights("rights-pilot-vocab-yama", "revoked", principal);
        assertEquals(List.of("pilot-vocab-kazan"), skills.kanjiDetail(yama.toString()).relatedVocabulary()
                .stream().map(SkillsContentService.KanjiVocabulary::key).toList());
        reviews.reviewRights("rights-pilot-stroke-yama", "revoked", principal);
        mvc.perform(get("/api/v1/skills/kanji/{id}/stroke-asset", yama))
                .andExpect(status().isNotFound())
                .andExpect(header().string("Cache-Control", "no-store"));
        assertEquals("unavailable", skills.kanjiDetail(yama.toString()).strokeOrder().status());
        mvc.perform(get("/api/v1/skills/kanji/{id}", yama)).andExpect(status().isOk());
        assertTrue(db.queryForObject("SELECT item_revision_public(?,1)", Boolean.class, yama));
    }

    private static Map<String, byte[]> packageFiles() throws Exception {
        Map<String, byte[]> files = new LinkedHashMap<>();
        for (String name : List.of("manifest.json", "rights.csv", "media.csv", "items.csv"))
            files.put(name, Files.readAllBytes(PILOT.resolve("package").resolve(name)));
        return files;
    }

    private static ContentOperatorAuth.Principal operator() throws Exception {
        char[] token = "test-content-pilot-token-1234567890123456".toCharArray();
        byte[] hash = MessageDigest.getInstance("SHA-256")
                .digest(new String(token).getBytes(StandardCharsets.UTF_8));
        return new ContentOperatorAuth("test-pilot-operator", java.util.HexFormat.of().formatHex(hash))
                .authenticate(token);
    }
}
