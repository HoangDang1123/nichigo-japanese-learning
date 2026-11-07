package com.nichigo.api.contentimport;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Upgrade test creates and removes only its own PostgreSQL schema. */
class PopulatedV4ToV5MigrationTest {
    @Test void populatedV4UpgradesWithoutChangingIdentitiesOrderOrPublication() throws Exception {
        String baseUrl = System.getenv("DB_URL");
        assertNotNull(baseUrl, "Use an isolated PostgreSQL test schema");
        assertTrue(baseUrl.matches("jdbc:postgresql://(?:localhost|127\\.0\\.0\\.1)(?::[0-9]+)?/[a-zA-Z0-9_]+\\?currentSchema=jpn021_[a-zA-Z0-9_]+"),
                "Refusing nonlocal or shared schema");
        String user = System.getenv("DB_USERNAME"), password = System.getenv("DB_PASSWORD");
        assertNotNull(user); assertNotNull(password);
        String schema = "jpn021_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        String url = baseUrl.replaceAll("currentSchema=jpn021_[a-zA-Z0-9_]+$", "currentSchema=" + schema);
        try (Connection admin = DriverManager.getConnection(baseUrl, user, password)) {
            execute(admin, "CREATE SCHEMA " + schema);
            try {
                Flyway throughV4 = flyway(url, user, password, schema, "4");
                throughV4.migrate();
                UUID rights = UUID.randomUUID(), path = UUID.randomUUID(), stage = UUID.randomUUID();
                UUID chapter = UUID.randomUUID(), lesson = UUID.randomUUID(), section = UUID.randomUUID();
                UUID item = UUID.randomUUID(), placement = UUID.randomUUID();
                try (Connection db = DriverManager.getConnection(url, user, password)) {
                    execute(db, "INSERT INTO content_rights(id,origin_kind,source_label,attribution,permission_basis,clearance_status) " +
                            "VALUES('" + rights + "','original','Source','Author','Original','cleared')");
                    execute(db, "INSERT INTO learning_paths(id,slug,title_vi,rights_id) VALUES('" + path + "','path-a','Path', '" + rights + "')");
                    execute(db, "INSERT INTO path_stages(id,path_id,stable_key,position,title_vi,rights_id) VALUES('" + stage + "','" + path + "','stage-a',1,'Stage','" + rights + "')");
                    execute(db, "INSERT INTO stage_chapters(id,stage_id,stable_key,position,title_vi,rights_id) VALUES('" + chapter + "','" + stage + "','chapter-a',1,'Chapter','" + rights + "')");
                    execute(db, "INSERT INTO lessons(id,stable_key,slug,title_vi,rights_id) VALUES('" + lesson + "','lesson-a','lesson-a','Lesson','" + rights + "')");
                    execute(db, "INSERT INTO lesson_sections(id,lesson_id,position,title_vi) VALUES('" + section + "','" + lesson + "',1,'Section')");
                    execute(db, "INSERT INTO content_items(id,stable_key,kind,payload,rights_id) VALUES('" + item + "','item-a','kana','{}'::jsonb,'" + rights + "')");
                    execute(db, "INSERT INTO chapter_lessons(id,chapter_id,lesson_id,position) VALUES('" + placement + "','" + chapter + "','" + lesson + "',1)");
                    execute(db, "INSERT INTO content_item_revisions(item_id,revision,kind,payload,rights_id) VALUES('" + item + "',1,'kana','{}'::jsonb,'" + rights + "')");
                    execute(db, "UPDATE content_item_revisions SET sealed_at=now() WHERE item_id='" + item + "' AND revision=1");
                    execute(db, "UPDATE content_items SET published_revision=1 WHERE id='" + item + "'");
                    assertEquals(1, scalar(db, "SELECT published_revision FROM content_items WHERE id='" + item + "'"));
                }
                Flyway throughV5 = flyway(url, user, password, schema, "5");
                throughV5.migrate();
                throughV5.validate();
                try (Connection db = DriverManager.getConnection(url, user, password)) {
                    assertEquals(1, scalar(db, "SELECT count(*) FROM learning_paths WHERE id='" + path + "'"));
                    assertEquals(1, scalar(db, "SELECT position FROM path_stages WHERE id='" + stage + "'"));
                    assertEquals(1, scalar(db, "SELECT position FROM stage_chapters WHERE id='" + chapter + "'"));
                    assertEquals(1, scalar(db, "SELECT position FROM lesson_sections WHERE id='" + section + "'"));
                    assertEquals(1, scalar(db, "SELECT position FROM chapter_lessons WHERE id='" + placement + "'"));
                    assertEquals(1, scalar(db, "SELECT published_revision FROM content_items WHERE id='" + item + "'"));
                    assertEquals(1, scalar(db, "SELECT count(*) FROM content_item_revisions WHERE item_id='" + item + "' AND sealed_at IS NOT NULL"));
                    assertEquals(1, scalar(db, "SELECT count(*) FROM content_rights WHERE id='" + rights + "' AND stable_key IS NULL"));
                    assertEquals(1, scalar(db, "SELECT count(*) FROM lesson_sections WHERE id='" + section + "' AND stable_key IS NULL"));
                    assertEquals(1, scalar(db, "SELECT count(*) FROM chapter_lessons WHERE id='" + placement + "' AND stable_key IS NULL"));
                    execute(db, "UPDATE content_rights SET stable_key='rights-a' WHERE id='" + rights + "'");
                    execute(db, "UPDATE lesson_sections SET stable_key='section-a' WHERE id='" + section + "'");
                    execute(db, "UPDATE chapter_lessons SET stable_key='placement-a' WHERE id='" + placement + "'");
                    assertThrows(SQLException.class, () -> execute(db,
                            "INSERT INTO content_rights(id,stable_key,origin_kind,source_label,attribution,permission_basis) " +
                                    "VALUES('" + UUID.randomUUID() + "','rights-a','original','S','A','P')"));
                    assertThrows(SQLException.class, () -> execute(db,
                            "INSERT INTO lesson_sections(id,lesson_id,position,stable_key) VALUES('" + UUID.randomUUID() + "','" + lesson + "',2,'section-a')"));
                    UUID secondLesson = UUID.randomUUID();
                    execute(db, "INSERT INTO lessons(id,stable_key,slug,title_vi,rights_id) VALUES('" + secondLesson + "','lesson-b','lesson-b','Lesson B','" + rights + "')");
                    execute(db, "INSERT INTO lesson_sections(id,lesson_id,position,stable_key) VALUES('" + UUID.randomUUID() + "','" + secondLesson + "',1,'section-a')");
                    UUID secondPlacement = UUID.randomUUID();
                    execute(db, "INSERT INTO chapter_lessons(id,chapter_id,lesson_id,position,stable_key) VALUES('" + secondPlacement + "','" + chapter + "','" + secondLesson + "',2,'placement-b')");
                    assertThrows(SQLException.class, () -> execute(db,
                            "UPDATE chapter_lessons SET stable_key='placement-a' WHERE id='" + secondPlacement + "'"));
                    UUID secondChapter = UUID.randomUUID();
                    execute(db, "INSERT INTO stage_chapters(id,stage_id,stable_key,position,title_vi,rights_id) VALUES('" + secondChapter + "','" + stage + "','chapter-b',2,'Chapter B','" + rights + "')");
                    execute(db, "INSERT INTO chapter_lessons(id,chapter_id,lesson_id,position,stable_key) VALUES('" + UUID.randomUUID() + "','" + secondChapter + "','" + lesson + "',1,'placement-a')");
                    assertThrows(SQLException.class, () -> execute(db,
                            "UPDATE lesson_sections SET stable_key='Bad Key' WHERE id='" + section + "'"));
                    assertEquals(5, scalar(db, "SELECT count(*) FROM flyway_schema_history WHERE success"));
                }
            } finally {
                execute(admin, "DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }

    private Flyway flyway(String url, String user, String password, String schema, String target) {
        return Flyway.configure().dataSource(url, user, password).locations("classpath:db/migration")
                .defaultSchema(schema).schemas(schema).createSchemas(false).target(target).load();
    }

    private void execute(Connection db, String sql) throws SQLException {
        try (Statement statement = db.createStatement()) { statement.execute(sql); }
    }

    private int scalar(Connection db, String sql) throws SQLException {
        try (Statement statement = db.createStatement(); ResultSet rows = statement.executeQuery(sql)) {
            assertTrue(rows.next());
            return rows.getInt(1);
        }
    }
}
