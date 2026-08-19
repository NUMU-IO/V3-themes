/**
 * Teen icon set — inline SVG, single stroke weight.
 *
 * Hand-authored rather than pulled from lucide/heroicons, for two reasons:
 * those libraries draw at `stroke-width: 2`, which is heavier than the
 * reference's thin line icons, and shipping a whole icon package into a
 * federated bundle costs more than the ~20 glyphs this theme actually uses.
 *
 * 1.5, not Genova's 1.25: Teen sets type in Raleway 700 and outlines its cards
 * in a solid 1px near-black. A 1.25 icon next to that reads underweight — the
 * icon has to hold its own against the border it sits inside.
 *
 * Everything inherits `currentColor`, so one `color` on the parent recolours
 * the lot. `aria-hidden` by default — these are decorative next to a visible
 * label or an `aria-label` on the control. Pass `title` only for a genuinely
 * standalone icon with no accessible name from anywhere else.
 */

import type { ReactNode, SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number;
  title?: string;
}

function Svg({ size = 20, title, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* ── Header controls ──────────────────────────────────────────────────── */

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
  </Svg>
);

/** Shopping BAG, not a trolley — the reference uses a bag throughout. */
export const IconBag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16l-1.2 13.2a1 1 0 0 1-1 .8H6.2a1 1 0 0 1-1-.8Z" />
    <path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10" />
  </Svg>
);

/* ── Direction ────────────────────────────────────────────────────────── */

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
);

/**
 * The ↗ on primary CTAs. It is a real glyph in the markup rather than a
 * pseudo-element so it participates in layout, inherits colour, and — the part
 * that matters — can be flipped for RTL by the caller. In an RTL document a
 * "go" arrow pointing north-EAST is pointing backwards.
 */
export const IconArrowUpRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h16m0 0-6-6m6 6-6 6" />
  </Svg>
);

/* ── Catalog + PDP ────────────────────────────────────────────────────── */

/** PLP filter control — sits in an orange square in the reference toolbar. */
export const IconFilter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7h11M17 7h4M3 17h4M10 17h11" />
    <circle cx="15.5" cy="7" r="1.9" />
    <circle cx="8.5" cy="17" r="1.9" />
  </Svg>
);

/** Grid quick-add: a black square with this plus, bottom-end of the image. */
export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconMinus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);

export const IconShare = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" />
  </Svg>
);

export const IconZoom = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5M11 8.5v5M8.5 11h5" />
  </Svg>
);

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5v7l6-3.5z" />
  </Svg>
);

/**
 * Rating star. Filled by default because a rating row is read as a QUANTITY —
 * an outline star at a glance reads as "not rated" rather than "one of five".
 * Pass `fill="none"` for the empty half of a partial rating.
 */
export const IconStar = ({ size = 16, title, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden={title ? undefined : true}
    role={title ? "img" : undefined}
    focusable="false"
    {...rest}
  >
    {title ? <title>{title}</title> : null}
    <path d="m12 2.8 2.7 5.9 6.3.7-4.7 4.4 1.3 6.4-5.6-3.2-5.6 3.2 1.3-6.4L3 9.4l6.3-.7z" />
  </svg>
);

/* ── Reassurance strip + bundle pill ──────────────────────────────────── */

/** "Delivery 2–3 days". */
export const IconTruck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z" />
    <circle cx="6" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </Svg>
);

/** "Easy exchange & returns". */
export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4v4.5h-4.5" />
  </Svg>
);

/** The floating "Build a bundle" pill. */
export const IconBolt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" />
  </Svg>
);

/* ── Social ───────────────────────────────────────────────────────────── */

export const IconInstagram = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconFacebook = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 8.5H17M14.5 21V8.6c0-2 1.1-3.1 3-3.1h1" />
    <path d="M11 12h6" />
    <rect x="3" y="3" width="18" height="18" rx="4" />
  </Svg>
);

export const IconTikTok = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3v11.2a3.4 3.4 0 1 1-3-3.38" />
    <path d="M14 6.2A5 5 0 0 0 19 9.5" />
  </Svg>
);

export const IconWhatsApp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 11.7a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.4-4.5A8.4 8.4 0 1 1 20.5 11.7Z" />
    <path d="M9 9.4c0 3 2.5 5.5 5.5 5.5.6 0 1.1-.5 1.1-1.1l-1.7-.8-.9.9a5.8 5.8 0 0 1-2.5-2.5l.9-.9-.8-1.7c-.6 0-1.6.1-1.6 1.1Z" />
  </Svg>
);
