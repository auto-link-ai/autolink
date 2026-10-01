import Link from 'next/link';
import { StickerIcon } from '@/components/site/icons';
import { buttonClasses } from '@/components/ui/Button';

/**
 * Shown when someone scanned a sticker nobody has linked yet and arrives here
 * signed out. Almost all of them are new, so on the sign-in page the main
 * action becomes creating an account; on both pages it says the sticker is
 * linked as soon as they are in.
 */
export function ClaimWelcome({
  tagId,
  title,
  body,
  cta,
}: {
  tagId: string;
  title: string;
  body: string;
  /** Sign-in page only: the button that sends them to create an account instead. */
  cta?: { label: string; href: string; secondary: string };
}) {
  return (
    <div className="mb-6 rounded-xl bg-surface-3 p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-accent">
          <StickerIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[17px] font-bold text-text">{title}</p>
          <p dir="ltr" className="mt-1 font-mono text-sm font-bold text-accent">
            {tagId}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{body}</p>
        </div>
      </div>
      {cta && (
        <>
          <Link href={cta.href} className={buttonClasses('primary', 'md', 'mt-5 w-full')}>
            {cta.label}
          </Link>
          <p className="mt-3 text-center text-sm text-text-muted">{cta.secondary}</p>
        </>
      )}
    </div>
  );
}
