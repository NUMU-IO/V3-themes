/**
 * PostCSS pipeline for the Empire V3 theme.
 *
 * Vite picks this up automatically when it processes the CSS that
 * src/main.tsx imports (src/theme.css). That runs Tailwind's JIT
 * compiler over the `@tailwind` directives + autoprefixes the result,
 * and Vite emits the compiled output as dist/theme.css. See
 * tailwind.config.js / styles.css for the full rationale.
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
