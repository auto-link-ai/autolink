import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/locales';
import type { CarBookDTO } from '@/lib/db/repositories/carBook';
import { CAR_FUELS, CARE_FIELD_LIMITS as L } from '@/lib/domain/constants';
import { CareForm } from './CareForm';
import { BookCard, CareField, careFormLabels, FieldGrid, INPUT } from './parts';

export async function ProfileSection({ book, locale }: { book: CarBookDTO; locale: Locale }) {
  const t = await getTranslations('care.profile');
  const fields = {
    year: t('year'),
    fuel: t('fuel'),
    engine: t('engine'),
    vin: t('vin'),
    registrationNumber: t('registrationNumber'),
  };
  const profile = book.profile;

  return (
    <BookCard id="profile" title={t('title')}>
      <CareForm locale={locale} tagId={book.publicTagId} section="profile" labels={await careFormLabels('save', fields)}>
        <FieldGrid>
          <CareField id="profile-year" label={fields.year}>
            <input
              id="profile-year"
              name="year"
              type="number"
              inputMode="numeric"
              min={L.firstYear}
              max={new Date().getUTCFullYear() + 1}
              defaultValue={profile.year ?? ''}
              className={INPUT}
            />
          </CareField>
          <CareField id="profile-fuel" label={fields.fuel}>
            <select id="profile-fuel" name="fuel" defaultValue={profile.fuel ?? ''} className={INPUT}>
              <option value="">{t('fuelNone')}</option>
              {CAR_FUELS.map((fuel) => (
                <option key={fuel} value={fuel}>
                  {t(`fuels.${fuel}`)}
                </option>
              ))}
            </select>
          </CareField>
          <CareField id="profile-engine" label={fields.engine} hint={t('engineHint')}>
            <input id="profile-engine" name="engine" maxLength={L.engine} defaultValue={profile.engine ?? ''} className={INPUT} />
          </CareField>
          <CareField id="profile-vin" label={fields.vin}>
            <input
              id="profile-vin"
              name="vin"
              dir="ltr"
              maxLength={L.vin.max + 4}
              autoCapitalize="characters"
              spellCheck={false}
              defaultValue={profile.vin ?? ''}
              className={INPUT}
            />
          </CareField>
          <CareField id="profile-registration" label={fields.registrationNumber}>
            <input
              id="profile-registration"
              name="registrationNumber"
              dir="ltr"
              maxLength={L.registrationNumber}
              defaultValue={profile.registrationNumber ?? ''}
              className={INPUT}
            />
          </CareField>
        </FieldGrid>
      </CareForm>
    </BookCard>
  );
}
