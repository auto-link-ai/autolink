import type { ReactNode } from 'react';

/**
 * One part of the order form: « 1 كم ملصقًا تحتاج؟ », then its fields. Without
 * a number (the ad page's form has a single part), just the title.
 */
export function FormPart({ number, title, children }: { number?: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4">
      <legend className="mb-4 flex items-center gap-3 text-[18px] font-bold text-text">
        {number !== undefined && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm text-white">
            {number}
          </span>
        )}
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
