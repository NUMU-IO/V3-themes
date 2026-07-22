/**
 * PostCSS pipeline for the Street V3 theme.
 *
 * Vite picks this up when it processes the CSS `src/main.tsx` imports
 * (`src/theme.css`): Tailwind's JIT compiles the `@tailwind` directives plus
 * Street's `st-*` component classes, autoprefixes, and Vite emits the result
 * as `dist/theme.css` — the exact filename the host loads via
 * `external_theme.css_url`.
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
