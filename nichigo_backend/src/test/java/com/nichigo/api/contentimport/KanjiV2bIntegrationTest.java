package com.nichigo.api.contentimport;

import com.nichigo.api.content.SkillsContentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class KanjiV2bIntegrationTest {
    @Autowired ContentImportService importer;
    @Autowired ContentPackageValidator validator;
    @Autowired ContentReviewService reviews;
    @Autowired ContentPublicationService publisher;
    @Autowired SkillsContentService skills;
    @Autowired JdbcTemplate db;
    @Autowired MockMvc mvc;

    @Test void pinnedEdgesAndOptionalStrokeSurviveRelatedRightsLoss() throws Exception {
        String suffix=UUID.randomUUID().toString().substring(0,8);
        String example="example-"+suffix, plain="plain-example-"+suffix;
        String word="word-"+suffix, second="second-word-"+suffix, kanji="kanji-"+suffix;
        String noWord="kanji-alone-"+suffix, stroke="stroke-"+suffix;
        String lesson="lesson-"+suffix, path="path-"+suffix;
        String exampleRights="example-rights-"+suffix, wordRights="word-rights-"+suffix;
        String secondRights="second-rights-"+suffix;
        String kanjiRights="kanji-rights-"+suffix, strokeRights="stroke-rights-"+suffix;
        Map<String,byte[]> files=new LinkedHashMap<>();
        files.put("manifest.json",bytes("{\"schemaVersion\":\"1.1\",\"packageKey\":\"kanji-v2b-"+suffix+"\",\"packageVersion\":\"1.0.0\",\"locale\":\"vi\",\"files\":[{\"path\":\"rights.csv\",\"type\":\"rights\"},{\"path\":\"media.csv\",\"type\":\"media\"},{\"path\":\"items.csv\",\"type\":\"items\"},{\"path\":\"lessons.json\",\"type\":\"lessons\"},{\"path\":\"paths.json\",\"type\":\"paths\"}]}"));
        String rights="key,originKind,sourceLabel,attribution,permissionBasis\n";
        for(String key:new String[]{exampleRights,wordRights,secondRights,kanjiRights,strokeRights})
            rights+=key+",original,NichiGo,NichiGo,owned\n";
        files.put("rights.csv",bytes(rights));
        files.put("media.csv",bytes("key,kind,storageKey,checksumSha256,mimeType,rightsKey\n"+
                stroke+",writing,stroke/"+stroke+".json,"+"a".repeat(64)+",application/json,"+strokeRights+"\n"));
        String rows="key,kind,payload,rightsKey,mediaRefs\n";
        rows+=example+",example,"+cell("{\"textJa\":\"山\",\"translationVi\":\"Núi\",\"segments\":[{\"text\":\"山\",\"reading\":\"やま\"}],\"kanjiDetailCandidate\":\"yes\"}")+","+exampleRights+",\n";
        rows+=plain+",example,"+cell("{\"textJa\":\"空\",\"translationVi\":\"Trời\"}")+","+exampleRights+",\n";
        rows+=word+",vocabulary,"+cell("{\"surface\":\"山\",\"reading\":\"やま\",\"glossVi\":\"núi\",\"exampleRefs\":[\""+example+"\",\""+plain+"\"]}")+","+wordRights+",\n";
        rows+=second+",vocabulary,"+cell("{\"surface\":\"山道\",\"reading\":\"やまみち\",\"glossVi\":\"đường núi\"}")+","+secondRights+",\n";
        rows+=kanji+",kanji,"+cell("{\"glyph\":\"山\",\"meaningVi\":\"núi\",\"relatedVocabularyRefs\":[\""+word+"\",\""+second+"\"]}")+","+kanjiRights+","+cell("[{\"position\":1,\"role\":\"stroke-order\",\"mediaKey\":\""+stroke+"\"}]")+"\n";
        rows+=noWord+",kanji,"+cell("{\"glyph\":\"山\",\"meaningVi\":\"núi\"}")+","+kanjiRights+",\n";
        files.put("items.csv",bytes(rows));
        files.put("lessons.json",bytes("{\"schemaVersion\":\"1.1\",\"lessons\":[{\"key\":\""+lesson+"\",\"slug\":\""+lesson+"\",\"titleVi\":\"Kanji test\",\"rightsKey\":\""+kanjiRights+"\",\"objectives\":[{\"position\":1,\"kind\":\"knowledge\",\"textVi\":\"Read\"}],\"sections\":[{\"key\":\"main\",\"position\":1,\"items\":[{\"position\":1,\"itemKey\":\""+kanji+"\"}]}]}]}"));
        files.put("paths.json",bytes("{\"schemaVersion\":\"1.1\",\"paths\":[{\"key\":\""+path+"\",\"titleVi\":\"Path test\",\"rightsKey\":\""+kanjiRights+"\",\"stages\":[{\"key\":\"start\",\"position\":1,\"titleVi\":\"Stage\",\"rightsKey\":\""+kanjiRights+"\",\"chapters\":[{\"key\":\"first\",\"position\":1,\"titleVi\":\"Chapter\",\"rightsKey\":\""+kanjiRights+"\",\"lessons\":[{\"key\":\"placement\",\"position\":1,\"lessonKey\":\""+lesson+"\"}]}]}]}]}"));
        assertTrue(validator.dryRun(files,null).valid());
        Map<String,byte[]> mismatched=new LinkedHashMap<>(files);
        mismatched.put("items.csv",bytes(rows.replace("\"\"textJa\"\":\"\"山\"\"", "\"\"textJa\"\":\"\"川\"\"")));
        assertTrue(validator.dryRun(mismatched,null).errors().stream()
                .anyMatch(error -> error.code().equals("EXAMPLE_SEGMENTS_MISMATCH")));
        for (String badReading : new String[]{"", "   "}) {
            Map<String,byte[]> invalidReading=new LinkedHashMap<>(files);
            String changed=rows.replace("\"\"reading\"\":\"\"やま\"\"",
                    "\"\"reading\"\":\"\""+badReading+"\"\"");
            assertNotEquals(rows,changed);
            invalidReading.put("items.csv",bytes(changed));
            var errors=validator.dryRun(invalidReading,null).errors();
            assertTrue(errors.stream().anyMatch(error -> error.code().equals("CONTENT_BLANK_FIELD")), errors.toString());
            assertTrue(errors.stream().anyMatch(error -> error.code().equals("EXAMPLE_KANJI_FURIGANA_REQUIRED")), errors.toString());
        }
        for (String badText : new String[]{"", "   "}) {
            Map<String,byte[]> invalidSegment=new LinkedHashMap<>(files);
            String changed=rows.replace("\"\"text\"\":\"\"山\"\"", "\"\"text\"\":\"\""+badText+"\"\"");
            assertNotEquals(rows,changed);
            invalidSegment.put("items.csv",bytes(changed));
            assertTrue(validator.dryRun(invalidSegment,null).errors().stream()
                    .anyMatch(error -> error.code().equals("EXAMPLE_SEGMENTS_MISMATCH")));
        }
        Map<String,byte[]> legacy=new LinkedHashMap<>(files);
        legacy.put("manifest.json",bytes(new String(files.get("manifest.json"),StandardCharsets.UTF_8)
                .replace("\"schemaVersion\":\"1.1\"","\"schemaVersion\":\"1.0\"")));
        assertTrue(validator.dryRun(legacy,null).errors().stream()
                .anyMatch(error -> error.code().equals("CONTENT_UNKNOWN_FIELD")));
        var principal=operator();
        assertEquals("applied",importer.apply(files,principal).status());
        assertEquals("already_applied",importer.apply(files,principal).status());
        for(String key:new String[]{exampleRights,wordRights,secondRights,kanjiRights,strokeRights})
            reviews.reviewRights(key,"cleared",principal);
        for(String key:new String[]{example,plain,word,second,kanji,noWord})
            reviews.reviewLanguage("item",key,1,principal);
        reviews.reviewLanguage("media",stroke,1,principal);
        reviews.reviewLanguage("lesson",lesson,1,principal);
        reviews.reviewLanguage("path",path,1,principal);
        assertThrows(IllegalStateException.class,()->publisher.publish("item",noWord,1,Map.of(),principal));
        publisher.publish("item",example,1,Map.of(),principal);
        publisher.publish("item",plain,1,Map.of(),principal);
        assertEquals(java.util.Set.of("item:"+example,"item:"+plain),publisher.preview("item",word).requiredPins().keySet());
        publisher.publish("item",word,1,Map.of("item:"+example,1,"item:"+plain,1),principal);
        publisher.publish("item",second,1,Map.of(),principal);
        publisher.publish("media",stroke,1,Map.of(),principal);
        publisher.publish("item",kanji,1,Map.of("item:"+word,1,"item:"+second,1,stroke,1),principal);
        publisher.publish("lesson",lesson,1,Map.of(kanji,1),principal);
        publisher.publish("path",path,1,Map.of(lesson,1),principal);
        UUID kanjiId=db.queryForObject("SELECT id FROM content_items WHERE stable_key=?",UUID.class,kanji);
        assertEquals(java.util.List.of(word,second),skills.kanjiDetail(kanjiId.toString()).relatedVocabulary().stream().map(SkillsContentService.KanjiVocabulary::key).toList());
        assertEquals(1,skills.kanjiDetail(kanjiId.toString()).relatedVocabulary().getFirst().examples().size());
        assertEquals("やま",skills.kanjiDetail(kanjiId.toString()).relatedVocabulary().getFirst().examples().getFirst().segments().get(0).path("reading").asText());
        mvc.perform(get("/api/v1/skills/kanji/{id}",kanjiId)).andExpect(status().isOk())
                .andExpect(jsonPath("$.strokeOrder.status").value("metadata_only"))
                .andExpect(jsonPath("$.storageKey").doesNotExist());
        assertThrows(Exception.class,()->db.update("UPDATE content_item_revision_edges SET target_revision=2 WHERE source_item_id=?",kanjiId));
        String strokeRef="[{\"position\":1,\"role\":\"stroke-order\",\"mediaKey\":\""+stroke+"\"}]";
        Map<String,byte[]> legacyUpdate=singleItemPackage(suffix,"1.0.1","1.0",kanji,"kanji",
                "{\"glyph\":\"山\",\"meaningVi\":\"núi\"}",kanjiRights,strokeRef);
        assertEquals("applied",importer.apply(legacyUpdate,principal).status());
        assertEquals("already_applied",importer.apply(legacyUpdate,principal).status());
        assertEquals(2,db.queryForObject("SELECT count(*) FROM content_item_edges WHERE source_item_id=?",Integer.class,kanjiId));
        assertEquals(java.util.Set.of("item:"+word,"item:"+second,stroke),publisher.preview("item",kanji).requiredPins().keySet());
        reviews.reviewLanguage("item",kanji,2,principal);
        publisher.publish("item",kanji,2,Map.of("item:"+word,1,"item:"+second,1,stroke,1),principal);
        assertEquals(2,db.queryForObject("SELECT count(*) FROM content_item_revision_edges WHERE source_item_id=? AND source_revision=1",Integer.class,kanjiId));
        assertEquals(2,db.queryForObject("SELECT count(*) FROM content_item_revision_edges WHERE source_item_id=? AND source_revision=2",Integer.class,kanjiId));
        Map<String,byte[]> reorder=singleItemPackage(suffix,"1.0.2","1.1",kanji,"kanji",
                "{\"glyph\":\"山\",\"meaningVi\":\"núi\",\"relatedVocabularyRefs\":[\""+second+"\",\""+word+"\"]}",kanjiRights,strokeRef);
        assertEquals("applied",importer.apply(reorder,principal).status());
        assertEquals(java.util.List.of(second,word),db.query("SELECT t.stable_key FROM content_item_edges e JOIN content_items t ON t.id=e.target_item_id WHERE e.source_item_id=? ORDER BY e.position",(rs,n)->rs.getString(1),kanjiId));
        Map<String,byte[]> clear=singleItemPackage(suffix,"1.0.3","1.1",kanji,"kanji",
                "{\"glyph\":\"山\",\"meaningVi\":\"núi\",\"relatedVocabularyRefs\":[]}",kanjiRights,strokeRef);
        assertEquals("applied",importer.apply(clear,principal).status());
        assertEquals(0,db.queryForObject("SELECT count(*) FROM content_item_edges WHERE source_item_id=?",Integer.class,kanjiId));
        assertEquals(java.util.List.of(word,second),skills.kanjiDetail(kanjiId.toString()).relatedVocabulary().stream().map(SkillsContentService.KanjiVocabulary::key).toList());
        UUID wordId=db.queryForObject("SELECT id FROM content_items WHERE stable_key=?",UUID.class,word);
        Map<String,byte[]> reorderExamples=singleItemPackage(suffix,"1.0.4","1.1",word,"vocabulary",
                "{\"surface\":\"山\",\"reading\":\"やま\",\"glossVi\":\"núi\",\"exampleRefs\":[\""+plain+"\",\""+example+"\"]}",wordRights,"[]");
        assertEquals("applied",importer.apply(reorderExamples,principal).status());
        assertEquals(java.util.List.of(plain,example),db.query("SELECT t.stable_key FROM content_item_edges e JOIN content_items t ON t.id=e.target_item_id WHERE e.source_item_id=? ORDER BY e.position",(rs,n)->rs.getString(1),wordId));
        Map<String,byte[]> clearExamples=singleItemPackage(suffix,"1.0.5","1.1",word,"vocabulary",
                "{\"surface\":\"山\",\"reading\":\"やま\",\"glossVi\":\"núi\",\"exampleRefs\":[]}",wordRights,"[]");
        assertEquals("applied",importer.apply(clearExamples,principal).status());
        assertEquals(0,db.queryForObject("SELECT count(*) FROM content_item_edges WHERE source_item_id=?",Integer.class,wordId));
        assertEquals(2,db.queryForObject("SELECT count(*) FROM content_item_revision_edges WHERE source_item_id=? AND source_revision=1",Integer.class,wordId));
        Map<String,byte[]> update=new LinkedHashMap<>();
        update.put("manifest.json",bytes("{\"schemaVersion\":\"1.1\",\"packageKey\":\"kanji-v2b-"+suffix+"\",\"packageVersion\":\"1.0.6\",\"locale\":\"vi\",\"files\":[{\"path\":\"items.csv\",\"type\":\"items\"}]}"));
        update.put("items.csv",bytes("key,kind,payload,rightsKey\n"+word+",vocabulary,"+
                cell("{\"surface\":\"山\",\"reading\":\"さん\",\"glossVi\":\"núi\",\"exampleRefs\":[\""+example+"\",\""+plain+"\"]}")+","+wordRights+"\n"));
        assertEquals("applied",importer.apply(update,principal).status());
        reviews.reviewLanguage("item",word,4,principal);
        publisher.publish("item",word,4,Map.of("item:"+example,1,"item:"+plain,1),principal);
        assertEquals(1,skills.kanjiDetail(kanjiId.toString()).relatedVocabulary().getFirst().revision());
        reviews.reviewRights(exampleRights,"revoked",principal);
        assertTrue(skills.kanjiDetail(kanjiId.toString()).relatedVocabulary().getFirst().examples().isEmpty());
        reviews.reviewRights(strokeRights,"revoked",principal);
        assertEquals("unavailable",skills.kanjiDetail(kanjiId.toString()).strokeOrder().status());
        assertTrue(db.queryForObject("SELECT item_revision_public(?,1)",Boolean.class,kanjiId));
        assertTrue(db.queryForObject("SELECT path_revision_public(id,published_revision) FROM learning_paths WHERE slug=?",Boolean.class,path));
        reviews.reviewRights(wordRights,"revoked",principal);
        assertEquals(java.util.List.of(second),skills.kanjiDetail(kanjiId.toString()).relatedVocabulary().stream().map(SkillsContentService.KanjiVocabulary::key).toList());
        reviews.reviewRights(secondRights,"revoked",principal);
        assertTrue(skills.kanjiDetail(kanjiId.toString()).relatedVocabulary().isEmpty());
        reviews.reviewRights(kanjiRights,"revoked",principal);
        assertFalse(db.queryForObject("SELECT path_revision_public(id,published_revision) FROM learning_paths WHERE slug=?",Boolean.class,path));
        mvc.perform(get("/api/v1/skills/kanji/{id}",kanjiId)).andExpect(status().isNotFound());
    }

    private static byte[] bytes(String value){return value.getBytes(StandardCharsets.UTF_8);}
    private static String cell(String value){return "\""+value.replace("\"","\"\"")+"\"";}
    private static Map<String,byte[]> singleItemPackage(String suffix,String packageVersion,String schemaVersion,
                                                          String key,String kind,String payload,String rightsKey,String mediaRefs) {
        Map<String,byte[]> files=new LinkedHashMap<>();
        files.put("manifest.json",bytes("{\"schemaVersion\":\""+schemaVersion+"\",\"packageKey\":\"kanji-v2b-"+suffix+
                "\",\"packageVersion\":\""+packageVersion+"\",\"locale\":\"vi\",\"files\":[{\"path\":\"items.csv\",\"type\":\"items\"}]}"));
        files.put("items.csv",bytes("key,kind,payload,rightsKey,mediaRefs\n"+key+","+kind+","+cell(payload)+","+rightsKey+","+cell(mediaRefs)+"\n"));
        return files;
    }
    private static ContentOperatorAuth.Principal operator() throws Exception {
        char[] token="test-content-operator-token-1234567890123456".toCharArray();
        byte[] hash=java.security.MessageDigest.getInstance("SHA-256")
                .digest(new String(token).getBytes(StandardCharsets.UTF_8));
        return new ContentOperatorAuth("test-operator",java.util.HexFormat.of().formatHex(hash)).authenticate(token);
    }
}
