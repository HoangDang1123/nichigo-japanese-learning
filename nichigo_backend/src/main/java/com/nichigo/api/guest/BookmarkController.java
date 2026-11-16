package com.nichigo.api.guest;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/skills/bookmarks")
public class BookmarkController {
    private final BookmarkService bookmarks;
    public BookmarkController(BookmarkService bookmarks) { this.bookmarks = bookmarks; }

    @PutMapping("/{itemId}")
    public ResponseEntity<BookmarkService.BookmarkMutation> save(@PathVariable String itemId, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(bookmarks.save(itemId, request));
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<BookmarkService.BookmarkMutation> remove(@PathVariable String itemId, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(bookmarks.remove(itemId, request));
    }

    @GetMapping("/{itemId}")
    public ResponseEntity<BookmarkService.BookmarkStatus> status(@PathVariable String itemId,
            HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(bookmarks.status(itemId, request));
    }

    @GetMapping("/summary")
    public ResponseEntity<BookmarkService.BookmarkSummary> summary(HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(bookmarks.summary(request));
    }

    @GetMapping
    public ResponseEntity<BookmarkService.SavedPage> page(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String after, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(bookmarks.page(limit, after, request));
    }
}
