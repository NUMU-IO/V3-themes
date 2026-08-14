/**
 * Genova icon set — inline SVG, hairline stroke.
 *
 * Hand-authored rather than pulled from lucide/heroicons for one reason: those
 * libraries draw at `stroke-width: 2`, which reads heavy next to Genova's 1 px
 * hairlines and 500-weight type. Everything here is 1.25, sized 20 by default,
 * and inherits `currentColor` so a single `color` on the parent recolours it.
 *
 * `aria-hidden` by default — these are decorative next to a visible label or an
 * `aria-label` on the control. Pass `title` only for a genuinely standalone icon
 * that has no accessible name from elsewhere.
 */

import type { SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number;
  title?: string;
}

function Svg({ size = 20, title, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
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

/** Shopping bag — Marce uses a bag, not a trolley. */
export const IconBag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16l-1.2 13.2a1 1 0 0 1-1 .8H6.2a1 1 0 0 1-1-.8Z" />
    <path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10" />
  </Svg>
);

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

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h16m0 0-6-6m6 6-6 6" />
  </Svg>
);

/** Trust row: fast shipping. */
export const IconTruck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z" />
    <circle cx="6" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </Svg>
);

/** Trust row: secure payment. */
export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5.5c0 4.3-2.9 8.2-7 9.5-4.1-1.3-7-5.2-7-9.5V6z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

/** Trust row: customer service. */
export const IconHeadset = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
    <path d="M4 13h2.5v5H5a1 1 0 0 1-1-1zM20 13h-2.5v5H19a1 1 0 0 0 1-1z" />
    <path d="M17.5 18v.5a2.5 2.5 0 0 1-2.5 2.5h-2" />
  </Svg>
);

export const IconInstagram = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconTikTok = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3v11.2a3.4 3.4 0 1 1-3-3.38" />
    <path d="M14 6.2A5 5 0 0 0 19 9.5" />
  </Svg>
);

export const IconFacebook = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 8.5H17M14.5 21V8.6c0-2 1.1-3.1 3-3.1h1" />
    <path d="M11 12h6" />
    <rect x="3" y="3" width="18" height="18" rx="4" />
  </Svg>
);

export const IconWhatsApp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 11.7a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.4-4.5A8.4 8.4 0 1 1 20.5 11.7Z" />
    <path d="M9 9.4c0 3 2.5 5.5 5.5 5.5.6 0 1.1-.5 1.1-1.1l-1.7-.8-.9.9a5.8 5.8 0 0 1-2.5-2.5l.9-.9-.8-1.7c-.6 0-1.6.1-1.6 1.1Z" />
  </Svg>
);

/** PLP filter control. */
export const IconFilter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7h11M17 7h4M3 17h4M10 17h11" />
    <circle cx="15.5" cy="7" r="1.9" />
    <circle cx="8.5" cy="17" r="1.9" />
  </Svg>
);
