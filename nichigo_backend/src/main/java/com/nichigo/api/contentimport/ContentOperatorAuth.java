package com.nichigo.api.contentimport;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.CharBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;

/** Local CLI credential boundary; no learner account or HTTP route grants operator access. */
@Component
public final class ContentOperatorAuth {
    private final String operatorId;
    private final byte[] expectedDigest;

    public ContentOperatorAuth(@Value("${CONTENT_OPERATOR_ID:}") String operatorId,
                               @Value("${CONTENT_OPERATOR_TOKEN_SHA256:}") String digestHex) {
        this.operatorId = operatorId;
        this.expectedDigest = digestHex.matches("[0-9a-f]{64}")
                ? HexFormat.of().parseHex(digestHex) : null;
    }

    public Principal authenticate(char[] token) {
        try {
            if (operatorId.isBlank() || !operatorId.matches("[a-zA-Z0-9._@-]{3,120}")
                    || expectedDigest == null || token == null || token.length < 32)
                throw new SecurityException("Operator authentication is unavailable.");
            var encoded = StandardCharsets.UTF_8.encode(CharBuffer.wrap(token));
            byte[] bytes = new byte[encoded.remaining()];
            encoded.get(bytes);
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(bytes);
            Arrays.fill(bytes, (byte) 0);
            if (encoded.hasArray()) Arrays.fill(encoded.array(), (byte) 0);
            if (!MessageDigest.isEqual(expectedDigest, digest))
                throw new SecurityException("Operator authentication failed.");
            return new Principal(operatorId);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is unavailable.", ex);
        } finally {
            if (token != null) Arrays.fill(token, '\0');
        }
    }

    public static final class Principal {
        private final String id;

        private Principal(String id) { this.id = id; }

        public String id() { return id; }
    }
}
