import { Component } from 'react';

/**
 * Bắt lỗi render của cả một nhánh màn hình và hiện thông báo thay vì để React
 * gỡ sạch cây component (màn trắng). Không có nó thì một lỗi ở một màn làm hỏng
 * toàn app, và lỗi "nháy phát rồi mất" không đọc được.
 *
 * Class component vì React chỉ cho bắt lỗi qua componentDidCatch /
 * getDerivedStateFromError, chưa có hook tương đương.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Vẫn log ra console để có stack đầy đủ khi cần đào sâu.
    console.error('Lỗi màn hình:', error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="max-w-lg rounded-2xl border border-wine/30 bg-wine/5 p-6 text-center">
          <h1 className="font-display text-xl italic text-wine">Màn hình gặp lỗi</h1>
          <p className="mt-2 text-[13px] text-ink-deep">
            Có lỗi khi hiển thị màn này. Bấm "Thử lại" để tải lại, hoặc chụp đoạn
            chữ đỏ bên dưới gửi cho người phụ trách.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-ink-deep/90 px-3 py-2.5 text-left text-[11.5px] text-batter-warm">
            {String(error?.message || error)}
          </pre>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-4 rounded-lg bg-rogue px-4 py-2 text-sm font-medium text-batter-lt transition hover:brightness-110"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }
}
