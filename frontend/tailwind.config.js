/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { deep: 'var(--ink-deep)' },
        cocoa: 'var(--cocoa)',
        rogue: { DEFAULT: 'var(--rogue)', dk: 'var(--rogue-dk)' },
        caramel: 'var(--caramel)',
        olive: { DEFAULT: 'var(--olive)', mute: 'var(--olive-mute)' },
        batter: {
          DEFAULT: 'var(--batter)',
          lt: 'var(--batter-lt)',
          warm: 'var(--batter-warm)',
        },
        wine: 'var(--wine)',
        cream: 'var(--cream)',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
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
