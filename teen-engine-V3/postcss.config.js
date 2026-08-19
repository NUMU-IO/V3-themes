/**
 * PostCSS pipeline for the Teen V3 theme.
 *
 * Vite picks this up when it processes the CSS that src/main.tsx imports
 * (src/theme.css): Tailwind's JIT compiles the `@tailwind` directives + the
 * `tn-*` component classes, autoprefixes, and Vite emits the result as
 * dist/theme.css.
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
