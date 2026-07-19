import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, hint, className = '', ...props },
  ref,
) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold text-rogue">{label}</span>
      )}
      <input
        ref={ref}
        className={`h-10 w-full rounded-lg border bg-batter-lt px-3 text-sm text-ink-deep outline-none transition placeholder:text-olive/70 focus:border-rogue focus:bg-cream focus:ring-[3px] focus:ring-rogue/15 disabled:opacity-60 ${
          error ? 'border-wine ring-[3px] ring-wine/10' : 'border-olive-mute'
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1.5 block text-xs text-wine">{error}</span>}
      {!error && hint && <span className="mt-1.5 block text-xs text-olive">{hint}</span>}
    </label>
  );
});

export default Input;
