/**
 * Tailwind config for the Gilded Glamour Boutique V3 theme bundle
 * (Tailwind-in-bundle — see bazar/vionne configs for the full rationale).
 * Gilded's V2 sections are authored in Tailwind utility classes
 * (`py-12 md:py-20`, `grid grid-cols-[...]`, `bg-foreground`, `text-card`,
 * arbitrary values like `bg-[hsl(var(--gold))]`). src/main.tsx imports
 * src/theme.css; Vite's PostCSS step compiles these into dist/theme.css.
 *
 * The `colors` extend maps shadcn semantic names to the HSL channel vars that
 * src/theme.css (ported from V2 gilded styles.css) defines, so `bg-background`
 * / `text-foreground` / `bg-card` / `text-muted-foreground` etc. from the
 * ported sections resolve.
 */

/**
 * Brand-token color factory: makes a CSS-variable colour opacity-aware so that
 * Tailwind variant + opacity forms work (`text-gold`, `hover:text-gold`,
 * `border-gold/40`, `bg-gold/10`). Without registering these in `colors`,
 * `hover:`/`focus:` variants and `/opacity` modifiers on hand-written helper
 * classes are silently dropped. `--gilded-gold(-dark)` are global-wired (the
 * merchant's Accent picker repaints them) so they must read through `var()`.
 */
const varColor = (cssVar) => ({ opacityValue } = {}) =>
  opacityValue === undefined
    ? `var(${cssVar})`
    : `color-mix(in srgb, var(${cssVar}) calc(${opacityValue} * 100%), transparent)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,js,jsx}", "./index.html"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand palette — registered so variant (hover:/focus:) + opacity
        // (/40, /10) forms compile. gold/gold-dark are global-wired (Accent
        // picker repaints); olive/sale/beige are the fixed faithful HSL tokens.
        gold: varColor("--gilded-gold"),
        "gold-dark": varColor("--gilded-gold-dark"),
        olive: "hsl(var(--olive) / <alpha-value>)",
        sale: "hsl(var(--sale) / <alpha-value>)",
        beige: "hsl(var(--beige) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--body-font)", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        heading: ["var(--heading-font)", "var(--body-font)", "serif"],
        body: ["var(--body-font)", "Helvetica Neue", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
