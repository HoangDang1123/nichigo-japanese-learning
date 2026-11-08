package com.nichigo.api.contentimport;

import com.nichigo.api.contentimport.CanonicalContentValidator.CanonicalRecord;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Transactional v1 package application. Stable keys, never generated IDs, match editorial identities. */
@Service
public class ContentImportService {
    private final JdbcTemplate db;
    private final ContentPackageValidator validator;
    private final JdbcContentReferenceResolver resolver;

    public ContentImportService(JdbcTemplate db, ContentPackageValidator validator,
                                JdbcContentReferenceResolver resolver) {
        this.db = db; this.validator = validator; this.resolver = resolver;
    }

    public record Result(UUID batchId, String status, Map<String, Integer> counts) {}

    @Transactional
    public Result apply(Map<String, byte[]> files, ContentOperatorAuth.Principal operator) {
        if (operator == null) throw new SecurityException("Operator authentication required.");
        // Serialize all imports, including packages that reference each other's declarations.
        db.execute("SELECT pg_advisory_xact_lock(2022, 22)");
        ContentPackageValidator.ParsedPackage parsed = validator.parse(files, resolver);
        if (!parsed.report().valid()) throw new IllegalArgumentException("Package validation failed.");
        String packageKey = value(parsed.manifest(), "packageKey");
        String version = value(parsed.manifest(), "packageVersion");
        String checksum = checksum(files);
        List<Map<String, Object>> previous = db.queryForList("SELECT id, checksum_sha256 FROM content_import_batches WHERE package_key=? AND package_version=?", packageKey, version);
        if (!previous.isEmpty()) {
            if (!checksum.equals(previous.getFirst().get("checksum_sha256")))
                throw new IllegalStateException("Package identity already exists with different content.");
            return new Result((UUID) previous.getFirst().get("id"), "already_applied", Map.of());
        }
        db.execute("SET CONSTRAINTS lesson_sections_lesson_id_position_key, lesson_items_section_id_position_key, path_stages_path_id_position_key, stage_chapters_stage_id_position_key, chapter_lessons_chapter_id_position_key DEFERRED");
        Map<String, Integer> counts = new HashMap<>();
        for (String type : List.of("rights", "media", "items", "lessons", "paths")) {
            List<CanonicalRecord> records = parsed.records().getOrDefault(type, List.of());
            for (CanonicalRecord record : records) {
                switch (type) {
                    case "rights" -> rights(record.node());
                    case "media" -> media(record.node(), packageKey, version);
                    case "items" -> item(record.node(), packageKey, version);
                    case "lessons" -> lesson(record.node(), packageKey, version);
                    case "paths" -> path(record.node(), packageKey, version);
                    default -> throw new IllegalStateException(type);
                }
            }
            counts.put(type, records.size());
            if (type.equals("lessons")) for (CanonicalRecord record : records) {
                UUID lessonId=id("lessons","stable_key",value(record.node(),"key"));
                db.update("DELETE FROM lesson_prerequisites WHERE lesson_id=?",lessonId);
                for (JsonNode prior : record.node().path("prerequisites"))
                    db.update("INSERT INTO lesson_prerequisites(lesson_id,prerequisite_lesson_id) VALUES (?,?)",
                            lessonId,id("lessons","stable_key",prior.asText()));
            }
        }
        UUID batchId = UUID.randomUUID();
        String jsonCounts = "{\"rights\":" + counts.get("rights") + ",\"media\":" + counts.get("media")
                + ",\"items\":" + counts.get("items") + ",\"lessons\":" + counts.get("lessons")
                + ",\"paths\":" + counts.get("paths") + "}";
        db.update("INSERT INTO content_import_batches(id,package_key,package_version,checksum_sha256,operator_id,entity_counts) VALUES (?,?,?,?,?,?::jsonb)",
                batchId, packageKey, version, checksum, operator.id(), jsonCounts);
        return new Result(batchId, "applied", Map.copyOf(counts));
    }

    private void rights(JsonNode n) {
        List<Map<String, Object>> rows = db.queryForList("SELECT * FROM content_rights WHERE stable_key=? FOR UPDATE", value(n,"key"));
        if (rows.isEmpty()) {
            db.update("INSERT INTO content_rights(id,stable_key,origin_kind,source_label,source_url,attribution,permission_basis,evidence_ref) VALUES (?,?,?,?,?,?,?,?)",
                    UUID.randomUUID(), value(n,"key"), value(n,"originKind"), value(n,"sourceLabel"), optional(n,"sourceUrl"),
                    value(n,"attribution"), value(n,"permissionBasis"), optional(n,"evidenceRef"));
            return;
        }
        Map<String,Object> r = rows.getFirst();
        if (!same(r,"origin_kind",value(n,"originKind")) || !same(r,"source_label",value(n,"sourceLabel"))
                || !same(r,"source_url",optional(n,"sourceUrl")) || !same(r,"attribution",value(n,"attribution"))
                || !same(r,"permission_basis",value(n,"permissionBasis")) || !same(r,"evidence_ref",optional(n,"evidenceRef")))
            throw new IllegalStateException("Rights evidence changed; create a new Rights key.");
    }

    private void media(JsonNode n, String owner, String version) {
        Root r = root("media", "media_assets", "stable_key", value(n,"key"), owner, version, value(n,"kind"));
        UUID rights = id("content_rights", "stable_key", value(n,"rightsKey"));
        if (r.created) db.update("INSERT INTO media_assets(id,stable_key,media_kind,storage_key,checksum_sha256,mime_type,alt_text_vi,transcript_vi,rights_id) VALUES (?,?,?,?,?,?,?,?,?)",
                r.id,value(n,"key"),value(n,"kind"),value(n,"storageKey"),value(n,"checksumSha256"),value(n,"mimeType"),optional(n,"altTextVi"),optional(n,"transcriptVi"),rights);
        else db.update("UPDATE media_assets SET storage_key=?,checksum_sha256=?,mime_type=?,alt_text_vi=?,transcript_vi=?,rights_id=?,edit_version=edit_version+1,editorial_status='draft',updated_at=now() WHERE id=?",
                value(n,"storageKey"),value(n,"checksumSha256"),value(n,"mimeType"),optional(n,"altTextVi"),optional(n,"transcriptVi"),rights,r.id);
        ownership("media",r,owner,version);
    }

    private void item(JsonNode n, String owner, String version) {
        Root r = root("item", "content_items", "stable_key", value(n,"key"), owner, version, value(n,"kind"));
        UUID rights = id("content_rights", "stable_key", value(n,"rightsKey"));
        if (r.created) db.update("INSERT INTO content_items(id,stable_key,kind,display_text_ja,display_text_vi,payload,rights_id,jlpt_level_code,communication_level_code) VALUES (?,?,?,?,?,?::jsonb,?,?,?)",
                r.id,value(n,"key"),value(n,"kind"),optional(n,"displayTextJa"),optional(n,"displayTextVi"),n.path("payload").toString(),rights,optional(n,"jlptLevelCode"),optional(n,"communicationLevelCode"));
        else db.update("UPDATE content_items SET display_text_ja=?,display_text_vi=?,payload=?::jsonb,rights_id=?,jlpt_level_code=?,communication_level_code=?,edit_version=edit_version+1,editorial_status='draft',updated_at=now() WHERE id=?",
                optional(n,"displayTextJa"),optional(n,"displayTextVi"),n.path("payload").toString(),rights,optional(n,"jlptLevelCode"),optional(n,"communicationLevelCode"),r.id);
        db.update("DELETE FROM content_item_tags WHERE item_id=?",r.id);
        for (String[] tag : new String[][]{{"knowledgeDomains","knowledge_domain"},{"languageSkills","language_skill"},{"topics","topic"}})
            for (JsonNode code : n.path(tag[0])) db.update("INSERT INTO content_item_tags(item_id,category,code) VALUES (?,?,?)",r.id,tag[1],code.asText());
        db.update("DELETE FROM content_item_media WHERE item_id=?",r.id);
        for (JsonNode ref : n.path("mediaRefs")) db.update("INSERT INTO content_item_media(id,item_id,media_id,role_code,position) VALUES (?,?,?,?,?)",
                UUID.randomUUID(),r.id,id("media_assets","stable_key",value(ref,"mediaKey")),value(ref,"role"),ref.path("position").asInt());
        ownership("item",r,owner,version);
    }

    private void lesson(JsonNode n, String owner, String version) {
        Root r = root("lesson","lessons","stable_key",value(n,"key"),owner,version,null);
        UUID rights = id("content_rights","stable_key",value(n,"rightsKey"));
        if (r.created) db.update("INSERT INTO lessons(id,stable_key,slug,title_vi,summary_vi,rights_id,jlpt_level_code,communication_level_code) VALUES (?,?,?,?,?,?,?,?)",
                r.id,value(n,"key"),value(n,"slug"),value(n,"titleVi"),optional(n,"summaryVi"),rights,optional(n,"jlptLevelCode"),optional(n,"communicationLevelCode"));
        else db.update("UPDATE lessons SET slug=?,title_vi=?,summary_vi=?,rights_id=?,jlpt_level_code=?,communication_level_code=?,edit_version=edit_version+1,editorial_status='draft',updated_at=now() WHERE id=?",
                value(n,"slug"),value(n,"titleVi"),optional(n,"summaryVi"),rights,optional(n,"jlptLevelCode"),optional(n,"communicationLevelCode"),r.id);
        db.update("DELETE FROM lesson_objectives WHERE lesson_id=?",r.id);
        for (JsonNode o : n.path("objectives")) db.update("INSERT INTO lesson_objectives(id,lesson_id,position,kind,text_vi) VALUES (?,?,?,?,?)",
                UUID.randomUUID(),r.id,o.path("position").asInt(),value(o,"kind"),value(o,"textVi"));
        Set<UUID> retained = new HashSet<>();
        for (JsonNode section : n.path("sections")) {
            String key = value(section,"key");
            List<UUID> existing = db.query("SELECT id FROM lesson_sections WHERE lesson_id=? AND stable_key=?", (rs,row) -> rs.getObject(1,UUID.class),r.id,key);
            UUID sectionId = existing.isEmpty()?UUID.randomUUID():existing.getFirst();
            retained.add(sectionId);
            if (existing.isEmpty()) db.update("INSERT INTO lesson_sections(id,lesson_id,stable_key,position,title_vi) VALUES (?,?,?,?,?)",sectionId,r.id,key,section.path("position").asInt(),optional(section,"titleVi"));
            else db.update("UPDATE lesson_sections SET position=?,title_vi=? WHERE id=?",section.path("position").asInt(),optional(section,"titleVi"),sectionId);
            // Placements lack stable keys: preserve their identity when the item stays in the section.
            Set<UUID> placements = new HashSet<>();
            for (JsonNode placement : section.path("items")) {
                UUID itemId = id("content_items","stable_key",value(placement,"itemKey"));
                List<UUID> prior = db.query("SELECT id FROM lesson_items WHERE section_id=? AND item_id=? ORDER BY position",(rs,row)->rs.getObject(1,UUID.class),sectionId,itemId)
                        .stream().filter(candidate->!placements.contains(candidate)).limit(1).toList();
                UUID placementId = prior.isEmpty()?UUID.randomUUID():prior.getFirst();
                placements.add(placementId);
                if (prior.isEmpty()) db.update("INSERT INTO lesson_items(id,section_id,item_id,position) VALUES (?,?,?,?)",placementId,sectionId,itemId,placement.path("position").asInt());
                else db.update("UPDATE lesson_items SET position=? WHERE id=?",placement.path("position").asInt(),placementId);
            }
            for (UUID old : db.query("SELECT id FROM lesson_items WHERE section_id=?",(rs,row)->rs.getObject(1,UUID.class),sectionId))
                if (!placements.contains(old)) db.update("DELETE FROM lesson_items WHERE id=?",old);
        }
        for (UUID old : db.query("SELECT id FROM lesson_sections WHERE lesson_id=?",(rs,row)->rs.getObject(1,UUID.class),r.id))
            if (!retained.contains(old)) {
                db.update("DELETE FROM lesson_items WHERE section_id=?",old);
                db.update("DELETE FROM lesson_sections WHERE id=?",old);
            }
        ownership("lesson",r,owner,version);
    }

    private void path(JsonNode n, String owner, String version) {
        Root r = root("path","learning_paths","slug",value(n,"key"),owner,version,null);
        UUID rights = id("content_rights","stable_key",value(n,"rightsKey"));
        if (r.created) db.update("INSERT INTO learning_paths(id,slug,title_vi,description_vi,rights_id) VALUES (?,?,?,?,?)",r.id,value(n,"key"),value(n,"titleVi"),optional(n,"descriptionVi"),rights);
        else db.update("UPDATE learning_paths SET title_vi=?,description_vi=?,rights_id=?,edit_version=edit_version+1,editorial_status='draft',updated_at=now() WHERE id=?",
                value(n,"titleVi"),optional(n,"descriptionVi"),rights,r.id);
        Set<UUID> stages = new HashSet<>();
        for (JsonNode stage : n.path("stages")) {
            UUID sid = child("path_stages","path_id",r.id,value(stage,"key")); stages.add(sid);
            UUID sr = id("content_rights","stable_key",value(stage,"rightsKey"));
            db.update("INSERT INTO path_stages(id,path_id,stable_key,position,title_vi,description_vi,rights_id) VALUES (?,?,?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET position=EXCLUDED.position,title_vi=EXCLUDED.title_vi,description_vi=EXCLUDED.description_vi,rights_id=EXCLUDED.rights_id",
                    sid,r.id,value(stage,"key"),stage.path("position").asInt(),value(stage,"titleVi"),optional(stage,"descriptionVi"),sr);
            Set<UUID> chapters = new HashSet<>();
            for (JsonNode chapter : stage.path("chapters")) {
                UUID cid = child("stage_chapters","stage_id",sid,value(chapter,"key")); chapters.add(cid);
                UUID cr = id("content_rights","stable_key",value(chapter,"rightsKey"));
                db.update("INSERT INTO stage_chapters(id,stage_id,stable_key,position,title_vi,description_vi,rights_id) VALUES (?,?,?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET position=EXCLUDED.position,title_vi=EXCLUDED.title_vi,description_vi=EXCLUDED.description_vi,rights_id=EXCLUDED.rights_id",
                        cid,sid,value(chapter,"key"),chapter.path("position").asInt(),value(chapter,"titleVi"),optional(chapter,"descriptionVi"),cr);
                Set<UUID> placements = new HashSet<>();
                for (JsonNode placement : chapter.path("lessons")) {
                    UUID lid = id("lessons","stable_key",value(placement,"lessonKey"));
                    List<UUID> old = db.query("SELECT id FROM chapter_lessons WHERE chapter_id=? AND stable_key=?",(rs,row)->rs.getObject(1,UUID.class),cid,value(placement,"key"));
                    UUID pid = old.isEmpty()?UUID.randomUUID():old.getFirst(); placements.add(pid);
                    if(!old.isEmpty() && !lid.equals(db.queryForObject("SELECT lesson_id FROM chapter_lessons WHERE id=?",UUID.class,pid)))
                        throw new IllegalStateException("Placement stable key cannot change its Lesson.");
                    db.update("INSERT INTO chapter_lessons(id,chapter_id,stable_key,lesson_id,position) VALUES (?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET lesson_id=EXCLUDED.lesson_id,position=EXCLUDED.position",
                            pid,cid,value(placement,"key"),lid,placement.path("position").asInt());
                }
                for (UUID old : db.query("SELECT id FROM chapter_lessons WHERE chapter_id=?",(rs,row)->rs.getObject(1,UUID.class),cid))
                    if (!placements.contains(old)) db.update("DELETE FROM chapter_lessons WHERE id=?",old);
            }
            for (UUID old : db.query("SELECT id FROM stage_chapters WHERE stage_id=?",(rs,row)->rs.getObject(1,UUID.class),sid))
                if (!chapters.contains(old)) { db.update("DELETE FROM chapter_lessons WHERE chapter_id=?",old); db.update("DELETE FROM stage_chapters WHERE id=?",old); }
        }
        for (UUID old : db.query("SELECT id FROM path_stages WHERE path_id=?",(rs,row)->rs.getObject(1,UUID.class),r.id))
            if (!stages.contains(old)) {
                for (UUID chapter : db.query("SELECT id FROM stage_chapters WHERE stage_id=?",(rs,row)->rs.getObject(1,UUID.class),old)) db.update("DELETE FROM chapter_lessons WHERE chapter_id=?",chapter);
                db.update("DELETE FROM stage_chapters WHERE stage_id=?",old); db.update("DELETE FROM path_stages WHERE id=?",old);
            }
        ownership("path",r,owner,version);
    }

    private record Root(UUID id, boolean created, long nextVersion) {}
    private Root root(String kind,String table,String keyColumn,String key,String owner,String version,String declaredKind) {
        List<Map<String,Object>> rows = db.queryForList("SELECT * FROM " + table + " WHERE " + keyColumn + "=? FOR UPDATE",key);
        if (rows.isEmpty()) return new Root(UUID.randomUUID(),true,1);
        Map<String,Object> row = rows.getFirst(); UUID entityId = (UUID)row.get("id");
        List<Map<String,Object>> claims = db.queryForList("SELECT * FROM content_editorial_ownership WHERE entity_kind=? AND entity_id=? FOR UPDATE",kind,entityId);
        if (claims.isEmpty() || !owner.equals(claims.getFirst().get("package_key")))
            throw new IllegalStateException("Stable key belongs to another editorial owner: " + key);
        if (((Number)row.get("edit_version")).longValue()!=((Number)claims.getFirst().get("last_edit_version")).longValue())
            throw new IllegalStateException("Stale editorial version: " + key);
        if (compareVersion(version,(String)claims.getFirst().get("last_package_version"))<=0)
            throw new IllegalStateException("Package version must increase for: " + key);
        if (declaredKind != null && !declaredKind.equals(row.get(kind.equals("media")?"media_kind":"kind")))
            throw new IllegalStateException("Existing kind cannot change: " + key);
        return new Root(entityId,false,((Number)row.get("edit_version")).longValue()+1);
    }
    private void ownership(String kind,Root root,String owner,String version) {
        db.update("INSERT INTO content_editorial_ownership(entity_kind,entity_id,package_key,last_package_version,last_edit_version) VALUES (?,?,?,?,?) ON CONFLICT (entity_kind,entity_id) DO UPDATE SET last_package_version=EXCLUDED.last_package_version,last_edit_version=EXCLUDED.last_edit_version",
                kind,root.id,owner,version,root.nextVersion);
    }
    private UUID child(String table,String parent,UUID parentId,String key) {
        List<UUID> ids = db.query("SELECT id FROM " + table + " WHERE " + parent + "=? AND stable_key=?",(rs,row)->rs.getObject(1,UUID.class),parentId,key);
        return ids.isEmpty()?UUID.randomUUID():ids.getFirst();
    }
    private UUID id(String table,String column,String key) {
        List<UUID> ids = db.query("SELECT id FROM " + table + " WHERE " + column + "=?",(rs,row)->rs.getObject(1,UUID.class),key);
        if (ids.size()!=1) throw new IllegalStateException("Unresolved or ambiguous reference: " + key);
        return ids.getFirst();
    }
    private static boolean same(Map<String,Object> row,String field,String expected) { return java.util.Objects.equals(row.get(field),expected); }
    private static String value(JsonNode n,String field) { return n.path(field).asText(); }
    private static String optional(JsonNode n,String field) { return n.has(field)?n.path(field).asText():null; }
    private static int compareVersion(String a,String b) {
        String[] x=a.split("\\."),y=b.split("\\.");
        for(int i=0;i<3;i++){int c=new java.math.BigInteger(x[i]).compareTo(new java.math.BigInteger(y[i]));if(c!=0)return c;} return 0;
    }
    private static String checksum(Map<String,byte[]> files) {
        try {
            MessageDigest d=MessageDigest.getInstance("SHA-256");
            files.keySet().stream().sorted().forEach(name->{byte[] bytes=name.getBytes(StandardCharsets.UTF_8); d.update((byte)(bytes.length>>8));d.update((byte)bytes.length);d.update(bytes); byte[] content=files.get(name);d.update(new byte[]{(byte)(content.length>>24),(byte)(content.length>>16),(byte)(content.length>>8),(byte)content.length});d.update(content);});
            return HexFormat.of().formatHex(d.digest());
        } catch(NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}
    }
}
