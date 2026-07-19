package com.brewdesk.app.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(
        @NotBlank(message = "Thiếu refresh token") String refreshToken) {}
