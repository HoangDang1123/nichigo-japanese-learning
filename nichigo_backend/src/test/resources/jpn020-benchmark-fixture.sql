-- Synthetic JPN-020 benchmark only. Run once in an empty, isolated PostgreSQL schema
-- after Flyway V4. Never run against production or include in a migration.
BEGIN;
CREATE FUNCTION benchmark_uuid(kind TEXT, n BIGINT) RETURNS UUID
LANGUAGE SQL IMMUTABLE AS $$ SELECT md5(kind || ':' || n::TEXT)::UUID $$;

INSERT INTO content_rights(id,origin_kind,source_label,attribution,permission_basis,clearance_status)
SELECT benchmark_uuid('rights',n), 'original', 'synthetic benchmark', 'synthetic benchmark',
       'generated test data', 'cleared'
FROM generate_series(0,10) AS n;

INSERT INTO content_items(id,stable_key,kind,payload,rights_id)
SELECT benchmark_uuid('item',n), 'bench-item-' || lpad(n::TEXT,6,'0'), 'kana',
       '{"glyph":"あ"}'::JSONB,
       benchmark_uuid('rights',((n-1)/5000)+1)
FROM generate_series(1,50000) AS n;
INSERT INTO content_item_revisions(item_id,revision,kind,display_text_ja,payload,rights_id)
SELECT benchmark_uuid('item',n),1,'kana','あ','{"glyph":"あ"}'::JSONB,
       benchmark_uuid('rights',((n-1)/5000)+1)
FROM generate_series(1,50000) AS n;
UPDATE content_item_revisions SET sealed_at=CURRENT_TIMESTAMP;
UPDATE content_items SET published_revision=1;

INSERT INTO lessons(id,stable_key,slug,title_vi,rights_id)
SELECT benchmark_uuid('lesson',n), 'bench-lesson-' || n, 'bench-lesson-' || n,
       'Bài thử ' || n, benchmark_uuid('rights',0)
FROM generate_series(1,5000) AS n;
INSERT INTO lesson_sections(id,lesson_id,position)
SELECT benchmark_uuid('section',n), benchmark_uuid('lesson',n),1
FROM generate_series(1,5000) AS n;
INSERT INTO lesson_items(id,section_id,item_id,position)
SELECT benchmark_uuid('lesson-item',n), benchmark_uuid('section',((n-1)/10)+1),
       benchmark_uuid('item',n), ((n-1)%10)+1
FROM generate_series(1,50000) AS n;
INSERT INTO lesson_revisions(lesson_id,revision,title_vi,rights_id)
SELECT benchmark_uuid('lesson',n),1,'Bài thử ' || n,benchmark_uuid('rights',0)
FROM generate_series(1,5000) AS n;
INSERT INTO lesson_revision_sections(lesson_id,lesson_revision,section_id,position)
SELECT benchmark_uuid('lesson',n),1,benchmark_uuid('section',n),1
FROM generate_series(1,5000) AS n;
INSERT INTO lesson_revision_items(lesson_id,lesson_revision,section_id,position,item_id,item_revision)
SELECT benchmark_uuid('lesson',((n-1)/10)+1),1,
       benchmark_uuid('section',((n-1)/10)+1),((n-1)%10)+1,
       benchmark_uuid('item',n),1
FROM generate_series(1,50000) AS n;
UPDATE lesson_revisions SET sealed_at=CURRENT_TIMESTAMP;
UPDATE lessons SET published_revision=1;

INSERT INTO learning_paths(id,slug,title_vi,rights_id)
SELECT benchmark_uuid('path',n), 'bench-path-' || n,'Lộ trình thử ' || n,
       benchmark_uuid('rights',0)
FROM generate_series(1,5) AS n;
INSERT INTO path_stages(id,path_id,stable_key,position,title_vi,rights_id)
SELECT benchmark_uuid('stage',n),benchmark_uuid('path',((n-1)/10)+1),
       'bench-stage-' || n,((n-1)%10)+1,'Giai đoạn thử ' || n,benchmark_uuid('rights',0)
FROM generate_series(1,50) AS n;
INSERT INTO stage_chapters(id,stage_id,stable_key,position,title_vi,rights_id)
SELECT benchmark_uuid('chapter',n),benchmark_uuid('stage',((n-1)/10)+1),
       'bench-chapter-' || n,((n-1)%10)+1,'Chương thử ' || n,benchmark_uuid('rights',0)
FROM generate_series(1,500) AS n;
INSERT INTO chapter_lessons(id,chapter_id,lesson_id,position)
SELECT benchmark_uuid('placement',n),benchmark_uuid('chapter',((n-1)/10)+1),
       benchmark_uuid('lesson',n),((n-1)%10)+1
FROM generate_series(1,5000) AS n;
INSERT INTO path_revisions(path_id,revision,title_vi,rights_id)
SELECT benchmark_uuid('path',n),1,'Lộ trình thử ' || n,benchmark_uuid('rights',0)
FROM generate_series(1,5) AS n;
INSERT INTO path_revision_stages(path_id,path_revision,stage_id,position,title_vi,rights_id)
SELECT benchmark_uuid('path',((n-1)/10)+1),1,benchmark_uuid('stage',n),
       ((n-1)%10)+1,'Giai đoạn thử ' || n,benchmark_uuid('rights',0)
FROM generate_series(1,50) AS n;
INSERT INTO path_revision_chapters(path_id,path_revision,stage_id,chapter_id,position,title_vi,rights_id)
SELECT benchmark_uuid('path',((n-1)/100)+1),1,benchmark_uuid('stage',((n-1)/10)+1),
       benchmark_uuid('chapter',n),((n-1)%10)+1,'Chương thử ' || n,benchmark_uuid('rights',0)
FROM generate_series(1,500) AS n;
INSERT INTO path_revision_lessons(path_id,path_revision,chapter_id,position,placement_id,lesson_id,lesson_revision)
SELECT benchmark_uuid('path',((n-1)/1000)+1),1,benchmark_uuid('chapter',((n-1)/10)+1),
       ((n-1)%10)+1,benchmark_uuid('placement',n),benchmark_uuid('lesson',n),1
FROM generate_series(1,5000) AS n;
UPDATE path_revisions SET sealed_at=CURRENT_TIMESTAMP;
UPDATE learning_paths SET published_revision=1;
COMMIT;
