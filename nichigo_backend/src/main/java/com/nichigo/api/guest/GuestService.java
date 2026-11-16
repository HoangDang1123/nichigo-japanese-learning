package com.nichigo.api.guest;

import com.nichigo.api.auth.AuthService;
import com.nichigo.api.content.PublicContentRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class GuestService {
    public static final String COOKIE = "NICHIGO_GUEST";
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Duration RETENTION = Duration.ofDays(90).plusMinutes(5);
    private static final Duration THROTTLE = Duration.ofMinutes(5);
    private final JdbcTemplate jdbc;
    private final AuthService auth;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public GuestService(JdbcTemplate jdbc, AuthService auth, Clock clock) {
        this.jdbc = jdbc;
        this.auth = auth;
        this.clock = clock;
    }

    public record Actor(UUID id, boolean guest) {}
    public record Identity(UUID id, Instant createdAt, Instant lastActiveAt) {
        Instant basis() { return lastActiveAt == null ? createdAt : lastActiveAt; }
        Instant expiresAt() { return basis().plus(RETENTION); }
    }
    public record NewGuest(String token, Identity identity) {}
    public record Activity(Instant lastActiveAt, Instant retentionEligibleAt, boolean persisted) {}
    public record Quota(LocalDate localDate, String timeZone, int dailyLimit, int used,
                        int remaining, Instant resetsAt) {}

    public boolean authenticated() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        return a != null && a.isAuthenticated() && !"anonymousUser".equals(a.getPrincipal());
    }

    public Actor actor(HttpServletRequest request) {
        if (authenticated()) {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            return new Actor(auth.getByEmail(email).id(), false);
        }
        if (token(request) == null) {
            throw new GuestException(HttpStatus.UNAUTHORIZED, "unauthorized", "Authentication is required.");
        }
        return new Actor(requireGuest(request).id(), true);
    }

    public String token(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (COOKIE.equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }

    public Identity requireGuest(HttpServletRequest request) {
        String token = token(request);
        if (token == null || token.isBlank()) throw invalidIdentity();
        var rows = jdbc.query("SELECT id, created_at, last_active_at FROM guest_identities WHERE credential_hash = ?",
                (rs, n) -> new Identity(rs.getObject(1, UUID.class),
                        rs.getTimestamp(2).toInstant(),
                        rs.getTimestamp(3) == null ? null : rs.getTimestamp(3).toInstant()), hash(token));
        if (rows.isEmpty() || !clock.instant().isBefore(rows.getFirst().expiresAt())) throw invalidIdentity();
        return rows.getFirst();
    }

    public static GuestException invalidIdentity() {
        return new GuestException(HttpStatus.UNAUTHORIZED, "guest_identity_invalid", "Guest identity is missing or expired.");
    }

    @Transactional
    public NewGuest create() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant now = clock.instant();
        Identity identity = new Identity(UUID.randomUUID(), now, null);
        jdbc.update("INSERT INTO guest_identities (id, credential_hash, created_at) VALUES (?, ?, ?)",
                identity.id(), hash(token), java.sql.Timestamp.from(now));
        return new NewGuest(token, identity);
    }

    @Transactional
    public Activity activity(HttpServletRequest request) {
        Identity identity = requireGuest(request);
        jdbc.queryForObject("SELECT id FROM guest_identities WHERE id = ? FOR UPDATE", UUID.class, identity.id());
        // Recheck under the lock so an expired identity cannot be revived by a delayed signal.
        identity = requireGuest(request);
        Instant now = clock.instant();
        if (identity.lastActiveAt() == null || !now.isBefore(identity.lastActiveAt().plus(THROTTLE))) {
            jdbc.update("UPDATE guest_identities SET last_active_at = ? WHERE id = ?",
                    java.sql.Timestamp.from(now), identity.id());
            return new Activity(now, now.plus(RETENTION), true);
        }
        return new Activity(identity.lastActiveAt(), identity.lastActiveAt().plus(RETENTION), false);
    }

    public void lock(Actor actor) {
        String table = actor.guest() ? "guest_identities" : "users";
        jdbc.queryForObject("SELECT id FROM " + table + " WHERE id = ? FOR UPDATE", UUID.class, actor.id());
    }

    public Quota quota(UUID guestId) {
        LocalDate day = LocalDate.ofInstant(clock.instant(), ZONE);
        Integer used = jdbc.queryForObject(
                "SELECT count(*) FROM guest_lesson_unlocks WHERE guest_id = ? AND unlocked_on = ?",
                Integer.class, guestId, day);
        int count = used == null ? 0 : used;
        Instant reset = ZonedDateTime.of(day.plusDays(1).atStartOfDay(), ZONE).toInstant();
        return new Quota(day, ZONE.getId(), 2, count, Math.max(0, 2 - count), reset);
    }

    public Instant now() { return clock.instant(); }

    /** Expiration uses the same conservative cutoff as credential validation. */
    @Transactional
    @Scheduled(initialDelayString = "${nichigo.guest.cleanup.initial-delay-ms:3600000}",
            fixedDelayString = "${nichigo.guest.cleanup.interval-ms:3600000}")
    public void cleanupExpired() {
        jdbc.update("DELETE FROM guest_identities WHERE COALESCE(last_active_at, created_at) <= ?",
                java.sql.Timestamp.from(clock.instant().minus(RETENTION)));
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
