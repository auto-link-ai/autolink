'use client';

import { useEffect, useState } from 'react';
import { useHydrated } from '@/components/ui/useHydrated';
import { cx } from '@/lib/cx';
import { ORDER_FIELD_LIMITS as L } from '@/lib/domain/constants';

export interface CommuneLabels {
  placeholder: string;
  wilayaFirst: string;
  other: string;
  backToList: string;
}

interface Commune {
  fr: string;
  ar: string;
}

/** The value meaning « not in the list »: the field becomes a text box. */
const OTHER = '__other__';

/** One file per wilaya (public/data/communes, from scripts/build-communes.ts), fetched once each. */
const cache = new Map<number, Promise<Commune[]>>();
function communesOf(wilayaCode: number): Promise<Commune[]> {
  let pending = cache.get(wilayaCode);
  if (!pending) {
    pending = fetch(`/data/communes/${String(wilayaCode).padStart(2, '0')}.json`).then((response) => {
      if (!response.ok) throw new Error(`communes ${response.status}`);
      return response.json() as Promise<Commune[]>;
    });
    pending.catch(() => cache.delete(wilayaCode));
    cache.set(wilayaCode, pending);
  }
  return pending;
}

/**
 * The commune, picked from the chosen wilaya's list — names in Arabic on the
 * Arabic page, French elsewhere; the order keeps the French name, the one
 * couriers use. « أخرى… » turns it into a text box, so a commune missing from
 * the list never blocks an order. Without JavaScript, or if the list cannot be
 * loaded, it is a text box from the start. The parent gives it the wilaya as
 * its key, so a new wilaya starts from a fresh, empty choice.
 */
export function CommuneField({
  id,
  wilayaCode,
  language,
  labels,
  className,
  invalidProps,
}: {
  id: string;
  wilayaCode: number | '';
  language: 'ar' | 'fr';
  labels: CommuneLabels;
  className: string;
  invalidProps: Record<string, unknown>;
}) {
  const hydrated = useHydrated();
  const [loaded, setLoaded] = useState<{ wilaya: number; communes: Commune[] } | null>(null);
  const [typing, setTyping] = useState(false);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (wilayaCode === '') return;
    let current = true;
    communesOf(wilayaCode)
      .then((communes) => current && setLoaded({ wilaya: wilayaCode, communes }))
      .catch(() => current && setTyping(true));
    return () => {
      current = false;
    };
  }, [wilayaCode]);

  const textBox = (
    <input
      id={id}
      name="commune"
      maxLength={L.commune.max}
      autoFocus={hydrated && typing}
      className={className}
      {...invalidProps}
    />
  );
  if (!hydrated || typing) {
    return (
      <>
        {textBox}
        {hydrated && wilayaCode !== '' && loaded && (
          <button
            type="button"
            onClick={() => setTyping(false)}
            className="self-start text-sm font-bold text-accent hover:underline"
          >
            {labels.backToList}
          </button>
        )}
      </>
    );
  }

  const communes = loaded && loaded.wilaya === wilayaCode ? loaded.communes : [];
  const shown = [...communes].sort((a, b) => a[language].localeCompare(b[language], language));
  return (
    <select
      id={id}
      name="commune"
      value={value}
      onChange={(event) => {
        if (event.target.value === OTHER) setTyping(true);
        else setValue(event.target.value);
      }}
      className={cx(className, wilayaCode === '' && 'text-text-muted')}
      {...invalidProps}
    >
      <option value="">{wilayaCode === '' ? labels.wilayaFirst : labels.placeholder}</option>
      {shown.map((commune) => (
        <option key={commune.fr} value={commune.fr}>
          {commune[language]}
        </option>
      ))}
      {communes.length > 0 && <option value={OTHER}>{labels.other}</option>}
    </select>
  );
}
