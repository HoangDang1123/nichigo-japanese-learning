package com.nichigo.api.contentimport;

import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.PrintStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Local, offline adapter. It never starts Spring or connects to a database. */
public final class ContentDryRunCli {
    private static final ObjectMapper JSON = new ObjectMapper();

    private ContentDryRunCli() {}

    public static void main(String[] args) {
        System.exit(run(args, System.out));
    }

    static int run(String[] args, PrintStream output) {
        if (args.length != 1) return executionError(output, "CLI_USAGE", "Supply one package directory or manifest.json path.");
        Path input;
        try { input = Path.of(args[0]).toAbsolutePath().normalize(); }
        catch (RuntimeException ex) { return executionError(output, "CLI_INPUT_ERROR", "Invalid package path."); }
        Path directory = Files.isDirectory(input, LinkOption.NOFOLLOW_LINKS) ? input : input.getParent();
        if (directory == null || (!Files.isDirectory(input, LinkOption.NOFOLLOW_LINKS)
                && !"manifest.json".equals(input.getFileName().toString())))
            return executionError(output, "CLI_INPUT_ERROR", "Supply a package directory or manifest.json path.");
        if (!Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS))
            return executionError(output, "CLI_INPUT_ERROR", "Package directory is unavailable.");
        try (var paths = Files.list(directory)) {
            List<Path> children = paths.sorted().toList();
            Map<String, byte[]> files = new LinkedHashMap<>();
            for (Path child : children) {
                if (!Files.isRegularFile(child, LinkOption.NOFOLLOW_LINKS))
                    return executionError(output, "CLI_INPUT_ERROR", "Package contains a non-regular file.");
                if (Files.size(child) > ContentPackageValidator.MAX_FILE_BYTES)
                    files.put(child.getFileName().toString(), new byte[ContentPackageValidator.MAX_FILE_BYTES + 1]);
                else files.put(child.getFileName().toString(), Files.readAllBytes(child));
            }
            ValidationReport report = new ContentPackageValidator().dryRun(files, null);
            output.println(JSON.writeValueAsString(report));
            return report.valid() ? 0 : 1;
        } catch (IOException | RuntimeException ex) {
            return executionError(output, "CLI_IO_ERROR", "Unable to read or validate the package.");
        }
    }

    private static int executionError(PrintStream output, String code, String message) {
        output.println("{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}");
        return 2;
    }
}
