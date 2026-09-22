import QRCode from 'qrcode';
import { siteOrigin } from '@/lib/site/seo';

/** A real QR code for the site's address, as one SVG path `size` units wide. */
function qrPath(text: string, size: number): string {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const unit = size / modules.size;
  const step = unit.toFixed(3);
  let d = '';
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (modules.get(row, col)) d += `M${(col * unit).toFixed(3)} ${(row * unit).toFixed(3)}h${step}v${step}h-${step}z`;
    }
  }
  return d;
}

/**
 * Original art: the rear of a car with an AutoLink sticker on the glass, drawn
 * in the brand palette. The sticker looks like the one customers receive — the
 * name, a QR code, the sticker id — and its code is a real one for the site.
 * No photo, no real vehicle, no competitor imagery. Decorative — the
 * surrounding text carries the meaning. Drawn on the server: no JavaScript.
 */
export function CarIllustration({ className = '' }: { className?: string }) {
  const qr = qrPath(siteOrigin().origin, 48);

  return (
    <svg viewBox="0 0 520 420" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="al-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbe0cd" />
          <stop offset="100%" stopColor="#f7cdb2" />
        </linearGradient>
        <linearGradient id="al-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a2f2a" />
          <stop offset="100%" stopColor="#15100e" />
        </linearGradient>
      </defs>

      {/* Warm background + soft road */}
      <rect width="520" height="420" fill="url(#al-sky)" />
      <circle cx="120" cy="90" r="70" fill="#ffffff" opacity="0.35" />
      <rect y="300" width="520" height="120" fill="#e9c6ad" opacity="0.7" />

      {/* Car body (rear three-quarter) */}
      <path
        d="M120 300 L120 170 Q124 132 168 124 L360 104 Q404 100 418 138 L448 236 Q456 268 452 300 Z"
        fill="#f6f2ee"
      />
      <path d="M120 300 L452 300 L452 336 Q452 348 436 348 L136 348 Q120 348 120 336 Z" fill="#e7ded6" />

      {/* Rear window with the sticker */}
      <path d="M156 186 Q160 152 190 146 L356 128 Q392 124 402 152 L414 206 L156 226 Z" fill="url(#al-glass)" />

      {/* AutoLink sticker: name, QR code, sticker id — as printed */}
      <g transform="translate(266 141) rotate(-5)">
        <rect width="70" height="75" rx="7" fill="var(--white)" />
        <text x="35" y="11" textAnchor="middle" direction="ltr" fontSize="8" fontWeight="700" fill="var(--ink)">
          Auto<tspan fill="var(--orange)">Link</tspan>
        </text>
        <path d={qr} transform="translate(11 14.5)" fill="var(--ink)" />
        <text
          x="35"
          y="70"
          textAnchor="middle"
          direction="ltr"
          fontSize="5.2"
          fontWeight="600"
          fill="#7a6a62"
          style={{ fontFamily: 'var(--app-font-mono)' }}
        >
          AUT-7K3M9QXZ
        </text>
      </g>

      {/* Tail light + bumper detail */}
      <rect x="132" y="240" width="74" height="30" rx="10" fill="#d94a2b" />
      <rect x="380" y="240" width="60" height="26" rx="10" fill="#f0a488" opacity="0.8" />

      {/* Wheel arch shadow */}
      <ellipse cx="290" cy="352" rx="200" ry="20" fill="#d9b49b" opacity="0.55" />
    </svg>
  );
}
