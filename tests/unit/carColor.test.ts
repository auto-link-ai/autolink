import { describe, expect, it } from 'vitest';
import { carPaint, isPale, NEUTRAL_PAINT } from '@/lib/care/carColor';

const paintOf = (colour: string) => carPaint(colour).paint;

describe('the car drawing takes the colour the owner typed', () => {
  it('reads French, with or without accents and extra words', () => {
    expect(paintOf('Blanc')).toBe(paintOf('white'));
    expect(paintOf('Gris métallisé')).toBe(paintOf('gris'));
    expect(paintOf('NOIR')).toBe(paintOf('black'));
    expect(paintOf('Doré')).toBe(paintOf('gold'));
  });

  it('reads Arabic, whatever the letter forms, and a little Darija', () => {
    expect(paintOf('أبيض')).toBe(paintOf('blanc'));
    expect(paintOf('ابيض')).toBe(paintOf('blanc'));
    expect(paintOf('بيضاء')).toBe(paintOf('blanc'));
    expect(paintOf('رمادي')).toBe(paintOf('gris'));
    expect(paintOf('فضة')).toBe(paintOf('silver'));
    expect(paintOf('كحلة')).toBe(paintOf('noir'));
    expect(paintOf('حمراء')).toBe(paintOf('rouge'));
  });

  it('prefers the more precise shade', () => {
    expect(paintOf('Bleu marine')).not.toBe(paintOf('bleu'));
    expect(paintOf('Rouge bordeaux')).not.toBe(paintOf('rouge'));
    expect(paintOf('Gris clair')).toBe(paintOf('argent'));
    expect(paintOf('Orange')).not.toBe(paintOf('or'));
  });

  it('falls back to a neutral grey it can say it did not recognise', () => {
    expect(carPaint('Vert pomme kiwi')).toMatchObject({ known: true });
    expect(carPaint('xyz')).toEqual({ paint: NEUTRAL_PAINT, known: false });
    expect(carPaint('')).toEqual({ paint: NEUTRAL_PAINT, known: false });
  });

  it('knows which paints need a darker outline', () => {
    expect(isPale(paintOf('blanc'))).toBe(true);
    expect(isPale(paintOf('argent'))).toBe(true);
    expect(isPale(paintOf('noir'))).toBe(false);
    expect(isPale(paintOf('rouge'))).toBe(false);
  });
});
