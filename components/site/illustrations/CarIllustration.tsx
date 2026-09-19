/**
 * Original placeholder art: the rear of a car with an AutoLink sticker on the
 * glass, drawn in the brand palette. No photo, no real vehicle, no competitor
 * imagery. Decorative — the surrounding text carries the meaning.
 */
export function CarIllustration({ className = '' }: { className?: string }) {
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

      {/* AutoLink sticker */}
      <g transform="translate(248 150) rotate(-4)">
        <rect x="0" y="0" width="112" height="60" rx="10" fill="var(--orange)" />
        <rect x="8" y="8" width="96" height="30" rx="6" fill="var(--white)" />
        <g fill="var(--ink)">
          <rect x="14" y="13" width="6" height="6" rx="1" />
          <rect x="24" y="13" width="6" height="6" rx="1" />
          <rect x="14" y="23" width="6" height="6" rx="1" />
          <rect x="24" y="23" width="4" height="4" rx="1" />
          <rect x="34" y="18" width="4" height="4" rx="1" />
        </g>
        <rect x="44" y="16" width="52" height="5" rx="2.5" fill="#d8cfc9" />
        <rect x="44" y="26" width="34" height="5" rx="2.5" fill="#e6e0dc" />
        <rect x="14" y="44" width="84" height="6" rx="3" fill="var(--white)" opacity="0.85" />
      </g>

      {/* Tail light + bumper detail */}
      <rect x="132" y="240" width="74" height="30" rx="10" fill="#d94a2b" />
      <rect x="380" y="240" width="60" height="26" rx="10" fill="#f0a488" opacity="0.8" />

      {/* Wheel arch shadow */}
      <ellipse cx="290" cy="352" rx="200" ry="20" fill="#d9b49b" opacity="0.55" />
    </svg>
  );
}
