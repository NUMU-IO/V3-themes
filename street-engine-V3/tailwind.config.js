/**
 * Tailwind config for the Street V3 theme bundle (Tailwind-in-bundle — same
 * setup as vionne and neo-brutalism). Street's sections are authored in
 * Tailwind utilities plus the `st-*` component classes defined in
 * `src/theme.css`; `src/main.tsx` imports that file and Vite's PostCSS step
 * compiles both into `dist/theme.css`.
 *
 * Before this the theme had NO Tailwind at all, so every utility class in its
 * sections was inert — one of several reasons it never rendered.
 *
 * The `colors` extend maps the shadcn semantic names onto the HSL channel vars
 * `src/theme.css` defines, so `bg-background` / `text-foreground` / `bg-muted`
 * resolve to Street's palette rather than nothing.
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
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--body-font)", "Cairo", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["var(--heading-font)", "var(--body-font)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
