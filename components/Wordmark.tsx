import { cx } from '@/lib/cx';

/**
 * AutoLink wordmark: an orange disc holding the tag glyph, plus the name.
 * Always rendered left-to-right (it is a brand name), including on Arabic pages.
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
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
        <circle cx="20" cy="20" r="20" fill="var(--orange)" />
        <rect x="10" y="17.5" width="5" height="5" rx="1.2" fill="var(--white)" />
        <rect x="17.5" y="17.5" width="5" height="5" rx="1.2" fill="var(--white)" />
        <rect x="25" y="16" width="6" height="8" rx="3" fill="var(--white)" />
      </svg>
      <span>AutoLink</span>
    </span>
  );
}
