package com.nichigo.api.content;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class SkillsContentIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    @WithAnonymousUser
    void anonymousReadsArePublicNoStoreAndDoNotCreateGuestIdentity() throws Exception {
        UUID rights = rights("cleared");
        Item published = item("vocabulary", rights,
                "{\"surface\":\"猫\",\"reading\":\"ねこ\",\"glossVi\":\"mèo\"}", "猫", "mèo");
        int guestsBefore = jdbc.queryForObject("SELECT count(*) FROM guest_identities", Integer.class);
        mvc.perform(get("/api/v1/skills"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
        mvc.perform(get("/api/v1/skills/items").param("type", "vocabulary"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
        mvc.perform(get("/api/v1/skills/items/" + published.id()))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
        mvc.perform(get("/api/v1/skills/flashcards").param("type", "vocabulary"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
        assertEquals(guestsBefore, jdbc.queryForObject("SELECT count(*) FROM guest_identities", Integer.class));
    }

    @Test
    void directoryAndDetailUseOnlyCurrentEligiblePublishedItems() throws Exception {
        int before = count("grammar");
        assertDirectoryShape();
        UUID rights = rights("cleared");
        Item draft = draft("grammar", rights);
        Item published = item("grammar", rights, "{\"pattern\":\"〜です\",\"explanationVi\":\"Là\","
                + "\"exampleRefs\":[\"" + draft.key() + "\"]}", "〜です", "Là");
        assertEquals(before + 1, count("grammar"));
        assertEquals("available", directorySkill("grammar").path("availability").asText());
        mvc.perform(get("/api/v1/skills/items/" + published.id()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(published.id().toString()))
                .andExpect(jsonPath("$.revision").value(1))
                .andExpect(jsonPath("$.payload.pattern").value("〜です"))
                .andExpect(jsonPath("$.payload.exampleRefs").doesNotExist())
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("private-rights-evidence"))));
        mvc.perform(get("/api/v1/skills/items/" + draft.id())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/skills/items/" + published.id()).param("revision", "999"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(1));

        jdbc.update("INSERT INTO content_item_revisions(item_id,revision,kind,payload,rights_id) " +
                "VALUES(?,2,'grammar','{\"pattern\":\"〜でした\",\"explanationVi\":\"Đã là\"}'::jsonb,?)",
                published.id(), rights);
        jdbc.update("UPDATE content_item_revisions SET sealed_at=now() WHERE item_id=? AND revision=2", published.id());
        jdbc.update("UPDATE content_items SET published_revision=2 WHERE id=?", published.id());
        mvc.perform(get("/api/v1/skills/items/" + published.id()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(2))
                .andExpect(jsonPath("$.payload.pattern").value("〜でした"));

        Item withdrawn = item("kanji", rights, "{\"glyph\":\"日\",\"meaningVi\":\"ngày\"}", "日", "ngày");
        jdbc.update("UPDATE content_items SET withdrawn_at=now() WHERE id=?", withdrawn.id());
        mvc.perform(get("/api/v1/skills/items/" + withdrawn.id())).andExpect(status().isNotFound());

        jdbc.update("UPDATE content_rights SET clearance_status='revoked' WHERE id=?", rights);
        assertEquals(before, count("grammar"));
        assertEquals(before > 0 ? "available" : "no_published_content",
                directorySkill("grammar").path("availability").asText());
        mvc.perform(get("/api/v1/skills/items/" + published.id())).andExpect(status().isNotFound());
    }

    @Test
    void languageSkillsRemainUnavailableDespiteRelatedPublishedItems() throws Exception {
        UUID rights = rights("cleared");
        Item vocabulary = draft("vocabulary", rights);
        jdbc.update("INSERT INTO content_item_revisions(item_id,revision,kind,payload,rights_id) " +
                "VALUES(?,1,'vocabulary','{\"surface\":\"聞く\",\"reading\":\"きく\",\"glossVi\":\"nghe\"}'::jsonb,?)",
                vocabulary.id(), rights);
        jdbc.update("INSERT INTO content_item_revision_tags(item_id,item_revision,category,code) " +
                "VALUES(?,1,'language_skill','listening')", vocabulary.id());
        jdbc.update("UPDATE content_item_revisions SET sealed_at=now() WHERE item_id=? AND revision=1", vocabulary.id());
        jdbc.update("UPDATE content_items SET published_revision=1 WHERE id=?", vocabulary.id());
        assertEquals("available", directorySkill("vocabulary").path("availability").asText());
        for (String type : new String[]{"listening", "speaking", "reading", "writing"}) {
            var skill = directorySkill(type);
            assertEquals("feature_unavailable", skill.path("availability").asText());
            assertTrue(skill.path("itemCount").isNull());
            mvc.perform(get("/api/v1/skills/items").param("type", type))
                    .andExpect(status().isBadRequest());
            mvc.perform(get("/api/v1/skills/flashcards").param("type", type))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void searchAndFlashcardsUseStablePagesAndNeverRevealRevokedItems() throws Exception {
        UUID rights = rights("cleared");
        String token = "jpn033" + UUID.randomUUID().toString().replace("-", "");
        Item first = item("vocabulary", rights, "{\"surface\":\"猫\",\"reading\":\"ねこ\",\"glossVi\":\"mèo\"}",
                "猫 " + token, "mèo");
        Item second = item("vocabulary", rights, "{\"surface\":\"犬\",\"reading\":\"いぬ\",\"glossVi\":\"chó\"}",
                "犬 " + token, "chó");
        Item missingBack = item("vocabulary", rights, "{\"surface\":\"鳥\"}",
                "鳥 " + token, "chim");
        int guestsBefore = jdbc.queryForObject("SELECT count(*) FROM guest_identities", Integer.class);
        int unlocksBefore = jdbc.queryForObject("SELECT count(*) FROM guest_lesson_unlocks", Integer.class);
        int bookmarksBefore = jdbc.queryForObject("SELECT count(*) FROM skill_bookmarks", Integer.class);
        var firstPage = json.readTree(mvc.perform(get("/api/v1/skills/items")
                .param("type", "vocabulary").param("q", token).param("limit", "1"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        String cursor = firstPage.path("nextCursor").asText("");
        Set<String> seen = new HashSet<>();
        seen.add(firstPage.path("items").get(0).path("id").asText());
        while (!cursor.isEmpty()) {
            var page = json.readTree(mvc.perform(get("/api/v1/skills/items")
                    .param("type", "vocabulary").param("q", token)
                    .param("limit", "1").param("after", cursor))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
            assertTrue(seen.add(page.path("items").get(0).path("id").asText()));
            cursor = page.path("nextCursor").asText("");
        }
        assertEquals(Set.of(first.id().toString(), second.id().toString(), missingBack.id().toString()), seen);
        mvc.perform(get("/api/v1/skills/items").param("type", "grammar").param("q", token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0));
        Set<String> cardIds = new HashSet<>();
        String cardCursor = null;
        do {
            var request = get("/api/v1/skills/flashcards").param("type", "vocabulary")
                    .param("limit", "10");
            if (cardCursor != null) request.param("after", cardCursor);
            var page = json.readTree(mvc.perform(request).andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString());
            for (var card : page.path("cards")) {
                cardIds.add(card.path("id").asText());
                if (card.path("id").asText().equals(first.id().toString())) {
                    assertEquals("猫", card.path("front").asText());
                    assertEquals("mèo", card.path("back").asText());
                    assertEquals("ねこ", card.path("reading").asText());
                }
            }
            cardCursor = page.path("nextCursor").asText("");
        } while (!cardCursor.isEmpty());
        assertTrue(cardIds.contains(first.id().toString()));
        assertTrue(cardIds.contains(second.id().toString()));
        assertFalse(cardIds.contains(missingBack.id().toString()));
        assertEquals(guestsBefore, jdbc.queryForObject("SELECT count(*) FROM guest_identities", Integer.class));
        assertEquals(unlocksBefore, jdbc.queryForObject("SELECT count(*) FROM guest_lesson_unlocks", Integer.class));
        assertEquals(bookmarksBefore, jdbc.queryForObject("SELECT count(*) FROM skill_bookmarks", Integer.class));
        mvc.perform(get("/api/v1/skills/items").param("limit", "51"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("invalid_content_query"));
        mvc.perform(get("/api/v1/skills/items").param("type", "example"))
                .andExpect(status().isBadRequest());

        jdbc.update("UPDATE content_rights SET clearance_status='revoked' WHERE id=?", rights);
        mvc.perform(get("/api/v1/skills/items").param("q", token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get("/api/v1/skills/items/" + first.id())).andExpect(status().isNotFound());
        Set<String> revokedCardIds = new HashSet<>();
        Set<String> revokedCursors = new HashSet<>();
        String revokedCursor = null;
        do {
            var request = get("/api/v1/skills/flashcards").param("type", "vocabulary")
                    .param("limit", "1");
            if (revokedCursor != null) request.param("after", revokedCursor);
            var page = json.readTree(mvc.perform(request).andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString());
            for (var card : page.path("cards")) revokedCardIds.add(card.path("id").asText());
            revokedCursor = page.path("nextCursor").asText("");
            if (!revokedCursor.isEmpty()) assertTrue(revokedCursors.add(revokedCursor));
        } while (!revokedCursor.isEmpty());
        assertFalse(revokedCardIds.contains(first.id().toString()));
        assertFalse(revokedCardIds.contains(second.id().toString()));
    }

    private int count(String type) throws Exception {
        return directorySkill(type).path("itemCount").asInt();
    }

    private tools.jackson.databind.JsonNode directorySkill(String type) throws Exception {
        var body = json.readTree(mvc.perform(get("/api/v1/skills")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        for (var group : body.path("groups"))
            for (var skill : group.path("skills"))
                if (type.equals(skill.path("type").asText())) return skill;
        throw new AssertionError("Missing Skills category");
    }

    private void assertDirectoryShape() throws Exception {
        var body = json.readTree(mvc.perform(get("/api/v1/skills")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertEquals(2, body.path("groups").size());
        assertEquals("foundation-knowledge", body.path("groups").get(0).path("id").asText());
        assertEquals("language-skills", body.path("groups").get(1).path("id").asText());
        String[] foundation = {"kana", "vocabulary", "grammar", "kanji"};
        String[] language = {"listening", "speaking", "reading", "writing"};
        for (int n = 0; n < 4; n++) {
            assertEquals(foundation[n], body.path("groups").get(0).path("skills").get(n).path("type").asText());
            assertEquals(language[n], body.path("groups").get(1).path("skills").get(n).path("type").asText());
        }
        assertEquals(4, body.path("groups").get(0).path("skills").size());
        assertEquals(4, body.path("groups").get(1).path("skills").size());
    }

    private UUID rights(String status) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO content_rights(id,origin_kind,source_label,attribution,permission_basis," +
                "evidence_ref,clearance_status) VALUES(?,'original','Nichigo','Nichigo','original work',?,?)",
                id, "private-rights-evidence", status);
        return id;
    }

    private Item draft(String kind, UUID rights) {
        Item item = new Item(UUID.randomUUID(), "jpn033-" + UUID.randomUUID());
        jdbc.update("INSERT INTO content_items(id,stable_key,kind,payload,rights_id) VALUES(?,?,?,'{}'::jsonb,?)",
                item.id(), item.key(), kind, rights);
        return item;
    }

    private Item item(String kind, UUID rights, String payload, String ja, String vi) {
        Item item = draft(kind, rights);
        jdbc.update("INSERT INTO content_item_revisions(item_id,revision,kind,display_text_ja,display_text_vi,payload,rights_id) " +
                "VALUES(?,1,?,?,?,?::jsonb,?)", item.id(), kind, ja, vi, payload, rights);
        jdbc.update("UPDATE content_item_revisions SET sealed_at=now() WHERE item_id=? AND revision=1", item.id());
        jdbc.update("UPDATE content_items SET published_revision=1 WHERE id=?", item.id());
        return item;
    }

    private record Item(UUID id, String key) {}
}
