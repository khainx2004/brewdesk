package com.brewdesk.app.auth.dto;

public record TokenResponse(
        String accessToken, String refreshToken, long expiresIn, UserResponse user) {}
