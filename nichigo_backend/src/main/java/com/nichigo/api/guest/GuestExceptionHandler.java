package com.nichigo.api.guest;

import com.nichigo.api.common.web.ApiError;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GuestExceptionHandler {
    @ExceptionHandler(GuestException.class)
    ResponseEntity<ApiError> guestError(GuestException exception) {
        return ResponseEntity.status(exception.status())
                .body(new ApiError(exception.code(), exception.getMessage()));
    }
}
