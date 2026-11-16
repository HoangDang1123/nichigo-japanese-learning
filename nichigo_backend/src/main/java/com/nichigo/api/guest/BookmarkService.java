package com.nichigo.api.guest;

import com.nichigo.api.content.ContentNotFoundException;
import com.nichigo.api.content.InvalidContentQueryException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.ByteBuffer;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class BookmarkService {
    private final GuestService guest;
    private final JdbcTemplate jdbc;
    public BookmarkService(GuestService guest, JdbcTemplate jdbc) {
        this.guest = guest;
        this.jdbc = jdbc;
    }

    public record BookmarkSummary(int savedCount, Integer maxSaved, Integer remaining) {}
    public record BookmarkMutation(UUID itemId, boolean saved, BookmarkSummary summary) {}
    public record BookmarkStatus(UUID itemId, boolean saved, String availability, BookmarkSummary summary) {}
    public record EligiblePublicItem(UUID id, String key, int revision, String kind,
                                     String displayTextJa, String displayTextVi) {}
    public record SavedPage(List<Map<String, Object>> items, String nextCursor, BookmarkSummary summary) {}

    private static UUID parse(String raw) {
        try { return UUID.fromString(raw); }
        catch (IllegalArgumentException ex) {
            throw new GuestException(HttpStatus.BAD_REQUEST, "invalid_request", "Item ID must be a UUID.");
        }
    }

    private String column(GuestService.Actor actor) { return actor.guest() ? "guest_id" : "user_id"; }

    private BookmarkSummary summary(GuestService.Actor actor) {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM skill_bookmarks WHERE " + column(actor) + " = ?",
                Integer.class, actor.id());
        int saved = count == null ? 0 : count;
        return new BookmarkSummary(saved, actor.guest() ? 20 : null,
                actor.guest() ? Math.max(0, 20 - saved) : null);
    }

    private boolean saved(GuestService.Actor actor, UUID itemId) {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM skill_bookmarks WHERE " + column(actor)
                + " = ? AND item_id = ?", Integer.class, actor.id(), itemId);
        return count != null && count > 0;
    }

    private List<EligiblePublicItem> available(UUID itemId) {
        return jdbc.query("""
                SELECT i.id, i.stable_key, r.revision, r.kind, r.display_text_ja, r.display_text_vi
                FROM content_items i JOIN content_item_revisions r
                  ON r.item_id = i.id AND r.revision = i.published_revision
                WHERE i.id = ? AND item_revision_public(i.id, r.revision)
                """, (rs, n) -> new EligiblePublicItem(rs.getObject(1, UUID.class), rs.getString(2),
                rs.getInt(3), rs.getString(4), rs.getString(5), rs.getString(6)), itemId);
    }

    @Transactional
    public BookmarkMutation save(String rawId, HttpServletRequest request) {
        UUID itemId = parse(rawId);
        GuestService.Actor actor = guest.actor(request);
        guest.lock(actor);
        // An existing bookmark remains idempotent even if its Item has since become unavailable.
        if (saved(actor, itemId)) return new BookmarkMutation(itemId, true, summary(actor));
        if (available(itemId).isEmpty()) throw new ContentNotFoundException();
        if (actor.guest() && summary(actor).remaining() == 0) throw new GuestException(HttpStatus.FORBIDDEN,
                "guest_bookmark_limit_reached", "The Guest Skills bookmark limit is reached.");
        jdbc.update("INSERT INTO skill_bookmarks (" + column(actor) + ", item_id, created_at) VALUES (?, ?, ?)",
                actor.id(), itemId, Timestamp.from(guest.now()));
        return new BookmarkMutation(itemId, true, summary(actor));
    }

    @Transactional
    public BookmarkMutation remove(String rawId, HttpServletRequest request) {
        UUID itemId = parse(rawId);
        GuestService.Actor actor = guest.actor(request);
        guest.lock(actor);
        jdbc.update("DELETE FROM skill_bookmarks WHERE " + column(actor) + " = ? AND item_id = ?",
                actor.id(), itemId);
        return new BookmarkMutation(itemId, false, summary(actor));
    }

    @Transactional(readOnly = true)
    public BookmarkStatus status(String rawId, HttpServletRequest request) {
        UUID itemId = parse(rawId);
        GuestService.Actor actor = guest.actor(request);
        boolean saved = saved(actor, itemId);
        return new BookmarkStatus(itemId, saved, saved ? (available(itemId).isEmpty() ? "unavailable" : "available")
                : null, summary(actor));
    }

    @Transactional(readOnly = true)
    public BookmarkSummary summary(HttpServletRequest request) { return summary(guest.actor(request)); }

    @Transactional(readOnly = true)
    public SavedPage page(int limit, String after, HttpServletRequest request) {
        if (limit < 1 || limit > 50) throw new InvalidContentQueryException("Limit must be between 1 and 50.");
        UUID cursor = decode(after);
        GuestService.Actor actor = guest.actor(request);
        List<UUID> ids = jdbc.query("SELECT item_id FROM skill_bookmarks WHERE " + column(actor)
                        + " = ? AND (?::uuid IS NULL OR item_id > ?::uuid) ORDER BY item_id LIMIT ?",
                (rs, n) -> rs.getObject(1, UUID.class), actor.id(), cursor, cursor, limit + 1);
        boolean more = ids.size() > limit;
        List<UUID> pageIds = ids.subList(0, Math.min(limit, ids.size()));
        List<Map<String, Object>> entries = new ArrayList<>();
        for (UUID id : pageIds) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("itemId", id);
            entry.put("saved", true);
            List<EligiblePublicItem> eligible = available(id);
            entry.put("availability", eligible.isEmpty() ? "unavailable" : "available");
            if (!eligible.isEmpty()) entry.put("item", eligible.getFirst());
            entries.add(entry);
        }
        String next = more ? encode(pageIds.getLast()) : null;
        return new SavedPage(entries, next, summary(actor));
    }

    private UUID decode(String cursor) {
        if (cursor == null) return null;
        try {
            byte[] bytes = Base64.getUrlDecoder().decode(cursor);
            if (bytes.length != 16) throw new IllegalArgumentException();
            ByteBuffer buffer = ByteBuffer.wrap(bytes);
            return new UUID(buffer.getLong(), buffer.getLong());
        } catch (IllegalArgumentException ex) {
            throw new InvalidContentQueryException("Invalid bookmark cursor.");
        }
    }

    private String encode(UUID id) {
        ByteBuffer bytes = ByteBuffer.allocate(16).putLong(id.getMostSignificantBits()).putLong(id.getLeastSignificantBits());
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes.array());
    }
}
