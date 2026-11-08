package com.nichigo.api.contentimport;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
class ContentOperatorPipelineIntegrationTest {
    @Autowired ContentImportService importer;
    @Autowired ContentReviewService reviews;
    @Autowired ContentPublicationService publisher;
    @Autowired ContentPackageValidator validator;
    @Autowired JdbcContentReferenceResolver resolver;
    @Autowired JdbcTemplate db;
    @Autowired PlatformTransactionManager transactions;
    @Autowired MockMvc mvc;

    @Test void importsReviewsPublishesExactPinsAndRevocationHidesPath() throws Exception {
        String suffix=UUID.randomUUID().toString().substring(0,8);
        Map<String,byte[]> files=example(suffix);
        String rights="original-sample-"+suffix,item="kana-a-"+suffix,lesson="intro-kana-a-"+suffix,path="intro-path-"+suffix;
        var principal=operator();
        assertThrows(SecurityException.class,()->importer.apply(files,null));
        var referenceReport=validator.dryRun(files,resolver);
        assertTrue(referenceReport.valid(),referenceReport.errors().toString());
        assertEquals("applied",importer.apply(files,principal).status());
        assertEquals("already_applied",importer.apply(files,principal).status());
        assertThrows(IllegalStateException.class,()->importer.apply(changed(files),principal));
        assertThrows(IllegalStateException.class,()->publisher.publish("item",item,1,Map.of(),principal));
        assertThrows(SecurityException.class,()->reviews.reviewRights(rights,"cleared",null));
        assertThrows(SecurityException.class,()->publisher.publish("item",item,1,Map.of(),null));
        reviews.reviewRights(rights,"cleared",principal);
        reviews.reviewLanguage("item",item,1,principal);
        reviews.reviewLanguage("lesson",lesson,1,principal);
        reviews.reviewLanguage("path",path,1,principal);
        assertEquals(1,publisher.publish("item",item,1,Map.of(),principal).revision());
        assertEquals(java.util.Set.of(item),publisher.preview("lesson",lesson).requiredPins().keySet());
        assertEquals(Map.of(item,1),publisher.preview("lesson",lesson,Map.of(item,1)).selectedPins());
        assertThrows(IllegalArgumentException.class,()->publisher.preview("lesson",lesson,Map.of()));
        assertThrows(IllegalArgumentException.class,()->publisher.publish("lesson",lesson,1,Map.of(),principal));
        assertEquals(0,db.queryForObject("SELECT count(*) FROM lesson_revisions WHERE lesson_id=(SELECT id FROM lessons WHERE stable_key=?)",Integer.class,lesson));
        assertEquals(1,publisher.publish("lesson",lesson,1,Map.of(item,1),principal).revision());
        assertEquals(1,publisher.publish("path",path,1,Map.of(lesson,1),principal).revision());
        assertEquals(1,db.queryForObject("SELECT published_revision FROM learning_paths WHERE slug=?",Integer.class,path));
        assertEquals(1,db.queryForObject("SELECT lesson_revision FROM path_revision_lessons WHERE path_id=(SELECT id FROM learning_paths WHERE slug=?)",Integer.class,path));
        UUID placement=db.queryForObject("SELECT placement_id FROM path_revision_lessons WHERE path_id=(SELECT id FROM learning_paths WHERE slug=?)",UUID.class,path);
        mvc.perform(get("/api/v1/learning-paths/{slug}",path)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/learning-paths/{slug}/placements/{placement}/lesson",path,placement))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(1));
        assertThrows(IllegalStateException.class,()->publisher.publish("path",path,1,Map.of(lesson,1),principal));
        assertEquals(1,db.queryForObject("SELECT published_revision FROM learning_paths WHERE slug=?",Integer.class,path));
        Map<String,byte[]> update=new LinkedHashMap<>(files);
        update.put("manifest.json",new String(files.get("manifest.json"),StandardCharsets.UTF_8).replace("1.0.0","1.0.1").getBytes(StandardCharsets.UTF_8));
        update.put("items.csv",new String(files.get("items.csv"),StandardCharsets.UTF_8).replace("\"\"reading\"\":\"\"a\"\"","\"\"reading\"\":\"\"aa\"\"").getBytes(StandardCharsets.UTF_8));
        assertTrue(validator.dryRun(update,resolver).valid());
        assertEquals("applied",importer.apply(update,principal).status());
        assertThrows(IllegalStateException.class,()->publisher.publish("item",item,1,Map.of(),principal));
        reviews.reviewLanguage("item",item,2,principal);
        reviews.reviewLanguage("lesson",lesson,2,principal);
        reviews.reviewLanguage("path",path,2,principal);
        assertEquals(2,publisher.publish("item",item,2,Map.of(),principal).revision());
        assertEquals(1,db.queryForObject("SELECT item_revision FROM lesson_revision_items WHERE lesson_id=(SELECT id FROM lessons WHERE stable_key=?) AND lesson_revision=1",Integer.class,lesson));
        assertEquals(2,publisher.publish("lesson",lesson,2,Map.of(item,2),principal).revision());
        assertEquals(1,db.queryForObject("SELECT lesson_revision FROM path_revision_lessons WHERE path_id=(SELECT id FROM learning_paths WHERE slug=?) AND path_revision=1",Integer.class,path));
        mvc.perform(get("/api/v1/lessons/{slug}",lesson)).andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(2));
        mvc.perform(get("/api/v1/learning-paths/{slug}/placements/{placement}/lesson",path,placement))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(1));
        assertEquals(2,publisher.publish("path",path,2,Map.of(lesson,2),principal).revision());
        mvc.perform(get("/api/v1/learning-paths/{slug}/placements/{placement}/lesson",path,placement))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(2));
        reviews.reviewRights(rights,"revoked",principal);
        assertFalse(db.queryForObject("SELECT path_revision_public(id,published_revision) FROM learning_paths WHERE slug=?",Boolean.class,path));
        mvc.perform(get("/api/v1/learning-paths/{slug}",path)).andExpect(status().isNotFound());
    }

    @Test void concurrentIdenticalImportsCreateOneBatch() throws Exception {
        String suffix=UUID.randomUUID().toString().substring(0,8);
        var files=example(suffix);
        var principal=operator();
        var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var a=pool.submit(()->importer.apply(files,principal));
            var b=pool.submit(()->importer.apply(files,principal));
            assertEquals(java.util.Set.of("applied","already_applied"),java.util.Set.of(a.get().status(),b.get().status()));
            assertEquals(1,db.queryForObject("SELECT count(*) FROM content_import_batches WHERE package_key=?",Integer.class,"original-intro-sample-"+suffix));
        } finally {pool.shutdownNow();}
    }

    @Test void mediaPublicationRequiresReviewAndExactItemPin() throws Exception {
        String suffix=UUID.randomUUID().toString().substring(0,8);
        Map<String,byte[]> files=example(suffix);
        String media="media-"+suffix,item="kana-a-"+suffix,rights="original-sample-"+suffix;
        String manifest=new String(files.get("manifest.json"),StandardCharsets.UTF_8)
                .replace("{\"path\": \"items.csv\", \"type\": \"items\"}",
                         "{\"path\": \"items.csv\", \"type\": \"items\"},\n    {\"path\": \"media.csv\", \"type\": \"media\"}");
        files.put("manifest.json",manifest.getBytes(StandardCharsets.UTF_8));
        String csv=new String(files.get("items.csv"),StandardCharsets.UTF_8).stripTrailing();
        String[] lines=csv.split("\\R");
        String ref="\"[{\"\"position\"\":1,\"\"role\"\":\"\"pronunciation\"\",\"\"mediaKey\"\":\"\""+media+"\"\"}]\"";
        files.put("items.csv",(lines[0]+",mediaRefs\n"+lines[1]+","+ref+"\n").getBytes(StandardCharsets.UTF_8));
        String mediaCsv="key,kind,storageKey,checksumSha256,mimeType,rightsKey\n"+media+",audio,media/"+media+".mp3,"+"a".repeat(64)+",audio/mpeg,"+rights+"\n";
        files.put("media.csv",mediaCsv.getBytes(StandardCharsets.UTF_8));
        assertTrue(validator.dryRun(files,resolver).valid());
        var principal=operator();
        importer.apply(files,principal);
        reviews.reviewRights(rights,"cleared",principal);
        reviews.reviewLanguage("media",media,1,principal);
        reviews.reviewLanguage("item",item,1,principal);
        assertThrows(IllegalArgumentException.class,()->publisher.publish("item",item,1,Map.of(),principal));
        assertEquals(1,publisher.publish("media",media,1,Map.of(),principal).revision());
        assertEquals(1,publisher.publish("item",item,1,Map.of(media,1),principal).revision());
        assertEquals(1,db.queryForObject("SELECT media_revision FROM content_item_revision_media WHERE item_id=(SELECT id FROM content_items WHERE stable_key=?)",Integer.class,item));
        reviews.reviewRights(rights,"revoked",principal);
        assertFalse(db.queryForObject("SELECT item_revision_public(id,published_revision) FROM content_items WHERE stable_key=?",Boolean.class,item));
    }

    @Test void concurrentPublicationAllowsOneRevisionForReviewedDraft() throws Exception {
        String suffix=UUID.randomUUID().toString().substring(0,8);
        var files=example(suffix);var principal=operator();
        String rights="original-sample-"+suffix,item="kana-a-"+suffix;
        importer.apply(files,principal);
        reviews.reviewRights(rights,"cleared",principal);
        reviews.reviewLanguage("item",item,1,principal);
        var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var a=pool.submit(()->publisher.publish("item",item,1,Map.of(),principal));
            var b=pool.submit(()->publisher.publish("item",item,1,Map.of(),principal));
            int successes=0,conflicts=0;
            for(var future:java.util.List.of(a,b))try{assertEquals(1,future.get().revision());successes++;}
            catch(java.util.concurrent.ExecutionException ex){assertInstanceOf(IllegalStateException.class,ex.getCause());conflicts++;}
            assertEquals(1,successes);assertEquals(1,conflicts);
            assertEquals(1,db.queryForObject("SELECT count(*) FROM content_item_revisions WHERE item_id=(SELECT id FROM content_items WHERE stable_key=?)",Integer.class,item));
        } finally {pool.shutdownNow();}
    }

    @Test void lateOwnershipConflictRollsBackEarlierDraftWrites() throws Exception {
        String first=UUID.randomUUID().toString().substring(0,8),second=UUID.randomUUID().toString().substring(0,8);
        var principal=operator();
        importer.apply(example(first),principal);
        Map<String,byte[]> conflicting=example(second);
        conflicting.put("paths.json",new String(conflicting.get("paths.json"),StandardCharsets.UTF_8)
                .replace("intro-path-"+second,"intro-path-"+first).getBytes(StandardCharsets.UTF_8));
        assertTrue(validator.dryRun(conflicting,resolver).valid());
        assertThrows(IllegalStateException.class,()->importer.apply(conflicting,principal));
        assertEquals(0,db.queryForObject("SELECT count(*) FROM content_import_batches WHERE package_key=?",Integer.class,"original-intro-sample-"+second));
        assertEquals(0,db.queryForObject("SELECT count(*) FROM content_rights WHERE stable_key=?",Integer.class,"original-sample-"+second));
        assertEquals(0,db.queryForObject("SELECT count(*) FROM content_items WHERE stable_key=?",Integer.class,"kana-a-"+second));
        assertEquals(0,db.queryForObject("SELECT count(*) FROM lessons WHERE stable_key=?",Integer.class,"intro-kana-a-"+second));
    }

    @Test void reorderRetainsSectionAndChapterIdentities() throws Exception {
        String suffix=UUID.randomUUID().toString().substring(0,8);
        Map<String,byte[]> first=example(suffix);
        ObjectMapper mapper=new ObjectMapper();
        ObjectNode lessons=(ObjectNode)mapper.readTree(new String(first.get("lessons.json"),StandardCharsets.UTF_8));
        ArrayNode sections=(ArrayNode)lessons.path("lessons").get(0).path("sections");
        ObjectNode extraSection=((ObjectNode)sections.get(0)).deepCopy();
        extraSection.put("key","practice");extraSection.put("position",2);sections.add(extraSection);
        first.put("lessons.json",mapper.writeValueAsBytes(lessons));
        ObjectNode paths=(ObjectNode)mapper.readTree(new String(first.get("paths.json"),StandardCharsets.UTF_8));
        ArrayNode chapters=(ArrayNode)paths.path("paths").get(0).path("stages").get(0).path("chapters");
        ObjectNode extraChapter=((ObjectNode)chapters.get(0)).deepCopy();
        extraChapter.put("key","second-script");extraChapter.put("position",2);chapters.add(extraChapter);
        first.put("paths.json",mapper.writeValueAsBytes(paths));
        assertTrue(validator.dryRun(first,resolver).valid());
        importer.apply(first,operator());
        String lesson="intro-kana-a-"+suffix,path="intro-path-"+suffix;
        UUID sectionId=db.queryForObject("SELECT s.id FROM lesson_sections s JOIN lessons l ON l.id=s.lesson_id WHERE l.stable_key=? AND s.stable_key='recognition'",UUID.class,lesson);
        UUID chapterId=db.queryForObject("SELECT c.id FROM stage_chapters c JOIN path_stages s ON s.id=c.stage_id JOIN learning_paths p ON p.id=s.path_id WHERE p.slug=? AND c.stable_key='first-script'",UUID.class,path);
        Map<String,byte[]> second=new LinkedHashMap<>(first);
        second.put("manifest.json",new String(first.get("manifest.json"),StandardCharsets.UTF_8).replace("1.0.0","1.0.1").getBytes(StandardCharsets.UTF_8));
        ((ObjectNode)sections.get(0)).put("position",2);((ObjectNode)sections.get(1)).put("position",1);
        ((ObjectNode)chapters.get(0)).put("position",2);((ObjectNode)chapters.get(1)).put("position",1);
        second.put("lessons.json",mapper.writeValueAsBytes(lessons));second.put("paths.json",mapper.writeValueAsBytes(paths));
        assertTrue(validator.dryRun(second,resolver).valid());
        importer.apply(second,operator());
        assertEquals(2,db.queryForObject("SELECT position FROM lesson_sections WHERE id=?",Integer.class,sectionId));
        assertEquals(2,db.queryForObject("SELECT position FROM stage_chapters WHERE id=?",Integer.class,chapterId));
    }

    @Test void concurrentRevocationAndPublicationNeverExposeRevokedContent() throws Exception {
        String suffix=UUID.randomUUID().toString().substring(0,8);
        var principal=operator();
        importer.apply(example(suffix),principal);
        String rights="original-sample-"+suffix,item="kana-a-"+suffix;
        reviews.reviewRights(rights,"cleared",principal);
        reviews.reviewLanguage("item",item,1,principal);
        var changed=new java.util.concurrent.CountDownLatch(1);
        var release=new java.util.concurrent.CountDownLatch(1);
        var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var revoker=pool.submit(()->new TransactionTemplate(transactions).execute(status->{
                reviews.reviewRights(rights,"revoked",principal);
                changed.countDown();
                try{if(!release.await(10,java.util.concurrent.TimeUnit.SECONDS))throw new IllegalStateException("Timed out");}
                catch(InterruptedException ex){Thread.currentThread().interrupt();throw new IllegalStateException(ex);}
                return null;
            }));
            assertTrue(changed.await(10,java.util.concurrent.TimeUnit.SECONDS));
            var publishing=pool.submit(()->publisher.publish("item",item,1,Map.of(),principal));
            release.countDown();
            revoker.get();
            try{publishing.get();}catch(java.util.concurrent.ExecutionException ex){assertInstanceOf(IllegalStateException.class,ex.getCause());}
            assertFalse(db.queryForObject("SELECT item_revision_public(id,published_revision) FROM content_items WHERE stable_key=?",Boolean.class,item));
        } finally {release.countDown();pool.shutdownNow();}
    }

    @Test void malformedDuplicateAndMissingRightsPackagesLeaveNoDrafts() throws Exception {
        String suffix=UUID.randomUUID().toString().substring(0,8);
        Map<String,byte[]> source=example(suffix);
        java.util.List<Map<String,byte[]>> invalid=new java.util.ArrayList<>();
        Map<String,byte[]> badJson=new LinkedHashMap<>(source);
        badJson.put("lessons.json","{".getBytes(StandardCharsets.UTF_8));invalid.add(badJson);
        Map<String,byte[]> duplicate=new LinkedHashMap<>(source);
        String items=new String(source.get("items.csv"),StandardCharsets.UTF_8).stripTrailing();
        duplicate.put("items.csv",(items+"\n"+items.split("\\R")[1]+"\n").getBytes(StandardCharsets.UTF_8));invalid.add(duplicate);
        Map<String,byte[]> missingRights=new LinkedHashMap<>(source);
        missingRights.put("rights.csv",new String(source.get("rights.csv"),StandardCharsets.UTF_8)
                .replace("original-sample-"+suffix,"other-rights-"+suffix).getBytes(StandardCharsets.UTF_8));invalid.add(missingRights);
        Map<String,byte[]> badCsv=new LinkedHashMap<>(source);
        badCsv.put("items.csv",(items+"\"\n").getBytes(StandardCharsets.UTF_8));invalid.add(badCsv);
        for(var files:invalid){
            assertFalse(validator.dryRun(files,resolver).valid());
            assertThrows(IllegalArgumentException.class,()->importer.apply(files,operator()));
        }
        assertEquals(0,db.queryForObject("SELECT count(*) FROM content_import_batches WHERE package_key=?",Integer.class,"original-intro-sample-"+suffix));
        assertEquals(0,db.queryForObject("SELECT count(*) FROM content_items WHERE stable_key=?",Integer.class,"kana-a-"+suffix));
    }

    @Test void lessonCanReferenceExistingItemWithoutRedeclaringIt() throws Exception {
        String sourceSuffix=UUID.randomUUID().toString().substring(0,8),newSuffix=UUID.randomUUID().toString().substring(0,8);
        var principal=operator();
        importer.apply(example(sourceSuffix),principal);
        Map<String,byte[]> files=example(newSuffix);
        files.remove("items.csv");
        ObjectMapper mapper=new ObjectMapper();
        ObjectNode manifest=(ObjectNode)mapper.readTree(new String(files.get("manifest.json"),StandardCharsets.UTF_8));
        ArrayNode declarations=(ArrayNode)manifest.path("files");
        for(int i=0;i<declarations.size();i++)if("items.csv".equals(declarations.get(i).path("path").asText())){declarations.remove(i);break;}
        files.put("manifest.json",mapper.writeValueAsBytes(manifest));
        files.put("lessons.json",new String(files.get("lessons.json"),StandardCharsets.UTF_8)
                .replace("\"itemKey\": \"kana-a-"+newSuffix+"\"","\"itemKey\": \"kana-a-"+sourceSuffix+"\"").getBytes(StandardCharsets.UTF_8));
        var report=validator.dryRun(files,resolver);
        assertTrue(report.valid(),report.errors().toString());
        importer.apply(files,principal);
        assertEquals(1,db.queryForObject("SELECT count(*) FROM content_items WHERE stable_key=?",Integer.class,"kana-a-"+sourceSuffix));
        assertEquals(0,db.queryForObject("SELECT count(*) FROM content_items WHERE stable_key=?",Integer.class,"kana-a-"+newSuffix));
        assertEquals("kana-a-"+sourceSuffix,db.queryForObject("SELECT i.stable_key FROM lesson_items li JOIN lesson_sections s ON s.id=li.section_id JOIN lessons l ON l.id=s.lesson_id JOIN content_items i ON i.id=li.item_id WHERE l.stable_key=?",String.class,"intro-kana-a-"+newSuffix));
    }

    private static ContentOperatorAuth.Principal operator() throws Exception {
        char[] token="test-content-operator-token-1234567890123456".toCharArray();
        byte[] hash=MessageDigest.getInstance("SHA-256").digest(new String(token).getBytes(StandardCharsets.UTF_8));
        return new ContentOperatorAuth("test-operator",java.util.HexFormat.of().formatHex(hash)).authenticate(token);
    }
    private static Map<String,byte[]> example(String suffix) throws Exception {
        Map<String,byte[]> files=new LinkedHashMap<>();
        Path root=Path.of("../content/examples/v1/valid");
        try(var entries=Files.list(root)) {
            for(Path entry:entries.toList()) {
                String value=Files.readString(entry,StandardCharsets.UTF_8)
                        .replace("original-intro-sample","original-intro-sample-"+suffix)
                        .replace("original-sample","original-sample-"+suffix)
                        .replace("kana-a","kana-a-"+suffix)
                        .replace("intro-path","intro-path-"+suffix);
                files.put(entry.getFileName().toString(),value.getBytes(StandardCharsets.UTF_8));
            }
        }
        return files;
    }
    private static Map<String,byte[]> changed(Map<String,byte[]> files){
        Map<String,byte[]> copy=new LinkedHashMap<>(files);
        copy.put("rights.csv",new String(files.get("rights.csv"),StandardCharsets.UTF_8).replace("NichiGo original sample","NichiGo revised sample").getBytes(StandardCharsets.UTF_8));
        return copy;
    }
}
