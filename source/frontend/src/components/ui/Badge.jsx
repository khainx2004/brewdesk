const TONES = {
  active: 'border-rogue/30 bg-rogue/10 text-rogue',
  muted: 'border-olive-mute bg-batter-warm/60 text-olive',
  warn: 'border-wine/30 bg-wine/8 text-wine',
};

export default function Badge({ tone = 'muted', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
