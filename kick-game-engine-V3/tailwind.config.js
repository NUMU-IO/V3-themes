/**
 * Tailwind config for the Kick Game V3 theme bundle (Tailwind-in-bundle — see
 * vionne / bazar for the full rationale). Kick Game's V2 page sections (the
 * product-detail / products-page / profile / order-confirmation ports cloned
 * from vionne) are authored in Tailwind utility classes (`py-10 md:py-14`,
 * `grid grid-cols-[...]`, `bg-background`, arbitrary values like
 * `text-[var(--kg-ink)]`). src/main.tsx imports src/theme.css; Vite's PostCSS
 * step compiles these into dist/theme.css.
 *
 * The `colors` extend maps shadcn semantic names to the HSL channel vars that
 * src/theme.css (ported from V2 kick-game styles.css) defines, so
 * `bg-background` / `text-foreground` / `bg-muted` etc. resolve to the Kick
 * Game palette.
 */

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
        whatsapp: "hsl(var(--whatsapp))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--body-font)", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        heading: ["var(--heading-font)", "var(--body-font)", "sans-serif"],
        body: ["var(--body-font)", "Helvetica Neue", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
