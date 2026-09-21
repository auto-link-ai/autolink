import { describe, expect, it } from 'vitest';
import { CARE_DUE_KINDS } from '@/lib/domain/constants';
import { CARE_SECTIONS, carBookPath, isCareSection, isLogSection, SECTION_FOR_DUE } from '@/lib/care/sections';
import en from '@/messages/en.json';

describe('car book sections', () => {
  it('knows its seven sections, and nothing else', () => {
    expect(CARE_SECTIONS).toHaveLength(7);
    expect(isCareSection('oil')).toBe(true);
    expect(isCareSection('repair')).toBe(false);
    expect(isCareSection('../admin')).toBe(false);
    expect(isCareSection(undefined)).toBe(false);
  });

  it('keeps a list only for oil changes and repairs', () => {
    expect(CARE_SECTIONS.filter(isLogSection)).toEqual(['oil', 'repairs']);
  });

  it('sends every due date to a section that exists', () => {
    for (const kind of CARE_DUE_KINDS) expect(isCareSection(SECTION_FOR_DUE[kind])).toBe(true);
  });

  it('has a title for every section, under the same name', () => {
    for (const section of CARE_SECTIONS) expect(en.care[section].title).toBeTruthy();
  });

  it('builds the book and section addresses', () => {
    expect(carBookPath('fr', 'AUT-7K3M9QXZ')).toBe('/fr/dashboard/car/AUT-7K3M9QXZ');
    expect(carBookPath('ar', 'AUT-7K3M9QXZ', 'vignette')).toBe('/ar/dashboard/car/AUT-7K3M9QXZ/vignette');
  });
});
