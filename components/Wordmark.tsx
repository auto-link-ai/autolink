import { cx } from '@/lib/cx';

/**
 * AutoLink wordmark: the folded-ribbon "A" holding a link, then the name —
 * "Auto" in the surrounding ink colour, "Link" in orange. The link keeps a
 * thin orange edge so it reads on the cream page as well as on dark bands.
 * Always rendered left-to-right (it is a brand name), including in Arabic.
 */
export function Wordmark({ className = '', inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span
      dir="ltr"
      className={cx(
        'inline-flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight',
        inverse ? 'text-text-on-inverse' : 'text-text',
        className,
      )}
    >
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="al-ribbon" x1="0.1" y1="1" x2="0.85" y2="0">
            <stop offset="0%" stopColor="#f4c49f" />
            <stop offset="50%" stopColor="#f3a06a" />
            <stop offset="100%" stopColor="#ee7534" />
          </linearGradient>
        </defs>

        {/* Left ribbon of the A, lit from the bottom */}
        <path d="M13 52 L30 16" fill="none" stroke="url(#al-ribbon)" strokeWidth="8.5" strokeLinecap="round" />
        {/* Right ribbon, solid orange */}
        <path d="M34 16 L51 52" fill="none" stroke="var(--orange)" strokeWidth="8.5" strokeLinecap="round" />
        {/* The fold at the apex, where one ribbon turns into the other */}
        <path d="M27 21 Q32 9 37 21 L34 25 Q32 18.5 30 25 Z" fill="#d9481a" />

        {/* The link in the counter: orange edge, cream body, orange hook */}
        <g transform="rotate(-8 32 42)">
          <rect x="25" y="31" width="14" height="22" rx="7" fill="none" stroke="var(--orange)" strokeWidth="6.5" />
          <rect x="25" y="31" width="14" height="22" rx="7" fill="none" stroke="#fdf3ea" strokeWidth="4" />
          <path d="M32 37.5 L32 46.5" fill="none" stroke="var(--orange)" strokeWidth="3.4" strokeLinecap="round" />
        </g>
      </svg>
      <span>
        Auto<span className="text-accent">Link</span>
      </span>
    </span>
  );
}
