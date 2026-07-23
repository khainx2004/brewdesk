/** @type {import('tailwindcss').Config} */

/**
 * Bọc một biến màu để Tailwind chèn được độ mờ (`text-olive/45`, `bg-wine/8`...).
 *
 * Màu khai trần bằng `var(--x)` khiến Tailwind KHÔNG tách được kênh màu, nên nó
 * bỏ luôn không sinh ra class opacity — mọi `/45`, `/8`... thành class rỗng, rơi
 * về màu thừa kế. `color-mix` trộn màu với `transparent` theo đúng tỉ lệ alpha
 * mà Tailwind truyền vào qua `<alpha-value>` (1 khi không có bộ chỉnh), và vẫn
 * giữ `--x` là hex nên chỗ nào dùng `var(--x)` trực tiếp (index.css, style inline)
 * không bị đụng.
 */
const alpha = (varName) =>
  `color-mix(in srgb, var(${varName}) calc(<alpha-value> * 100%), transparent)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { deep: alpha('--ink-deep') },
        cocoa: { DEFAULT: alpha('--cocoa'), lt: alpha('--cocoa-lt') },
        rogue: { DEFAULT: alpha('--rogue'), dk: alpha('--rogue-dk') },
        caramel: alpha('--caramel'),
        olive: { DEFAULT: alpha('--olive'), mute: alpha('--olive-mute') },
        batter: {
          DEFAULT: alpha('--batter'),
          lt: alpha('--batter-lt'),
          warm: alpha('--batter-warm'),
        },
        wine: alpha('--wine'),
        cream: alpha('--cream'),
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: 'var(--r)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      boxShadow: {
        // Card 2.5D: 2 lớp shadow
        card: '0 1px 2px rgba(28,21,16,0.08), 0 8px 24px -6px rgba(28,21,16,0.18)',
        'card-hover': '0 2px 4px rgba(28,21,16,0.10), 0 16px 32px -8px rgba(28,21,16,0.24)',
        cta: '0 4px 14px -2px rgba(58,61,46,0.45)',
      },
      screens: {
        // Chỉ hỗ trợ mobile và desktop, bỏ qua tablet.
        sm: '360px',
        lg: '1180px',
      },
    },
  },
  plugins: [],
};
