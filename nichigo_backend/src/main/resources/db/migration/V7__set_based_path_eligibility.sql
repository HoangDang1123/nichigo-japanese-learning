-- Check one pinned Path graph as sets. Do not consult working drafts or current
-- child pointers: a Path continues to serve its exact Lesson/Item/Media pins.
CREATE OR REPLACE FUNCTION path_revision_public(p_path UUID, p_revision INT) RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM learning_paths p
        JOIN path_revisions pr ON pr.path_id = p.id AND pr.revision = p_revision
        LEFT JOIN content_rights root_rights ON root_rights.id = pr.rights_id
        WHERE p.id = p_path AND p.withdrawn_at IS NULL
          AND pr.sealed_at IS NOT NULL
          AND root_rights.clearance_status = 'cleared'
          AND NOT EXISTS (
              SELECT 1 FROM path_revision_stages s
              LEFT JOIN content_rights r ON r.id = s.rights_id
              WHERE s.path_id = p.id AND s.path_revision = pr.revision
                AND r.clearance_status IS DISTINCT FROM 'cleared'
          )
          AND NOT EXISTS (
              SELECT 1 FROM path_revision_chapters c
              LEFT JOIN content_rights r ON r.id = c.rights_id
              WHERE c.path_id = p.id AND c.path_revision = pr.revision
                AND r.clearance_status IS DISTINCT FROM 'cleared'
          )
          AND NOT EXISTS (
              SELECT 1 FROM path_revision_lessons pl
              JOIN lessons l ON l.id = pl.lesson_id
              JOIN lesson_revisions lr ON lr.lesson_id = pl.lesson_id
                   AND lr.revision = pl.lesson_revision
              LEFT JOIN content_rights r ON r.id = lr.rights_id
              WHERE pl.path_id = p.id AND pl.path_revision = pr.revision
                AND (l.withdrawn_at IS NOT NULL OR lr.sealed_at IS NULL
                     OR r.clearance_status IS DISTINCT FROM 'cleared')
          )
          AND NOT EXISTS (
              SELECT 1 FROM path_revision_lessons pl
              JOIN lesson_revision_items li ON li.lesson_id = pl.lesson_id
                   AND li.lesson_revision = pl.lesson_revision
              JOIN content_items i ON i.id = li.item_id
              JOIN content_item_revisions ir ON ir.item_id = li.item_id
                   AND ir.revision = li.item_revision
              LEFT JOIN content_rights r ON r.id = ir.rights_id
              WHERE pl.path_id = p.id AND pl.path_revision = pr.revision
                AND (i.withdrawn_at IS NOT NULL OR ir.sealed_at IS NULL
                     OR r.clearance_status IS DISTINCT FROM 'cleared')
          )
          AND NOT EXISTS (
              SELECT 1 FROM path_revision_lessons pl
              JOIN lesson_revision_items li ON li.lesson_id = pl.lesson_id
                   AND li.lesson_revision = pl.lesson_revision
              JOIN content_item_revision_media im ON im.item_id = li.item_id
                   AND im.item_revision = li.item_revision
              JOIN media_assets m ON m.id = im.media_id
              JOIN media_asset_revisions mr ON mr.media_id = im.media_id
                   AND mr.revision = im.media_revision
              LEFT JOIN content_rights r ON r.id = mr.rights_id
              WHERE pl.path_id = p.id AND pl.path_revision = pr.revision
                AND (m.withdrawn_at IS NOT NULL OR mr.sealed_at IS NULL
                     OR r.clearance_status IS DISTINCT FROM 'cleared')
          )
    );
$$;
