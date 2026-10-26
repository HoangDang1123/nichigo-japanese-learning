package com.nichigo.api.auth.user;

import java.util.Optional;

public interface UserRepository {
    AuthUser create(String email, String passwordHash);

    Optional<AuthUser> findByEmail(String normalizedEmail);
}
