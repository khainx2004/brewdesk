# doc/ — Tài liệu dự án

Thư mục này giữ trạng thái và ngữ cảnh của dự án để AI (và người) không phải suy
luận lại từ mã nguồn mỗi lần bắt đầu làm việc.

| File | Nội dung |
|---|---|
| `0.backend-phase.md` | Các phase backend, phase nào xong, phase nào đang làm |
| `1.frontend-phase.md` | Các phase frontend, tương tự |
| `2.moi-truong.md` | Cách dựng môi trường chạy, những cạm bẫy đã gặp |

## Quy ước

- **Bắt đầu phiên làm việc:** đọc file phase tương ứng trước khi động vào code.
- **Kết thúc một phase:** cập nhật lại file phase ngay, đừng để trạng thái lệch
  với thực tế — file này sai còn tệ hơn không có.
- Chỉ ghi việc **đã kiểm chứng thật** (chạy được, test qua) vào cột đã xong.
  Viết xong code mà chưa chạy thì vẫn tính là đang làm dở.
- Tài liệu đặc tả nghiệp vụ nằm ở `CLAUDE.md` ngoài thư mục gốc, không lặp lại
  ở đây.
