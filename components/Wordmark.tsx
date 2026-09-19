import { cx } from '@/lib/cx';

/**
 * AutoLink wordmark: the ribbon "A" monogram with the link loop inside, then
 * the name — "Auto" in the surrounding ink colour, "Link" in orange.
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
      <svg viewBox="0 0 48 48" className="h-9 w-9 shrink-0" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="al-mark" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#f7d3b8" />
            <stop offset="55%" stopColor="#f6a06a" />
            <stop offset="100%" stopColor="#f2541b" />
          </linearGradient>
        </defs>
        {/* Left ribbon of the A */}
        <path
          d="M9 40 L23 9"
          fill="none"
          stroke="url(#al-mark)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Right ribbon of the A */}
        <path d="M25 9 L39 40" fill="none" stroke="var(--orange)" strokeWidth="7" strokeLinecap="round" />
        {/* The link loop sitting inside the counter */}
        <rect
          x="18.5"
          y="21"
          width="11"
          height="20"
          rx="5.5"
          fill="none"
          stroke="#fdf7f3"
          strokeWidth="4"
        />
        <path d="M24 27 L24 33" stroke="var(--orange)" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span>
        Auto<span className="text-accent">Link</span>
      </span>
    </span>
  );
}
