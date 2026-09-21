import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { CARE_ERROR_CODES } from '../careState';
import type { CareFormLabels } from './CareForm';

/** Same field look as the rest of the customer area. */
export const INPUT =
  'h-11 w-full rounded-2xl border border-border bg-white px-3 text-[15px] text-text outline-none focus:border-accent';

/** One card of the car book; `id` doubles as the anchor. */
export function BookCard({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-xl bg-white p-6 shadow-card-sm">
      <h2 id={`${id}-title`} className="mb-4 text-h3 text-text">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CareField({
  id,
  label,
  hint,
  wide = false,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', wide && 'sm:col-span-2')}>
      <label htmlFor={id} className="text-sm font-bold text-text">
        {label}
      </label>
      {children}
      {hint && <span className="text-sm text-text-muted">{hint}</span>}
    </div>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

/** Button, result and error words for a car book form. */
export async function careFormLabels(mode: 'save' | 'add', fields: Record<string, string>): Promise<CareFormLabels> {
  const t = await getTranslations('care');
  return {
    submit: mode === 'save' ? t('save') : t('add'),
    working: mode === 'save' ? t('saving') : t('adding'),
    done: mode === 'save' ? t('saved') : t('added'),
    checkFields: t('checkFields'),
    fields,
    errors: Object.fromEntries(CARE_ERROR_CODES.map((code) => [code, t(`errors.${code}`)])),
  };
}
