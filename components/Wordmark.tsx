/**
 * AutoLink wordmark: a tag glyph plus the name. Always rendered left-to-right
 * (it is a brand name), including on Arabic pages.
 */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      dir="ltr"
      className={`inline-flex items-center gap-2 text-lg font-bold tracking-tight text-text ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="6" fill="var(--navy)" />
        <rect x="6.5" y="6.5" width="4.5" height="4.5" rx="1" fill="var(--sky)" />
        <rect x="13" y="6.5" width="4.5" height="4.5" rx="1" fill="var(--white)" />
        <rect x="6.5" y="13" width="4.5" height="4.5" rx="1" fill="var(--white)" />
        <rect x="13" y="13" width="4.5" height="4.5" rx="1" fill="var(--blue)" />
      </svg>
      <span>
        Auto<span className="text-accent">Link</span>
      </span>
    </span>
  );
}
