import { describe, expect, it } from 'vitest';
import { safeNext } from '@/app/[locale]/(site)/_auth/state';
import { reminderText } from '@/lib/care/reminders';
import type { DueReminder } from '@/lib/db/repositories/careReminders';
import { isCronAuthorized } from '@/lib/security/cron';
import en from '@/messages/en.json';

const SECRET = 'a-cron-secret-of-some-length';

describe('isCronAuthorized', () => {
  it('lets in exactly the bearer secret', () => {
    expect(isCronAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(isCronAuthorized(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isCronAuthorized(SECRET, SECRET)).toBe(false);
    expect(isCronAuthorized(null, SECRET)).toBe(false);
  });

  it('refuses everyone while no real secret is configured', () => {
    expect(isCronAuthorized('Bearer ', '')).toBe(false);
    expect(isCronAuthorized('Bearer undefined', undefined)).toBe(false);
    expect(isCronAuthorized('Bearer short', 'short')).toBe(false);
  });
});

describe('reminderText', () => {
  const reminder: DueReminder = {
    kind: 'OIL_CHANGE',
    // Only the job itself reads it; the wording never does.
    ref: null as unknown as DueReminder['ref'],
    userId: 'u',
    locale: 'en',
    publicTagId: 'AUT-7K3M9QXZ',
    carLabel: 'Peugeot 208',
    dueDate: new Date('2026-09-24T00:00:00.000Z'),
  };

  it('names the car and the date', () => {
    const text = reminderText(en.notifications.care, reminder, new Date('2026-09-21T00:00:00.000Z'));
    expect(text.title).toBe('Oil change due — Peugeot 208');
    expect(text.body).toBe('Due on 24 Sept 2026.');
  });

  it('says when it is already late', () => {
    const text = reminderText(en.notifications.care, reminder, new Date('2026-09-30T00:00:00.000Z'));
    expect(text.body).toBe('It was due on 24 Sept 2026.');
  });
});

describe('safeNext', () => {
  it("sends an owner who signed in from a scan page back to that sticker", () => {
    expect(safeNext('/t/AUT-7K3M9QXZ', 'fr')).toBe('/t/AUT-7K3M9QXZ');
  });

  it('never follows anything else', () => {
    expect(safeNext('/t/AUT-BAD', 'fr')).toBe('/fr/dashboard');
    expect(safeNext('/t/AUT-7K3M9QXZ/../../evil', 'fr')).toBe('/fr/dashboard');
    expect(safeNext('https://evil.example/t/AUT-7K3M9QXZ', 'fr')).toBe('/fr/dashboard');
    expect(safeNext('//evil.example', 'fr')).toBe('/fr/dashboard');
  });
});
