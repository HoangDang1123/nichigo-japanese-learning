package com.nichigo.api.auth;

import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import com.nichigo.api.auth.dto.CsrfResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;

    @Test
    void registrationHashesPasswordAndReturnsSafeUser() throws Exception {
        String password = "beginner-password-123";
        String email = newEmail();

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", password))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn();

        String hash = jdbcTemplate.queryForObject("SELECT password_hash FROM users WHERE email = ?",
                String.class, email);
        org.junit.jupiter.api.Assertions.assertNotEquals(password, hash);
        org.junit.jupiter.api.Assertions.assertTrue(hash.startsWith("$2"));
        org.junit.jupiter.api.Assertions.assertFalse(result.getResponse().getContentAsString().contains(hash));
    }

    @Test
    void duplicateEmailIsRejectedCaseInsensitively() throws Exception {
        String email = newEmail();
        register(email);
        mockMvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email.toUpperCase(), "password", "beginner-password-123"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("email_already_registered"));
    }

    @Test
    void invalidRegistrationIsRejected() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void loginCreatesSessionAndReturnsSafeAuthenticatedUser() throws Exception {
        String email = newEmail();
        register(email);

        MvcResult login = mockMvc.perform(post("/api/v1/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email.toUpperCase(), "password", "beginner-password-123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andReturn();

        Cookie sessionCookie = login.getResponse().getCookie("SESSION");
        org.junit.jupiter.api.Assertions.assertNotNull(sessionCookie);
        org.junit.jupiter.api.Assertions.assertTrue(sessionCookie.isHttpOnly());
        mockMvc.perform(get("/api/v1/auth/me").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        mockMvc.perform(post("/api/v1/auth/logout").cookie(sessionCookie).with(csrf()))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/auth/me").cookie(sessionCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidCredentialsReturnGenericError() throws Exception {
        String email = newEmail();
        register(email);
        mockMvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", "wrong-password"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    void privateMeRequiresAuthenticationAndMutationsRequireCsrf() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", newEmail(), "password", "beginner-password-123"))))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headerName").value("X-CSRF-TOKEN"))
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void csrfBootstrapTokenAllowsMutationWithItsSession() throws Exception {
        MvcResult csrfResult = mockMvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isOk()).andReturn();
        CsrfResponse csrf = objectMapper.readValue(csrfResult.getResponse().getContentAsString(), CsrfResponse.class);
        Cookie sessionCookie = csrfResult.getResponse().getCookie("SESSION");
        org.junit.jupiter.api.Assertions.assertNotNull(sessionCookie);

        mockMvc.perform(post("/api/v1/auth/register")
                        .cookie(sessionCookie)
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", newEmail(), "password", "beginner-password-123"))))
                .andExpect(status().isCreated());
    }

    @Test
    void healthEndpointRemainsPublic() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void flywayCreatedUsersAndSessionTables() {
        Integer users = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM information_schema.tables " +
                "WHERE table_schema = current_schema() AND table_name = 'users'", Integer.class);
        Integer sessions = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM information_schema.tables " +
                "WHERE table_schema = current_schema() AND table_name = 'spring_session'", Integer.class);
        org.junit.jupiter.api.Assertions.assertEquals(1, users);
        org.junit.jupiter.api.Assertions.assertEquals(1, sessions);
    }

    private void register(String email) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", "beginner-password-123"))))
                .andExpect(status().isCreated());
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private String newEmail() {
        return "student-" + UUID.randomUUID() + "@example.jp";
    }
}
