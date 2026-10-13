import { getTranslations } from 'next-intl/server';
import { CategoryIcon, PhoneIcon, WhatsAppIcon } from '@/components/site/icons';
import { Button, buttonClasses } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import type { MessageDTO } from '@/lib/db/repositories/messages';
import { formatAge } from '@/lib/format/date';
import { whatsappLink } from '@/lib/site/whatsapp';
import { findDzPhone } from '@/lib/validation/phone';
import { setMessageStatusAction } from '../actions';

/**
 * The first thing on the owner's screen: what people who scanned their
 * stickers wrote. Unread first (the repository orders them), the car each one
 * is about, and — when the sender left an Algerian number — one tap to call
 * them back or answer on WhatsApp.
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
        <div className="rounded-xl bg-white p-6 shadow-card-sm">
          <p className="text-[17px] font-bold text-text">{t('emptyTitle')}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-text-secondary">{t('empty')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {messages.map((message) => {
            const callBack = message.scannerContact ? findDzPhone(message.scannerContact) : null;
            const answer = callBack ? whatsappLink(callBack, t('whatsappText')) : null;
            return (
              <li
                key={message.publicId}
                className={cx(
                  'rounded-xl bg-white p-5 shadow-card-sm',
                  message.status === 'UNREAD' && 'border-s-4 border-accent',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cx(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                      message.status === 'UNREAD' ? 'bg-accent-soft text-accent' : 'bg-surface-3 text-text-muted',
                    )}
                  >
                    <CategoryIcon category={message.category} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h3 className="text-[16px] font-bold text-text">{tCategories(message.category)}</h3>
                      <span className="text-sm text-text-muted">{formatAge(message.createdAt, locale)}</span>
                    </div>
                    <p className="text-sm font-semibold text-text-secondary">{message.vehicleLabel ?? t('yourCar')}</p>
                  </div>
                </div>

                {/* A one-tap report has no words: the category above is the message. Written in its
                    own language: `dir="auto"` keeps French punctuation right on an Arabic screen. */}
                {message.body && (
                  <p dir="auto" className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-text">
                    {message.body}
                  </p>
                )}

                {message.scannerContact ? (
                  <p className="mt-3 text-sm text-text-secondary">
                    {t('contact')} <span dir="ltr" className="font-bold text-text">{message.scannerContact}</span>
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-text-muted">{t('noContact')}</p>
                )}

                {callBack && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={`tel:${callBack}`} className={buttonClasses('primary', 'sm', 'gap-2')}>
                      <PhoneIcon className="h-4 w-4" />
                      {t('call')}
                    </a>
                    {answer && (
                      <a href={answer} target="_blank" rel="noopener" className={buttonClasses('secondary', 'sm', 'gap-2')}>
                        <WhatsAppIcon className="h-4 w-4" />
                        {t('whatsapp')}
                      </a>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <span dir="ltr" className="font-mono text-xs text-text-muted">
                    {message.publicTagId}
                  </span>
                  <form action={setMessageStatusAction} className="flex flex-wrap gap-2">
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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
