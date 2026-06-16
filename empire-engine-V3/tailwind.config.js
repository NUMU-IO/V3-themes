/**
 * Tailwind config for the Empire V3 theme bundle.
 *
 * WHY this exists (the Tailwind-in-bundle decision — see styles.css header):
 * Empire's sections are authored entirely in Tailwind utility classes
 * (`grid md:grid-cols-2`, `container mx-auto`, `py-12`, arbitrary values like
 * `text-[var(--emp-dark)]`…). The @numueg/theme-plugin copies styles.css
 * verbatim to dist/theme.css and does NOT run Tailwind, so without this
 * pipeline every section would render unstyled. We instead import the CSS
 * entry (src/theme.css) from src/main.tsx; Vite's PostCSS step compiles the
 * `@tailwind` directives and emits dist/theme.css itself, which the plugin
 * then leaves untouched (it only writes the fallback copy when no Vite CSS
 * emit exists).
 *
 * `content` globs the section source so JIT generates exactly the utilities
 * (and arbitrary values) those files use — nothing more.
 */

/** @type {import('tailwindcss').Config} */
export default {
  // Match the V2 bazaar breakpoints so the ported responsive classes
  // (`xs:`, `sm:` … `2xl:`) compile to the same widths the sections expect.
  content: ["./src/**/*.{ts,tsx,js,jsx}", "./index.html"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
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
      fontFamily: {
        sans: ["var(--body-font)", "system-ui", "-apple-system", "sans-serif"],
        heading: ["var(--heading-font)", "system-ui", "sans-serif"],
        body: ["var(--body-font)", "system-ui", "sans-serif"],
      },
      // Semantic color tokens mirror the V2 bazaar Tailwind config so the
      // ported V2 Empire markup (`text-foreground`, `bg-muted`,
      // `text-muted-foreground`, `border-border`, `bg-card`…) compiles to the
      // same HSL custom-property values the theme.css token block defines.
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
      },
    },
  },
  // The rich-text section renders sanitized merchant HTML inside `.prose`.
  plugins: [require("@tailwindcss/typography")],
};
