package com.nichigo.api.guest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;

@RestController
@RequestMapping("/api/v1/guest")
public class GuestController {
    private final GuestService guest;
    private final boolean secure;
    private final String sameSite;
    private final String domain;

    public GuestController(GuestService guest,
            @Value("${nichigo.guest.cookie.secure:${server.servlet.session.cookie.secure:false}}") boolean secure,
            @Value("${nichigo.guest.cookie.same-site:${server.servlet.session.cookie.same-site:Lax}}") String sameSite,
            @Value("${nichigo.guest.cookie.domain:}") String domain) {
        this.guest = guest;
        this.secure = secure;
        this.sameSite = sameSite;
        this.domain = domain;
    }

    public record Session(String actorType, boolean restored) {}
    public record SessionStatus(String actorType) {}
    public record ActivityResponse(Instant lastActiveAt, Instant retentionEligibleAt) {}

    @PostMapping("/session")
    public ResponseEntity<Session> initialize(HttpServletRequest request, HttpServletResponse response) {
        if (guest.authenticated()) throw new GuestException(HttpStatus.CONFLICT, "actor_conflict",
                "Authenticated users cannot initialize a Guest session.");
        if (guest.token(request) != null) {
            try {
                guest.requireGuest(request);
                return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                        .body(new Session("guest", true));
            } catch (GuestException ex) {
                response.addHeader(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO));
                throw ex;
            }
        }
        GuestService.NewGuest created = guest.create();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(created.token(), Duration.between(
                guest.now(), created.identity().expiresAt())));
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
                .body(new Session("guest", false));
    }

    @GetMapping("/session")
    public ResponseEntity<SessionStatus> session(HttpServletRequest request) {
        if (guest.authenticated()) throw new GuestException(HttpStatus.CONFLICT, "actor_conflict",
                "Authenticated users use the account session.");
        guest.requireGuest(request);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new SessionStatus("guest"));
    }

    @PostMapping("/activity")
    public ResponseEntity<ActivityResponse> activity(HttpServletRequest request, HttpServletResponse response) {
        if (guest.authenticated()) throw new GuestException(HttpStatus.CONFLICT, "actor_conflict",
                "Authenticated users do not send Guest activity.");
        GuestService.Activity result = guest.activity(request);
        if (result.persisted()) {
            response.addHeader(HttpHeaders.SET_COOKIE, cookie(guest.token(request), Duration.between(
                    guest.now(), result.retentionEligibleAt())));
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new ActivityResponse(result.lastActiveAt(), result.retentionEligibleAt()));
    }

    @GetMapping("/quota")
    public ResponseEntity<GuestService.Quota> quota(HttpServletRequest request) {
        if (guest.authenticated()) throw new GuestException(HttpStatus.CONFLICT, "actor_conflict",
                "Authenticated users have no Guest quota.");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(guest.quota(guest.requireGuest(request).id()));
    }

    private String cookie(String token, Duration age) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(GuestService.COOKIE, token)
                .httpOnly(true).secure(secure).sameSite(sameSite).path("/api/v1")
                .maxAge(age.isNegative() ? Duration.ZERO : age);
        if (!domain.isBlank()) builder.domain(domain);
        return builder.build().toString();
    }
}
