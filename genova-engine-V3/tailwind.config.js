/**
 * Tailwind config for the Genova V3 theme bundle (Tailwind-in-bundle).
 *
 * src/main.tsx imports src/theme.css; Vite's PostCSS step compiles the
 * `@tailwind` directives + the `gn-*` component classes into dist/theme.css.
 *
 * ⚠ EVERY colour a section references through a utility class MUST be
 * registered here. Tailwind only emits `bg-canvas` / `text-ink` if `canvas` /
 * `ink` exist in this map — an unregistered token produces NO CSS at all and
 * the class is silently dead in the browser. (This has bitten the fleet before;
 * see the gilded-glamour rebuild note.) Add the CSS var in src/theme.css AND
 * the key here, always as a pair.
 *
 * ⚠ `@layer components` CLASSES ARE PURGED WHEN UNUSED. The `gn-btn` /
 * `gn-chip` / `gn-plate` primitives in src/theme.css only reach dist/theme.css
 * if the literal class string appears in a file matched by `content` below.
 * Two consequences:
 *   - never build a class name dynamically (`gn-btn-${variant}`) — Tailwind
 *     cannot see it and the CSS is silently absent in production;
 *   - a class referenced only from a schema default, a locale string, or
 *     injected HTML needs an entry in `safelist` here.
 * (Measured at WP0: with no sections written yet, everything except
 * `.gn-container` and `.gn-label` was correctly purged.)
 *
 * ⚠ NO ALPHA MODIFIERS. These values are plain hex behind a `var()`, not the
 * `<alpha-value>` channel form, so `bg-ink/50` compiles to nothing usable.
 * Genova is monochrome and shadowless by design — if you need translucency,
 * add an explicit token (`--gn-overlay` is the pattern) rather than reaching
 * for a slash opacity.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,js,jsx}", "./index.html"],
  theme: {
    screens: {
      xs: "430px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        // ── Surfaces ──
        canvas: "var(--gn-canvas)",
        surface: "var(--gn-surface)",
        media: "var(--gn-media-bg)",
        // ── Ink ──
        ink: {
          DEFAULT: "var(--gn-ink)",
          soft: "var(--gn-ink-soft)",
        },
        muted: {
          DEFAULT: "var(--gn-muted)",
          soft: "var(--gn-muted-2)",
        },
        // ── Hairlines ──
        line: {
          DEFAULT: "var(--gn-line)",
          strong: "var(--gn-line-strong)",
        },
        // ── Inverted band (announcement ticker, offer strips) ──
        ticker: {
          DEFAULT: "var(--gn-ticker-bg)",
          fg: "var(--gn-ticker-fg)",
        },
        // ── Buttons ──
        "btn-primary": "var(--gn-btn-primary-bg)",
        "btn-primary-fg": "var(--gn-btn-primary-fg)",
        "btn-secondary": "var(--gn-btn-secondary-bg)",
        "btn-secondary-fg": "var(--gn-btn-secondary-fg)",
        // ── Scrims ──
        overlay: "var(--gn-overlay)",
      },
      fontFamily: {
        sans: ["var(--gn-font-body)", "system-ui", "sans-serif"],
        heading: ["var(--gn-font-heading)", "var(--gn-font-body)", "system-ui", "sans-serif"],
        body: ["var(--gn-font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        // Cards are sharp (editorial); buttons are full pills; swatches 6px.
        none: "0",
        swatch: "6px",
        pill: "999px",
      },
      maxWidth: {
        container: "var(--gn-container)",
        prose: "72ch",
      },
      spacing: {
        gutter: "var(--gn-gutter)",
      },
      transitionTimingFunction: {
        gn: "var(--gn-ease)",
      },
      aspectRatio: {
        product: "3 / 4",
      },
    },
  },
  plugins: [],
};
