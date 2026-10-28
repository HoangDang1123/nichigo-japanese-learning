package com.nichigo.api.auth.dto;

public record CsrfResponse(String headerName, String token) {
}
