package com.brewdesk.app.common.security;

import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.staff.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    /** Đường dẫn vẫn dùng được khi tài khoản đang bị buộc đổi mật khẩu. */
    private static final Set<String> ALLOWED_WHILE_MUST_CHANGE_PASSWORD =
            Set.of("/api/v1/auth/change-password", "/api/v1/auth/refresh");

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final SecurityResponseWriter responseWriter;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(BEARER_PREFIX.length()).trim();
        UserPrincipal principal;
        try {
            UUID userId = jwtService.parseUserId(token, TokenType.ACCESS);
            // Đọc lại từ DB thay vì tin claim trong token, để tài khoản vừa bị
            // vô hiệu hoá hoặc vừa đổi mật khẩu có hiệu lực ngay.
            principal =
                    userRepository
                            .findById(userId)
                            .map(UserPrincipal::new)
                            .orElseThrow(() -> new AppException(ErrorCode.TOKEN_INVALID));
        } catch (AppException ex) {
            SecurityContextHolder.clearContext();
            responseWriter.write(response, ex.getErrorCode(), ex.getMessage());
            return;
        }

        if (!principal.isActive()) {
            SecurityContextHolder.clearContext();
            responseWriter.write(response, ErrorCode.ACCOUNT_DISABLED);
            return;
        }

        if (principal.isMustChangePassword()
                && !ALLOWED_WHILE_MUST_CHANGE_PASSWORD.contains(request.getRequestURI())) {
            SecurityContextHolder.clearContext();
            responseWriter.write(response, ErrorCode.MUST_CHANGE_PASSWORD);
            return;
        }

        var authentication =
                new UsernamePasswordAuthenticationToken(
                        principal, null, principal.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }
}
