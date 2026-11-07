package com.nichigo.api.contentimport;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import com.nichigo.api.contentimport.CanonicalContentValidator.CanonicalRecord;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CanonicalContentValidatorTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final CanonicalContentValidator validator = new CanonicalContentValidator(mapper);

    @Test void normalizedCmsRecordsUseTheSameShapeAndReferenceRules() throws Exception {
        CanonicalRecord rights = record("rights", """
                {"key":"source-a","originKind":"original","sourceLabel":"Original",
                 "attribution":"NichiGo","permissionBasis":"Original content"}
                """);
        CanonicalRecord item = record("items", """
                {"key":"item-a","kind":"kana","payload":{"script":"hiragana","glyph":"あ","reading":"a"},
                 "rightsKey":"source-a"}
                """);
        CanonicalRecord lesson = record("lessons", """
                {"key":"lesson-a","slug":"lesson-a","titleVi":"Intro","rightsKey":"source-a",
                 "objectives":[],"sections":[{"key":"section-a","position":1,
                 "items":[{"position":1,"itemKey":"item-a"}]}]}
                """);
        Map<String, List<CanonicalRecord>> groups = Map.of(
                "rights", List.of(rights), "items", List.of(item), "lessons", List.of(lesson));
        ValidationReport valid = validator.validate(groups, request -> ContentReferenceResolver.Snapshot.empty());
        assertTrue(valid.valid(), valid.toString());
        assertFalse(valid.publicationReady());
        assertTrue(valid.warnings().stream().anyMatch(d -> d.code().equals("RIGHTS_REVIEW_REQUIRED")));
        Map<String, List<CanonicalRecord>> reversed = new LinkedHashMap<>();
        reversed.put("lessons", List.of(lesson));
        reversed.put("items", List.of(item));
        reversed.put("rights", List.of(rights));
        assertEquals(valid, validator.validate(reversed, request -> ContentReferenceResolver.Snapshot.empty()));

        CanonicalRecord missingItem = record("lessons", """
                {"key":"lesson-a","slug":"lesson-a","titleVi":"Intro","rightsKey":"source-a",
                 "objectives":[],"sections":[{"key":"section-a","position":1,
                 "items":[{"position":1,"itemKey":"missing-item"}]}]}
                """);
        ValidationReport invalid = validator.validate(Map.of("rights", List.of(rights),
                "items", List.of(item), "lessons", List.of(missingItem)),
                request -> ContentReferenceResolver.Snapshot.empty());
        assertTrue(invalid.errors().stream().anyMatch(d -> d.code().equals("CONTENT_REFERENCE_MISSING")
                && d.file().equals("cms")), invalid.toString());
        assertTrue(validator.validate(Map.of("unsupported", List.of(item)), null).errors().stream()
                .anyMatch(d -> d.code().equals("CONTENT_INVALID_RECORD_SET")));
    }

    private CanonicalRecord record(String type, String value) throws Exception {
        return new CanonicalRecord("cms", null, 1, "/" + type + "/0", mapper.readTree(value));
    }
}
