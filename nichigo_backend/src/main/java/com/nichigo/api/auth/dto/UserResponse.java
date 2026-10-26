package com.nichigo.api.auth.dto;

import com.nichigo.api.auth.user.AuthUser;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(UUID id, String email, Instant createdAt, Instant updatedAt) {
    public static UserResponse from(AuthUser user) {
        return new UserResponse(user.id(), user.email(), user.createdAt(), user.updatedAt());
    }
}
