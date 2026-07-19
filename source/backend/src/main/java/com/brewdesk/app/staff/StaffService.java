package com.brewdesk.app.staff;

import com.brewdesk.app.auth.dto.UserResponse;
import com.brewdesk.app.common.audit.Auditable;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.staff.dto.CreateStaffRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StaffService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    @Auditable(action = "CREATE_STAFF", entityType = "users")
    public UserResponse create(CreateStaffRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new AppException(ErrorCode.USERNAME_EXISTS);
        }

        User user =
                User.builder()
                        .username(request.username())
                        .passwordHash(passwordEncoder.encode(request.initialPassword()))
                        .fullName(request.fullName())
                        .role(request.role())
                        .active(true)
                        // Nhân viên phải tự đặt lại mật khẩu ở lần đăng nhập đầu,
                        // admin không biết mật khẩu thật của họ.
                        .mustChangePassword(true)
                        .build();

        return UserResponse.from(userRepository.save(user));
    }
}
