package com.nichigo.api.guest;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(GuestFoundationIntegrationTest.ClockConfiguration.class)
class GuestFoundationIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired AdjustableClock clock;
    @Autowired ObjectMapper json;
    @Autowired GuestService guests;
    @Autowired PlatformTransactionManager transactions;

    @TestConfiguration
    static class ClockConfiguration {
        @Bean @Primary AdjustableClock adjustableClock() { return new AdjustableClock(); }
    }

    static class AdjustableClock extends Clock {
        private final AtomicReference<Instant> now = new AtomicReference<>();
        void set(Instant value) { now.set(value); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now.get(); }
    }

    @BeforeEach void resetClock() { clock.set(Instant.parse("2026-11-16T03:00:00Z")); }

    private Cookie guestCookie() throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/guest/session").with(csrf()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.restored").value(false)).andReturn();
        String raw = result.getResponse().getHeader("Set-Cookie");
        assertNotNull(raw);
        assertTrue(raw.contains("HttpOnly"));
        assertTrue(raw.contains("SameSite"));
        return new Cookie(GuestService.COOKIE, raw.split(";", 2)[0].split("=", 2)[1]);
    }

    private UUID rights() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO content_rights(id,origin_kind,source_label,attribution,permission_basis,evidence_ref,clearance_status) "
                        + "VALUES(?,'original','Nichigo','Nichigo','original work','private-evidence','cleared')", id);
        return id;
    }

    private String lesson(UUID right) {
        UUID id = UUID.randomUUID();
        String slug = "guest-test-" + id;
        jdbc.update("INSERT INTO lessons(id,stable_key,slug,title_vi,rights_id) VALUES(?,?,?,?,?)",
                id, slug, slug, "Lesson", right);
        jdbc.update("INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id) VALUES(?,1,'Lesson',?)",
                id, right);
        jdbc.update("UPDATE lesson_revisions SET sealed_at=now() WHERE lesson_id=? AND revision=1", id);
        jdbc.update("UPDATE lessons SET published_revision=1 WHERE id=?", id);
        return slug;
    }

    private UUID item(UUID right) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO content_items(id,stable_key,kind,payload,rights_id) VALUES(?,?,'kana','{}'::jsonb,?)",
                id, "guest-item-" + id, right);
        jdbc.update("INSERT INTO content_item_revisions(item_id,revision,kind,display_text_ja,payload,rights_id) "
                + "VALUES(?,1,'kana','A','{}'::jsonb,?)", id, right);
        jdbc.update("UPDATE content_item_revisions SET sealed_at=now() WHERE item_id=? AND revision=1", id);
        jdbc.update("UPDATE content_items SET published_revision=1 WHERE id=?", id);
        return id;
    }

    private String[] path(UUID right, String lessonSlug) {
        UUID lessonId = jdbc.queryForObject("SELECT id FROM lessons WHERE slug=?", UUID.class, lessonSlug);
        UUID pathId = UUID.randomUUID(), stage = UUID.randomUUID(), chapter = UUID.randomUUID(), placement = UUID.randomUUID();
        String slug = "guest-path-" + pathId;
        jdbc.update("INSERT INTO learning_paths(id,slug,title_vi,rights_id) VALUES(?,?,'Path',?)", pathId, slug, right);
        jdbc.update("INSERT INTO path_stages(id,path_id,stable_key,position,title_vi,rights_id) VALUES(?,?,?,1,'Stage',?)",
                stage, pathId, "stage-" + stage, right);
        jdbc.update("INSERT INTO stage_chapters(id,stage_id,stable_key,position,title_vi,rights_id) VALUES(?,?,?,1,'Chapter',?)",
                chapter, stage, "chapter-" + chapter, right);
        jdbc.update("INSERT INTO chapter_lessons(id,chapter_id,lesson_id,position) VALUES(?,?,?,1)", placement, chapter, lessonId);
        jdbc.update("INSERT INTO path_revisions(path_id,revision,title_vi,rights_id) VALUES(?,1,'Path',?)", pathId, right);
        jdbc.update("INSERT INTO path_revision_stages(path_id,path_revision,stage_id,position,title_vi,rights_id) "
                + "VALUES(?,1,?,1,'Stage',?)", pathId, stage, right);
        jdbc.update("INSERT INTO path_revision_chapters(path_id,path_revision,stage_id,chapter_id,position,title_vi,rights_id) "
                + "VALUES(?,1,?,?,1,'Chapter',?)", pathId, stage, chapter, right);
        jdbc.update("INSERT INTO path_revision_lessons(path_id,path_revision,chapter_id,position,placement_id,lesson_id,lesson_revision) "
                + "VALUES(?,1,?,1,?,?,1)", pathId, chapter, placement, lessonId);
        jdbc.update("UPDATE path_revisions SET sealed_at=now() WHERE path_id=? AND revision=1", pathId);
        jdbc.update("UPDATE learning_paths SET published_revision=1 WHERE id=?", pathId);
        return new String[]{slug, placement.toString()};
    }

    @Test void identityRestorationCsrfAndRetentionAreIndependentOfSession() throws Exception {
        mvc.perform(post("/api/v1/guest/session")).andExpect(status().isForbidden());
        Cookie cookie = guestCookie();
        mvc.perform(get("/api/v1/guest/session").cookie(cookie)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/guest/session").with(csrf()).cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.restored").value(true));
        mvc.perform(post("/api/v1/guest/session").with(csrf())
                        .cookie(new Cookie(GuestService.COOKIE, "invalid")))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));
        mvc.perform(post("/api/v1/guest/activity").cookie(cookie)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/guest/activity").with(csrf()).cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.lastActiveAt").value("2026-11-16T03:00:00Z"));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM guest_identities WHERE credential_hash = ?",
                Integer.class, cookie.getValue()));
        clock.set(clock.instant().plusSeconds(240));
        mvc.perform(post("/api/v1/guest/activity").with(csrf()).cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.lastActiveAt").value("2026-11-16T03:00:00Z"));
        clock.set(clock.instant().plusSeconds(60));
        mvc.perform(post("/api/v1/guest/activity").with(csrf()).cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.lastActiveAt").value("2026-11-16T03:05:00Z"));
        // A fresh CSRF session is sufficient after an older 30-minute SESSION expires.
        mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk());
        mvc.perform(post("/api/v1/guest/activity").with(csrf()).cookie(cookie)).andExpect(status().isOk());
        clock.set(clock.instant().plusSeconds(90L * 24 * 3600 + 301));
        mvc.perform(post("/api/v1/guest/activity").with(csrf()).cookie(cookie))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("guest_identity_invalid"));
    }

    @Test void realCsrfSessionCanExpireWithoutLosingGuestLearningData() throws Exception {
        MvcResult initialCsrf = mvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isOk()).andReturn();
        String firstToken = json.readTree(initialCsrf.getResponse().getContentAsString()).get("token").asText();
        Cookie firstSession = initialCsrf.getResponse().getCookie("SESSION");
        assertNotNull(firstSession);

        MvcResult created = mvc.perform(post("/api/v1/guest/session")
                        .cookie(firstSession).header("X-CSRF-TOKEN", firstToken))
                .andExpect(status().isCreated()).andReturn();
        String raw = created.getResponse().getHeader("Set-Cookie");
        assertNotNull(raw);
        Cookie guestCookie = new Cookie(GuestService.COOKIE, raw.split(";", 2)[0].split("=", 2)[1]);
        UUID right = rights();
        UUID itemId = item(right);
        String lessonSlug = lesson(right);
        mvc.perform(put("/api/v1/skills/bookmarks/" + itemId)
                        .cookie(firstSession, guestCookie).header("X-CSRF-TOKEN", firstToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.summary.savedCount").value(1));
        mvc.perform(post("/api/v1/lessons/" + lessonSlug + "/unlock")
                        .cookie(firstSession, guestCookie).header("X-CSRF-TOKEN", firstToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.guestQuota.used").value(1));

        String sessionId = new String(Base64.getDecoder().decode(firstSession.getValue()), StandardCharsets.UTF_8);
        assertEquals(1, jdbc.update("UPDATE SPRING_SESSION SET LAST_ACCESS_TIME=0, MAX_INACTIVE_INTERVAL=1, "
                + "EXPIRY_TIME=0 WHERE SESSION_ID=?", sessionId));
        mvc.perform(post("/api/v1/guest/activity").cookie(firstSession, guestCookie)
                        .header("X-CSRF-TOKEN", firstToken))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/guest/quota").cookie(guestCookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.used").value(1));
        mvc.perform(get("/api/v1/skills/bookmarks/summary").cookie(guestCookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.savedCount").value(1));

        MvcResult refreshedCsrf = mvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isOk()).andReturn();
        Cookie secondSession = refreshedCsrf.getResponse().getCookie("SESSION");
        String secondToken = json.readTree(refreshedCsrf.getResponse().getContentAsString()).get("token").asText();
        assertNotNull(secondSession);
        assertNotEquals(firstSession.getValue(), secondSession.getValue());
        assertNotEquals(firstToken, secondToken);
        mvc.perform(post("/api/v1/guest/activity").cookie(secondSession, guestCookie)
                        .header("X-CSRF-TOKEN", secondToken))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/v1/skills/bookmarks/" + itemId).cookie(secondSession, guestCookie)
                        .header("X-CSRF-TOKEN", secondToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.summary.savedCount").value(0));
        mvc.perform(get("/api/v1/guest/quota").cookie(guestCookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.used").value(1));
    }

    @Test void actorSpecificReadsAndMutationsAreNotCached() throws Exception {
        Cookie cookie = guestCookie();
        UUID right = rights();
        String slug = lesson(right);
        String[] path = path(right, slug);
        mvc.perform(get("/api/v1/guest/session").cookie(cookie))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(get("/api/v1/guest/quota").cookie(cookie))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(get("/api/v1/lessons/" + slug + "/access").cookie(cookie))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
        String contextual = "/api/v1/learning-paths/" + path[0] + "/placements/" + path[1] + "/lesson";
        mvc.perform(get(contextual + "/access").cookie(cookie))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(post(contextual + "/unlock").with(csrf()).cookie(cookie))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(get("/api/v1/skills/bookmarks/summary").cookie(cookie))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(put("/api/v1/skills/bookmarks/" + item(right)).with(csrf()).cookie(cookie))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test void rightsChangeWhileGuestLockIsHeldPreventsUnlockAndQuotaUse() throws Exception {
        Cookie cookie = guestCookie();
        UUID guestId;
        var request = new org.springframework.mock.web.MockHttpServletRequest();
        request.setCookies(cookie);
        guestId = guests.requireGuest(request).id();
        UUID right = rights();
        String slug = lesson(right);
        CountDownLatch locked = new CountDownLatch(1), release = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var holder = pool.submit(() -> {
                new TransactionTemplate(transactions).executeWithoutResult(status -> {
                    jdbc.queryForObject("SELECT id FROM guest_identities WHERE id=? FOR UPDATE", UUID.class, guestId);
                    locked.countDown();
                    try {
                        if (!release.await(15, TimeUnit.SECONDS)) throw new IllegalStateException("Lock release timed out");
                    } catch (InterruptedException ex) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException(ex);
                    }
                });
                return null;
            });
            assertTrue(locked.await(5, TimeUnit.SECONDS));
            var unlock = pool.submit(() -> mvc.perform(post("/api/v1/lessons/" + slug + "/unlock")
                    .with(csrf()).cookie(cookie)).andReturn().getResponse().getStatus());
            try {
                boolean waiting = false;
                for (int i = 0; i < 150; i++) {
                    Integer blocked = jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity "
                            + "WHERE wait_event_type='Lock' AND query LIKE 'SELECT id FROM guest_identities%FOR UPDATE%'",
                            Integer.class);
                    if (blocked != null && blocked > 0) { waiting = true; break; }
                    Thread.sleep(20);
                }
                assertTrue(waiting, "Unlock did not reach the Guest row lock");
                jdbc.update("UPDATE content_rights SET clearance_status='revoked' WHERE id=?", right);
            } finally {
                release.countDown();
            }
            holder.get(15, TimeUnit.SECONDS);
            assertEquals(404, unlock.get(15, TimeUnit.SECONDS));
        }
        mvc.perform(get("/api/v1/guest/quota").cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.used").value(0));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM guest_lesson_unlocks WHERE guest_id=?",
                Integer.class, guestId));
    }

    @Test void stableLessonUnlockIsGatedAndDailyQuotaResetsInVietnam() throws Exception {
        Cookie cookie = guestCookie();
        UUID right = rights();
        String first = lesson(right), second = lesson(right), third = lesson(right);
        mvc.perform(get("/api/v1/lessons/" + first).cookie(cookie))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("lesson_not_unlocked"));
        mvc.perform(get("/api/v1/lessons/" + first + "/access").cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accessStatus").value("locked"));
        mvc.perform(post("/api/v1/lessons/" + first + "/unlock").with(csrf()).cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.newlyUnlocked").value(true));
        mvc.perform(post("/api/v1/lessons/" + first + "/unlock").with(csrf()).cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.newlyUnlocked").value(false));
        mvc.perform(post("/api/v1/lessons/" + second + "/unlock").with(csrf()).cookie(cookie))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/lessons/" + third + "/unlock").with(csrf()).cookie(cookie))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("guest_unlock_quota_exceeded"));
        mvc.perform(get("/api/v1/lessons/" + first).cookie(cookie))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
        clock.set(Instant.parse("2026-11-16T17:00:00Z")); // Midnight in Vietnam.
        mvc.perform(post("/api/v1/lessons/" + third + "/unlock").with(csrf()).cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.guestQuota.used").value(1));
    }

    @Test void unavailableBookmarksRemainVisibleAndCanBeRemoved() throws Exception {
        Cookie cookie = guestCookie();
        UUID right = rights();
        List<UUID> ids = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            UUID id = item(right);
            ids.add(id);
            mvc.perform(put("/api/v1/skills/bookmarks/" + id).with(csrf()).cookie(cookie))
                    .andExpect(status().isOk());
        }
        mvc.perform(put("/api/v1/skills/bookmarks/" + ids.getFirst()).with(csrf()).cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.summary.savedCount").value(20));
        UUID extra = item(right);
        mvc.perform(put("/api/v1/skills/bookmarks/" + extra).with(csrf()).cookie(cookie))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("guest_bookmark_limit_reached"));
        for (int i = 0; i < 3; i++) jdbc.update("UPDATE content_items SET withdrawn_at=now() WHERE id=?", ids.get(i));
        MvcResult page = mvc.perform(get("/api/v1/skills/bookmarks?limit=50").cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.summary.savedCount").value(20))
                .andExpect(jsonPath("$.items.length()").value(20)).andReturn();
        int unavailable = 0;
        for (var entry : json.readTree(page.getResponse().getContentAsString()).get("items")) {
            if ("unavailable".equals(entry.get("availability").asText())) {
                unavailable++;
                assertEquals(3, entry.size());
                assertFalse(entry.has("item"));
            }
        }
        assertEquals(3, unavailable);
        assertFalse(page.getResponse().getContentAsString().contains("private-evidence"));
        for (int i = 0; i < 3; i++) {
            mvc.perform(get("/api/v1/skills/bookmarks/" + ids.get(i)).cookie(cookie))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.availability").value("unavailable"));
            mvc.perform(delete("/api/v1/skills/bookmarks/" + ids.get(i)).with(csrf()).cookie(cookie))
                    .andExpect(status().isOk());
        }
        mvc.perform(get("/api/v1/skills/bookmarks/summary").cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.savedCount").value(17))
                .andExpect(jsonPath("$.remaining").value(3));
    }

    @Test void simultaneousNewUnlocksCannotExceedTwo() throws Exception {
        Cookie cookie = guestCookie();
        UUID right = rights();
        String[] lessons = {lesson(right), lesson(right), lesson(right)};
        CountDownLatch start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(3)) {
            var futures = new ArrayList<java.util.concurrent.Future<Integer>>();
            for (String slug : lessons) futures.add(pool.submit(() -> {
                start.await();
                return mvc.perform(post("/api/v1/lessons/" + slug + "/unlock").with(csrf()).cookie(cookie))
                        .andReturn().getResponse().getStatus();
            }));
            start.countDown();
            int successes = 0;
            for (var future : futures) if (future.get(15, TimeUnit.SECONDS) == 200) successes++;
            assertEquals(2, successes);
        }
    }

    @Test void simultaneousBookmarkSavesCannotExceedTwenty() throws Exception {
        Cookie cookie = guestCookie();
        UUID right = rights();
        for (int i = 0; i < 19; i++) {
            mvc.perform(put("/api/v1/skills/bookmarks/" + item(right)).with(csrf()).cookie(cookie))
                    .andExpect(status().isOk());
        }
        UUID first = item(right), second = item(right);
        CountDownLatch start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var a = pool.submit(() -> {
                start.await();
                return mvc.perform(put("/api/v1/skills/bookmarks/" + first).with(csrf()).cookie(cookie))
                        .andReturn().getResponse().getStatus();
            });
            var b = pool.submit(() -> {
                start.await();
                return mvc.perform(put("/api/v1/skills/bookmarks/" + second).with(csrf()).cookie(cookie))
                        .andReturn().getResponse().getStatus();
            });
            start.countDown();
            assertEquals(603, a.get(15, TimeUnit.SECONDS) + b.get(15, TimeUnit.SECONDS));
        }
        mvc.perform(get("/api/v1/skills/bookmarks/summary").cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.savedCount").value(20));
    }

    @Test void contextualLessonSharesStableUnlockAndRightsGate() throws Exception {
        Cookie cookie = guestCookie();
        UUID right = rights();
        String slug = lesson(right);
        String[] path = path(right, slug);
        String contextual = "/api/v1/learning-paths/" + path[0] + "/placements/" + path[1] + "/lesson";
        mvc.perform(get(contextual).cookie(cookie)).andExpect(status().isForbidden());
        mvc.perform(get(contextual + "/access").cookie(cookie)).andExpect(status().isOk())
                .andExpect(jsonPath("$.accessStatus").value("locked"));
        mvc.perform(post(contextual + "/unlock").with(csrf()).cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.newlyUnlocked").value(true));
        mvc.perform(post("/api/v1/lessons/" + slug + "/unlock").with(csrf()).cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.newlyUnlocked").value(false));
        mvc.perform(get(contextual).cookie(cookie)).andExpect(status().isOk());
        jdbc.update("UPDATE content_rights SET clearance_status='revoked' WHERE id=?", right);
        mvc.perform(get(contextual).cookie(cookie)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/lessons/" + slug).cookie(cookie)).andExpect(status().isNotFound());
    }

    @Test void guestDataIsIsolatedAndAuthenticatedUserHasNoGuestQuota() throws Exception {
        Cookie first = guestCookie(), second = guestCookie();
        UUID right = rights(), saved = item(right);
        String lesson = lesson(right);
        mvc.perform(put("/api/v1/skills/bookmarks/" + saved).with(csrf()).cookie(first))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/skills/bookmarks/summary").cookie(second))
                .andExpect(status().isOk()).andExpect(jsonPath("$.savedCount").value(0));
        mvc.perform(post("/api/v1/lessons/" + lesson + "/unlock").with(csrf()).cookie(first))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/lessons/" + lesson).cookie(second)).andExpect(status().isForbidden());
        UUID userId = UUID.randomUUID();
        String email = "guest-test-" + userId + "@example.test";
        jdbc.update("INSERT INTO users(id,email,password_hash) VALUES(?,?,'unused')", userId, email);
        mvc.perform(get("/api/v1/lessons/" + lesson).cookie(second).with(user(email)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/lessons/" + lesson + "/access").cookie(second).with(user(email)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.guestQuota").value(org.hamcrest.Matchers.nullValue()));
        mvc.perform(put("/api/v1/skills/bookmarks/" + saved).with(csrf()).cookie(second).with(user(email)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.summary.maxSaved")
                        .value(org.hamcrest.Matchers.nullValue()));
        mvc.perform(get("/api/v1/skills/bookmarks/summary").cookie(first))
                .andExpect(status().isOk()).andExpect(jsonPath("$.savedCount").value(1));
        mvc.perform(post("/api/v1/guest/session").with(csrf()).cookie(second).with(user(email)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("actor_conflict"));
    }

    @Test void cleanupRemovesExpiredGuestAndDependentLearningData() throws Exception {
        Cookie cookie = guestCookie();
        UUID right = rights();
        String slug = lesson(right);
        mvc.perform(post("/api/v1/lessons/" + slug + "/unlock").with(csrf()).cookie(cookie))
                .andExpect(status().isOk());
        clock.set(clock.instant().plusSeconds(90L * 24 * 3600 + 300));
        guests.cleanupExpired();
        mvc.perform(get("/api/v1/guest/session").cookie(cookie))
                .andExpect(status().isUnauthorized());
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM guest_lesson_unlocks u "
                + "JOIN lessons l ON l.id=u.lesson_id WHERE l.slug=?", Integer.class, slug));
    }
}
