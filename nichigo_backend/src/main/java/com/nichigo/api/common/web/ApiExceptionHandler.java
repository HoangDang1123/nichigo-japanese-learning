package com.nichigo.api.common.web;

import com.nichigo.api.auth.DuplicateEmailException;
import com.nichigo.api.auth.InvalidRegistrationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(DuplicateEmailException.class)
    ResponseEntity<ApiError> duplicateEmail() {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiError("email_already_registered", "An account with this email already exists."));
    }

    @ExceptionHandler(BadCredentialsException.class)
    ResponseEntity<ApiError> badCredentials() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiError("invalid_credentials", "Invalid email or password."));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, InvalidRegistrationException.class})
    ResponseEntity<ApiError> invalidRequest(Exception exception) {
        String message = exception instanceof InvalidRegistrationException
                ? exception.getMessage() : "Request data is invalid.";
        return ResponseEntity.badRequest().body(new ApiError("invalid_request", message));
    }
}
