/**
 * PostCSS pipeline for the Modern V3 theme.
 *
 * Vite picks this up when it processes the CSS that src/main.tsx imports
 * (src/theme.css): Tailwind's JIT compiles the `@tailwind` directives + the
 * V2 modern utility classes the sections use, autoprefixes, and Vite emits
 * the result as dist/theme.css. Mirrors the vionne/bazar theme's setup.
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
