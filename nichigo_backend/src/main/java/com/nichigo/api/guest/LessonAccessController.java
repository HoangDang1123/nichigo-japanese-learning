package com.nichigo.api.guest;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class LessonAccessController {
    private final LessonAccessService access;
    public LessonAccessController(LessonAccessService access) { this.access = access; }

    @GetMapping("/lessons/{slug}/access")
    public ResponseEntity<LessonAccessService.LessonAccess> access(@PathVariable String slug, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(access.access(access.independent(slug), request));
    }

    @PostMapping("/lessons/{slug}/unlock")
    public ResponseEntity<LessonAccessService.LessonUnlockResult> unlock(@PathVariable String slug, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(access.unlockIndependent(slug, request));
    }

    @GetMapping("/learning-paths/{pathSlug}/placements/{placementId}/lesson/access")
    public ResponseEntity<LessonAccessService.LessonAccess> placementAccess(@PathVariable String pathSlug,
            @PathVariable String placementId, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(access.access(access.placement(pathSlug, placementId), request));
    }

    @PostMapping("/learning-paths/{pathSlug}/placements/{placementId}/lesson/unlock")
    public ResponseEntity<LessonAccessService.LessonUnlockResult> placementUnlock(@PathVariable String pathSlug,
            @PathVariable String placementId, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(access.unlockPlacement(pathSlug, placementId, request));
    }
}
