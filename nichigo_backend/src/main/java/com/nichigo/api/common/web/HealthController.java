package com.nichigo.api.common.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Application-level health check endpoint.
 *
 * GET /api/v1/health -> {"status":"UP","service":"nichigo-api"}
 *
 * This is intentionally simple for JPN-001. A richer health response
 * (DB, dependencies) will be wired in JPN-002 via Spring Actuator.
 */
@RestController
@RequestMapping("/api/v1")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "nichigo-api"
        ));
    }
}