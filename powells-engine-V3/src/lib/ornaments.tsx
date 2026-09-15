/**
 * Powell's — line art and icons.
 *
 * Two kinds of drawing live here and they are governed differently:
 *
 *   - ORNAMENTS (the floral sprigs, the shopfront, the stacked books) are the
 *     theme's marginalia. Every one is `aria-hidden`, and every one is gated at
 *     the call site on the merchant's `show_ornaments` global via
 *     `useOrnaments()`.
 *   - ICONS carry meaning (search, cart, heart, chevron) and are never gated.
 *
 * All of them inherit `currentColor` rather than naming a purple, so they
 * follow a merchant's colour edit instead of stranding a hard-coded lavender
 * on a repainted page.
 *
 * The drawings are deliberately built from arcs, ellipses and rectangles
 * rather than long traced path data: this is a line-art *style*, not a logo
 * reproduction, and primitives stay legible to the next person to edit them.
 */

import type { ReactNode } from "react";

const line = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * A five-petal blossom, open to the viewer.
 *
 * Drawn as five ellipses on a rotation, which is what gives the reference its
 * engraved-botanical feel — a circle of dots reads as a diagram instead.
 */
function Blossom({ cx, cy, r = 6 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx={cx}
          cy={cy - r * 0.78}
          rx={r * 0.42}
          ry={r * 0.78}
          transform={`rotate(${angle} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.24} />
    </g>
  );
}

/** A leaf: two mirrored arcs with a midrib. */
function Leaf({
  x,
  y,
  length = 16,
  angle = 0,
}: {
  x: number;
  y: number;
  length?: number;
  angle?: number;
}) {
  const w = length * 0.42;
  return (
    <g transform={`rotate(${angle} ${x} ${y})`}>
      <path d={`M${x} ${y} q ${w} ${-length * 0.35} ${length} 0 q ${-w} ${length * 0.35} ${-length} 0`} />
      <path d={`M${x} ${y} h ${length}`} strokeOpacity="0.5" />
    </g>
  );
}

/**
 * The tall vine that flanks the wordmark.
 *
 * Rendered once and mirrored with a CSS transform for the other side, so the
 * two sides are the same drawing rather than two that drift apart.
 */
export function LogoSprig({ size = 46 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 2.2}
      viewBox="0 0 46 101"
      aria-hidden="true"
      {...line}
      strokeWidth={1}
    >
      {/* main stem */}
      <path d="M34 2c-9 12-13 24-11 37 2 13 7 24 6 36-1 10-6 18-13 24" />
      {/* side stems */}
      <path d="M27 24c-7-3-13-1-16 4" />
      <path d="M25 47c7-4 14-2 17 4" />
      <path d="M22 72c-7-2-13 1-15 7" />
      <Blossom cx={9} cy={26} r={7} />
      <Blossom cx={41} cy={53} r={6} />
      <Blossom cx={7} cy={81} r={6.5} />
      <Leaf x={24} y={14} length={13} angle={-38} />
      <Leaf x={26} y={38} length={12} angle={28} />
      <Leaf x={23} y={60} length={13} angle={-24} />
      <Leaf x={19} y={88} length={11} angle={34} />
    </svg>
  );
}

/**
 * A flowering spray. Sits above "Browse" in the rail and beside the results
 * heading, where the reference puts a small botanical drawing.
 */
export function Sprig({ size = 72 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.82}
      viewBox="0 0 72 59"
      aria-hidden="true"
      {...line}
      strokeWidth={1}
    >
      <path d="M3 56C13 42 26 29 45 19" />
      <path d="M17 41c-5-6-4-13 2-16 5-2 10 1 10 7" />
      <path d="M33 28c-3-8 1-15 8-16 6-1 10 4 9 10" />
      <Blossom cx={57} cy={13} r={8} />
      <Blossom cx={66} cy={31} r={6} />
      <Leaf x={12} y={47} length={14} angle={-30} />
      <Leaf x={28} y={33} length={13} angle={-34} />
      <Leaf x={42} y={22} length={12} angle={-40} />
    </svg>
  );
}

/** A stack of books, drawn in perspective. Foot of the filter rail. */
export function BookStack({ size = 86 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.84}
      viewBox="0 0 86 72"
      aria-hidden="true"
      {...line}
      strokeWidth={1}
    >
      <path d="M6 66h58M6 66V56l58-6v10zM6 56 12 48l58-6-6 8" />
      <path d="M10 54h52M10 60h52" />
      <path d="M14 44V34l50-6v10zM14 34l6-8 50-6-6 8" />
      <path d="M18 32h46" />
      <path d="M20 22V13l46-5v9zM20 13l6-7 46-5-6 7" />
    </svg>
  );
}

/**
 * The shopfront: two brick blocks under a cornice, a row of awnings, a grid of
 * windows, street trees, a spire behind — and the blade sign.
 *
 * The sign carries the STORE'S OWN name, one letter per line, so a merchant
 * who is not Powell's gets their own blade rather than someone else's. The
 * blade sizes itself to the letter count instead of clipping.
 */
export function Storefront({ signText = "", width = 300 }: { signText?: string; width?: number }) {
  const letters = signText.replace(/\s+/g, "").slice(0, 8).toUpperCase().split("");
  const step = 11;
  const signHeight = Math.max(30, letters.length * step + 8);

  return (
    <svg
      width={width}
      height={width * 0.52}
      viewBox="0 0 300 156"
      aria-hidden="true"
      {...line}
      strokeWidth={0.9}
    >
      {/* street line */}
      <path d="M0 152h300" />

      {/* spire behind, right */}
      <path d="M258 152V86l10-16 10 16v66" />
      <path d="M268 70V54M262 86h12M262 100h12M262 114h12" />

      {/* left block */}
      <path d="M18 152V58l58-22 58 22v94" />
      <path d="M12 58h128M12 64h128" />
      {[0, 1, 2].map((row) => (
        <g key={`lw-${row}`}>
          {[0, 1, 2, 3].map((col) => (
            <rect
              key={col}
              x={30 + col * 26}
              y={76 + row * 24}
              width={17}
              height={17}
              rx="1"
            />
          ))}
        </g>
      ))}

      {/* right block */}
      <path d="M140 152V72l70-24 70 24v80" />
      <path d="M134 72h152M134 78h152" />
      {[0, 1, 2].map((row) => (
        <g key={`rw-${row}`}>
          {[0, 1, 2, 3, 4].map((col) => (
            <rect
              key={col}
              x={152 + col * 26}
              y={90 + row * 22}
              width={17}
              height={15}
              rx="1"
            />
          ))}
        </g>
      ))}

      {/* awnings over the ground floor */}
      <path d="M24 140h252" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <path key={`aw-${i}`} d={`M${28 + i * 28} 140 l6 -9 h16 l6 9 z`} />
      ))}

      {/* street trees, left */}
      <g>
        <path d="M8 152v-22" />
        <circle cx="8" cy="122" r="11" />
        <circle cx="2" cy="130" r="7" />
        <path d="M300 152v-20" />
      </g>

      {/* blade sign */}
      {letters.length > 0 && (
        <>
          <path d={`M212 ${26 + signHeight}v-6`} />
          <rect
            x="204"
            y="20"
            width="18"
            height={signHeight}
            rx="2"
            fill="currentColor"
            stroke="none"
          />
          {letters.map((ch, i) => (
            <text
              key={`${ch}-${i}`}
              x="213"
              y={32 + i * step}
              fontFamily="Georgia, serif"
              fontSize="8.5"
              fill="var(--pw-band-bot, #ded4f3)"
              stroke="none"
              textAnchor="middle"
            >
              {ch}
            </text>
          ))}
        </>
      )}
    </svg>
  );
}

/** Four-point star. Also marks a heading, so it takes a size. */
export function Twinkle({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 0l2 10 10 2-10 2-2 10-2-10-10-2 10-2z" />
    </svg>
  );
}

/* ── Scenes ─────────────────────────────────────────────────────────────────
   The larger drawings for empty states and editorial panels. Same language as
   the marginalia — thin line in currentColor — set on a pale lavender field
   (`--pw-scene-field`), so every one of them reads as part of one hand. */

function Scene({ width, children }: { width: number; children: ReactNode }) {
  return (
    <svg
      className="pw-scene"
      width={width}
      height={width * 0.75}
      viewBox="0 0 240 180"
      aria-hidden="true"
      {...line}
      strokeWidth={1.3}
    >
      <ellipse cx="120" cy="96" rx="96" ry="72" fill="var(--pw-scene-field)" stroke="none" />
      {children}
    </svg>
  );
}

/** An empty tote with a bookmark ribbon: the cart with nothing in it yet. */
export function SceneEmptyBag({ width = 220 }: { width?: number }) {
  return (
    <Scene width={width}>
      <path d="M70 70h100l-8 84H78z" fill="var(--pw-paper)" />
      <path d="M96 70c0-22 10-34 24-34s24 12 24 34" />
      <path d="M150 70v44l-7-6-7 6V70" fill="var(--pw-scene-field)" />
      <Blossom cx={62} cy={150} r={8} />
      <Leaf x={66} y={160} length={16} angle={-20} />
      <path d="M186 58l4-10 4 10-10-4 10-4z" />
    </Scene>
  );
}

/** A magnifier over an open book with nothing on its pages: no results. */
export function SceneSearch({ width = 220 }: { width?: number }) {
  return (
    <Scene width={width}>
      <path d="M52 118c22-10 46-10 68 2 22-12 46-12 68-2v34c-22-10-46-10-68 2-22-12-46-12-68-2z" fill="var(--pw-paper)" />
      <path d="M120 120v34" />
      <path d="M64 128c14-5 30-5 44 1M132 129c14-6 30-6 44-1" strokeOpacity="0.45" strokeDasharray="3 4" />
      <circle cx="150" cy="70" r="26" fill="var(--pw-paper)" />
      <path d="M168 89l22 22" strokeWidth={3} />
      <path d="M144 64c0-6 12-6 12 0 0 5-6 5-6 11M150 82v1" />
    </Scene>
  );
}

/** A shelf with one book fallen over: the page that isn't there. */
export function SceneLost({ width = 220 }: { width?: number }) {
  return (
    <Scene width={width}>
      <path d="M40 132h160M40 138h160" />
      <rect x="64" y="72" width="16" height="60" rx="1" fill="var(--pw-paper)" />
      <rect x="82" y="80" width="14" height="52" rx="1" fill="var(--pw-paper)" />
      <path d="M100 132l18-58 14 4-18 58" fill="var(--pw-paper)" />
      <path d="M146 132v-10l44-12v10z" fill="var(--pw-paper)" />
      <path d="M170 60c8-8 20-6 22 4" />
      <path d="M58 52l3-8 3 8-8-3 8-3z" />
    </Scene>
  );
}

/** A gift card tied with ribbon, a book tucked behind it. */
export function SceneGift({ width = 220 }: { width?: number }) {
  return (
    <Scene width={width}>
      <rect x="116" y="44" width="46" height="70" rx="2" fill="var(--pw-paper)" transform="rotate(8 139 79)" />
      <rect x="54" y="74" width="120" height="74" rx="8" fill="var(--pw-paper)" />
      <path d="M54 102h120M100 74v74" />
      <path d="M100 102c-16-18-30-10-22-2 6 6 22 2 22 2zM100 102c14-18 30-12 22-2-6 6-22 2-22 2z" />
      <path d="M140 126h22M140 134h14" strokeOpacity="0.55" />
    </Scene>
  );
}

/** A magnifier held over a book's worn corner, a grade tag on a string. */
export function SceneGrading({ width = 220 }: { width?: number }) {
  return (
    <Scene width={width}>
      <rect x="62" y="40" width="70" height="104" rx="3" fill="var(--pw-paper)" transform="rotate(-6 97 92)" />
      <path d="M72 44l-2 100" strokeOpacity="0.5" transform="rotate(-6 97 92)" />
      <path d="M84 70h34M84 78h24" strokeOpacity="0.5" transform="rotate(-6 97 92)" />
      <path d="M122 40l10 10" transform="rotate(-6 97 92)" />
      <circle cx="140" cy="104" r="28" fill="var(--pw-paper)" fillOpacity="0.7" />
      <path d="M160 124l24 24" strokeWidth={3} />
      <path d="M130 96c4 3 8 3 12 0M128 108c6 2 12 2 18-1" strokeOpacity="0.6" />
      <path d="M160 52c8 4 14 10 16 18" strokeDasharray="2 3" />
      <rect x="168" y="68" width="30" height="18" rx="3" fill="var(--pw-paper)" transform="rotate(14 183 77)" />
      <path d="M176 77h14" transform="rotate(14 183 77)" />
    </Scene>
  );
}

/** An envelope with a book slipped inside: the reading club letter. */
export function SceneLetter({ width = 220 }: { width?: number }) {
  return (
    <Scene width={width}>
      <rect x="92" y="34" width="56" height="78" rx="2" fill="var(--pw-paper)" transform="rotate(-8 120 73)" />
      <path d="M104 52h30M104 60h20" strokeOpacity="0.5" transform="rotate(-8 120 73)" />
      <path d="M58 86h124v62H58z" fill="var(--pw-paper)" />
      <path d="M58 86l62 38 62-38" />
      <path d="M58 148l46-34M182 148l-46-34" strokeOpacity="0.6" />
      <circle cx="120" cy="124" r="7" fill="var(--pw-scene-field)" />
      <Blossom cx={190} cy={70} r={7} />
      <Leaf x={186} y={80} length={14} angle={70} />
      <path d="M44 60l3-8 3 8-8-3 8-3z" />
    </Scene>
  );
}

/** An open book, a cup and a sprig: the shop's own reading table. */
export function SceneReading({ width = 220 }: { width?: number }) {
  return (
    <Scene width={width}>
      <path d="M44 146h152" />
      <path d="M58 136c20-14 42-14 62-2 20-12 42-12 62 2v8c-20-12-42-12-62 2-20-14-42-14-62-2z" fill="var(--pw-paper)" />
      <path d="M120 134v12" />
      <path d="M70 124c14-7 30-7 42 0M128 124c12-7 28-7 42 0" strokeOpacity="0.45" />
      <path d="M150 84h30v18c0 10-6 16-15 16s-15-6-15-16z" fill="var(--pw-paper)" />
      <path d="M180 90c8 0 8 12 0 12" />
      <path d="M160 76c-3-5 3-8 0-13M170 76c-3-5 3-8 0-13" strokeOpacity="0.6" />
      <path d="M62 118C68 96 80 80 98 70" />
      <Blossom cx={98} cy={66} r={7} />
      <Leaf x={70} y={104} length={14} angle={-50} />
      <Leaf x={82} y={86} length={12} angle={-30} />
    </Scene>
  );
}

/* ── Icons ──────────────────────────────────────────────────────────────── */

export function IconArrow({ size = 16 }: { size?: number }) {
  return (
    <svg className="pw-arrow" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...line} strokeWidth={1.8}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconSearch({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
    >
      <circle cx="8.5" cy="8.5" r="6" />
      <path d="M13 13l5 5" />
    </svg>
  );
}

export function IconCart({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 2h2.6l2.2 10.4h8.6l1.8-7.4H5.4" />
      <circle cx="8" cy="17" r="1.4" />
      <circle cx="15" cy="17" r="1.4" />
    </svg>
  );
}

export function IconHeart({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.93}
      viewBox="0 0 16 15"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
    >
      <path d="M8 13.5C4 10.5 1 8.2 1 5.4 1 3.2 2.7 1.5 4.8 1.5c1.3 0 2.5.7 3.2 1.7.7-1 1.9-1.7 3.2-1.7C13.3 1.5 15 3.2 15 5.4c0 2.8-3 5.1-7 8.1z" />
    </svg>
  );
}

export function IconChevron({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.67}
      viewBox="0 0 12 8"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
    >
      <path d="M1 1l5 5 5-5" />
    </svg>
  );
}

export function IconMenu({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
    >
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </svg>
  );
}

export function IconClose({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
    >
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

export function IconTruck({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1.5 4.5h10v8h-10zM11.5 7.5h3.6l3.4 3.2v1.8h-7" />
      <circle cx="5" cy="14.8" r="1.6" />
      <circle cx="14.6" cy="14.8" r="1.6" />
    </svg>
  );
}

export function IconReturn({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 8a6.5 6.5 0 1 1 1.4 6.2" />
      <path d="M3.5 3.5V8H8" />
    </svg>
  );
}

export function IconShield({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 2l6.5 2.5v5c0 4-2.8 7-6.5 8.5C6.3 16.5 3.5 13.5 3.5 9.5v-5z" />
      <path d="M7 10l2.2 2.2L13.3 8" />
    </svg>
  );
}

export function IconEye({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1.5 10S4.6 4.5 10 4.5 18.5 10 18.5 10 15.4 15.5 10 15.5 1.5 10 1.5 10z" />
      <circle cx="10" cy="10" r="2.6" />
    </svg>
  );
}

export function IconUser({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <circle cx="10" cy="7" r="3.4" />
      <path d="M3.5 17.5c1.2-3.2 3.7-4.8 6.5-4.8s5.3 1.6 6.5 4.8" />
    </svg>
  );
}

export function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

export function IconFacebook({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill="currentColor">
      <path d="M11 18v-6.5h2.2l.3-2.6H11V7.3c0-.8.2-1.3 1.3-1.3h1.3V3.7c-.2 0-1-.1-2-.1-2 0-3.3 1.2-3.3 3.4v1.9H6.1v2.6h2.2V18z" />
    </svg>
  );
}

export function IconXLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill="currentColor">
      <path d="M14.6 3h2.5l-5.4 6.2L18 17h-5l-3.9-5.1L4.6 17H2.1l5.8-6.6L2 3h5.1l3.5 4.7zm-.9 12.6h1.4L6.4 4.3H4.9z" />
    </svg>
  );
}

export function IconLinkedin({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill="currentColor">
      <path d="M4.5 7.5h2.8V16H4.5zM5.9 3.4a1.6 1.6 0 110 3.2 1.6 1.6 0 010-3.2zM9 7.5h2.7v1.2c.4-.7 1.3-1.4 2.7-1.4 2.9 0 3.4 1.9 3.4 4.3V16H15v-3.9c0-.9 0-2.2-1.3-2.2s-1.6 1-1.6 2.1v4H9z" />
    </svg>
  );
}

export function IconWhatsapp({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill="currentColor">
      <path d="M10 2.2a7.7 7.7 0 00-6.6 11.7L2.3 17.8l4-1a7.7 7.7 0 103.7-14.6zm0 14a6.3 6.3 0 01-3.2-.9l-.2-.1-2.4.6.6-2.3-.2-.3A6.3 6.3 0 1110 16.2zm3.5-4.7c-.2-.1-1.1-.6-1.3-.6-.2-.1-.3-.1-.4.1l-.6.7c-.1.1-.2.1-.4 0a5.2 5.2 0 01-2.6-2.3c-.2-.3.2-.3.6-1 .1-.1 0-.2 0-.3l-.6-1.4c-.2-.4-.3-.3-.4-.3h-.4a.7.7 0 00-.5.2 2.2 2.2 0 00-.7 1.6 3.8 3.8 0 00.8 2 8.7 8.7 0 003.3 2.9c1.2.5 1.7.6 2.3.5.4-.1 1.1-.5 1.3-.9.2-.4.2-.8.1-.9z" />
    </svg>
  );
}
