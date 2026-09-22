import type { CSSProperties, ReactNode } from 'react';

/**
 * An iPhone frame to show a screen inside: bezel, rounded screen, Dynamic
 * Island or notch, home indicator. Plain markup and inline styles — no state,
 * no JavaScript — so it renders on the server.
 *
 * Adapted from a shared component: strict-mode typing, `scale` that also
 * reserves the scaled size in the layout, no built-in "iPhone mockup" label
 * (the caller decides whether the phone is decorative), and a home indicator
 * colour for light screens.
 */

type IPhoneModel = '14' | '14-pro' | '15' | '15-pro' | 'x' | 'plain';
type Orientation = 'portrait' | 'landscape';
type WallpaperFit = 'cover' | 'contain' | 'fill';

export interface IPhoneMockupProps {
  model?: IPhoneModel;
  color?:
    | 'black'
    | 'midnight'
    | 'silver'
    | 'starlight'
    | 'space-black'
    | 'gold'
    | 'blue'
    | 'pink'
    | 'titanium'
    | 'natural-titanium'
    | 'green'
    | 'red'
    | (string & {});
  orientation?: Orientation;
  /** Scales the whole device; the layout reserves the scaled size. */
  scale?: number;

  // Frame
  bezel?: number;
  radius?: number;
  shadow?: boolean | string;

  // Screen + content
  screenBg?: string;
  wallpaper?: string;
  wallpaperFit?: WallpaperFit;
  wallpaperPosition?: string;

  // Cutouts
  showDynamicIsland?: boolean;
  showNotch?: boolean;
  islandWidth?: number;
  islandHeight?: number;
  islandRadius?: number;
  notchWidth?: number;
  notchHeight?: number;
  notchRadius?: number;

  // Safe area insets
  safeArea?: boolean;
  safeAreaOverrides?: Partial<{ top: number; bottom: number; left: number; right: number }>;

  // Details
  showHomeIndicator?: boolean;
  /** Any CSS background; the default suits a dark screen. */
  homeIndicatorColor?: string;
  innerShadow?: boolean;

  // Styling hooks
  style?: CSSProperties;
  className?: string;
  frameStyle?: CSSProperties;
  screenStyle?: CSSProperties;

  children?: ReactNode;
}

/** Device specs, in logical pixels. */
const DEVICE_SPECS: Record<
  IPhoneModel,
  {
    w: number;
    h: number;
    radius: number;
    bezel: number;
    topSafe: number;
    bottomSafe: number;
    notch?: { w: number; h: number; r: number };
    island?: { w: number; h: number; r: number };
  }
> = {
  x: { w: 375, h: 812, radius: 50, bezel: 12, topSafe: 47, bottomSafe: 34, notch: { w: 210, h: 35, r: 18 } },
  '14': { w: 390, h: 844, radius: 56, bezel: 12, topSafe: 47, bottomSafe: 34, notch: { w: 225, h: 33, r: 18 } },
  '14-pro': { w: 393, h: 852, radius: 56, bezel: 12, topSafe: 59, bottomSafe: 34, island: { w: 126, h: 37, r: 20 } },
  '15': { w: 393, h: 852, radius: 56, bezel: 12, topSafe: 59, bottomSafe: 34, island: { w: 126, h: 37, r: 20 } },
  '15-pro': { w: 393, h: 852, radius: 56, bezel: 12, topSafe: 59, bottomSafe: 34, island: { w: 126, h: 37, r: 20 } },
  plain: { w: 390, h: 844, radius: 56, bezel: 12, topSafe: 16, bottomSafe: 16 },
};

const PRESET_COLORS: Record<string, string> = {
  black: '#0b0b0d',
  midnight: '#0b0c10',
  silver: '#d7d8dc',
  starlight: '#f1eee9',
  'space-black': '#1c1e22',
  gold: '#f2dfb3',
  blue: '#2b4fa8',
  pink: '#ffbfd1',
  titanium: '#837a72',
  'natural-titanium': '#a69a8a',
  green: '#2b622e',
  red: '#c81f2f',
};

/** Lightens (pct > 0) or darkens (pct < 0) a #rrggbb colour. */
function shade(hex: string, pct: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const k = (100 + pct) / 100;
  const channel = (part: string | undefined) =>
    Math.max(0, Math.min(255, Math.round(parseInt(part ?? '0', 16) * k)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(m[1])}${channel(m[2])}${channel(m[3])}`;
}

export function IPhoneMockup({
  model = '14-pro',
  color = 'space-black',
  orientation = 'portrait',
  scale = 1,

  bezel,
  radius,
  shadow = true,

  screenBg = '#000',
  wallpaper,
  wallpaperFit = 'cover',
  wallpaperPosition = 'center',

  showDynamicIsland,
  showNotch,
  islandWidth,
  islandHeight,
  islandRadius,
  notchWidth,
  notchHeight,
  notchRadius,

  safeArea = true,
  safeAreaOverrides,

  showHomeIndicator = true,
  homeIndicatorColor = 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
  innerShadow = true,

  style,
  className,
  frameStyle,
  screenStyle,

  children,
}: IPhoneMockupProps) {
  const spec = DEVICE_SPECS[model];

  const useIsland = typeof showDynamicIsland === 'boolean' ? showDynamicIsland : Boolean(spec.island);
  const useNotch = typeof showNotch === 'boolean' ? showNotch : Boolean(spec.notch) && !useIsland;

  const resolvedRadius = radius ?? spec.radius;
  const resolvedBezel = bezel ?? spec.bezel;

  const isLandscape = orientation === 'landscape';
  const screenWidth = isLandscape ? spec.h : spec.w;
  const screenHeight = isLandscape ? spec.w : spec.h;

  const outerWidth = screenWidth + resolvedBezel * 2;
  const outerHeight = screenHeight + resolvedBezel * 2;
  const outerRadius = resolvedRadius + resolvedBezel;

  const colorHex = PRESET_COLORS[color] ?? color;
  const frameGradient = `linear-gradient(135deg, ${shade(colorHex, 8)} 0%, ${colorHex} 40%, ${shade(colorHex, -14)} 100%)`;

  const outerShadow =
    typeof shadow === 'string' ? shadow : shadow ? '0 12px 30px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.22)' : 'none';

  const innerShadowCss = innerShadow
    ? 'inset 0 0 0 1px rgba(255,255,255,0.03), inset 0 10px 20px rgba(0,0,0,0.35), inset 0 -8px 16px rgba(0,0,0,0.28)'
    : 'none';

  const notch = {
    w: notchWidth ?? spec.notch?.w ?? 0,
    h: notchHeight ?? spec.notch?.h ?? 0,
    r: notchRadius ?? spec.notch?.r ?? 0,
  };
  const island = {
    w: islandWidth ?? spec.island?.w ?? 0,
    h: islandHeight ?? spec.island?.h ?? 0,
    r: islandRadius ?? spec.island?.r ?? 0,
  };

  const insets = {
    top: safeAreaOverrides?.top ?? spec.topSafe,
    bottom: safeAreaOverrides?.bottom ?? spec.bottomSafe,
    left: safeAreaOverrides?.left ?? 0,
    right: safeAreaOverrides?.right ?? 0,
  };

  // The wrapper takes the scaled size, so the page lays out around what is seen.
  const wrapperStyle: CSSProperties = {
    boxSizing: 'border-box',
    display: 'inline-block',
    width: outerWidth * scale,
    height: outerHeight * scale,
    ...style,
  };

  const frameBoxStyle: CSSProperties = {
    width: outerWidth,
    height: outerHeight,
    borderRadius: outerRadius,
    background: frameGradient,
    padding: resolvedBezel,
    boxSizing: 'border-box',
    boxShadow: outerShadow,
    position: 'relative',
    overflow: 'hidden',
    transform: scale === 1 ? undefined : `scale(${scale})`,
    transformOrigin: 'top left',
    ...frameStyle,
  };

  const screenBoxStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: resolvedRadius,
    position: 'relative',
    overflow: 'hidden',
    background: screenBg,
    boxShadow: innerShadowCss,
    ...screenStyle,
  };

  const cutoutCommon: CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#000',
    zIndex: 2,
    boxShadow: '0 1px 2px rgba(0,0,0,0.7)',
  };

  const contentStyle: CSSProperties = {
    position: 'absolute',
    ...(safeArea ? { top: insets.top, right: insets.right, bottom: insets.bottom, left: insets.left } : { inset: 0 }),
    overflow: 'hidden',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div className={className} style={wrapperStyle}>
      <div style={frameBoxStyle}>
        <div style={screenBoxStyle}>
          {wallpaper && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${wallpaper})`,
                backgroundSize: wallpaperFit,
                backgroundPosition: wallpaperPosition,
                backgroundRepeat: 'no-repeat',
                zIndex: 0,
              }}
            />
          )}

          {useIsland && island.w > 0 && island.h > 0 && (
            <div aria-hidden="true" style={{ ...cutoutCommon, top: 12, width: island.w, height: island.h, borderRadius: island.r }} />
          )}

          {!useIsland && useNotch && notch.w > 0 && notch.h > 0 && (
            <div aria-hidden="true" style={{ ...cutoutCommon, top: 8, width: notch.w, height: notch.h, borderRadius: notch.r }} />
          )}

          <div style={contentStyle}>{children}</div>

          {showHomeIndicator && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: Math.round(screenWidth * 0.34),
                maxWidth: 140,
                height: 5,
                borderRadius: 3,
                background: homeIndicatorColor,
                opacity: 0.9,
                zIndex: 3,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default IPhoneMockup;
