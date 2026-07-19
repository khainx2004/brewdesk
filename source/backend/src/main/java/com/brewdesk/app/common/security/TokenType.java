package com.brewdesk.app.common.security;

/** Phân biệt 2 loại token để refresh token không dùng thay được access token. */
public enum TokenType {
    ACCESS,
    REFRESH
}
