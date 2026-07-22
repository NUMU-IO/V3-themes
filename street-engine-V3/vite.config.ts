import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { numuTheme } from "@numueg/theme-plugin";

/**
 * Street V3 build config.
 *
 * Tailwind-in-bundle (mirrors vionne / neo-brutalism): src/main.tsx imports
 * src/theme.css, whose `@tailwind` directives + Street's `st-*` classes are
 * compiled by Vite's PostCSS step. `cssFileName: "theme"` makes Vite emit the
 * COMPILED stylesheet as dist/theme.css — the exact name the host loads via
 * external_theme.css_url — so the plugin's fallback copy of styles.css no-ops.
 *
 * `federate: true`: Street was the last theme still bundling its own React and
 * SDK copy, which is the documented dual-React hazard (two Reacts in one page
 * ⇒ null hook dispatcher). It now shares the host's singletons like every
 * other theme.
 */
export default defineConfig({
  plugins: [react(), numuTheme({ federate: true }) as unknown as PluginOption],
  build: {
    lib: {
      entry: "src/main.tsx",
      formats: ["es"],
      fileName: () => "theme.js",
      cssFileName: "theme",
    },
    cssCodeSplit: false,
  },
  server: { port: 5173 },
});
