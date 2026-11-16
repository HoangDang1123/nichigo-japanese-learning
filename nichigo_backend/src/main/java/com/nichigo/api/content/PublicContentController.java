package com.nichigo.api.content;

import com.nichigo.api.content.dto.PublicContentDtos;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PublicContentController {
    private final PublicContentService content;

    public PublicContentController(PublicContentService content) { this.content = content; }

    @GetMapping("/learning-paths")
    public ResponseEntity<PublicContentDtos.PathList> paths(@RequestParam(defaultValue = "20") int limit,
                                            @RequestParam(required = false) String after) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(content.paths(limit, after));
    }

    @GetMapping("/learning-paths/{slug}")
    public ResponseEntity<PublicContentDtos.Path> path(@PathVariable String slug) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(content.path(slug));
    }

    @GetMapping("/learning-paths/{pathSlug}/placements/{placementId}/lesson")
    public ResponseEntity<PublicContentDtos.Lesson> lessonAtPlacement(@PathVariable String pathSlug,
            @PathVariable String placementId, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(content.lessonAtPlacement(pathSlug, placementId, request));
    }

    @GetMapping("/lessons/{slug}")
    public ResponseEntity<PublicContentDtos.Lesson> lesson(@PathVariable String slug, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(content.lesson(slug, request));
    }

    @GetMapping("/skills/{type}/items")
    public ResponseEntity<PublicContentDtos.SkillItems> skills(@PathVariable String type,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String after) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(content.skills(type, limit, after));
    }
}
