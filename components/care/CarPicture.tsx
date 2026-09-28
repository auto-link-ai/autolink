import { carPaint, isPale } from '@/lib/care/carColor';
import { cx } from '@/lib/cx';

/**
 * The owner's car, drawn side-on and painted in the colour they gave it
 * (lib/care/carColor.ts). There is no photo of every model, so this stands in:
 * decoration only — the make, model and plate are written beside it. Faces
 * the reading direction: flipped in Arabic.
 */
export function CarPicture({ colour, className }: { colour: string; className?: string }) {
  const { paint } = carPaint(colour);
  const outline = isPale(paint) ? '#a29a94' : 'rgb(0 0 0 / 0.22)';

  return (
    <svg
      viewBox="0 0 200 90"
      aria-hidden="true"
      focusable="false"
      className={cx('shrink-0 rtl:-scale-x-100', className)}
    >
      {/* Shadow on the ground */}
      <ellipse cx="102" cy="82" rx="88" ry="5" fill="#000" opacity="0.1" />

      {/* Body */}
      <path
        d="M14 64V52q2-8 12-10l32-4 18-16q4-3 10-3h38q7 0 12 4l20 15 24 4q10 2 11 10v12q0 3-3 3h-22a16 16 0 0 0-32 0H68a16 16 0 0 0-32 0H17q-3 0-3-3z"
        fill={paint}
        stroke={outline}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Light on the upper body */}
      <path d="M22 45q-3 2-3 6h170q-1-5-8-6z" fill="#fff" opacity="0.18" />

      {/* Windows */}
      <path d="M64 38.5 79 25.5q2-1.5 5-1.5h15v14.5z" fill="#27313d" />
      <path d="M103 24h19q5 0 8 3l14 11.5h-41z" fill="#27313d" />
      <path d="M84 26h10l-9 11h-12z" fill="#fff" opacity="0.16" />

      {/* Door line, handle */}
      <path d="M101 40v24" stroke="#000" strokeOpacity="0.18" strokeWidth="1.5" />
      <rect x="107" y="44" width="9" height="2.5" rx="1.25" fill="#000" opacity="0.25" />

      {/* Lights */}
      <path d="M181 47.5q6 .5 8 4h-7q-2-1-1-4z" fill="#ffe9a8" />
      <rect x="14.5" y="47" width="5" height="7" rx="1.5" fill="#d0433a" />

      {/* Wheels */}
      {[52, 150].map((x) => (
        <g key={x}>
          <circle cx={x} cy="68" r="13" fill="#1f2023" />
          <circle cx={x} cy="68" r="6.5" fill="#b9bdc3" />
          <circle cx={x} cy="68" r="2" fill="#6b7078" />
        </g>
      ))}
    </svg>
  );
}
