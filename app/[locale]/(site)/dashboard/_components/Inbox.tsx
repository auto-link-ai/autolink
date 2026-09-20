import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import type { MessageDTO } from '@/lib/db/repositories/messages';
import { formatAge } from '@/lib/format/date';
import { setMessageStatusAction } from '../actions';

/**
 * What someone who scanned the sticker wrote. Unread first, and the sender's
 * contact only if they chose to leave one.
 */
export async function Inbox({ messages, locale }: { messages: MessageDTO[]; locale: Locale }) {
  const t = await getTranslations('dashboard.inbox');
  const tCategories = await getTranslations('scanner.categories');
  const unread = messages.filter((message) => message.status === 'UNREAD').length;

  return (
    <section aria-labelledby="inbox" className="mb-10">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 id="inbox" className="text-h3 text-text">
          {t('title')}
        </h2>
        {unread > 0 && (
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-ink">
            {t('unread', { count: unread })}
          </span>
        )}
      </div>

      {messages.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-[15px] text-text-secondary shadow-card-sm">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {messages.map((message) => (
            <li
              key={message.publicId}
              className={cx(
                'rounded-xl bg-white p-5 shadow-card-sm',
                message.status === 'UNREAD' && 'border-s-4 border-accent',
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[15px] font-bold text-text">{tCategories(message.category)}</h3>
                <span className="text-sm text-text-muted">{formatAge(message.createdAt, locale)}</span>
              </div>

              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-text">{message.body}</p>

              <p className="mt-3 text-sm text-text-secondary">
                {message.scannerContact ? (
                  <>
                    {t('contact')} <span dir="ltr" className="font-bold text-text">{message.scannerContact}</span>
                  </>
                ) : (
                  t('noContact')
                )}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {t('from', { tagId: message.publicTagId })}
                {message.vehicleLabel ? ` · ${message.vehicleLabel}` : ''}
              </p>

              <form action={setMessageStatusAction} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="publicId" value={message.publicId} />
                {message.status === 'UNREAD' && (
                  <Button type="submit" name="status" value="READ" variant="secondary" size="sm">
                    {t('markRead')}
                  </Button>
                )}
                <Button type="submit" name="status" value="ARCHIVED" variant="ghost" size="sm">
                  {t('archive')}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
