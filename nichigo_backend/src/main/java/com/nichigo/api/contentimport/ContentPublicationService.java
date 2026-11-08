package com.nichigo.api.contentimport;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Exact-pin relational publication. One database transaction assembles, seals and exposes a root. */
@Service
public class ContentPublicationService {
    private final JdbcTemplate db;
    private final ObjectMapper json=new ObjectMapper();
    public ContentPublicationService(JdbcTemplate db){this.db=db;}
    public record Candidate(String kind,String key,long editVersion,Integer currentRevision,
                            Map<String,Integer> requiredPins,Map<String,Integer> selectedPins){}
    public record Published(String kind,String key,int revision,Map<String,Integer> pins){}

    @Transactional(readOnly=true)
    public Candidate preview(String kind,String key) {
        return preview(kind,key,null);
    }

    @Transactional(readOnly=true)
    public Candidate preview(String kind,String key,Map<String,Integer> pins) {
        Root r=load(kind,key,false);
        Map<String,Integer> required=required(kind,r.id);
        if(pins!=null && (!required.keySet().equals(pins.keySet())
                || pins.values().stream().anyMatch(v->v==null || v<1)))
            throw new IllegalArgumentException("Preview pins must name every dependency exactly once.");
        return new Candidate(kind,key,r.version,r.current,required,pins==null?Map.of():Map.copyOf(pins));
    }

    @Transactional
    public Published publish(String kind,String key,long expectedVersion,Map<String,Integer> pins,
                             ContentOperatorAuth.Principal operator) {
        ContentReviewService.require(operator);
        if (pins==null || pins.values().stream().anyMatch(v->v==null || v<1)) throw new IllegalArgumentException("Explicit positive pins required.");
        Root root=load(kind,key,true);
        if(root.version!=expectedVersion) throw new IllegalStateException("Stale draft version.");
        if(db.queryForObject("SELECT count(*) FROM content_publication_audit WHERE entity_kind=? AND entity_id=? AND edit_version=?",Integer.class,kind,root.id,expectedVersion)>0)
            throw new IllegalStateException("This draft version was already published.");
        if(root.withdrawn) throw new IllegalStateException("Draft is withdrawn.");
        if(!root.reviewed || db.queryForObject("SELECT count(*) FROM content_language_reviews WHERE entity_kind=? AND entity_id=? AND edit_version=?",Integer.class,kind,root.id,expectedVersion)!=1)
            throw new IllegalStateException("Current draft lacks language review.");
        Map<String,Integer> required=required(kind,root.id);
        if(!required.keySet().equals(pins.keySet())) throw new IllegalArgumentException("Pins must name every dependency exactly once.");
        // A single deterministic lock order also protects direct and transitive Rights
        // from concurrent revocation until the new pointer is committed.
        db.query("SELECT id FROM content_rights ORDER BY id FOR SHARE",rs->{});
        if(!Boolean.TRUE.equals(db.queryForObject("SELECT clearance_status='cleared' FROM content_rights WHERE id=?",Boolean.class,root.rights)))
            throw new IllegalStateException("Root Rights are not cleared.");
        int revision=root.current==null?1:root.current+1;
        switch(kind){
            case "media"->media(root.id,revision);
            case "item"->item(root.id,revision,pins);
            case "lesson"->lesson(root.id,revision,pins);
            case "path"->path(root.id,revision,pins);
            default->throw new IllegalArgumentException("Unsupported kind.");
        }
        String revisionTable=revisionTable(kind),idColumn=revisionId(kind);
        db.update("UPDATE "+revisionTable+" SET sealed_at=now() WHERE "+idColumn+"=? AND revision=?",root.id,revision);
        String check=switch(kind){case "media"->"media_revision_public";case "item"->"item_revision_public";case "lesson"->"lesson_revision_public";case "path"->"path_revision_public";default->throw new IllegalArgumentException();};
        if(!Boolean.TRUE.equals(db.queryForObject("SELECT "+check+"(?,?)",Boolean.class,root.id,revision)))
            throw new IllegalStateException("Revision graph is not public eligible.");
        db.update("UPDATE "+table(kind)+" SET published_revision=?,withdrawn_at=NULL WHERE id=? AND edit_version=?",revision,root.id,expectedVersion);
        db.update("INSERT INTO content_publication_audit(id,entity_kind,entity_id,revision,edit_version,operator_id,selected_pins) VALUES (?,?,?,?,?,?,?::jsonb)",UUID.randomUUID(),kind,root.id,revision,expectedVersion,operator.id(),json.writeValueAsString(pins));
        return new Published(kind,key,revision,Map.copyOf(pins));
    }

    private void media(UUID id,int rev){
        db.update("INSERT INTO media_asset_revisions(media_id,revision,media_kind,storage_key,checksum_sha256,mime_type,alt_text_vi,transcript_vi,rights_id) SELECT id,?,media_kind,storage_key,checksum_sha256,mime_type,alt_text_vi,transcript_vi,rights_id FROM media_assets WHERE id=?",rev,id);
    }
    private void item(UUID id,int rev,Map<String,Integer> pins){
        db.update("INSERT INTO content_item_revisions(item_id,revision,kind,display_text_ja,display_text_vi,payload,jlpt_level_code,communication_level_code,rights_id) SELECT id,?,kind,display_text_ja,display_text_vi,payload,jlpt_level_code,communication_level_code,rights_id FROM content_items WHERE id=?",rev,id);
        db.update("INSERT INTO content_item_revision_tags(item_id,item_revision,category,code) SELECT item_id,?,category,code FROM content_item_tags WHERE item_id=?",rev,id);
        List<Map<String,Object>> rows=db.queryForList("SELECT im.*,m.stable_key FROM content_item_media im JOIN media_assets m ON m.id=im.media_id WHERE im.item_id=? ORDER BY im.position",id);
        for(Map<String,Object> row:rows){
            UUID media=(UUID)row.get("media_id"); int pin=pins.get((String)row.get("stable_key"));
            if(!eligible("media_revision_public",media,pin)) throw new IllegalStateException("Selected Media revision unavailable.");
            db.update("INSERT INTO content_item_revision_media(item_id,item_revision,position,role_code,media_id,media_revision) VALUES (?,?,?,?,?,?)",id,rev,row.get("position"),row.get("role_code"),media,pin);
        }
    }
    private void lesson(UUID id,int rev,Map<String,Integer> pins){
        db.update("INSERT INTO lesson_revisions(lesson_id,revision,title_vi,summary_vi,jlpt_level_code,communication_level_code,rights_id) SELECT id,?,title_vi,summary_vi,jlpt_level_code,communication_level_code,rights_id FROM lessons WHERE id=?",rev,id);
        db.update("INSERT INTO lesson_revision_objectives(lesson_id,lesson_revision,position,kind,text_vi) SELECT lesson_id,?,position,kind,text_vi FROM lesson_objectives WHERE lesson_id=?",rev,id);
        db.update("INSERT INTO lesson_revision_sections(lesson_id,lesson_revision,section_id,position,title_vi) SELECT lesson_id,?,id,position,title_vi FROM lesson_sections WHERE lesson_id=?",rev,id);
        List<Map<String,Object>> rows=db.queryForList("SELECT li.*,s.lesson_id,i.stable_key FROM lesson_items li JOIN lesson_sections s ON s.id=li.section_id JOIN content_items i ON i.id=li.item_id WHERE s.lesson_id=? ORDER BY s.position,li.position",id);
        for(Map<String,Object> row:rows){
            UUID itemId=(UUID)row.get("item_id"); int pin=pins.get((String)row.get("stable_key"));
            if(!eligible("item_revision_public",itemId,pin)) throw new IllegalStateException("Selected Item revision unavailable.");
            db.update("INSERT INTO lesson_revision_items(lesson_id,lesson_revision,section_id,position,item_id,item_revision) VALUES (?,?,?,?,?,?)",id,rev,row.get("section_id"),row.get("position"),itemId,pin);
        }
        db.update("INSERT INTO lesson_revision_prerequisites(lesson_id,lesson_revision,prerequisite_lesson_id) SELECT lesson_id,?,prerequisite_lesson_id FROM lesson_prerequisites WHERE lesson_id=?",rev,id);
    }
    private void path(UUID id,int rev,Map<String,Integer> pins){
        db.update("INSERT INTO path_revisions(path_id,revision,title_vi,description_vi,rights_id) SELECT id,?,title_vi,description_vi,rights_id FROM learning_paths WHERE id=?",rev,id);
        db.update("INSERT INTO path_revision_stages(path_id,path_revision,stage_id,position,title_vi,description_vi,rights_id) SELECT path_id,?,id,position,title_vi,description_vi,rights_id FROM path_stages WHERE path_id=?",rev,id);
        db.update("INSERT INTO path_revision_chapters(path_id,path_revision,stage_id,chapter_id,position,title_vi,description_vi,rights_id) SELECT ?,?,stage_id,id,position,title_vi,description_vi,rights_id FROM stage_chapters WHERE stage_id IN (SELECT id FROM path_stages WHERE path_id=?)",id,rev,id);
        List<Map<String,Object>> rows=db.queryForList("SELECT cl.*,l.stable_key AS lesson_key FROM chapter_lessons cl JOIN stage_chapters c ON c.id=cl.chapter_id JOIN path_stages s ON s.id=c.stage_id JOIN lessons l ON l.id=cl.lesson_id WHERE s.path_id=? ORDER BY s.position,c.position,cl.position",id);
        for(Map<String,Object> row:rows){
            UUID lessonId=(UUID)row.get("lesson_id");int pin=pins.get((String)row.get("lesson_key"));
            if(!eligible("lesson_revision_public",lessonId,pin)) throw new IllegalStateException("Selected Lesson revision unavailable.");
            db.update("INSERT INTO path_revision_lessons(path_id,path_revision,chapter_id,position,placement_id,lesson_id,lesson_revision) VALUES (?,?,?,?,?,?,?)",id,rev,row.get("chapter_id"),row.get("position"),row.get("id"),lessonId,pin);
        }
    }

    private boolean eligible(String function,UUID id,int revision){return Boolean.TRUE.equals(db.queryForObject("SELECT "+function+"(?,?)",Boolean.class,id,revision));}
    private Map<String,Integer> required(String kind,UUID id){
        String sql=switch(kind){
            case "media"->null;
            case "item"->"SELECT DISTINCT m.stable_key FROM content_item_media im JOIN media_assets m ON m.id=im.media_id WHERE im.item_id=?";
            case "lesson"->"SELECT DISTINCT i.stable_key FROM lesson_items li JOIN lesson_sections s ON s.id=li.section_id JOIN content_items i ON i.id=li.item_id WHERE s.lesson_id=?";
            case "path"->"SELECT DISTINCT l.stable_key FROM chapter_lessons cl JOIN stage_chapters c ON c.id=cl.chapter_id JOIN path_stages s ON s.id=c.stage_id JOIN lessons l ON l.id=cl.lesson_id WHERE s.path_id=?";
            default->throw new IllegalArgumentException("Unknown content kind.");
        };
        Map<String,Integer> result=new LinkedHashMap<>();
        if(sql!=null) for(String key:db.query(sql,(rs,row)->rs.getString(1),id)) result.put(key,null);
        return result;
    }
    private record Root(UUID id,long version,Integer current,UUID rights,boolean reviewed,boolean withdrawn){}
    private Root load(String kind,String key,boolean lock){
        String table=table(kind),column=kind.equals("path")?"slug":"stable_key";
        List<Map<String,Object>> rows=db.queryForList("SELECT id,edit_version,published_revision,rights_id,editorial_status,withdrawn_at FROM "+table+" WHERE "+column+"=?"+(lock?" FOR UPDATE":""),key);
        if(rows.size()!=1) throw new IllegalArgumentException("Content key not found.");
        Map<String,Object> row=rows.getFirst();
        return new Root((UUID)row.get("id"),((Number)row.get("edit_version")).longValue(),(Integer)row.get("published_revision"),(UUID)row.get("rights_id"),"reviewed".equals(row.get("editorial_status")),row.get("withdrawn_at")!=null);
    }
    private static String table(String kind){return switch(kind){case "media"->"media_assets";case "item"->"content_items";case "lesson"->"lessons";case "path"->"learning_paths";default->throw new IllegalArgumentException("Unknown kind.");};}
    private static String revisionTable(String kind){return switch(kind){case "media"->"media_asset_revisions";case "item"->"content_item_revisions";case "lesson"->"lesson_revisions";case "path"->"path_revisions";default->throw new IllegalArgumentException();};}
    private static String revisionId(String kind){return switch(kind){case "media"->"media_id";case "item"->"item_id";case "lesson"->"lesson_id";case "path"->"path_id";default->throw new IllegalArgumentException();};}
}
