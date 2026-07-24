package com.brewdesk.app.staff;

import com.brewdesk.app.auth.dto.UserResponse;
import com.brewdesk.app.common.audit.Auditable;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.common.security.CurrentUser;
import com.brewdesk.app.staff.dto.CreateStaffRequest;
import com.brewdesk.app.staff.dto.ResetStaffPasswordRequest;
import com.brewdesk.app.staff.dto.UpdateStaffRequest;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StaffService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Danh sách nhân viên đang làm việc, để màn Checklist cho ADMIN ghi nhận
     * đúng người đã làm thay vì luôn ghi tên chính mình.
     *
     * <p>Chỉ trả tài khoản còn hoạt động: người đã nghỉ không nên xuất hiện
     * trong ô chọn của việc hôm nay.
     */
    @Transactional(readOnly = true)
    public List<UserResponse> listActive() {
        return userRepository.findByActiveTrueOrderByFullNameAsc().stream()
                .map(UserResponse::from)
                .toList();
    }

    /**
     * Danh sách cho màn Quản lý nhân viên. {@code includeInactive = true} kèm cả
     * người đã khoá để ADMIN thấy và mở lại; mặc định chỉ người đang hoạt động.
     */
    @Transactional(readOnly = true)
    public List<UserResponse> list(boolean includeInactive) {
        List<User> users =
                includeInactive
                        ? userRepository.findAllByOrderByFullNameAsc()
                        : userRepository.findByActiveTrueOrderByFullNameAsc();
        return users.stream().map(UserResponse::from).toList();
    }

    /**
     * Khoá tài khoản (nghỉ việc). Hai chốt chặn để không tự nhốt mình ra ngoài:
     * không tự khoá chính mình, và không khoá người quản lý cuối cùng còn hoạt
     * động — nếu không sẽ chẳng còn ai vào được phần quản trị.
     */
    @Transactional
    @Auditable(action = "DEACTIVATE_STAFF", entityType = "users")
    public UserResponse deactivate(UUID id) {
        User user = require(id);
        if (id.equals(CurrentUser.require().getId())) {
            throw new AppException(ErrorCode.CANNOT_DEACTIVATE_SELF);
        }
        if (user.getRole() == Role.ADMIN && user.isActive() && lastActiveAdmin()) {
            throw new AppException(ErrorCode.LAST_ADMIN);
        }
        user.setActive(false);
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    @Auditable(action = "ACTIVATE_STAFF", entityType = "users")
    public UserResponse activate(UUID id) {
        User user = require(id);
        user.setActive(true);
        return UserResponse.from(userRepository.save(user));
    }

    /** ADMIN cấp mật khẩu tạm; nhân viên buộc đổi ở lần đăng nhập kế tiếp. */
    @Transactional
    @Auditable(action = "RESET_STAFF_PASSWORD", entityType = "users")
    public UserResponse resetPassword(UUID id, ResetStaffPasswordRequest request) {
        User user = require(id);
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(true);
        return UserResponse.from(userRepository.save(user));
    }

    /**
     * Sửa họ tên và vai trò. Không cho tự đổi vai trò của chính mình, và không
     * hạ vai trò người quản lý cuối cùng — cùng lý do chống tự nhốt như khi khoá.
     */
    @Transactional
    @Auditable(action = "UPDATE_STAFF", entityType = "users")
    public UserResponse update(UUID id, UpdateStaffRequest request) {
        User user = require(id);
        boolean demotingFromAdmin = user.getRole() == Role.ADMIN && request.role() != Role.ADMIN;
        if (demotingFromAdmin) {
            if (id.equals(CurrentUser.require().getId())) {
                throw new AppException(ErrorCode.CANNOT_CHANGE_OWN_ROLE);
            }
            if (user.isActive() && lastActiveAdmin()) {
                throw new AppException(ErrorCode.LAST_ADMIN);
            }
        }
        user.setFullName(request.fullName());
        user.setRole(request.role());
        return UserResponse.from(userRepository.save(user));
    }

    private User require(UUID id) {
        return userRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private boolean lastActiveAdmin() {
        return userRepository.countByRoleAndActiveTrue(Role.ADMIN) <= 1;
    }

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
