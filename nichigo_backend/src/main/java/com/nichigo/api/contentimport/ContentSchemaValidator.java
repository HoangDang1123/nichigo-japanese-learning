package com.nichigo.api.contentimport;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.regex.Pattern;

/** Format-independent validation of canonical JsonNode records against checked-in schemas. */
public final class ContentSchemaValidator {
    private final Map<String, JsonNode> schemas = new HashMap<>();

    public ContentSchemaValidator(ObjectMapper mapper) {
        for (String name : new String[]{"manifest", "item", "rights", "media", "lesson", "path",
                "kana", "vocabulary", "grammar", "kanji", "example", "dialogue"}) {
            String resource = "content/schemas/v1/" + name + ".schema.json";
            try (InputStream input = getClass().getClassLoader().getResourceAsStream(resource)) {
                if (input == null) throw new IllegalStateException("Missing schema: " + resource);
                schemas.put(name, mapper.readTree(input));
            } catch (IOException ex) {
                throw new IllegalStateException("Invalid schema: " + resource, ex);
            }
        }
    }

    public void validate(String name, JsonNode value, String pointer, BiConsumer<String, String> issue) {
        walk(schemas.get(name), value, pointer, issue);
    }

    private void walk(JsonNode schema, JsonNode value, String pointer, BiConsumer<String, String> issue) {
        String type = schema.path("type").asText("");
        boolean rightType = switch (type) {
            case "object" -> value.isObject();
            case "array" -> value.isArray();
            case "string" -> value.isTextual();
            case "integer" -> value.isIntegralNumber();
            default -> true;
        };
        if (!rightType) {
            issue.accept("CONTENT_INVALID_TYPE", pointer);
            return;
        }
        if (value.isObject()) {
            for (JsonNode required : schema.path("required")) {
                String field = required.asText();
                if (!value.has(field) || value.path(field).isNull())
                    issue.accept("CONTENT_REQUIRED_FIELD", pointer + "/" + field);
            }
            JsonNode properties = schema.path("properties");
            value.propertyNames().forEach(field -> {
                String child = pointer + "/" + field.replace("~", "~0").replace("/", "~1");
                if (!properties.has(field)) {
                    if (schema.path("additionalProperties").isBoolean()
                            && !schema.path("additionalProperties").asBoolean())
                        issue.accept("CONTENT_UNKNOWN_FIELD", child);
                } else walk(properties.get(field), value.get(field), child, issue);
            });
        } else if (value.isArray()) {
            if (value.size() < schema.path("minItems").asInt(0)
                    || value.size() > schema.path("maxItems").asInt(Integer.MAX_VALUE))
                issue.accept("CONTENT_ARRAY_LENGTH", pointer);
            JsonNode items = schema.path("items");
            if (!items.isMissingNode()) {
                for (int index = 0; index < value.size(); index++)
                    walk(items, value.get(index), pointer + "/" + index, issue);
            }
        } else if (value.isTextual()) {
            String text = value.asText();
            if (text.isBlank()) issue.accept("CONTENT_BLANK_FIELD", pointer);
            if (text.codePointCount(0, text.length()) > schema.path("maxLength").asInt(Integer.MAX_VALUE))
                issue.accept("CONTENT_TEXT_LENGTH", pointer);
            if (schema.has("pattern") && !Pattern.compile(schema.path("pattern").asText()).matcher(text).matches())
                issue.accept("CONTENT_PATTERN", pointer);
            if (schema.has("enum")) {
                boolean allowed = false;
                for (JsonNode option : schema.path("enum")) allowed |= option.asText().equals(text);
                if (!allowed) issue.accept("CONTENT_UNSUPPORTED_VALUE", pointer);
            }
            for (int i = 0; i < text.length(); i++) {
                char c = text.charAt(i);
                if (Character.isHighSurrogate(c)) {
                    if (i + 1 < text.length() && Character.isLowSurrogate(text.charAt(i + 1))) i++;
                    else issue.accept("CONTENT_INVALID_UNICODE", pointer);
                } else if (Character.isLowSurrogate(c)) issue.accept("CONTENT_INVALID_UNICODE", pointer);
            }
        } else if (value.isIntegralNumber()) {
            long number = value.longValue();
            if (number < schema.path("minimum").asLong(Long.MIN_VALUE)
                    || number > schema.path("maximum").asLong(Long.MAX_VALUE))
                issue.accept("CONTENT_NUMBER_RANGE", pointer);
        }
    }
}
