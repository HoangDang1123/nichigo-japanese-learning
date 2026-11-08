package com.nichigo.api.contentimport;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;

class ContentOperatorAuthTest {
    @Test void requiresConfiguredCredentialAndWipesSubmittedToken() throws Exception {
        char[] token="local-test-token-12345678901234567890".toCharArray();
        String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(new String(token).getBytes(StandardCharsets.UTF_8)));
        assertEquals("editor-a",new ContentOperatorAuth("editor-a",hash).authenticate(token).id());
        assertTrue(new String(token).chars().allMatch(c->c==0));
        char[] wrong="wrong-test-token-12345678901234567890".toCharArray();
        assertThrows(SecurityException.class,()->new ContentOperatorAuth("editor-a",hash).authenticate(wrong));
        assertTrue(new String(wrong).chars().allMatch(c->c==0));
        assertThrows(SecurityException.class,()->new ContentOperatorAuth("",hash)
                .authenticate("local-test-token-12345678901234567890".toCharArray()));
    }
}
