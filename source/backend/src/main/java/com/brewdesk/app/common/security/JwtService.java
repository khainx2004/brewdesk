package com.brewdesk.app.common.security;

import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.staff.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final String CLAIM_TYPE = "type";
    private static final String CLAIM_USERNAME = "username";
    private static final String CLAIM_ROLE = "role";

    private final SecretKey key;
    private final JwtProperties properties;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String issueAccessToken(User user) {
        return issue(user, TokenType.ACCESS, properties.accessTokenTtl().toSeconds());
    }

    public String issueRefreshToken(User user) {
        return issue(user, TokenType.REFRESH, properties.refreshTokenTtl().toSeconds());
    }

    public long accessTokenTtlSeconds() {
        return properties.accessTokenTtl().toSeconds();
    }

    private String issue(User user, TokenType type, long ttlSeconds) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim(CLAIM_TYPE, type.name())
                .claim(CLAIM_USERNAME, user.getUsername())
                .claim(CLAIM_ROLE, user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ttlSeconds)))
                .signWith(key)
                .compact();
    }

    /**
     * Đọc và kiểm tra chữ ký token, đồng thời bắt buộc đúng loại token mong đợi.
     *
     * @throws AppException TOKEN_EXPIRED hoặc TOKEN_INVALID
     */
    public UUID parseUserId(String token, TokenType expectedType) {
        Claims claims = parseClaims(token);
        String type = claims.get(CLAIM_TYPE, String.class);
        if (!expectedType.name().equals(type)) {
            throw new AppException(ErrorCode.TOKEN_INVALID);
        }
        try {
            return UUID.fromString(claims.getSubject());
        } catch (IllegalArgumentException ex) {
            throw new AppException(ErrorCode.TOKEN_INVALID);
        }
    }

    private Claims parseClaims(String token) {
        try {
            return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        } catch (ExpiredJwtException ex) {
            throw new AppException(ErrorCode.TOKEN_EXPIRED);
        } catch (JwtException | IllegalArgumentException ex) {
            throw new AppException(ErrorCode.TOKEN_INVALID);
        }
    }
}
