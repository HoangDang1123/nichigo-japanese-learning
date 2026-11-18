package com.nichigo.api.content;

import tools.jackson.databind.JsonNode;

/** Structural checks for authored Example segments; language accuracy still needs editorial review. */
public final class ExampleFurigana {
    private ExampleFurigana() {}

    public static boolean matchesText(JsonNode payload) {
        JsonNode segments = payload.path("segments");
        if (!segments.isArray() || segments.size() == 0 || !payload.path("textJa").isTextual())
            return false;
        StringBuilder joined = new StringBuilder();
        for (JsonNode segment : segments) {
            if (!segment.path("text").isTextual() || segment.path("text").asText().isBlank())
                return false;
            joined.append(segment.path("text").asText());
        }
        return joined.toString().equals(payload.path("textJa").asText());
    }

    public static boolean readyForKanjiDetail(JsonNode payload) {
        if (!"yes".equals(payload.path("kanjiDetailCandidate").asText()) || !matchesText(payload))
            return false;
        boolean hasReading = false;
        for (JsonNode segment : payload.path("segments")) {
            if (segment.has("reading")) {
                if (!segment.path("reading").isTextual() || segment.path("reading").asText().isBlank())
                    return false;
                hasReading = true;
            }
        }
        return hasReading;
    }
}
