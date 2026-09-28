/**
 * The car's colour as the owner typed it at activation (« Gris métallisé »,
 * « أبيض », "dark blue"…) turned into a paint for its drawing in the car book.
 * Words in French, Arabic (and a little Darija) and English; the most specific
 * first, so « bleu marine » is navy and « rouge bordeaux » is burgundy. An
 * unknown word gets a neutral grey — the drawing is only decoration.
 */
const PAINTS: readonly (readonly [RegExp, string])[] = [
  [/anthracite|gris fonce|dark gr[ae]y|رمادي غامق/, '#4b5057'],
  [/argent|silver|gris clair|light gr[ae]y|فضي|فضه/, '#c3c7cc'],
  [/marine|navy|bleu fonce|dark blue|كحلي/, '#223a66'],
  [/bordeaux|burgundy|maroon|عنابي|خمري/, '#7a1f2c'],
  [/blanc|white|ابيض|بيضا|بيض/, '#f5f4f1'],
  [/noir|black|اسود|سودا|كحل/, '#1e1f22'],
  [/gris|gr[ae]y|رمادي|رماد/, '#8d939a'],
  [/rouge|red|احمر|حمرا/, '#c4302b'],
  [/bleu|blue|ازرق|زرقا/, '#2b61b5'],
  [/vert|green|اخضر|خضرا/, '#2f7a4d'],
  [/jaune|yellow|اصفر|صفرا/, '#e8b923'],
  [/orange|برتقالي|تشينا/, '#e8661d'],
  [/marron|brun|brown|chocolat|بني|قهوي|شوكولا/, '#6b4a39'],
  [/beige|champagne|sable|sand|بيج/, '#d7c3a2'],
  [/\bdore\b|\bor\b|gold|ذهبي/, '#c8a445'],
  [/violet|purple|mauve|بنفسجي/, '#65409b'],
  [/rose|pink|وردي/, '#df8aa4'],
];

export const NEUTRAL_PAINT = '#b7b2ad';

/** Lower case, no accents (é → e), and Arabic letters in one form (أ إ آ → ا, ة → ه, no harakat). */
function normalise(colour: string): string {
  return colour
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064b-\u0652\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

export function carPaint(colour: string): { paint: string; known: boolean } {
  const words = normalise(colour);
  const match = PAINTS.find(([pattern]) => pattern.test(words));
  return match ? { paint: match[1], known: true } : { paint: NEUTRAL_PAINT, known: false };
}

/** Pale paints (white, silver, beige, yellow) need a darker outline to stand out on white. */
export function isPale(paint: string): boolean {
  const hex = paint.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.7;
}
