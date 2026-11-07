package com.nichigo.api.contentimport;

import java.util.Map;
import java.util.Set;

/** Read-only lookups of current editorial identities and live rights state. */
public interface ContentReferenceResolver {
    Snapshot resolve(Request request);

    record Request(Set<String> itemKeys, Set<String> lessonKeys,
                   Set<String> mediaKeys, Set<String> rightsKeys) {}

    record Snapshot(Map<String, String> itemKinds, Set<String> lessonKeys,
                    Map<String, String> mediaKinds, Map<String, String> rightsStatuses,
                    Map<String, Set<String>> lessonPrerequisites) {
        public static Snapshot empty() {
            return new Snapshot(Map.of(), Set.of(), Map.of(), Map.of(), Map.of());
        }
    }
}
