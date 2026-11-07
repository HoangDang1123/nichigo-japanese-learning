package com.nichigo.api.contentimport;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Small RFC-4180-style comma parser with physical-line and logical-record tracking. */
final class StrictCsv {
    record Row(int line, int record, Map<String, String> fields) {}
    record Problem(String code, int line, int record, String field) {}
    record Result(List<Row> rows, List<Problem> problems) {}

    static Result parse(String input, Set<String> required, Set<String> allowed, int maxRecords) {
        List<Problem> problems = new ArrayList<>();
        List<List<String>> records = new ArrayList<>();
        List<Integer> lines = new ArrayList<>();
        List<String> cells = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        int state = 0, line = 1, startLine = 1;
        boolean dirty = false;
        for (int index = 0; index <= input.length(); index++) {
            char c = index == input.length() ? '\0' : input.charAt(index);
            if (c == '\r') {
                if (index + 1 < input.length() && input.charAt(index + 1) == '\n') index++;
                c = '\n';
            }
            if (c == '\0') {
                if (state == 2) problems.add(new Problem("CSV_UNCLOSED_QUOTE", startLine, records.size() + 1, null));
                if (dirty || !cells.isEmpty() || cell.length() > 0) {
                    cells.add(cell.toString());
                    records.add(cells);
                    lines.add(startLine);
                }
                break;
            }
            if (state == 2) {
                if (c == '"') state = 3;
                else {
                    if (c == '\n') line++;
                    cell.append(c);
                }
                dirty = true;
                continue;
            }
            if (c == '\n') {
                cells.add(cell.toString());
                if (dirty || !cells.isEmpty()) {
                    records.add(cells);
                    lines.add(startLine);
                }
                cells = new ArrayList<>();
                cell = new StringBuilder();
                state = 0;
                line++;
                startLine = line;
                dirty = false;
                if (records.size() > maxRecords + 1) {
                    problems.add(new Problem("PACKAGE_RECORD_LIMIT", line, records.size(), null));
                    break;
                }
                continue;
            }
            if (state == 3) {
                if (c == '"') { cell.append('"'); state = 2; }
                else if (c == ',') { cells.add(cell.toString()); cell = new StringBuilder(); state = 0; }
                else problems.add(new Problem("CSV_MALFORMED", line, records.size() + 1, null));
            } else if (state == 0) {
                if (c == '"') state = 2;
                else if (c == ',') { cells.add(""); dirty = true; }
                else { cell.append(c); state = 1; }
            } else if (state == 1) {
                if (c == ',') { cells.add(cell.toString()); cell = new StringBuilder(); state = 0; }
                else if (c == '"') problems.add(new Problem("CSV_MALFORMED", line, records.size() + 1, null));
                else cell.append(c);
            }
            dirty = true;
        }
        if (records.isEmpty()) {
            problems.add(new Problem("CSV_HEADER_REQUIRED", 1, 1, null));
            return new Result(List.of(), problems);
        }
        List<String> header = records.getFirst();
        if (!header.isEmpty() && header.getFirst().startsWith("\uFEFF"))
            header.set(0, header.getFirst().substring(1));
        Set<String> seen = new HashSet<>();
        for (String field : header) {
            if (!seen.add(field)) problems.add(new Problem("CSV_DUPLICATE_HEADER", 1, 1, field));
            if (!allowed.contains(field)) problems.add(new Problem("CSV_UNKNOWN_HEADER", 1, 1, field));
        }
        for (String field : required) if (!seen.contains(field))
            problems.add(new Problem("CSV_MISSING_HEADER", 1, 1, field));
        List<Row> rows = new ArrayList<>();
        for (int i = 1; i < records.size(); i++) {
            List<String> values = records.get(i);
            if (values.size() != header.size()) {
                problems.add(new Problem("CSV_COLUMN_COUNT", lines.get(i), i + 1, null));
                continue;
            }
            Map<String, String> fields = new HashMap<>();
            for (int j = 0; j < header.size(); j++) fields.put(header.get(j), values.get(j));
            rows.add(new Row(lines.get(i), i + 1, fields));
        }
        return new Result(rows, problems);
    }
}
