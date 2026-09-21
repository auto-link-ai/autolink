import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/locales';
import { algiersToday } from '@/lib/care/due';
import type { CarBookDTO } from '@/lib/db/repositories/carBook';
import { CARE_FIELD_LIMITS as L } from '@/lib/domain/constants';
import { toDayInput } from '@/lib/validation/carCare';
import { CareForm } from './CareForm';
import { BookCard, CareField, careFormLabels, FieldGrid, INPUT } from './parts';
import { RecordList } from './RecordList';

type Props = { book: CarBookDTO; locale: Locale; currency: string };

function KmInput({ id, name }: { id: string; name: string }) {
  return <input id={id} name={name} type="number" inputMode="numeric" min={0} max={L.km} step={1} className={INPUT} />;
}

function CostInput({ id }: { id: string }) {
  return <input id={id} name="costDzd" type="number" inputMode="numeric" min={0} max={L.costDzd} step={1} className={INPUT} />;
}

/** Oil changes (vidange): log one, and the latest one's "next change" is what comes up. */
export async function OilSection({ book, locale, currency }: Props) {
  const t = await getTranslations('care.oil');
  const fields = {
    date: t('date'),
    km: t('km'),
    oilType: t('oilType'),
    garage: t('garage'),
    costDzd: t('cost', { currency }),
    nextDueDate: t('nextDate'),
    nextDueKm: t('nextKm'),
    note: t('note'),
  };

  return (
    <BookCard id="oil" title={t('title')}>
      <h3 className="mb-3 text-[15px] font-bold text-text">{t('add')}</h3>
      <CareForm locale={locale} tagId={book.publicTagId} section="oil" labels={await careFormLabels('add', fields)} resetOnSave>
        <FieldGrid>
          <CareField id="oil-date" label={fields.date}>
            <input id="oil-date" name="date" type="date" required defaultValue={toDayInput(algiersToday())} className={INPUT} />
          </CareField>
          <CareField id="oil-km" label={fields.km}>
            <KmInput id="oil-km" name="km" />
          </CareField>
          <CareField id="oil-type" label={fields.oilType} hint={t('oilTypeHint')}>
            <input id="oil-type" name="oilType" maxLength={L.oilType} className={INPUT} />
          </CareField>
          <CareField id="oil-garage" label={fields.garage}>
            <input id="oil-garage" name="garage" maxLength={L.garage} className={INPUT} />
          </CareField>
          <CareField id="oil-cost" label={fields.costDzd}>
            <CostInput id="oil-cost" />
          </CareField>
          <div className="hidden sm:block" />
          <CareField id="oil-next-date" label={fields.nextDueDate}>
            <input id="oil-next-date" name="nextDueDate" type="date" className={INPUT} />
          </CareField>
          <CareField id="oil-next-km" label={fields.nextDueKm}>
            <KmInput id="oil-next-km" name="nextDueKm" />
          </CareField>
          <p className="-mt-2 text-sm text-text-muted sm:col-span-2">{t('nextHint')}</p>
          <CareField id="oil-note" label={fields.note} wide>
            <input id="oil-note" name="note" maxLength={L.note} className={INPUT} />
          </CareField>
        </FieldGrid>
      </CareForm>
      <RecordList
        records={book.oilChanges}
        locale={locale}
        tagId={book.publicTagId}
        currency={currency}
        heading={t('history')}
        empty={t('empty')}
      />
    </BookCard>
  );
}

/** Any other work on the car: tyres, brakes, battery… */
export async function RepairSection({ book, locale, currency }: Props) {
  const t = await getTranslations('care.repairs');
  const fields = {
    date: t('date'),
    km: t('km'),
    work: t('work'),
    garage: t('garage'),
    costDzd: t('cost', { currency }),
    note: t('note'),
  };

  return (
    <BookCard id="repairs" title={t('title')}>
      <h3 className="mb-3 text-[15px] font-bold text-text">{t('add')}</h3>
      <CareForm locale={locale} tagId={book.publicTagId} section="repair" labels={await careFormLabels('add', fields)} resetOnSave>
        <FieldGrid>
          <CareField id="repair-work" label={fields.work} hint={t('workHint')} wide>
            <input id="repair-work" name="work" required minLength={L.work.min} maxLength={L.work.max} className={INPUT} />
          </CareField>
          <CareField id="repair-date" label={fields.date}>
            <input id="repair-date" name="date" type="date" required defaultValue={toDayInput(algiersToday())} className={INPUT} />
          </CareField>
          <CareField id="repair-km" label={fields.km}>
            <KmInput id="repair-km" name="km" />
          </CareField>
          <CareField id="repair-garage" label={fields.garage}>
            <input id="repair-garage" name="garage" maxLength={L.garage} className={INPUT} />
          </CareField>
          <CareField id="repair-cost" label={fields.costDzd}>
            <CostInput id="repair-cost" />
          </CareField>
          <CareField id="repair-note" label={fields.note} wide>
            <input id="repair-note" name="note" maxLength={L.note} className={INPUT} />
          </CareField>
        </FieldGrid>
      </CareForm>
      <RecordList
        records={book.repairs}
        locale={locale}
        tagId={book.publicTagId}
        currency={currency}
        heading={t('history')}
        empty={t('empty')}
      />
    </BookCard>
  );
}

/** Free text: anything else the owner wants to remember. */
export async function NotesSection({ book, locale }: Omit<Props, 'currency'>) {
  const t = await getTranslations('care.notes');
  const fields = { notes: t('title') };

  return (
    <BookCard id="notes" title={t('title')}>
      <CareForm locale={locale} tagId={book.publicTagId} section="notes" labels={await careFormLabels('save', fields)}>
        <CareField id="notes-text" label={t('title')} hint={t('hint')}>
          <textarea
            id="notes-text"
            name="notes"
            rows={5}
            maxLength={L.notes}
            defaultValue={book.notes ?? ''}
            className="w-full rounded-2xl border border-border bg-white p-3 text-[15px] text-text outline-none focus:border-accent"
          />
        </CareField>
      </CareForm>
    </BookCard>
  );
}
