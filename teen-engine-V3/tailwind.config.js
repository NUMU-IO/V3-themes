/**
 * Tailwind config for the Teen V3 theme bundle (Tailwind-in-bundle).
 *
 * src/main.tsx imports src/theme.css; Vite's PostCSS step compiles the
 * `@tailwind` directives + the `tn-*` component classes into dist/theme.css.
 *
 * ⚠ EVERY colour a section references through a utility class MUST be
 * registered here. Tailwind only emits `bg-paper` / `text-ink` if `paper` /
 * `ink` exist in this map — an unregistered token produces NO CSS at all and
 * the class is silently dead in the browser. Add the CSS var in src/theme.css
 * AND the key here, always as a pair.
 *
 * ⚠ `@layer components` CLASSES ARE PURGED WHEN UNUSED. The `tn-btn` /
 * `tn-badge` / `tn-card` primitives in src/theme.css only reach dist/theme.css
 * if the literal class string appears in a file matched by `content` below.
 * Two consequences:
 *   - never build a class name dynamically (`tn-btn-${variant}`) — Tailwind
 *     cannot see it and the CSS is silently absent in production;
 *   - a class referenced only from a schema default, a locale string, or
 *     injected HTML needs an entry in `safelist`.
 *
 * ⚠ NO ALPHA MODIFIERS. These values are plain hex behind a `var()`, not the
 * `<alpha-value>` channel form, so `bg-ink/50` compiles to nothing usable. Add
 * an explicit token (`--tn-overlay` is the pattern) instead of reaching for a
 * slash opacity.
 *
 * The `screens` map is the REFERENCE's ladder, not Tailwind's defaults — read
 * out of shopsleekz's own base.css (D12). `xs`/`mobile`/`tablet`/`desktop` are
 * the names used throughout the theme; the numeric Tailwind defaults are kept
 * as aliases so a stray `md:` from muscle memory still compiles to something
 * sane rather than nothing.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,js,jsx}", "./index.html"],
  theme: {
    screens: {
      xs: "430px",
      tablet: "750px",
      desktop: "990px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1340px",
    },
    extend: {
      colors: {
        // ── Surfaces ──
        paper: "var(--tn-paper)",
        plate: "var(--tn-plate)",
        wash: "var(--tn-wash)",
        // ── Ink ──
        ink: {
          DEFAULT: "var(--tn-ink)",
          2: "var(--tn-ink-2)",
          soft: "var(--tn-ink-soft)",
        },
        muted: "var(--tn-muted)",
        // ── Hairlines ── (`line` = inner divider, `line-strong` = the 1px
        // near-black outline that defines every card and the header capsule)
        line: {
          DEFAULT: "var(--tn-line)",
          strong: "var(--tn-ink)",
        },
        // ── The three accents. Three jobs, no overlap:
        //    primary = buy / on-sale badge, sale = the sale PRICE text,
        //    lime = the discount quantum. A fourth accent is a bug.
        primary: {
          DEFAULT: "var(--tn-primary)",
          fg: "var(--tn-primary-fg)",
        },
        sale: "var(--tn-sale)",
        alert: "var(--tn-alert)",
        lime: {
          DEFAULT: "var(--tn-lime)",
          ink: "var(--tn-lime-ink)",
        },
        cream: "var(--tn-cream)",
        // ── Offer tiles inside the bundle chooser ──
        offer: {
          DEFAULT: "var(--tn-offer-tile)",
          active: "var(--tn-offer-tile-active)",
        },
        // ── Misc semantic ──
        assure: "var(--tn-assure)",
        soldout: "var(--tn-soldout)",
        overlay: "var(--tn-overlay)",
      },
      fontFamily: {
        sans: ["var(--tn-font-body)", "system-ui", "sans-serif"],
        heading: ["var(--tn-font-heading)", "var(--tn-font-body)", "system-ui", "sans-serif"],
        body: ["var(--tn-font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "var(--tn-r-card)",
        panel: "var(--tn-r-panel)",
        chip: "var(--tn-r-chip)",
        pill: "999px",
      },
      maxWidth: {
        container: "var(--tn-container)",
        prose: "72ch",
      },
      spacing: {
        gutter: "var(--tn-gutter)",
        section: "var(--tn-section-y)",
      },
      transitionTimingFunction: {
        tn: "var(--tn-ease)",
      },
      aspectRatio: {
        product: "3 / 4",
      },
    },
  },
  plugins: [],
};
