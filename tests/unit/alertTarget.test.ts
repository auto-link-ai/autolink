import { describe, expect, it } from 'vitest';
import { alertTarget } from '@/lib/notifications/alertTarget';

describe('alertTarget: where a WhatsApp button lands', () => {
  it('opens the car book for a reminder (it carries the sticker id)', () => {
    expect(alertTarget('ar', 'AUT-7K3M9QXZ')).toBe('/ar/dashboard/car/AUT-7K3M9QXZ');
  });

  it('opens the inbox for a message alert, or anything else', () => {
    expect(alertTarget('fr', 'MSG-0000000001')).toBe('/fr/dashboard');
    expect(alertTarget('en', '../../admin')).toBe('/en/dashboard');
    expect(alertTarget('en', '')).toBe('/en/dashboard');
  });

  it('still finds the sticker behind a stray template placeholder', () => {
    expect(alertTarget('ar', '{{1}}AUT-7K3M9QXZ')).toBe('/ar/dashboard/car/AUT-7K3M9QXZ');
  });
});
