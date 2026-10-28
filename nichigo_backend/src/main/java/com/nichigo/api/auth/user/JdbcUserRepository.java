package com.nichigo.api.auth.user;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcUserRepository implements UserRepository {
    private final JdbcTemplate jdbcTemplate;

    public JdbcUserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public AuthUser create(String email, String passwordHash) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
                id, email, passwordHash);
        return findByEmail(email).orElseThrow();
    }

    @Override
    public Optional<AuthUser> findByEmail(String normalizedEmail) {
        return jdbcTemplate.query("""
                        SELECT id, email, password_hash, created_at, updated_at
                        FROM users WHERE LOWER(email) = ?
                        """, (rs, rowNum) -> mapUser(rs), normalizedEmail)
                .stream().findFirst();
    }

    private AuthUser mapUser(ResultSet rs) throws SQLException {
        Timestamp created = rs.getTimestamp("created_at");
        Timestamp updated = rs.getTimestamp("updated_at");
        return new AuthUser(rs.getObject("id", UUID.class), rs.getString("email"),
                rs.getString("password_hash"), created.toInstant(), updated.toInstant());
    }
}
