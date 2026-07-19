const VARIANTS = {
  primary:
    'bg-gradient-to-b from-rogue to-rogue-dk text-batter-lt shadow-cta hover:brightness-110 hover:-translate-y-0.5',
  secondary:
    'border border-olive-mute bg-cream text-ink-deep hover:border-rogue hover:text-rogue',
  danger:
    'border border-wine/40 bg-wine/5 text-wine hover:bg-wine/10 hover:border-wine',
  ghost: 'text-caramel hover:bg-olive-mute/25',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  loading,
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:brightness-100 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
