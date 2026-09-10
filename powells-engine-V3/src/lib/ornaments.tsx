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

/* ── Icons ──────────────────────────────────────────────────────────────── */

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
