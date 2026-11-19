package com.nichigo.api.content;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/skills")
public class SkillsContentController {
    private final SkillsContentService content;
    private final StrokeAssetService strokeAssets;

    public SkillsContentController(SkillsContentService content, StrokeAssetService strokeAssets) {
        this.content = content; this.strokeAssets = strokeAssets;
    }

    @GetMapping
    public ResponseEntity<SkillsContentService.Directory> directory() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(content.directory());
    }

    @GetMapping("/items")
    public ResponseEntity<SkillsContentService.ItemPage> items(
            @RequestParam(required = false) String type, @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "20") int limit, @RequestParam(required = false) String after) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(content.items(type, q, limit, after));
    }

    @GetMapping("/items/{itemId}")
    public ResponseEntity<SkillsContentService.Item> item(@PathVariable String itemId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(content.item(itemId));
    }

    @GetMapping("/kanji/{itemId}")
    public ResponseEntity<SkillsContentService.KanjiDetail> kanjiDetail(@PathVariable String itemId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(content.kanjiDetail(itemId));
    }

    @GetMapping(value="/kanji/{itemId}/stroke-asset", produces="application/json")
    public ResponseEntity<byte[]> strokeAsset(@PathVariable String itemId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Type", "application/json")
                .body(strokeAssets.delivery(itemId));
    }

    @GetMapping("/flashcards")
    public ResponseEntity<SkillsContentService.FlashcardPage> flashcards(
            @RequestParam(required = false) String type, @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String after) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(content.flashcards(type, limit, after));
    }
}
