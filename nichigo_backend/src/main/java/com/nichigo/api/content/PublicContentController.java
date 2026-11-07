package com.nichigo.api.content;

import com.nichigo.api.content.dto.PublicContentDtos;
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
    public PublicContentDtos.PathList paths(@RequestParam(defaultValue = "20") int limit,
                                            @RequestParam(required = false) String after) {
        return content.paths(limit, after);
    }

    @GetMapping("/learning-paths/{slug}")
    public PublicContentDtos.Path path(@PathVariable String slug) { return content.path(slug); }

    @GetMapping("/learning-paths/{pathSlug}/placements/{placementId}/lesson")
    public PublicContentDtos.Lesson lessonAtPlacement(@PathVariable String pathSlug,
                                                       @PathVariable String placementId) {
        return content.lessonAtPlacement(pathSlug, placementId);
    }

    @GetMapping("/lessons/{slug}")
    public PublicContentDtos.Lesson lesson(@PathVariable String slug) { return content.lesson(slug); }

    @GetMapping("/skills/{type}/items")
    public PublicContentDtos.SkillItems skills(@PathVariable String type,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String after) {
        return content.skills(type, limit, after);
    }
}
