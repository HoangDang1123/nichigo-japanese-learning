package com.nichigo.api.contentimport;

import java.util.List;

/** A dry-run result contains no raw payloads, private evidence, or persistence IDs. */
public record ValidationReport(boolean valid, boolean publicationReady, boolean truncated,
                               List<Diagnostic> errors, List<Diagnostic> warnings) {
    public record Diagnostic(String code, String severity, String file, Integer line,
                             Integer row, String field, String pointer, String entityKey,
                             String message) {}
}
