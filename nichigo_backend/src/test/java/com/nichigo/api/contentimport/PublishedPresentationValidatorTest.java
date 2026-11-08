package com.nichigo.api.contentimport;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PublishedPresentationValidatorTest {
    private final PublishedPresentationValidator validator = new PublishedPresentationValidator(new ObjectMapper());

    @Test
    void acceptsCanonicalLayoutWithoutDuplicatingPins() {
        assertDoesNotThrow(() -> validator.lesson("""
                {"schemaVersion":"1.0","objectives":[{"position":1,"kind":"can_do","textVi":"Read kana"}],
                 "sections":[{"id":"00000000-0000-0000-0000-000000000001","position":1}]}
                """));
        assertDoesNotThrow(() -> validator.path("""
                {"schemaVersion":"1.0","stages":[{"id":"00000000-0000-0000-0000-000000000002",
                 "position":1,"titleVi":"Stage","chapters":[{"id":"00000000-0000-0000-0000-000000000003",
                 "position":1,"titleVi":"Chapter"}]}]}
                """));
    }

    @Test
    void rejectsUnknownFieldsVersionsAndDuplicateLayoutKeys() {
        assertThrows(IllegalStateException.class, () -> validator.lesson("""
                {"schemaVersion":"2.0","objectives":[],"sections":[]}
                """));
        assertThrows(IllegalStateException.class, () -> validator.lesson("""
                {"schemaVersion":"1.0","objectives":[],"sections":[],"itemRevision":3}
                """));
        assertThrows(IllegalStateException.class, () -> validator.lesson("""
                {"schemaVersion":"1.0","objectives":[],"sections":[
                  {"id":"00000000-0000-0000-0000-000000000001","position":1},
                  {"id":"00000000-0000-0000-0000-000000000001","position":2}]}
                """));
        assertThrows(IllegalStateException.class, () -> validator.path("""
                {"schemaVersion":"1.0","stages":[{"id":"00000000-0000-0000-0000-000000000002",
                 "position":1,"titleVi":"Stage","chapters":[
                   {"id":"00000000-0000-0000-0000-000000000003","position":1,"titleVi":"Chapter"},
                   {"id":"00000000-0000-0000-0000-000000000003","position":2,"titleVi":"Repeat"}]}]}
                """));
    }

    @Test
    void rejectsMalformedIdentifiersPositionsAndNestedFields() {
        for (String document : new String[]{
                "{\"schemaVersion\":\"1.0\",\"objectives\":[],\"sections\":[{\"id\":\"not-a-uuid\",\"position\":1}]}",
                "{\"schemaVersion\":\"1.0\",\"objectives\":[],\"sections\":[{\"id\":\"00000000-0000-0000-0000-000000000001\",\"position\":0}]}",
                "{\"schemaVersion\":\"1.0\",\"objectives\":[],\"sections\":[{\"id\":\"00000000-0000-0000-0000-000000000001\",\"position\":1},{\"id\":\"00000000-0000-0000-0000-000000000002\",\"position\":1}]}",
                "{\"schemaVersion\":\"1.0\",\"objectives\":[],\"sections\":[{\"id\":\"00000000-0000-0000-0000-000000000001\",\"position\":1,\"itemRevision\":2}]}"
        }) assertThrows(IllegalStateException.class, () -> validator.lesson(document));

        for (String document : new String[]{
                "{\"schemaVersion\":\"2.0\",\"stages\":[]}",
                "{\"schemaVersion\":\"1.0\",\"stages\":[{\"id\":\"not-a-uuid\",\"position\":1,\"titleVi\":\"Stage\",\"chapters\":[]}]}",
                "{\"schemaVersion\":\"1.0\",\"stages\":[{\"id\":\"00000000-0000-0000-0000-000000000001\",\"position\":0,\"titleVi\":\"Stage\",\"chapters\":[]}]}",
                "{\"schemaVersion\":\"1.0\",\"stages\":[{\"id\":\"00000000-0000-0000-0000-000000000001\",\"position\":1,\"titleVi\":\"A\",\"chapters\":[]},{\"id\":\"00000000-0000-0000-0000-000000000002\",\"position\":1,\"titleVi\":\"B\",\"chapters\":[]}]}",
                "{\"schemaVersion\":\"1.0\",\"stages\":[{\"id\":\"00000000-0000-0000-0000-000000000001\",\"position\":1,\"titleVi\":\"Stage\",\"chapters\":[{\"id\":\"00000000-0000-0000-0000-000000000002\",\"position\":1,\"titleVi\":\"Chapter\",\"lessonRevision\":2}]}]}"
        }) assertThrows(IllegalStateException.class, () -> validator.path(document));
    }
}
