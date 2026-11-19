package com.nichigo.api.content;

import com.nichigo.api.contentimport.ContentOperatorAuth;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class StrokeAssetService {
    private final JdbcTemplate db;
    private final StrokeAssetStorage storage;
    private final StrokeAssetValidator validator;

    public StrokeAssetService(JdbcTemplate db, StrokeAssetStorage storage, StrokeAssetValidator validator) {
        this.db = db; this.storage = storage; this.validator = validator;
    }
    private record Asset(String key, String hash, String mime, String glyph) {}

    /** Operator-only staging against the current Media draft; no Rights state is changed. */
    public void ingest(String mediaKey, String kanjiKey, byte[] bytes, ContentOperatorAuth.Principal operator) {
        if (operator == null) throw new SecurityException("Operator authentication required.");
        Asset asset = db.query("""
                SELECT m.storage_key,m.checksum_sha256,m.mime_type,i.payload->>'glyph'
                FROM media_assets m JOIN content_items i ON i.stable_key=? AND i.kind='kanji'
                JOIN content_item_media e ON e.item_id=i.id AND e.media_id=m.id AND e.role_code='stroke-order'
                WHERE m.stable_key=? AND m.media_kind='writing'
                """, (rs,n) -> new Asset(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4)),kanjiKey,mediaKey)
                .stream().findFirst().orElseThrow(() -> new IllegalArgumentException("Stroke draft not found."));
        validator.validate(bytes, asset.glyph(), asset.hash(), asset.mime());
        storage.putImmutable(asset.key(), bytes);
    }

    /** Called only for a Kanji stroke pin; other Media publication semantics stay intact. */
    public void requirePublishedStrokeBytes(UUID mediaId, int revision, String glyph) {
        Asset asset = db.query("""
                SELECT storage_key,checksum_sha256,mime_type,? FROM media_asset_revisions
                WHERE media_id=? AND revision=? AND media_kind='writing'
                """, (rs,n) -> new Asset(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4)),glyph,mediaId,revision)
                .stream().findFirst().orElseThrow(() -> new IllegalStateException("Stroke revision unavailable."));
        validator.validate(storage.read(asset.key()), asset.glyph(), asset.hash(), asset.mime());
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public byte[] delivery(String rawItemId) {
        UUID itemId;
        try { itemId = UUID.fromString(rawItemId); }
        catch (IllegalArgumentException ex) { throw new ContentNotFoundException(); }
        Asset asset = db.query("""
                SELECT mr.storage_key,mr.checksum_sha256,mr.mime_type,ir.payload->>'glyph'
                FROM content_items i
                JOIN content_item_revisions ir ON ir.item_id=i.id AND ir.revision=i.published_revision AND ir.kind='kanji'
                JOIN content_item_revision_media e ON e.item_id=i.id AND e.item_revision=ir.revision AND e.role_code='stroke-order'
                JOIN media_assets m ON m.id=e.media_id AND m.published_revision IS NOT NULL
                JOIN media_asset_revisions mr ON mr.media_id=m.id AND mr.revision=e.media_revision
                    AND mr.media_kind='writing' AND mr.mime_type='application/json'
                WHERE i.id=? AND item_revision_public(i.id,ir.revision)
                  AND media_revision_public(m.id,mr.revision)
                ORDER BY e.position LIMIT 1
                """, (rs,n) -> new Asset(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4)),itemId)
                .stream().findFirst().orElseThrow(ContentNotFoundException::new);
        byte[] bytes = storage.read(asset.key());
        try { validator.validate(bytes, asset.glyph(), asset.hash(), asset.mime()); }
        catch (IllegalArgumentException ex) { throw new IllegalStateException("Stroke asset unavailable."); }
        return bytes;
    }
}
