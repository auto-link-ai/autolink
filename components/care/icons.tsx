import { Icon, type IconProps } from '@/components/site/icons';

/**
 * The car book's own line icons, drawn on the same 24px grid and stroke as
 * the site's (components/site/icons.tsx). Decorative: the name beside each
 * one carries the meaning.
 */

export const OilIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 10.5h10l3 3 5.5-3 .5 1.2-6.5 7.3H3.5a1 1 0 0 1-1-1z" />
    <path d="M5.5 10.5V8h4.5v2.5M4.5 8h6.5" />
    <path d="M20.5 18c0 1-.7 1.7-1.5 1.7s-1.5-.7-1.5-1.7c0-1 1.5-2.7 1.5-2.7s1.5 1.7 1.5 2.7z" />
  </Icon>
);

export const ClipboardIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
    <path d="M9 3h6v3H9zM9 13l2 2 4-4" />
  </Icon>
);

/** The vignette: the tax that lets the car on the road. */
export const RoadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3 5 21M16 3l3 18M12 4.5v2M12 11v2M12 17.5v2" />
  </Icon>
);

export const WrenchIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15.5 3.5a4.5 4.5 0 0 0-4.3 5.8L4 16.5a2.1 2.1 0 0 0 3 3l7.2-7.2a4.5 4.5 0 0 0 5.8-4.3l-2.6 2.6-2.8-.8-.8-2.8z" />
  </Icon>
);

export const NoteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3.5h9l4 4v13H6zM15 3.5v4h4M9 12h7M9 16h5" />
  </Icon>
);
