/**
 * Tailwind config for the Bazar V3 theme bundle.
 *
 * WHY this exists (the Tailwind-in-bundle decision — see styles.css header):
 * Bazar's 8 sections are authored entirely in Tailwind utility classes
 * (`grid md:grid-cols-2`, `container mx-auto`, `py-12`, arbitrary values like
 * `text-[var(--bz-dark)]`…). The @numueg/theme-plugin copies styles.css
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
    },
  },
  // The rich-text section renders sanitized merchant HTML inside `.prose`.
  plugins: [require("@tailwindcss/typography")],
};
