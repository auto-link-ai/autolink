import type { SVGProps } from 'react';
import type { MessageCategory } from '@/lib/domain/constants';

/**
 * Line icons (24px grid, 1.75 stroke, currentColor). Decorative: always
 * aria-hidden — the text next to them carries the meaning.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, className = 'h-5 w-5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {children}
    </svg>
  );
}

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);
export const CrossIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);
export const ArrowIcon = (p: IconProps) => (
  <Icon {...p} className={`${p.className ?? 'h-4 w-4'} rtl:-scale-x-100`}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);
export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);
export const StickerIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    <path d="M8 8h3v3H8zM13 8h3v3h-3zM8 13h3v3H8zM14 14h2v2h-2z" />
  </Icon>
);
export const ScanIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16" />
  </Icon>
);
export const BellIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 6 2.5 7.5 2.5 7.5H4S6.5 15 6.5 9zM10.3 20a2 2 0 0 0 3.4 0" />
  </Icon>
);
export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </Icon>
);
export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
    <path d="M10.5 18.5h3" />
  </Icon>
);
export const TruckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 6.5h11v9H3zM14 9.5h4l3 3v3h-7z" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </Icon>
);
export const CashIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 9.5v5M18 9.5v5" />
  </Icon>
);
export const MailIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </Icon>
);
export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icon>
);

export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.2l7 2.6v5.4c0 4.7-3 7.8-7 9.6-4-1.8-7-4.9-7-9.6V5.8z" />
    <path d="M9 12l2 2 4-4" />
  </Icon>
);
export const BoltIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 3 5.5 13.5H11l-1 7.5 7.5-10.5H12z" />
  </Icon>
);
export const ChevronIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
export const QrIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <path d="M14 14h3v3h-3zM19.5 14v.01M19.5 19.5v.01M14 19.5v.01" />
  </Icon>
);
export const ChatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.5 12a8 8 0 0 1-11.6 7.1L3.5 20.5l1.4-4.9A8 8 0 1 1 20.5 12z" />
  </Icon>
);
export const WhatsAppIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.5 11.7a8.4 8.4 0 0 1-12.3 7.5L3.5 20.5l1.4-4.6A8.4 8.4 0 1 1 20.5 11.7z" />
    <path d="M9 9.2c.3 2.4 2.4 4.5 4.8 4.8l.9-1.3 1.6.8c-.4 1.2-1.7 1.6-2.9 1.3-2.4-.6-4.6-2.8-5.2-5.2-.3-1.2.1-2.5 1.3-2.9l.8 1.6z" />
  </Icon>
);

const CATEGORY_PATHS: Record<MessageCategory, string> = {
  // Headlight with beams
  LIGHTS_ON: 'M9 6.5C5.5 6.5 3.5 9 3.5 12s2 5.5 5.5 5.5h1.5v-11zM14 8.5h6.5M14 12h6.5M14 15.5h6.5',
  // Gate / blocked access
  BLOCKING_ACCESS: 'M4 20V6M20 20V6M4 9h16M4 14h16M9 9v5M15 9v5',
  // Wrench
  VEHICLE_PROBLEM: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5v3h3l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.4-.4-2.4z',
  // Warning triangle
  POSSIBLE_DAMAGE: 'M12 4 2.5 20h19zM12 10v4.5M12 17.5h.01',
  // Siren
  URGENT: 'M7 18v-5a5 5 0 0 1 10 0v5M5 21h14M12 2.5v2M4.5 6l1.5 1.5M19.5 6 18 7.5',
  // Speech bubble
  OTHER: 'M20.5 12a8 8 0 0 1-11.6 7.1L3.5 20.5l1.4-4.9A8 8 0 1 1 20.5 12z',
};

export function CategoryIcon({ category, ...p }: IconProps & { category: MessageCategory }) {
  return (
    <Icon {...p}>
      <path d={CATEGORY_PATHS[category]} />
    </Icon>
  );
}
