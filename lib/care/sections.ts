import type { CareDueKind } from '@/lib/domain/constants';

/**
 * The car book's sections: one page each, one form each, one name for both —
 * the URL slug, the form's `section` field and the copy namespace all agree.
 * Listed in the order the overview shows them.
 */
export const CARE_SECTIONS = ['oil', 'insurance', 'inspection', 'vignette', 'repairs', 'profile', 'notes'] as const;
export type CareSection = (typeof CARE_SECTIONS)[number];

/** Sections that keep a list of entries; the others hold one set of details. */
export const CARE_LOG_SECTIONS = ['oil', 'repairs'] as const satisfies readonly CareSection[];
export type CareLogSection = (typeof CARE_LOG_SECTIONS)[number];

export function isCareSection(value: unknown): value is CareSection {
  return typeof value === 'string' && (CARE_SECTIONS as readonly string[]).includes(value);
}

export function isLogSection(section: CareSection): section is CareLogSection {
  return (CARE_LOG_SECTIONS as readonly string[]).includes(section);
}

/** Where each due date is kept, so "Coming up" can link straight to it. */
export const SECTION_FOR_DUE: Record<CareDueKind, CareSection> = {
  OIL_CHANGE: 'oil',
  INSURANCE: 'insurance',
  INSPECTION: 'inspection',
  VIGNETTE: 'vignette',
};

export function carBookPath(locale: string, publicTagId: string, section?: CareSection): string {
  const book = `/${locale}/dashboard/car/${publicTagId}`;
  return section ? `${book}/${section}` : book;
}
