package com.nichigo.api.auth.user;

import java.time.Instant;
import java.util.UUID;

/** Safe domain representation; the password hash is deliberately not exposed. */
public record AuthUser(UUID id, String email, String passwordHash, Instant createdAt, Instant updatedAt) {
}
