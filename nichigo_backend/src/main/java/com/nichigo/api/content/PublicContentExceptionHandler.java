package com.nichigo.api.content;

import com.nichigo.api.common.web.ApiError;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = PublicContentController.class)
public class PublicContentExceptionHandler {
    @ExceptionHandler(ContentNotFoundException.class)
    ResponseEntity<ApiError> notFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiError("content_not_found", "Published content was not found."));
    }

    @ExceptionHandler(InvalidContentQueryException.class)
    ResponseEntity<ApiError> invalidQuery(InvalidContentQueryException exception) {
        return ResponseEntity.badRequest().body(new ApiError("invalid_content_query", exception.getMessage()));
    }

    @ExceptionHandler({DataAccessException.class, IllegalStateException.class})
    ResponseEntity<ApiError> unavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ApiError("content_unavailable", "Published content is temporarily unavailable."));
    }
}
