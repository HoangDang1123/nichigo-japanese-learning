package com.nichigo.api.content;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Uses PostgreSQL JSONB, FK, trigger and transaction behavior; never H2. */
@SpringBootTest
@AutoConfigureMockMvc
class PublicContentIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired PlatformTransactionManager transactions;
    @Autowired PublishedContentPublicationBoundary publicationBoundary;

    @Test
    void publicationBoundaryAcceptsLockedCurrentCandidateAndRejectsStaleVersion() {
        UUID rights = rights("cleared");
        Lesson lesson = lesson(rights);
        String presentation = "{\"schemaVersion\":\"1.0\",\"objectives\":[],\"sections\":[]}";
        jdbc.update("INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id,presentation) " +
                "VALUES(?,1,'Draft',?,?::jsonb)", lesson.id(), rights, presentation);
        TransactionTemplate transaction = new TransactionTemplate(transactions);
        transaction.executeWithoutResult(status ->
                publicationBoundary.validateLesson(lesson.id(), 1, 1, presentation));
        assertThrows(IllegalStateException.class, () -> transaction.executeWithoutResult(status ->
                publicationBoundary.validateLesson(lesson.id(), 1, 2, presentation)));
    }

    @Test
    void draftsAndReviewedLessonsAreNeverPublic() throws Exception { // PUB-01, PUB-02, API-03
        UUID rights = rights("cleared");
        Lesson lesson = lesson(rights);
        mvc.perform(get("/api/v1/lessons/" + lesson.slug())).andExpect(status().isNotFound());
        jdbc.update("UPDATE lessons SET editorial_status='reviewed' WHERE id=?", lesson.id());
        mvc.perform(get("/api/v1/lessons/" + lesson.slug())).andExpect(status().isNotFound());
    }

    @Test
    void publishedRevisionSurvivesDraftEditsAndNewRevision() throws Exception { // PUB-03,04,05,06,07,09,10
        UUID rights = rights("cleared");
        Item item = item(rights);
        publishItem(item, rights, 1, "あ");
        Lesson lesson = lesson(rights);
        UUID section = section(lesson.id(), 1);
        jdbc.update("INSERT INTO lesson_items(id,section_id,item_id,position) VALUES(?,?,?,1)",
                UUID.randomUUID(), section, item.id());
        publishLesson(lesson, rights, item, 1, 1, "Bản đầu", section);

        mvc.perform(get("/api/v1/lessons/" + lesson.slug()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Bản đầu"))
                .andExpect(jsonPath("$.sections[0].items[0].content.payload.glyph").value("あ"));
        jdbc.update("UPDATE lessons SET title_vi='Bản nháp mới',edit_version=edit_version+1 WHERE id=?", lesson.id());
        jdbc.update("UPDATE lesson_items SET position=2 WHERE section_id=?", section);
        mvc.perform(get("/api/v1/lessons/" + lesson.slug()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Bản đầu"))
                .andExpect(jsonPath("$.sections[0].items[0].position").value(1));

        Item draftItem = item(rights);
        UUID draftSection = section(lesson.id(), 2);
        jdbc.update("UPDATE lesson_sections SET title_vi='Bản sửa nháp' WHERE id=?", section);
        jdbc.update("INSERT INTO lesson_objectives(id,lesson_id,position,kind,text_vi) " +
                "VALUES(?,?,1,'knowledge','Mục tiêu nháp')", UUID.randomUUID(), lesson.id());
        jdbc.update("DELETE FROM lesson_items WHERE section_id=?", section);
        jdbc.update("INSERT INTO lesson_items(id,section_id,item_id,position) VALUES(?,?,?,1)",
                UUID.randomUUID(), draftSection, draftItem.id());
        mvc.perform(get("/api/v1/lessons/" + lesson.slug()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Bản đầu"))
                .andExpect(jsonPath("$.objectives[0].text").value("Nhận biết âm đã học"))
                .andExpect(jsonPath("$.sections[0].items[0].content.key").value(item.key()))
                .andExpect(jsonPath("$.sections[1]").doesNotExist());

        publishLesson(lesson, rights, item, 1, 2, "Bản mới", section);
        mvc.perform(get("/api/v1/lessons/" + lesson.slug()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(2))
                .andExpect(jsonPath("$.title").value("Bản mới"));
        assertEquals("Bản đầu", jdbc.queryForObject(
                "SELECT title_vi FROM lesson_revisions WHERE lesson_id=? AND revision=1",
                String.class, lesson.id()));
        assertEquals(1, jdbc.queryForObject(
                "SELECT count(*) FROM content_item_revisions WHERE item_id=?", Integer.class, item.id()));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE lesson_revisions SET title_vi='tampered' WHERE lesson_id=? AND revision=1", lesson.id()));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "DELETE FROM lesson_revisions WHERE lesson_id=? AND revision=1", lesson.id()));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE lesson_revisions SET presentation='{}'::jsonb WHERE lesson_id=? AND revision=1", lesson.id()));
        jdbc.update("UPDATE content_rights SET clearance_status='revoked' WHERE id=?", rights);
        assertEquals(false, jdbc.queryForObject("SELECT lesson_revision_public(?,1)", Boolean.class, lesson.id()));
        assertEquals(false, jdbc.queryForObject("SELECT lesson_revision_public(?,2)", Boolean.class, lesson.id()));
    }

    @Test
    void databaseRejectsWrongIdentityAndDuplicateOrder() { // INT-01,02,03,05,06,07
        UUID rights = rights("cleared");
        Item item = item(rights);
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "INSERT INTO content_items(id,stable_key,kind,payload,rights_id) VALUES(?,?,'kana','{}'::jsonb,?)",
                UUID.randomUUID(), item.key(), rights));
        Lesson lesson = lesson(rights);
        UUID section = section(lesson.id(), 1);
        assertThrows(DataAccessException.class, () -> section(lesson.id(), 1));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "INSERT INTO lesson_items(id,section_id,item_id,position) VALUES(?,?,?,1)",
                UUID.randomUUID(), section, UUID.randomUUID()));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "INSERT INTO lesson_prerequisites(lesson_id,prerequisite_lesson_id) VALUES(?,?)",
                lesson.id(), lesson.id()));
        publishItem(item, rights, 1, "あ");
        publishLesson(lesson, rights, item, 1, 1, "Bài", section);
        Lesson other = lesson(rights);
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE lessons SET published_revision=1 WHERE id=?", other.id()));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "INSERT INTO lesson_revision_items(lesson_id,lesson_revision,section_id,position,item_id,item_revision) " +
                        "VALUES(?,?,?,2,?,999)", lesson.id(), 1, section, item.id()));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "DELETE FROM content_items WHERE id=?", item.id()));
    }

    @Test
    void oneCanonicalItemCanBeReusedAndRightsRevocationBlocksEveryConsumer() throws Exception { // INT-04, RGT-02,03,06,07,08, API-05
        UUID itemRights = rights("cleared");
        UUID otherRights = rights("cleared");
        Item item = item(itemRights);
        publishItem(item, itemRights, 1, "あ");
        Lesson[] lessons = new Lesson[3];
        for (int i = 0; i < 3; i++) {
            lessons[i] = lesson(otherRights);
            UUID section = section(lessons[i].id(), 1);
            publishLesson(lessons[i], otherRights, item, 1, 1, "Bài " + i, section);
            mvc.perform(get("/api/v1/lessons/" + lessons[i].slug())).andExpect(status().isOk());
        }
        mvc.perform(get("/api/v1/skills/kana/items"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[?(@.key=='" + item.key() + "')]").exists());
        jdbc.update("UPDATE content_rights SET clearance_status='revoked' WHERE id=?", itemRights);
        for (Lesson lesson : lessons) {
            mvc.perform(get("/api/v1/lessons/" + lesson.slug())).andExpect(status().isNotFound());
        }
        mvc.perform(get("/api/v1/skills/kana/items"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[?(@.key=='" + item.key() + "')]").doesNotExist());
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE content_rights SET clearance_status='cleared' WHERE id=?", itemRights));
        assertThrows(DataAccessException.class, () -> jdbc.update("DELETE FROM content_rights WHERE id=?", itemRights));
    }

    @Test
    void unverifiedRightsCannotReachPublicAndApiErrorsAreBounded() throws Exception { // RGT-01, API-06,07,09,10
        UUID rights = rights("unverified");
        Item item = item(rights);
        jdbc.update("INSERT INTO content_item_revisions(item_id,revision,kind,payload,rights_id) " +
                "VALUES(?,1,'kana','{}'::jsonb,?)", item.id(), rights);
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE content_item_revisions SET sealed_at=now() WHERE item_id=? AND revision=1", item.id()));
        mvc.perform(get("/api/v1/skills/kana/items"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[?(@.key=='" + item.key() + "')]").doesNotExist());
        mvc.perform(get("/api/v1/skills/unknown/items")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/skills/kana/items?limit=999")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/lessons/missing-" + UUID.randomUUID())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/skills/kana/items"))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("private-rights-evidence"))));
    }

    @Test
    void pathPreservesHierarchyAndBecomesUnavailableWhenChildRightsRevoked() throws Exception { // API-01,08
        UUID pathRights = rights("cleared");
        UUID itemRights = rights("cleared");
        Item item = item(itemRights);
        publishItem(item, itemRights, 1, "あ");
        Lesson lesson = lesson(pathRights);
        UUID section = section(lesson.id(), 1);
        publishLesson(lesson, pathRights, item, 1, 1, "Bài học", section);
        String slug = "path-" + UUID.randomUUID();
        UUID path = UUID.randomUUID(), stage = UUID.randomUUID(), chapter = UUID.randomUUID();
        UUID placement = UUID.randomUUID();
        jdbc.update("INSERT INTO learning_paths(id,slug,title_vi,rights_id) VALUES(?,?,?,?)",
                path, slug, "Lộ trình", pathRights);
        jdbc.update("INSERT INTO path_stages(id,path_id,stable_key,position,title_vi,rights_id) " +
                "VALUES(?,?,?,1,?,?)", stage, path, "stage-1", "Giai đoạn", pathRights);
        jdbc.update("INSERT INTO stage_chapters(id,stage_id,stable_key,position,title_vi,rights_id) " +
                "VALUES(?,?,?,1,?,?)", chapter, stage, "chapter-1", "Chương", pathRights);
        jdbc.update("INSERT INTO chapter_lessons(id,chapter_id,lesson_id,position) VALUES(?,?,?,1)",
                placement, chapter, lesson.id());
        jdbc.update("INSERT INTO path_revisions(path_id,revision,title_vi,rights_id) VALUES(?,1,?,?)",
                path, "Lộ trình", pathRights);
        jdbc.update("INSERT INTO path_revision_stages(path_id,path_revision,stage_id,rights_id) " +
                "VALUES(?,1,?,?)", path, stage, pathRights);
        jdbc.update("INSERT INTO path_revision_chapters(path_id,path_revision,stage_id,chapter_id,rights_id) " +
                "VALUES(?,1,?,?,?)", path, stage, chapter, pathRights);
        jdbc.update("INSERT INTO path_revision_lessons(path_id,path_revision,chapter_id,position,placement_id,lesson_id,lesson_revision) " +
                "VALUES(?,1,?,1,?,?,1)", path, chapter, placement, lesson.id());
        setPathPresentation(path, 1);
        jdbc.update("UPDATE path_revisions SET sealed_at=now() WHERE path_id=? AND revision=1", path);
        jdbc.update("UPDATE learning_paths SET published_revision=1 WHERE id=?", path);
        mvc.perform(get("/api/v1/learning-paths/" + slug)).andExpect(status().isOk())
                .andExpect(jsonPath("$.stages[0].chapters[0].lessons[0].title").value("Bài học"));
        jdbc.update("UPDATE content_rights SET clearance_status='revoked' WHERE id=?", itemRights);
        mvc.perform(get("/api/v1/learning-paths/" + slug)).andExpect(status().isNotFound());
    }

    @Test
    void pathPlacementReadsItsPinnedLessonRevision() throws Exception {
        UUID pathRights = rights("cleared"), itemRights = rights("cleared");
        Item item = item(itemRights);
        publishItem(item, itemRights, 1, "あ");
        Lesson lesson = lesson(pathRights);
        UUID section = section(lesson.id(), 1);
        publishLesson(lesson, pathRights, item, 1, 1, "Bài v1", section);
        PathFixture path = pathFixture(pathRights, lesson);
        publishPathRevision(path, pathRights, lesson, 1, 1);

        publishLesson(lesson, pathRights, item, 1, 2, "Bài v2", section);
        mvc.perform(get("/api/v1/lessons/" + lesson.slug()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(2))
                .andExpect(jsonPath("$.title").value("Bài v2"));
        String contextualUrl = "/api/v1/learning-paths/" + path.slug()
                + "/placements/" + path.placement() + "/lesson";
        mvc.perform(get(contextualUrl)).andExpect(status().isOk())
                .andExpect(jsonPath("$.revision").value(1))
                .andExpect(jsonPath("$.title").value("Bài v1"));
        mvc.perform(get("/api/v1/learning-paths/" + path.slug() + "/placements/"
                + UUID.randomUUID() + "/lesson")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/learning-paths/" + path.slug() + "/placements/not-a-uuid/lesson"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/learning-paths/missing/placements/" + path.placement() + "/lesson"))
                .andExpect(status().isNotFound());

        publishPathRevision(path, pathRights, lesson, 2, 2);
        mvc.perform(get(contextualUrl)).andExpect(status().isOk())
                .andExpect(jsonPath("$.revision").value(2))
                .andExpect(jsonPath("$.title").value("Bài v2"));
        mvc.perform(get(contextualUrl + "?revision=1")).andExpect(status().isOk())
                .andExpect(jsonPath("$.revision").value(2));
        mvc.perform(get("/api/v1/lessons/" + lesson.slug() + "?revision=1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(2));
        jdbc.update("UPDATE content_rights SET clearance_status='revoked' WHERE id=?", itemRights);
        mvc.perform(get(contextualUrl)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/lessons/" + lesson.slug())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/learning-paths/" + path.slug())).andExpect(status().isNotFound());
    }

    @Test
    void pathOrdersMultipleStagesChaptersAndPlacements() throws Exception { // API-01
        UUID rights = rights("cleared");
        Item item = item(rights);
        publishItem(item, rights, 1, "あ");
        Lesson first = lesson(rights), second = lesson(rights), third = lesson(rights);
        publishLesson(first, rights, item, 1, 1, "Bài đầu", section(first.id(), 1));
        publishLesson(second, rights, item, 1, 1, "Bài giữa", section(second.id(), 1));
        publishLesson(third, rights, item, 1, 1, "Bài cuối", section(third.id(), 1));

        UUID path = UUID.randomUUID(), stageOne = UUID.randomUUID(), stageTwo = UUID.randomUUID();
        UUID chapterOne = UUID.randomUUID(), chapterTwo = UUID.randomUUID(), chapterThree = UUID.randomUUID();
        UUID placementOne = UUID.randomUUID(), placementTwo = UUID.randomUUID();
        UUID placementThree = UUID.randomUUID(), placementFour = UUID.randomUUID();
        String slug = "path-" + UUID.randomUUID();
        jdbc.update("INSERT INTO learning_paths(id,slug,title_vi,rights_id) VALUES(?,?,'Lộ trình',?)",
                path, slug, rights);
        jdbc.update("INSERT INTO path_stages(id,path_id,stable_key,position,title_vi,rights_id) " +
                "VALUES(?,?,?,2,'Stage 2',?),(?,?,?,1,'Stage 1',?)",
                stageTwo, path, "stage-" + stageTwo, rights, stageOne, path, "stage-" + stageOne, rights);
        jdbc.update("INSERT INTO stage_chapters(id,stage_id,stable_key,position,title_vi,rights_id) " +
                "VALUES(?,?,?,1,'Chapter 3',?),(?,?,?,2,'Chapter 2',?),(?,?,?,1,'Chapter 1',?)",
                chapterThree, stageTwo, "chapter-" + chapterThree, rights,
                chapterTwo, stageOne, "chapter-" + chapterTwo, rights,
                chapterOne, stageOne, "chapter-" + chapterOne, rights);
        jdbc.update("INSERT INTO chapter_lessons(id,chapter_id,lesson_id,position) " +
                "VALUES(?,?,?,2),(?,?,?,1),(?,?,?,1),(?,?,?,1)",
                placementTwo, chapterOne, second.id(), placementOne, chapterOne, first.id(),
                placementThree, chapterTwo, third.id(), placementFour, chapterThree, first.id());

        jdbc.update("INSERT INTO path_revisions(path_id,revision,title_vi,rights_id) VALUES(?,1,'Lộ trình',?)",
                path, rights);
        jdbc.update("INSERT INTO path_revision_stages(path_id,path_revision,stage_id,rights_id) " +
                "VALUES(?,1,?,?),(?,1,?,?)",
                path, stageTwo, rights, path, stageOne, rights);
        jdbc.update("INSERT INTO path_revision_chapters(path_id,path_revision,stage_id,chapter_id,rights_id) " +
                "VALUES(?,1,?,?,?),(?,1,?,?,?),(?,1,?,?,?)",
                path, stageTwo, chapterThree, rights, path, stageOne, chapterTwo, rights,
                path, stageOne, chapterOne, rights);
        jdbc.update("INSERT INTO path_revision_lessons(path_id,path_revision,chapter_id,position,placement_id,lesson_id,lesson_revision) " +
                "VALUES(?,1,?,2,?,?,1),(?,1,?,1,?,?,1),(?,1,?,1,?,?,1),(?,1,?,1,?,?,1)",
                path, chapterOne, placementTwo, second.id(), path, chapterOne, placementOne, first.id(),
                path, chapterTwo, placementThree, third.id(), path, chapterThree, placementFour, first.id());
        setPathPresentation(path, 1);
        jdbc.update("UPDATE path_revisions SET sealed_at=now() WHERE path_id=? AND revision=1", path);
        jdbc.update("UPDATE learning_paths SET published_revision=1 WHERE id=?", path);

        mvc.perform(get("/api/v1/learning-paths/" + slug)).andExpect(status().isOk())
                .andExpect(jsonPath("$.stages[0].title").value("Stage 1"))
                .andExpect(jsonPath("$.stages[0].chapters[0].title").value("Chapter 1"))
                .andExpect(jsonPath("$.stages[0].chapters[0].lessons[0].title").value("Bài đầu"))
                .andExpect(jsonPath("$.stages[0].chapters[0].lessons[1].title").value("Bài giữa"))
                .andExpect(jsonPath("$.stages[0].chapters[1].title").value("Chapter 2"))
                .andExpect(jsonPath("$.stages[0].chapters[1].lessons[0].title").value("Bài cuối"))
                .andExpect(jsonPath("$.stages[1].title").value("Stage 2"))
                .andExpect(jsonPath("$.stages[1].chapters[0].title").value("Chapter 3"));
    }

    @Test
    void mediaRightsRevocationBlocksLessonWithoutExposingStorageKey() throws Exception { // RGT-04, API-07
        UUID itemRights = rights("cleared"), mediaRights = rights("cleared"), lessonRights = rights("cleared");
        UUID media = UUID.randomUUID();
        jdbc.update("INSERT INTO media_assets(id,stable_key,media_kind,storage_key,checksum_sha256,mime_type,rights_id) " +
                "VALUES(?,?,'audio',?,'test-checksum','audio/mpeg',?)",
                media, "media-" + media, "private-object-" + media, mediaRights);
        jdbc.update("INSERT INTO media_asset_revisions(media_id,revision,media_kind,storage_key,checksum_sha256,mime_type,rights_id) " +
                "VALUES(?,1,'audio',?,'test-checksum','audio/mpeg',?)",
                media, "private-object-" + media, mediaRights);
        jdbc.update("UPDATE media_asset_revisions SET sealed_at=now() WHERE media_id=? AND revision=1", media);
        jdbc.update("UPDATE media_assets SET published_revision=1 WHERE id=?", media);
        Item item = item(itemRights);
        jdbc.update("INSERT INTO content_item_revisions(item_id,revision,kind,payload,rights_id) " +
                "VALUES(?,1,'kana','{}'::jsonb,?)", item.id(), itemRights);
        jdbc.update("INSERT INTO content_item_revision_media(item_id,item_revision,position,role_code,media_id,media_revision) " +
                "VALUES(?,1,1,'pronunciation',?,1)", item.id(), media);
        jdbc.update("UPDATE content_item_revisions SET sealed_at=now() WHERE item_id=? AND revision=1", item.id());
        jdbc.update("UPDATE content_items SET published_revision=1 WHERE id=?", item.id());
        Lesson lesson = lesson(lessonRights);
        publishLesson(lesson, lessonRights, item, 1, 1, "Bài âm", section(lesson.id(), 1));
        mvc.perform(get("/api/v1/lessons/" + lesson.slug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections[0].items[0].content.media[0].kind").value("audio"))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("private-object-"))));
        jdbc.update("UPDATE content_rights SET clearance_status='revoked' WHERE id=?", mediaRights);
        mvc.perform(get("/api/v1/lessons/" + lesson.slug())).andExpect(status().isNotFound());
    }

    @Test
    void lessonOrdersMultipleSectionsItemsAndObjectives() throws Exception { // API-02
        UUID rights = rights("cleared");
        Item first = item(rights), second = item(rights);
        publishItem(first, rights, 1, "あ");
        publishItem(second, rights, 1, "い");
        Lesson lesson = lesson(rights);
        UUID sectionOne = section(lesson.id(), 1), sectionTwo = section(lesson.id(), 2);
        jdbc.update("INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id) VALUES(?,1,'Thứ tự',?)",
                lesson.id(), rights);
        jdbc.update("INSERT INTO lesson_revision_items(lesson_id,lesson_revision,section_id,position,item_id,item_revision) " +
                "VALUES(?,1,?,2,?,1),(?,1,?,1,?,1),(?,1,?,1,?,1)",
                lesson.id(), sectionOne, second.id(), lesson.id(), sectionOne, first.id(),
                lesson.id(), sectionTwo, second.id());
        jdbc.update("""
                UPDATE lesson_revisions SET presentation=jsonb_build_object(
                  'schemaVersion','1.0',
                  'objectives',jsonb_build_array(
                    jsonb_build_object('position',2,'kind','knowledge','textVi','Second'),
                    jsonb_build_object('position',1,'kind','can_do','textVi','First')),
                  'sections',jsonb_build_array(
                    jsonb_build_object('id',?::text,'position',2),
                    jsonb_build_object('id',?::text,'position',1)))
                WHERE lesson_id=? AND revision=1
                """, sectionTwo, sectionOne, lesson.id());
        jdbc.update("UPDATE lesson_revisions SET sealed_at=now() WHERE lesson_id=? AND revision=1", lesson.id());
        jdbc.update("UPDATE lessons SET published_revision=1 WHERE id=?", lesson.id());
        mvc.perform(get("/api/v1/lessons/" + lesson.slug())).andExpect(status().isOk())
                .andExpect(jsonPath("$.objectives[0].text").value("First"))
                .andExpect(jsonPath("$.sections[0].position").value(1))
                .andExpect(jsonPath("$.sections[0].items[0].content.key").value(first.key()))
                .andExpect(jsonPath("$.sections[0].items[1].content.key").value(second.key()))
                .andExpect(jsonPath("$.sections[1].position").value(2));
    }

    @Test
    void conditionalPointerRaceAndRollbackKeepPublicationAtomic() throws Exception { // CON-01,02, PUB-08
        UUID rights = rights("cleared");
        Item item = item(rights);
        publishItem(item, rights, 1, "あ");
        Lesson lesson = lesson(rights);
        UUID section = section(lesson.id(), 1);
        publishLesson(lesson, rights, item, 1, 1, "Bài 1", section);
        for (int revision : new int[] {2, 3}) {
            jdbc.update("INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id) VALUES(?,?,?,?)",
                    lesson.id(), revision, "Bài " + revision, rights);
            jdbc.update("INSERT INTO lesson_revision_items(lesson_id,lesson_revision,section_id,position,item_id,item_revision) " +
                    "VALUES(?,?,?,1,?,1)", lesson.id(), revision, section, item.id());
            setLessonPresentation(lesson.id(), revision);
            jdbc.update("UPDATE lesson_revisions SET sealed_at=now() WHERE lesson_id=? AND revision=?",
                    lesson.id(), revision);
        }
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id) VALUES(?,2,'duplicate',?)",
                lesson.id(), rights));
        var ready = new CountDownLatch(2);
        var go = new CountDownLatch(1);
        try (var workers = Executors.newFixedThreadPool(2)) {
            var first = workers.submit(() -> racePointer(lesson.id(), 2, ready, go));
            var second = workers.submit(() -> racePointer(lesson.id(), 3, ready, go));
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            go.countDown();
            assertEquals(1, first.get(5, TimeUnit.SECONDS) + second.get(5, TimeUnit.SECONDS));
        }
        int winner = jdbc.queryForObject("SELECT published_revision FROM lessons WHERE id=?", Integer.class, lesson.id());
        mvc.perform(get("/api/v1/lessons/" + lesson.slug()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(winner));

        assertThrows(IllegalStateException.class, () -> new TransactionTemplate(transactions).execute(status -> {
            jdbc.update("INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id) " +
                    "VALUES(?,4,'rolled back',?)", lesson.id(), rights);
            throw new IllegalStateException("simulated failure before pointer switch");
        }));
        assertEquals(0, jdbc.queryForObject(
                "SELECT count(*) FROM lesson_revisions WHERE lesson_id=? AND revision=4", Integer.class, lesson.id()));
    }

    @Test
    void publicReaderCannotSeeUncommittedPublication() throws Exception { // CON-07
        UUID rights = rights("cleared");
        Item item = item(rights);
        publishItem(item, rights, 1, "あ");
        Lesson lesson = lesson(rights);
        UUID section = section(lesson.id(), 1);
        var publishedInTransaction = new CountDownLatch(1);
        var allowCommit = new CountDownLatch(1);
        try (var worker = Executors.newSingleThreadExecutor()) {
            var publication = worker.submit(() -> new TransactionTemplate(transactions).execute(status -> {
                publishLesson(lesson, rights, item, 1, 1, "Bài kiểm tra", section);
                publishedInTransaction.countDown();
                try {
                    if (!allowCommit.await(5, TimeUnit.SECONDS)) {
                        throw new IllegalStateException("test publication commit was not released");
                    }
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(ex);
                }
                return true;
            }));
            assertTrue(publishedInTransaction.await(5, TimeUnit.SECONDS));
            mvc.perform(get("/api/v1/lessons/" + lesson.slug())).andExpect(status().isNotFound());
            allowCommit.countDown();
            assertTrue(publication.get(5, TimeUnit.SECONDS));
        }
        mvc.perform(get("/api/v1/lessons/" + lesson.slug())).andExpect(status().isOk());
    }

    @Test
    void reviewedRightsEvidenceIsImmutableAndRevocationIsAudited() {
        UUID right = rights("unverified");
        jdbc.update("UPDATE content_rights SET source_label='Reviewed source', clearance_status='cleared', reviewed_at=now() WHERE id=?", right);
        assertEquals(2, jdbc.queryForObject(
                "SELECT count(*) FROM content_rights_events WHERE rights_id=?", Integer.class, right));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE content_rights SET source_label='Rewritten' WHERE id=?", right));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE content_rights SET stable_key='rewritten-right' WHERE id=?", right));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE content_rights SET clearance_status='unverified' WHERE id=?", right));
        jdbc.update("UPDATE content_rights SET clearance_status='revoked' WHERE id=?", right);
        assertEquals(3, jdbc.queryForObject(
                "SELECT count(*) FROM content_rights_events WHERE rights_id=?", Integer.class, right));
        assertEquals("Reviewed source", jdbc.queryForObject(
                "SELECT provenance->>'sourceLabel' FROM content_rights_events WHERE rights_id=? AND clearance_status='cleared'",
                String.class, right));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE content_rights_events SET provenance='{}'::jsonb WHERE rights_id=?", right));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "DELETE FROM content_rights_events WHERE rights_id=?", right));
    }

    @Test
    void rootRightsRevocationWaitsForPublicationSeal() throws Exception {
        UUID right = rights("cleared");
        Item item = item(right);
        CountDownLatch sealed = new CountDownLatch(1), release = new CountDownLatch(1);
        try (var worker = Executors.newSingleThreadExecutor()) {
            var publication = worker.submit(() -> new TransactionTemplate(transactions).execute(status -> {
                jdbc.update("INSERT INTO content_item_revisions(item_id,revision,kind,payload,rights_id) " +
                        "VALUES(?,1,'kana','{}'::jsonb,?)", item.id(), right);
                jdbc.update("UPDATE content_item_revisions SET sealed_at=now() WHERE item_id=? AND revision=1", item.id());
                jdbc.update("UPDATE content_items SET published_revision=1 WHERE id=?", item.id());
                sealed.countDown();
                try {
                    if (!release.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("seal not released");
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(ex);
                }
                return true;
            }));
            assertTrue(sealed.await(5, TimeUnit.SECONDS));
            try {
                assertThrows(DataAccessException.class, () -> new TransactionTemplate(transactions).execute(status -> {
                    jdbc.execute("SET LOCAL lock_timeout = '150ms'");
                    jdbc.update("UPDATE content_rights SET clearance_status='revoked' WHERE id=?", right);
                    return null;
                }));
            } finally {
                release.countDown();
            }
            assertTrue(publication.get(5, TimeUnit.SECONDS));
        }
        assertTrue(jdbc.queryForObject("SELECT item_revision_public(?,1)", Boolean.class, item.id()));
        jdbc.update("UPDATE content_rights SET clearance_status='revoked' WHERE id=?", right);
        assertFalse(jdbc.queryForObject("SELECT item_revision_public(?,1)", Boolean.class, item.id()));
    }

    @Test
    void pathSetCheckRejectsEveryRightsLayerAndWithdrawnIdentity() {
        for (int layer = 0; layer < 6; layer++) {
            UUID pathRight = rights("cleared"), stageRight = rights("cleared"), chapterRight = rights("cleared");
            UUID lessonRight = rights("cleared"), itemRight = rights("cleared"), mediaRight = rights("cleared");
            UUID media = UUID.randomUUID();
            jdbc.update("INSERT INTO media_assets(id,stable_key,media_kind,storage_key,checksum_sha256,mime_type,rights_id) " +
                    "VALUES(?,?,'audio',?,'test-checksum','audio/mpeg',?)",
                    media, "media-" + media, "private-object-" + media, mediaRight);
            jdbc.update("INSERT INTO media_asset_revisions(media_id,revision,media_kind,storage_key,checksum_sha256,mime_type,rights_id) " +
                    "VALUES(?,1,'audio',?,'test-checksum','audio/mpeg',?)", media, "private-object-" + media, mediaRight);
            jdbc.update("UPDATE media_asset_revisions SET sealed_at=now() WHERE media_id=? AND revision=1", media);
            Item item = item(itemRight);
            jdbc.update("INSERT INTO content_item_revisions(item_id,revision,kind,payload,rights_id) " +
                    "VALUES(?,1,'kana','{}'::jsonb,?)", item.id(), itemRight);
            jdbc.update("INSERT INTO content_item_revision_media(item_id,item_revision,position,role_code,media_id,media_revision) " +
                    "VALUES(?,1,1,'pronunciation',?,1)", item.id(), media);
            jdbc.update("UPDATE content_item_revisions SET sealed_at=now() WHERE item_id=? AND revision=1", item.id());
            Lesson lesson = lesson(lessonRight);
            publishLesson(lesson, lessonRight, item, 1, 1, "Lesson", section(lesson.id(), 1));
            PathFixture path = pathFixture(pathRight, lesson);
            jdbc.update("INSERT INTO path_revisions(path_id,revision,title_vi,rights_id) VALUES(?,1,'Path',?)", path.id(), pathRight);
            jdbc.update("INSERT INTO path_revision_stages(path_id,path_revision,stage_id,rights_id) " +
                    "VALUES(?,1,?,?)", path.id(), path.stage(), stageRight);
            jdbc.update("INSERT INTO path_revision_chapters(path_id,path_revision,stage_id,chapter_id,rights_id) " +
                    "VALUES(?,1,?,?,?)", path.id(), path.stage(), path.chapter(), chapterRight);
            jdbc.update("INSERT INTO path_revision_lessons(path_id,path_revision,chapter_id,position,placement_id,lesson_id,lesson_revision) " +
                    "VALUES(?,1,?,1,?,?,1)", path.id(), path.chapter(), path.placement(), lesson.id());
            setPathPresentation(path.id(), 1);
            jdbc.update("UPDATE path_revisions SET sealed_at=now() WHERE path_id=? AND revision=1", path.id());
            jdbc.update("UPDATE learning_paths SET published_revision=1 WHERE id=?", path.id());
            assertTrue(jdbc.queryForObject("SELECT path_revision_public(?,1)", Boolean.class, path.id()));
            UUID[] rights = {pathRight, stageRight, chapterRight, lessonRight, itemRight, mediaRight};
            jdbc.update("UPDATE content_rights SET clearance_status='revoked' WHERE id=?", rights[layer]);
            assertFalse(jdbc.queryForObject("SELECT path_revision_public(?,1)", Boolean.class, path.id()));
        }
        UUID right = rights("cleared");
        Item item = item(right);
        publishItem(item, right, 1, "a");
        assertTrue(jdbc.queryForObject("SELECT item_revision_public(?,1)", Boolean.class, item.id()));
        jdbc.update("UPDATE content_items SET withdrawn_at=now() WHERE id=?", item.id());
        assertFalse(jdbc.queryForObject("SELECT item_revision_public(?,1)", Boolean.class, item.id()));
    }

    @Test
    void publishedPathRejectsNullRightsAndMissingPinnedLessons() {
        UUID right = rights("cleared");
        Lesson lesson = lesson(right);
        PathFixture path = pathFixture(right, lesson);
        jdbc.update("INSERT INTO path_revisions(path_id,revision,title_vi,rights_id) VALUES(?,1,'Path',?)", path.id(), right);
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "INSERT INTO path_revision_stages(path_id,path_revision,stage_id,rights_id) " +
                "VALUES(?,1,?,NULL)", path.id(), path.stage()));
        jdbc.update("INSERT INTO path_revision_stages(path_id,path_revision,stage_id,rights_id) " +
                "VALUES(?,1,?,?)", path.id(), path.stage(), right);
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "INSERT INTO path_revision_chapters(path_id,path_revision,stage_id,chapter_id,rights_id) " +
                "VALUES(?,1,?,?,NULL)", path.id(), path.stage(), path.chapter()));
        jdbc.update("INSERT INTO path_revision_chapters(path_id,path_revision,stage_id,chapter_id,rights_id) " +
                "VALUES(?,1,?,?,?)", path.id(), path.stage(), path.chapter(), right);
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "INSERT INTO path_revision_lessons(path_id,path_revision,chapter_id,position,placement_id,lesson_id,lesson_revision) " +
                "VALUES(?,1,?,1,?,?,1)", path.id(), path.chapter(), path.placement(), lesson.id()));
    }

    @Test
    void withdrawnMediaLessonAndPathAreIneligible() {
        UUID right = rights("cleared");
        UUID media = UUID.randomUUID();
        jdbc.update("INSERT INTO media_assets(id,stable_key,media_kind,storage_key,checksum_sha256,mime_type,rights_id) " +
                "VALUES(?,?,'audio',?,'test-checksum','audio/mpeg',?)",
                media, "media-" + media, "private-object-" + media, right);
        jdbc.update("INSERT INTO media_asset_revisions(media_id,revision,media_kind,storage_key,checksum_sha256,mime_type,rights_id) " +
                "VALUES(?,1,'audio',?,'test-checksum','audio/mpeg',?)", media, "private-object-" + media, right);
        jdbc.update("UPDATE media_asset_revisions SET sealed_at=now() WHERE media_id=? AND revision=1", media);
        assertTrue(jdbc.queryForObject("SELECT media_revision_public(?,1)", Boolean.class, media));
        jdbc.update("UPDATE media_assets SET withdrawn_at=now() WHERE id=?", media);
        assertFalse(jdbc.queryForObject("SELECT media_revision_public(?,1)", Boolean.class, media));

        Lesson lesson = lesson(right);
        jdbc.update("INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id) VALUES(?,1,'Lesson',?)", lesson.id(), right);
        jdbc.update("UPDATE lesson_revisions SET sealed_at=now() WHERE lesson_id=? AND revision=1", lesson.id());
        assertTrue(jdbc.queryForObject("SELECT lesson_revision_public(?,1)", Boolean.class, lesson.id()));
        jdbc.update("UPDATE lessons SET withdrawn_at=now() WHERE id=?", lesson.id());
        assertFalse(jdbc.queryForObject("SELECT lesson_revision_public(?,1)", Boolean.class, lesson.id()));

        UUID path = UUID.randomUUID();
        jdbc.update("INSERT INTO learning_paths(id,slug,title_vi,rights_id) VALUES(?,?,?,?)",
                path, "path-" + path, "Path", right);
        jdbc.update("INSERT INTO path_revisions(path_id,revision,title_vi,rights_id) VALUES(?,1,'Path',?)", path, right);
        jdbc.update("UPDATE path_revisions SET sealed_at=now() WHERE path_id=? AND revision=1", path);
        assertTrue(jdbc.queryForObject("SELECT path_revision_public(?,1)", Boolean.class, path));
        jdbc.update("UPDATE learning_paths SET withdrawn_at=now() WHERE id=?", path);
        assertFalse(jdbc.queryForObject("SELECT path_revision_public(?,1)", Boolean.class, path));
    }

    @Test
    void malformedLessonLayoutCannotSealOrExposePins() throws Exception {
        UUID right = rights("cleared");
        Item item = item(right);
        publishItem(item, right, 1, "a");
        Lesson lesson = lesson(right);
        UUID section = section(lesson.id(), 1);
        jdbc.update("INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id) VALUES(?,1,'Lesson',?)",
                lesson.id(), right);
        jdbc.update("INSERT INTO lesson_revision_items(lesson_id,lesson_revision,section_id,position,item_id,item_revision) " +
                "VALUES(?,1,?,1,?,1)", lesson.id(), section, item.id());
        jdbc.update("UPDATE lesson_revisions SET presentation=?::jsonb WHERE lesson_id=? AND revision=1",
                "{\"schemaVersion\":\"2.0\",\"objectives\":[],\"sections\":[]}", lesson.id());
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE lesson_revisions SET sealed_at=now() WHERE lesson_id=? AND revision=1", lesson.id()));
        jdbc.update("UPDATE lesson_revisions SET presentation=?::jsonb WHERE lesson_id=? AND revision=1",
                "{\"schemaVersion\":\"1.0\",\"objectives\":[],\"sections\":[]}", lesson.id());
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE lesson_revisions SET sealed_at=now() WHERE lesson_id=? AND revision=1", lesson.id()));
        mvc.perform(get("/api/v1/lessons/" + lesson.slug())).andExpect(status().isNotFound());
        setLessonPresentation(lesson.id(), 1);
        jdbc.update("UPDATE lesson_revisions SET sealed_at=now() WHERE lesson_id=? AND revision=1", lesson.id());
        jdbc.update("UPDATE lessons SET published_revision=1 WHERE id=?", lesson.id());
        mvc.perform(get("/api/v1/lessons/" + lesson.slug())).andExpect(status().isOk());
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE lesson_revisions SET presentation='{}'::jsonb WHERE lesson_id=? AND revision=1", lesson.id()));
    }

    @Test
    void duplicateOrOmittedPathLayoutCannotSeal() {
        UUID right = rights("cleared");
        Item item = item(right);
        publishItem(item, right, 1, "a");
        Lesson lesson = lesson(right);
        publishLesson(lesson, right, item, 1, 1, "Lesson", section(lesson.id(), 1));
        PathFixture path = pathFixture(right, lesson);
        jdbc.update("INSERT INTO path_revisions(path_id,revision,title_vi,rights_id) VALUES(?,1,'Path',?)", path.id(), right);
        jdbc.update("INSERT INTO path_revision_stages(path_id,path_revision,stage_id,rights_id) VALUES(?,1,?,?)",
                path.id(), path.stage(), right);
        jdbc.update("INSERT INTO path_revision_chapters(path_id,path_revision,stage_id,chapter_id,rights_id) " +
                "VALUES(?,1,?,?,?)", path.id(), path.stage(), path.chapter(), right);
        jdbc.update("INSERT INTO path_revision_lessons(path_id,path_revision,chapter_id,position,placement_id,lesson_id,lesson_revision) " +
                "VALUES(?,1,?,1,?,?,1)", path.id(), path.chapter(), path.placement(), lesson.id());
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE path_revisions SET sealed_at=now() WHERE path_id=? AND revision=1", path.id()));
        setPathPresentation(path.id(), 1);
        jdbc.update("UPDATE path_revisions SET presentation=jsonb_set(presentation,'{stages,0,chapters}', " +
                "(presentation->'stages'->0->'chapters') || (presentation->'stages'->0->'chapters')) " +
                "WHERE path_id=? AND revision=1", path.id());
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "UPDATE path_revisions SET sealed_at=now() WHERE path_id=? AND revision=1", path.id()));
        setPathPresentation(path.id(), 1);
        jdbc.update("UPDATE path_revisions SET sealed_at=now() WHERE path_id=? AND revision=1", path.id());
        jdbc.update("UPDATE learning_paths SET published_revision=1 WHERE id=?", path.id());
        assertTrue(jdbc.queryForObject("SELECT path_revision_public(?,1)", Boolean.class, path.id()));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "INSERT INTO path_revision_lessons(path_id,path_revision,chapter_id,position,placement_id,lesson_id,lesson_revision) " +
                "VALUES(?,1,?,2,?,?,1)", path.id(), path.chapter(), path.placement(), lesson.id()));
    }

    private int racePointer(UUID lessonId, int revision, CountDownLatch ready, CountDownLatch go) {
        ready.countDown();
        try {
            if (!go.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("race did not start");
            return jdbc.update("UPDATE lessons SET published_revision=? WHERE id=? AND published_revision=1",
                    revision, lessonId);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(ex);
        }
    }

    private UUID rights(String status) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO content_rights(id,origin_kind,source_label,attribution,permission_basis," +
                "evidence_ref,clearance_status) VALUES(?,'original','Nichigo','Nichigo','original work',?,?)",
                id, "private-rights-evidence", status);
        return id;
    }

    private Item item(UUID rights) {
        Item item = new Item(UUID.randomUUID(), "item-" + UUID.randomUUID());
        jdbc.update("INSERT INTO content_items(id,stable_key,kind,payload,rights_id) " +
                "VALUES(?,?,'kana','{}'::jsonb,?)", item.id(), item.key(), rights);
        return item;
    }

    private void publishItem(Item item, UUID rights, int revision, String glyph) {
        jdbc.update("INSERT INTO content_item_revisions(item_id,revision,kind,display_text_ja,payload,rights_id) " +
                "VALUES(?,?,'kana',?,?::jsonb,?)", item.id(), revision, glyph,
                "{\"glyph\":\"" + glyph + "\"}", rights);
        jdbc.update("UPDATE content_item_revisions SET sealed_at=now() WHERE item_id=? AND revision=?",
                item.id(), revision);
        jdbc.update("UPDATE content_items SET published_revision=? WHERE id=?", revision, item.id());
    }

    private Lesson lesson(UUID rights) {
        Lesson lesson = new Lesson(UUID.randomUUID(), "lesson-" + UUID.randomUUID());
        jdbc.update("INSERT INTO lessons(id,stable_key,slug,title_vi,rights_id) VALUES(?,?,?,?,?)",
                lesson.id(), lesson.slug(), lesson.slug(), "Bản nháp", rights);
        return lesson;
    }

    private UUID section(UUID lesson, int position) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO lesson_sections(id,lesson_id,position) VALUES(?,?,?)", id, lesson, position);
        return id;
    }

    private void publishLesson(Lesson lesson, UUID rights, Item item, int itemRevision,
                               int revision, String title, UUID section) {
        jdbc.update("INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id) VALUES(?,?,?,?)",
                lesson.id(), revision, title, rights);
        jdbc.update("INSERT INTO lesson_revision_items(lesson_id,lesson_revision,section_id,position,item_id,item_revision) " +
                "VALUES(?,?,?,1,?,?)", lesson.id(), revision, section, item.id(), itemRevision);
        setLessonPresentation(lesson.id(), revision);
        jdbc.update("UPDATE lesson_revisions SET sealed_at=now() WHERE lesson_id=? AND revision=?",
                lesson.id(), revision);
        jdbc.update("UPDATE lessons SET published_revision=? WHERE id=?", revision, lesson.id());
    }

    private PathFixture pathFixture(UUID rights, Lesson lesson) {
        PathFixture path = new PathFixture(UUID.randomUUID(), "path-" + UUID.randomUUID(),
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        jdbc.update("INSERT INTO learning_paths(id,slug,title_vi,rights_id) VALUES(?,?,'Lộ trình',?)",
                path.id(), path.slug(), rights);
        jdbc.update("INSERT INTO path_stages(id,path_id,stable_key,position,title_vi,rights_id) " +
                "VALUES(?,?,?,1,'Giai đoạn',?)", path.stage(), path.id(), "stage-" + path.stage(), rights);
        jdbc.update("INSERT INTO stage_chapters(id,stage_id,stable_key,position,title_vi,rights_id) " +
                "VALUES(?,?,?,1,'Chương',?)", path.chapter(), path.stage(), "chapter-" + path.chapter(), rights);
        jdbc.update("INSERT INTO chapter_lessons(id,chapter_id,lesson_id,position) VALUES(?,?,?,1)",
                path.placement(), path.chapter(), lesson.id());
        return path;
    }

    private void publishPathRevision(PathFixture path, UUID rights, Lesson lesson,
                                     int revision, int lessonRevision) {
        jdbc.update("INSERT INTO path_revisions(path_id,revision,title_vi,rights_id) VALUES(?,?,?,?)",
                path.id(), revision, "Lộ trình " + revision, rights);
        jdbc.update("INSERT INTO path_revision_stages(path_id,path_revision,stage_id,rights_id) " +
                "VALUES(?,?,?,?)", path.id(), revision, path.stage(), rights);
        jdbc.update("INSERT INTO path_revision_chapters(path_id,path_revision,stage_id,chapter_id,rights_id) " +
                "VALUES(?,?,?,?,?)", path.id(), revision, path.stage(), path.chapter(), rights);
        jdbc.update("INSERT INTO path_revision_lessons(path_id,path_revision,chapter_id,position,placement_id,lesson_id,lesson_revision) " +
                "VALUES(?,?,?,1,?,?,?)", path.id(), revision, path.chapter(), path.placement(),
                lesson.id(), lessonRevision);
        setPathPresentation(path.id(), revision);
        jdbc.update("UPDATE path_revisions SET sealed_at=now() WHERE path_id=? AND revision=?", path.id(), revision);
        jdbc.update("UPDATE learning_paths SET published_revision=? WHERE id=?", revision, path.id());
    }

    private void setLessonPresentation(UUID lessonId, int revision) {
        jdbc.update("""
                UPDATE lesson_revisions lr SET presentation=jsonb_build_object(
                  'schemaVersion','1.0',
                  'objectives',jsonb_build_array(jsonb_build_object(
                    'position',1,'kind','can_do','textVi','Nhận biết âm đã học')),
                  'sections',COALESCE((
                    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                      'id',s.id,'position',s.position,'titleVi',s.title_vi)) ORDER BY s.position)
                    FROM lesson_sections s WHERE s.lesson_id=lr.lesson_id), '[]'::jsonb))
                WHERE lr.lesson_id=? AND lr.revision=?
                """, lessonId, revision);
    }

    private void setPathPresentation(UUID pathId, int revision) {
        jdbc.update("""
                UPDATE path_revisions pr SET presentation=jsonb_build_object(
                  'schemaVersion','1.0',
                  'stages',COALESCE((
                    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                      'id',s.id,'position',s.position,'titleVi',s.title_vi,
                      'descriptionVi',s.description_vi,
                      'chapters',COALESCE((
                        SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                          'id',c.id,'position',c.position,'titleVi',c.title_vi,
                          'descriptionVi',c.description_vi)) ORDER BY c.position)
                        FROM path_revision_chapters pc JOIN stage_chapters c ON c.id=pc.chapter_id
                        WHERE pc.path_id=pr.path_id AND pc.path_revision=pr.revision
                          AND pc.stage_id=s.id), '[]'::jsonb))) ORDER BY s.position)
                    FROM path_revision_stages ps JOIN path_stages s ON s.id=ps.stage_id
                    WHERE ps.path_id=pr.path_id AND ps.path_revision=pr.revision), '[]'::jsonb))
                WHERE pr.path_id=? AND pr.revision=?
                """, pathId, revision);
    }

    private record Item(UUID id, String key) {}
    private record Lesson(UUID id, String slug) {}
    private record PathFixture(UUID id, String slug, UUID stage, UUID chapter, UUID placement) {}
}
