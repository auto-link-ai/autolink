import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/locales';
import type { CarBookDTO } from '@/lib/db/repositories/carBook';
import { CARE_FIELD_LIMITS as L } from '@/lib/domain/constants';
import { toDayInput } from '@/lib/validation/carCare';
import { CareForm } from './CareForm';
import { BookCard, CareField, careFormLabels, FieldGrid, INPUT } from './parts';

type Props = { book: CarBookDTO; locale: Locale };

function DayInput({ id, name, value }: { id: string; name: string; value: Date | null }) {
  return <input id={id} name={name} type="date" defaultValue={toDayInput(value)} className={INPUT} />;
}

/** Insurance: who, which policy, and when it runs out. */
export async function InsuranceSection({ book, locale }: Props) {
  const t = await getTranslations('care.insurance');
  const fields = {
    company: t('company'),
    policyNumber: t('policyNumber'),
    startDate: t('startDate'),
    expiryDate: t('expiryDate'),
  };
  const value = book.insurance;

  return (
    <BookCard id="insurance" title={t('title')}>
      <CareForm locale={locale} tagId={book.publicTagId} section="insurance" labels={await careFormLabels('save', fields)}>
        <FieldGrid>
          <CareField id="insurance-company" label={fields.company}>
            <input id="insurance-company" name="company" maxLength={L.company} defaultValue={value.company ?? ''} className={INPUT} />
          </CareField>
          <CareField id="insurance-policy" label={fields.policyNumber}>
            <input
              id="insurance-policy"
              name="policyNumber"
              dir="ltr"
              maxLength={L.policyNumber}
              defaultValue={value.policyNumber ?? ''}
              className={INPUT}
            />
          </CareField>
          <CareField id="insurance-start" label={fields.startDate}>
            <DayInput id="insurance-start" name="startDate" value={value.startDate} />
          </CareField>
          <CareField id="insurance-expiry" label={fields.expiryDate}>
            <DayInput id="insurance-expiry" name="expiryDate" value={value.expiryDate} />
          </CareField>
        </FieldGrid>
      </CareForm>
    </BookCard>
  );
}

/** Contrôle technique: the last one and when the next is due. */
export async function InspectionSection({ book, locale }: Props) {
  const t = await getTranslations('care.inspection');
  const fields = { lastDate: t('lastDate'), nextDueDate: t('nextDueDate'), centre: t('centre') };
  const value = book.inspection;

  return (
    <BookCard id="inspection" title={t('title')}>
      <CareForm locale={locale} tagId={book.publicTagId} section="inspection" labels={await careFormLabels('save', fields)}>
        <FieldGrid>
          <CareField id="inspection-last" label={fields.lastDate}>
            <DayInput id="inspection-last" name="lastDate" value={value.lastDate} />
          </CareField>
          <CareField id="inspection-next" label={fields.nextDueDate}>
            <DayInput id="inspection-next" name="nextDueDate" value={value.nextDueDate} />
          </CareField>
          <CareField id="inspection-centre" label={fields.centre} wide>
            <input id="inspection-centre" name="centre" maxLength={L.centre} defaultValue={value.centre ?? ''} className={INPUT} />
          </CareField>
        </FieldGrid>
      </CareForm>
    </BookCard>
  );
}

/** Vignette: the yearly car tax. */
export async function VignetteSection({ book, locale }: Props) {
  const t = await getTranslations('care.vignette');
  const fields = { paidDate: t('paidDate'), nextDueDate: t('nextDueDate') };
  const value = book.vignette;

  return (
    <BookCard id="vignette" title={t('title')}>
      <CareForm locale={locale} tagId={book.publicTagId} section="vignette" labels={await careFormLabels('save', fields)}>
        <FieldGrid>
          <CareField id="vignette-paid" label={fields.paidDate}>
            <DayInput id="vignette-paid" name="paidDate" value={value.paidDate} />
          </CareField>
          <CareField id="vignette-next" label={fields.nextDueDate}>
            <DayInput id="vignette-next" name="nextDueDate" value={value.nextDueDate} />
          </CareField>
        </FieldGrid>
      </CareForm>
    </BookCard>
  );
}
