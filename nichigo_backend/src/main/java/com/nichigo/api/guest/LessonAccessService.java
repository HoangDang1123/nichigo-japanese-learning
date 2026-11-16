package com.nichigo.api.guest;

import com.nichigo.api.content.ContentNotFoundException;
import com.nichigo.api.content.PublicContentRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.UUID;
import java.util.function.Supplier;

@Service
public class LessonAccessService {
    private final GuestService guest;
    private final PublicContentRepository content;
    private final JdbcTemplate jdbc;

    public LessonAccessService(GuestService guest, PublicContentRepository content, JdbcTemplate jdbc) {
        this.guest = guest;
        this.content = content;
        this.jdbc = jdbc;
    }

    public record LessonAccess(UUID lessonId, String slug, String accessStatus, boolean canStart,
                               GuestService.Quota guestQuota) {}
    public record LessonUnlockResult(UUID lessonId, String slug, String accessStatus,
                                     boolean newlyUnlocked, GuestService.Quota guestQuota) {}

    public PublicContentRepository.LessonHead independent(String slug) {
        return content.publishedLesson(slug).orElseThrow(ContentNotFoundException::new);
    }

    public PublicContentRepository.LessonHead placement(String pathSlug, String placementId) {
        UUID id;
        try { id = UUID.fromString(placementId); }
        catch (IllegalArgumentException ex) { throw new ContentNotFoundException(); }
        return content.lessonAtPublishedPlacement(pathSlug, id).orElseThrow(ContentNotFoundException::new);
    }

    @Transactional(readOnly = true)
    public LessonAccess access(PublicContentRepository.LessonHead lesson, HttpServletRequest request) {
        if (guest.authenticated()) return new LessonAccess(lesson.id(), lesson.slug(), "unlocked", true, null);
        GuestService.Actor actor = guest.actor(request);
        boolean unlocked = unlocked(actor.id(), lesson.id());
        GuestService.Quota quota = guest.quota(actor.id());
        return new LessonAccess(lesson.id(), lesson.slug(), unlocked ? "unlocked" : "locked",
                unlocked || quota.remaining() > 0, quota);
    }

    @Transactional
    public LessonUnlockResult unlockIndependent(String slug, HttpServletRequest request) {
        return unlock(() -> independent(slug), request);
    }

    @Transactional
    public LessonUnlockResult unlockPlacement(String pathSlug, String placementId, HttpServletRequest request) {
        return unlock(() -> placement(pathSlug, placementId), request);
    }

    private LessonUnlockResult unlock(Supplier<PublicContentRepository.LessonHead> eligibleLesson,
                                      HttpServletRequest request) {
        // Both reads belong to the transaction. READ COMMITTED lets the second read see
        // publication or Rights changes committed while the Guest row lock was pending.
        PublicContentRepository.LessonHead first = eligibleLesson.get();
        if (guest.authenticated()) throw new GuestException(HttpStatus.CONFLICT, "actor_conflict",
                "Authenticated users do not need Guest unlocks.");
        GuestService.Actor actor = new GuestService.Actor(guest.requireGuest(request).id(), true);
        guest.lock(actor);
        PublicContentRepository.LessonHead lesson = eligibleLesson.get();
        if (!lesson.id().equals(first.id())) throw new ContentNotFoundException();
        if (unlocked(actor.id(), lesson.id())) {
            return new LessonUnlockResult(lesson.id(), lesson.slug(), "unlocked", false, guest.quota(actor.id()));
        }
        GuestService.Quota quota = guest.quota(actor.id());
        if (quota.remaining() == 0) throw new GuestException(HttpStatus.FORBIDDEN,
                "guest_unlock_quota_exceeded", "The daily Guest Lesson unlock allowance is exhausted.");
        jdbc.update("INSERT INTO guest_lesson_unlocks (guest_id, lesson_id, unlocked_on, unlocked_at) VALUES (?, ?, ?, ?)",
                actor.id(), lesson.id(), quota.localDate(), Timestamp.from(guest.now()));
        return new LessonUnlockResult(lesson.id(), lesson.slug(), "unlocked", true, guest.quota(actor.id()));
    }

    public void requireFullLesson(PublicContentRepository.LessonHead lesson, HttpServletRequest request) {
        if (guest.authenticated()) return;
        GuestService.Actor actor = guest.actor(request);
        if (actor.guest() && !unlocked(actor.id(), lesson.id())) {
            throw new GuestException(HttpStatus.FORBIDDEN, "lesson_not_unlocked", "Lesson is not unlocked.");
        }
    }

    private boolean unlocked(UUID guestId, UUID lessonId) {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM guest_lesson_unlocks WHERE guest_id = ? AND lesson_id = ?",
                Integer.class, guestId, lessonId);
        return count != null && count > 0;
    }
}
