package com.nichigo.api.contentimport;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class ContentDryRunCliTest {
    @TempDir Path packageDirectory;
    private final ObjectMapper json = new ObjectMapper();

    private String invoke(Path input, int expectedExit) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        int exit = ContentDryRunCli.run(new String[]{input.toString()},
                new PrintStream(bytes, true, StandardCharsets.UTF_8));
        assertEquals(expectedExit, exit);
        String output = bytes.toString(StandardCharsets.UTF_8).trim();
        json.readTree(output);
        return output;
    }

    private void copyExample() throws Exception {
        Path source = Path.of("..", "content", "examples", "v1", "valid");
        for (String name : new String[]{"manifest.json", "rights.csv", "items.csv", "lessons.json", "paths.json"})
            Files.copy(source.resolve(name), packageDirectory.resolve(name));
    }

    @Test void validPackageHasDeterministicReportAndNoPublicationClaim() throws Exception {
        copyExample();
        String first = invoke(packageDirectory, 0);
        assertEquals(first, invoke(packageDirectory.resolve("manifest.json"), 0));
        assertTrue(json.readTree(first).path("valid").asBoolean());
        assertFalse(json.readTree(first).path("publicationReady").asBoolean());
    }

    @Test void invalidPackageAndMalformedJsonReturnValidationExit() throws Exception {
        copyExample();
        Path items = packageDirectory.resolve("items.csv");
        Files.writeString(items, Files.readString(items).replace("kana-a,kana", "kana-a,quiz"));
        String invalid = invoke(packageDirectory, 1);
        assertTrue(invalid.contains("CONTENT_UNSUPPORTED_VALUE"));
        Files.writeString(packageDirectory.resolve("manifest.json"), "{");
        assertTrue(invoke(packageDirectory, 1).contains("JSON_INVALID"));
    }

    @Test void missingManifestAndExecutionErrorsAreDistinct() throws Exception {
        assertTrue(invoke(packageDirectory, 1).contains("PACKAGE_MANIFEST_REQUIRED"));
        assertTrue(invoke(packageDirectory.resolve("other.json"), 2).contains("CLI_INPUT_ERROR"));
        assertTrue(invoke(packageDirectory.resolve("missing/manifest.json"), 2).contains("CLI_INPUT_ERROR"));
    }

    @Test void oversizedFileIsAValidationFailure() throws Exception {
        copyExample();
        Files.write(packageDirectory.resolve("items.csv"), new byte[ContentPackageValidator.MAX_FILE_BYTES + 1]);
        assertTrue(invoke(packageDirectory, 1).contains("PACKAGE_FILE_LIMIT"));
    }
}
