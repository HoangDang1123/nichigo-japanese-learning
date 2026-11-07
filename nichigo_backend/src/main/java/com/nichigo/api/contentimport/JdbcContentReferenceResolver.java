package com.nichigo.api.contentimport;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Bounded, read-only lookups. No authoring input is interpolated into SQL text. */
@Repository
public class JdbcContentReferenceResolver implements ContentReferenceResolver {
    private static final int BATCH = 400;
    private final NamedParameterJdbcTemplate jdbc;

    public JdbcContentReferenceResolver(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    @Transactional(readOnly = true)
    public Snapshot resolve(Request request) {
        Map<String, String> items = lookup(request.itemKeys(),
                "SELECT stable_key, kind AS value FROM content_items WHERE stable_key IN (:keys)");
        Map<String, String> media = lookup(request.mediaKeys(),
                "SELECT stable_key, media_kind AS value FROM media_assets WHERE stable_key IN (:keys)");
        Map<String, String> rights = lookup(request.rightsKeys(),
                "SELECT stable_key, clearance_status AS value FROM content_rights WHERE stable_key IN (:keys)");
        Map<String, String> lessons = lookup(request.lessonKeys(),
                "SELECT stable_key, stable_key AS value FROM lessons WHERE stable_key IN (:keys)");
        Map<String, Set<String>> graph = new HashMap<>();
        Set<String> frontier = new HashSet<>(request.lessonKeys());
        Set<String> visited = new HashSet<>();
        int edges = 0;
        while (!frontier.isEmpty()) {
            frontier.removeAll(visited);
            if (frontier.isEmpty()) break;
            visited.addAll(frontier);
            if (visited.size() > CanonicalContentValidator.MAX_REFERENCES)
                throw new IllegalStateException("Existing prerequisite closure exceeds validation limit");
            Set<String> next = new HashSet<>();
            List<String> keys = new ArrayList<>(frontier);
            for (int start = 0; start < keys.size(); start += BATCH) {
                List<String> chunk = keys.subList(start, Math.min(keys.size(), start + BATCH));
                jdbc.query("""
                        SELECT l.stable_key AS source_key, p.stable_key AS prior_key
                        FROM lesson_prerequisites lp
                        JOIN lessons l ON l.id = lp.lesson_id
                        JOIN lessons p ON p.id = lp.prerequisite_lesson_id
                        WHERE l.stable_key IN (:keys)
                        """, Map.of("keys", chunk), rs -> {
                    String source = rs.getString("source_key"), prior = rs.getString("prior_key");
                    graph.computeIfAbsent(source, ignored -> new HashSet<>()).add(prior);
                    next.add(prior);
                });
            }
            edges = graph.values().stream().mapToInt(Set::size).sum();
            if (edges > CanonicalContentValidator.MAX_REFERENCES)
                throw new IllegalStateException("Existing prerequisite graph exceeds validation limit");
            frontier = next;
        }
        return new Snapshot(items, lessons.keySet(), media, rights, graph);
    }

    private Map<String, String> lookup(Set<String> keys, String sql) {
        Map<String, String> result = new HashMap<>();
        List<String> values = new ArrayList<>(keys);
        for (int start = 0; start < values.size(); start += BATCH) {
            List<String> chunk = values.subList(start, Math.min(values.size(), start + BATCH));
            jdbc.query(sql, Map.of("keys", chunk), (RowCallbackHandler) rs ->
                    result.put(rs.getString("stable_key"), rs.getString("value")));
        }
        return result;
    }
}
