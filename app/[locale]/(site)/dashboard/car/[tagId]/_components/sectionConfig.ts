import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/locales';
import { algiersToday, dueItem, type DueItem } from '@/lib/care/due';
import type { CareLogSection, CareSection } from '@/lib/care/sections';
import type { CarBookDTO } from '@/lib/db/repositories/carBook';
import { CAR_FUELS, CARE_FIELD_LIMITS as L, type CareDueKind } from '@/lib/domain/constants';
import { formatDay } from '@/lib/format/date';
import { toDayInput } from '@/lib/validation/carCare';
import { CARE_ERROR_CODES, type CareFormLabels, type FieldSpec } from '../careState';

export type CareDetailsSection = Exclude<CareSection, CareLogSection>;

/** One line of a read view: "Expiry date — 11 Sept 2026 · 10 days late [Overdue]". */
export interface ReadRow {
  label: string;
  value: string | null;
  due?: DueItem;
  ltr?: boolean;
  multiline?: boolean;
}

export interface DetailsConfig {
  fields: FieldSpec[];
  rows: ReadRow[];
  /** Never filled in: the page opens straight on the form. */
  empty: boolean;
}

const day = (date: Date | null, locale: Locale) => (date ? formatDay(date, locale) : null);
const text = (value: string | number | null) => (value === null ? '' : String(value));

export async function formLabels(mode: 'save' | 'add'): Promise<CareFormLabels> {
  const t = await getTranslations('care');
  return {
    submit: mode === 'save' ? t('save') : t('add'),
    working: mode === 'save' ? t('saving') : t('adding'),
    cancel: t('cancel'),
    required: t('required'),
    fixBelow: t('fixBelow'),
    errors: Object.fromEntries(CARE_ERROR_CODES.map((code) => [code, t(`errors.${code}`)])),
  };
}

export async function detailsConfig(
  section: CareDetailsSection,
  book: CarBookDTO,
  locale: Locale,
  soonDays: number,
): Promise<DetailsConfig> {
  const t = await getTranslations('care');
  const today = algiersToday();
  const due = (kind: CareDueKind, date: Date | null) => (date ? dueItem(kind, date, null, today, soonDays) : undefined);

  switch (section) {
    case 'insurance': {
      const v = book.insurance;
      return {
        empty: !v.company && !v.policyNumber && !v.startDate && !v.expiryDate,
        fields: [
          { name: 'company', kind: 'text', label: t('insurance.company'), value: text(v.company), maxLength: L.company },
          { name: 'policyNumber', kind: 'text', label: t('insurance.policyNumber'), value: text(v.policyNumber), maxLength: L.policyNumber, ltr: true },
          { name: 'startDate', kind: 'date', label: t('insurance.startDate'), value: toDayInput(v.startDate) },
          { name: 'expiryDate', kind: 'date', label: t('insurance.expiryDate'), value: toDayInput(v.expiryDate) },
        ],
        rows: [
          { label: t('insurance.expiryDate'), value: day(v.expiryDate, locale), due: due('INSURANCE', v.expiryDate) },
          { label: t('insurance.company'), value: v.company },
          { label: t('insurance.policyNumber'), value: v.policyNumber, ltr: true },
          { label: t('insurance.startDate'), value: day(v.startDate, locale) },
        ],
      };
    }
    case 'inspection': {
      const v = book.inspection;
      return {
        empty: !v.lastDate && !v.nextDueDate && !v.centre,
        fields: [
          { name: 'nextDueDate', kind: 'date', label: t('inspection.nextDueDate'), value: toDayInput(v.nextDueDate) },
          { name: 'lastDate', kind: 'date', label: t('inspection.lastDate'), value: toDayInput(v.lastDate) },
          { name: 'centre', kind: 'text', label: t('inspection.centre'), value: text(v.centre), maxLength: L.centre, wide: true },
        ],
        rows: [
          { label: t('inspection.nextDueDate'), value: day(v.nextDueDate, locale), due: due('INSPECTION', v.nextDueDate) },
          { label: t('inspection.lastDate'), value: day(v.lastDate, locale) },
          { label: t('inspection.centre'), value: v.centre },
        ],
      };
    }
    case 'vignette': {
      const v = book.vignette;
      return {
        empty: !v.paidDate && !v.nextDueDate,
        fields: [
          { name: 'nextDueDate', kind: 'date', label: t('vignette.nextDueDate'), value: toDayInput(v.nextDueDate) },
          { name: 'paidDate', kind: 'date', label: t('vignette.paidDate'), value: toDayInput(v.paidDate) },
        ],
        rows: [
          { label: t('vignette.nextDueDate'), value: day(v.nextDueDate, locale), due: due('VIGNETTE', v.nextDueDate) },
          { label: t('vignette.paidDate'), value: day(v.paidDate, locale) },
        ],
      };
    }
    case 'profile': {
      const v = book.profile;
      return {
        empty: v.year === null && !v.fuel && !v.engine && !v.vin && !v.registrationNumber,
        fields: [
          { name: 'year', kind: 'number', label: t('profile.year'), value: text(v.year), maxLength: 4 },
          {
            name: 'fuel',
            kind: 'select',
            label: t('profile.fuel'),
            value: v.fuel ?? '',
            options: [
              { value: '', label: t('profile.fuelNone') },
              ...CAR_FUELS.map((fuel) => ({ value: fuel, label: t(`profile.fuels.${fuel}`) })),
            ],
          },
          { name: 'engine', kind: 'text', label: t('profile.engine'), hint: t('profile.engineHint'), value: text(v.engine), maxLength: L.engine },
          { name: 'vin', kind: 'text', label: t('profile.vin'), value: text(v.vin), maxLength: L.vin.max + 4, ltr: true, autoCapitalize: 'characters' },
          { name: 'registrationNumber', kind: 'text', label: t('profile.registrationNumber'), value: text(v.registrationNumber), maxLength: L.registrationNumber, ltr: true },
        ],
        rows: [
          { label: t('profile.year'), value: v.year === null ? null : String(v.year) },
          { label: t('profile.fuel'), value: v.fuel ? t(`profile.fuels.${v.fuel}`) : null },
          { label: t('profile.engine'), value: v.engine },
          { label: t('profile.vin'), value: v.vin, ltr: true },
          { label: t('profile.registrationNumber'), value: v.registrationNumber, ltr: true },
        ],
      };
    }
    case 'notes':
      return {
        empty: !book.notes,
        fields: [{ name: 'notes', kind: 'textarea', label: t('notes.title'), hint: t('notes.hint'), value: text(book.notes), maxLength: L.notes }],
        rows: [{ label: t('notes.title'), value: book.notes, multiline: true }],
      };
  }
}

/** The fields to log one oil change or one repair. Dates start at today. */
export async function logFields(section: CareLogSection, currency: string): Promise<FieldSpec[]> {
  const t = await getTranslations('care');
  const today = toDayInput(algiersToday());

  if (section === 'oil') {
    return [
      { name: 'date', kind: 'date', label: t('oil.date'), value: today, required: true },
      { name: 'km', kind: 'number', label: t('oil.km'), maxLength: 12 },
      { name: 'oilType', kind: 'text', label: t('oil.oilType'), hint: t('oil.oilTypeHint'), maxLength: L.oilType },
      { name: 'garage', kind: 'text', label: t('oil.garage'), maxLength: L.garage },
      { name: 'nextDueDate', kind: 'date', label: t('oil.nextDate'), hint: t('oil.nextHint') },
      { name: 'nextDueKm', kind: 'number', label: t('oil.nextKm'), maxLength: 12 },
      { name: 'costDzd', kind: 'number', label: t('oil.cost', { currency }), maxLength: 12 },
      { name: 'note', kind: 'text', label: t('oil.note'), maxLength: L.note, wide: true },
    ];
  }
  return [
    { name: 'work', kind: 'text', label: t('repairs.work'), hint: t('repairs.workHint'), required: true, maxLength: L.work.max, wide: true },
    { name: 'date', kind: 'date', label: t('repairs.date'), value: today, required: true },
    { name: 'km', kind: 'number', label: t('repairs.km'), maxLength: 12 },
    { name: 'garage', kind: 'text', label: t('repairs.garage'), maxLength: L.garage },
    { name: 'costDzd', kind: 'number', label: t('repairs.cost', { currency }), maxLength: 12 },
    { name: 'note', kind: 'text', label: t('repairs.note'), maxLength: L.note, wide: true },
  ];
}
