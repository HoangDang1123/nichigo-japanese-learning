package com.nichigo.api.contentimport;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.HashSet;
import java.util.Set;

/** Shared server-side validation for immutable presentation documents. */
public final class PublishedPresentationValidator {
    private final ObjectMapper mapper;
    private final ContentSchemaValidator schemas;

    public PublishedPresentationValidator(ObjectMapper mapper) {
        this(mapper, new ContentSchemaValidator(mapper));
    }

    PublishedPresentationValidator(ObjectMapper mapper, ContentSchemaValidator schemas) {
        this.mapper = mapper;
        this.schemas = schemas;
    }

    public JsonNode lesson(String json) {
        JsonNode doc = parse(json);
        checkSchema("published-lesson-presentation", doc);
        Set<Integer> objectives = new HashSet<>();
        for (JsonNode objective : doc.path("objectives")) {
            if (!objectives.add(objective.path("position").asInt())) invalid();
        }
        Set<String> sections = new HashSet<>();
        Set<Integer> positions = new HashSet<>();
        for (JsonNode section : doc.path("sections")) {
            if (!sections.add(section.path("id").asText())
                    || !positions.add(section.path("position").asInt())) invalid();
        }
        return doc;
    }

    public JsonNode path(String json) {
        JsonNode doc = parse(json);
        checkSchema("published-path-presentation", doc);
        Set<String> stageIds = new HashSet<>(), chapterIds = new HashSet<>();
        Set<Integer> stagePositions = new HashSet<>();
        int chapters = 0;
        for (JsonNode stage : doc.path("stages")) {
            if (!stageIds.add(stage.path("id").asText())
                    || !stagePositions.add(stage.path("position").asInt())) invalid();
            Set<Integer> chapterPositions = new HashSet<>();
            for (JsonNode chapter : stage.path("chapters")) {
                if (!chapterIds.add(chapter.path("id").asText())
                        || !chapterPositions.add(chapter.path("position").asInt())) invalid();
                chapters++;
            }
        }
        if (chapters > 100) invalid();
        return doc;
    }

    private JsonNode parse(String json) {
        try {
            return mapper.readTree(json);
        } catch (Exception ex) {
            throw new IllegalStateException("Published presentation is invalid.", ex);
        }
    }

    private void checkSchema(String name, JsonNode doc) {
        if (doc == null) invalid();
        schemas.validate(name, doc, "", (code, pointer) -> invalid());
    }

    private static void invalid() {
        throw new IllegalStateException("Published presentation is invalid.");
    }
}
