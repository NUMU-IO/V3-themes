import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { numuTheme } from "@numueg/theme-plugin";
import { transform } from "esbuild";

/**
 * Whitespace-minify the emitted theme chunks.
 *
 * `build.minify` cannot do this in an ES **library** build. Vite hard-codes the
 * carve-out (vite 6 `resolveEsbuildTranspileOptions`, dist/node/chunks/
 * dep-*.js): when `isEsLibBuild` it returns `minifyWhitespace: false`, and the
 * branch above it forces the same value even when the option is set
 * explicitly. So identifiers get shortened and syntax gets compacted
 * (`autoplay: !0`) but every block comment and all 2-space indentation
 * survives. That is why the deployed 0.7.0 bundle was 426,824 bytes across
 * 9,816 lines with 1,062 block comments and Lighthouse charged it 37 KiB of
 * `unminified-javascript` — and why a clean local build of 0.7.1 reproduced it
 * byte for byte. It was never a deploy-pipeline bug, and setting
 * `build.minify: "esbuild"` is a no-op (verified: byte-identical output).
 *
 * Vite's reason for the carve-out is that a published ES library is usually
 * re-bundled by its consumer, which would minify anyway. A NUMU theme is the
 * opposite: it is a LEAF artifact that the storefront `import()`s straight over
 * the network from an immutable-cached CDN URL. Nothing downstream will ever
 * minify it, so we do it here.
 *
 * NOTE: this belongs in `@numueg/theme-plugin` — none of the 16 V3 themes sets
 * `minify`, the plugin (0.6.0) doesn't either, and every theme therefore ships
 * unminified. This local copy fixes vionne only; see the fleet note in
 * `REports/vionne & theme performance and AEO/VIONNE-STORE-FIX-PLAN.md` §WP6.
 */
function minifyThemeBundle(): PluginOption {
  return {
    name: "numu:minify-theme-bundle",
    enforce: "post",
    apply: "build",
    // `generateBundle`, NOT `renderChunk`. Vite's internal
    // `vite:esbuild-transpile` plugin is appended AFTER user "post" plugins, so
    // a renderChunk here runs FIRST and Vite's pass then re-prints the AST with
    // `minifyWhitespace: false` — which pretty-prints our minified output
    // straight back to 2-space indentation. (Measured: comments were stripped,
    // 426,827 → 340,113 bytes, but the indentation returned.) Every
    // `renderChunk` hook has completed by the time `generateBundle` runs, so
    // rewriting the chunk here is the last word.
    async generateBundle(_options, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type !== "chunk" || !fileName.endsWith(".js")) continue;
        const out = await transform(output.code, {
          loader: "js",
          format: "esm",
          // esnext: minify only. Downlevelling here would silently change the
          // browser support matrix of every theme without anyone asking for it.
          target: "esnext",
          minify: true,
          legalComments: "none",
        });
        output.code = out.code;
      }
    },
  };
}

/**
 * Vionne V3 build config.
 *
 * Tailwind-in-bundle (mirrors bazar): src/main.tsx imports src/theme.css,
 * whose `@tailwind` directives + the ported V2 vionne utility classes are
 * compiled by Vite's PostCSS step. `cssFileName: "theme"` makes Vite emit the
 * COMPILED stylesheet as dist/theme.css (the exact name the host loads via
 * external_theme.css_url), so the plugin's fallback-copy of styles.css no-ops.
 */
export default defineConfig({
  plugins: [
    react(),
    numuTheme({ federate: true }) as unknown as PluginOption,
    minifyThemeBundle(),
  ],
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
