-- Test-only comparison. Requires the JPN-020 synthetic fixture in an isolated
-- V7 or V9 schema. Every write is rolled back; never run against production.
BEGIN;
DO $walkthrough$
DECLARE
  v9 BOOLEAN := EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema=current_schema() AND table_name='lesson_revisions' AND column_name='presentation');
  v_rights UUID := benchmark_uuid('rights',0);
  v_lesson UUID := benchmark_uuid('walk-lesson',1);
  v_section_a UUID := benchmark_uuid('walk-section',1);
  v_section_b UUID := benchmark_uuid('walk-section',2);
  v_item UUID := benchmark_uuid('item',1);
  v_path UUID := benchmark_uuid('walk-path',1);
  v_stage UUID := benchmark_uuid('walk-stage',1);
  v_chapter UUID := benchmark_uuid('walk-chapter',1);
  v_placement UUID := benchmark_uuid('walk-placement',1);
  v_lesson_doc JSONB;
  v_path_doc JSONB;
BEGIN
  -- Two editorial Sections and one shared canonical Item. Reorder the draft.
  INSERT INTO lessons(id,stable_key,slug,title_vi,rights_id)
    VALUES(v_lesson,'walk-lesson','walk-lesson','Draft',v_rights);
  INSERT INTO lesson_sections(id,lesson_id,position,stable_key,title_vi)
    VALUES(v_section_a,v_lesson,1,'first','First'),(v_section_b,v_lesson,2,'second','Second');
  INSERT INTO lesson_items(id,section_id,item_id,position)
    VALUES(benchmark_uuid('walk-entry',1),v_section_a,v_item,1);
  UPDATE lesson_sections SET position=3 WHERE id=v_section_a;
  UPDATE lesson_sections SET position=1 WHERE id=v_section_b;
  UPDATE lesson_sections SET position=2,title_vi='Edited First' WHERE id=v_section_a;

  v_lesson_doc := jsonb_build_object('schemaVersion','1.0','objectives','[]'::jsonb,
      'sections',jsonb_build_array(
        jsonb_build_object('id',v_section_b,'position',1,'titleVi','Second'),
        jsonb_build_object('id',v_section_a,'position',2,'titleVi','Edited First')));
  IF v9 THEN
    INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id,presentation)
      VALUES(v_lesson,1,'Lesson v1',v_rights,v_lesson_doc);
  ELSE
    INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id)
      VALUES(v_lesson,1,'Lesson v1',v_rights);
    INSERT INTO lesson_revision_sections(lesson_id,lesson_revision,section_id,position,title_vi)
      VALUES(v_lesson,1,v_section_b,1,'Second'),(v_lesson,1,v_section_a,2,'Edited First');
  END IF;
  INSERT INTO lesson_revision_items(lesson_id,lesson_revision,section_id,position,item_id,item_revision)
    VALUES(v_lesson,1,v_section_a,1,v_item,1);
  UPDATE lesson_revisions SET sealed_at=now() WHERE lesson_id=v_lesson AND revision=1;
  UPDATE lessons SET published_revision=1 WHERE id=v_lesson;

  INSERT INTO learning_paths(id,slug,title_vi,rights_id)
    VALUES(v_path,'walk-path','Walk Path',v_rights);
  INSERT INTO path_stages(id,path_id,stable_key,position,title_vi,rights_id)
    VALUES(v_stage,v_path,'walk-stage',1,'Stage',v_rights);
  INSERT INTO stage_chapters(id,stage_id,stable_key,position,title_vi,rights_id)
    VALUES(v_chapter,v_stage,'walk-chapter',1,'Chapter',v_rights);
  INSERT INTO chapter_lessons(id,chapter_id,lesson_id,position)
    VALUES(v_placement,v_chapter,v_lesson,1);
  v_path_doc := jsonb_build_object('schemaVersion','1.0','stages',jsonb_build_array(
      jsonb_build_object('id',v_stage,'position',1,'titleVi','Stage','chapters',
        jsonb_build_array(jsonb_build_object('id',v_chapter,'position',1,'titleVi','Chapter')))));
  IF v9 THEN
    INSERT INTO path_revisions(path_id,revision,title_vi,rights_id,presentation)
      VALUES(v_path,1,'Path v1',v_rights,v_path_doc);
    INSERT INTO path_revision_stages(path_id,path_revision,stage_id,rights_id)
      VALUES(v_path,1,v_stage,v_rights);
    INSERT INTO path_revision_chapters(path_id,path_revision,stage_id,chapter_id,rights_id)
      VALUES(v_path,1,v_stage,v_chapter,v_rights);
  ELSE
    INSERT INTO path_revisions(path_id,revision,title_vi,rights_id)
      VALUES(v_path,1,'Path v1',v_rights);
    INSERT INTO path_revision_stages(path_id,path_revision,stage_id,position,title_vi,rights_id)
      VALUES(v_path,1,v_stage,1,'Stage',v_rights);
    INSERT INTO path_revision_chapters(path_id,path_revision,stage_id,chapter_id,position,title_vi,rights_id)
      VALUES(v_path,1,v_stage,v_chapter,1,'Chapter',v_rights);
  END IF;
  INSERT INTO path_revision_lessons(path_id,path_revision,chapter_id,position,placement_id,lesson_id,lesson_revision)
    VALUES(v_path,1,v_chapter,1,v_placement,v_lesson,1);
  UPDATE path_revisions SET sealed_at=now() WHERE path_id=v_path AND revision=1;
  UPDATE learning_paths SET published_revision=1 WHERE id=v_path;

  -- A new Item does not change already pinned Lesson or Path revisions.
  INSERT INTO content_item_revisions(item_id,revision,kind,display_text_ja,payload,rights_id)
    SELECT item_id,2,kind,display_text_ja,payload || '{"walkthrough":true}'::jsonb,rights_id
    FROM content_item_revisions WHERE item_id=v_item AND revision=1;
  UPDATE content_item_revisions SET sealed_at=now() WHERE item_id=v_item AND revision=2;
  UPDATE content_items SET published_revision=2 WHERE id=v_item;
  IF NOT EXISTS (SELECT 1 FROM lesson_revision_items WHERE lesson_id=v_lesson
                 AND lesson_revision=1 AND item_id=v_item AND item_revision=1) THEN
    RAISE EXCEPTION 'Lesson v1 pin changed';
  END IF;

  IF v9 THEN
    INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id,presentation)
      VALUES(v_lesson,2,'Lesson v2',v_rights,v_lesson_doc);
  ELSE
    INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id)
      VALUES(v_lesson,2,'Lesson v2',v_rights);
    INSERT INTO lesson_revision_sections(lesson_id,lesson_revision,section_id,position,title_vi)
      VALUES(v_lesson,2,v_section_b,1,'Second'),(v_lesson,2,v_section_a,2,'Edited First');
  END IF;
  INSERT INTO lesson_revision_items(lesson_id,lesson_revision,section_id,position,item_id,item_revision)
    VALUES(v_lesson,2,v_section_a,1,v_item,2);
  UPDATE lesson_revisions SET sealed_at=now() WHERE lesson_id=v_lesson AND revision=2;
  UPDATE lessons SET published_revision=2 WHERE id=v_lesson AND published_revision=1;
  IF NOT EXISTS (SELECT 1 FROM path_revision_lessons WHERE path_id=v_path
                 AND path_revision=1 AND lesson_id=v_lesson AND lesson_revision=1)
     OR NOT path_revision_public(v_path,1) THEN
    RAISE EXCEPTION 'Path v1 pin or eligibility changed';
  END IF;

  IF v9 THEN
    INSERT INTO path_revisions(path_id,revision,title_vi,rights_id,presentation)
      VALUES(v_path,2,'Path v2',v_rights,v_path_doc);
    INSERT INTO path_revision_stages(path_id,path_revision,stage_id,rights_id)
      VALUES(v_path,2,v_stage,v_rights);
    INSERT INTO path_revision_chapters(path_id,path_revision,stage_id,chapter_id,rights_id)
      VALUES(v_path,2,v_stage,v_chapter,v_rights);
  ELSE
    INSERT INTO path_revisions(path_id,revision,title_vi,rights_id)
      VALUES(v_path,2,'Path v2',v_rights);
    INSERT INTO path_revision_stages(path_id,path_revision,stage_id,position,title_vi,rights_id)
      VALUES(v_path,2,v_stage,1,'Stage',v_rights);
    INSERT INTO path_revision_chapters(path_id,path_revision,stage_id,chapter_id,position,title_vi,rights_id)
      VALUES(v_path,2,v_stage,v_chapter,1,'Chapter',v_rights);
  END IF;
  INSERT INTO path_revision_lessons(path_id,path_revision,chapter_id,position,placement_id,lesson_id,lesson_revision)
    VALUES(v_path,2,v_chapter,1,v_placement,v_lesson,2);
  UPDATE path_revisions SET sealed_at=now() WHERE path_id=v_path AND revision=2;
  UPDATE learning_paths SET published_revision=2 WHERE id=v_path AND published_revision=1;

  -- An invalid candidate must roll back without creating revision 3.
  BEGIN
    IF v9 THEN
      INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id,presentation)
        VALUES(v_lesson,3,'Bad',v_rights,v_lesson_doc || '{"unknown":true}'::jsonb);
      UPDATE lesson_revisions SET sealed_at=now() WHERE lesson_id=v_lesson AND revision=3;
    ELSE
      INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id)
        VALUES(v_lesson,3,'Bad',v_rights);
      INSERT INTO lesson_revision_items(lesson_id,lesson_revision,section_id,position,item_id,item_revision)
        VALUES(v_lesson,3,benchmark_uuid('missing-section',1),1,v_item,2);
    END IF;
    RAISE EXCEPTION 'invalid candidate was accepted';
  EXCEPTION WHEN check_violation OR foreign_key_violation THEN
    NULL;
  END;
  IF EXISTS (SELECT 1 FROM lesson_revisions WHERE lesson_id=v_lesson AND revision=3) THEN
    RAISE EXCEPTION 'failed publication left partial revision';
  END IF;

  UPDATE content_rights SET clearance_status='revoked' WHERE id=v_rights;
  IF path_revision_public(v_path,2) OR lesson_revision_public(v_lesson,2) THEN
    RAISE EXCEPTION 'Rights revocation did not hide content';
  END IF;
  RAISE NOTICE 'walkthrough % passed: pins, explicit republish, rollback, Rights',
    CASE WHEN v9 THEN 'V9' ELSE 'V7' END;
END;
$walkthrough$;
ROLLBACK;
