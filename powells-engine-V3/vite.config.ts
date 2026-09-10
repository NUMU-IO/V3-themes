import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { numuTheme } from "@numueg/theme-plugin";
import { transform } from "esbuild";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Whitespace-minify the emitted theme chunks.
 *
 * `build.minify` cannot do this in an ES **library** build — Vite hard-codes
 * the carve-out (`resolveEsbuildTranspileOptions`): when `isEsLibBuild` it
 * forces `minifyWhitespace: false` even when the option is set explicitly.
 * Identifiers get shortened but every comment and all indentation survives,
 * which is how the whole V3 fleet shipped unminified.
 *
 * Vite's reasoning is that a published ES library gets re-bundled by its
 * consumer. A NUMU theme is the opposite: a LEAF artifact the storefront
 * `import()`s straight from an immutable CDN URL. Nothing downstream will
 * ever minify it.
 *
 * `generateBundle`, NOT `renderChunk`: Vite appends its internal
 * `vite:esbuild-transpile` plugin AFTER user "post" plugins, so a renderChunk
 * hook here runs first and Vite's pass pretty-prints our output straight back.
 *
 * NOTE: belongs in `@numueg/theme-plugin` (0.6.0 doesn't do it). Until it
 * lands there, every theme needs its own copy.
 */
function minifyThemeBundle(): PluginOption {
  return {
    name: "numu:minify-theme-bundle",
    enforce: "post",
    apply: "build",
    async generateBundle(_options, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type !== "chunk" || !fileName.endsWith(".js")) continue;
        const out = await transform(output.code, {
          loader: "js",
          format: "esm",
          // esnext: minify only. Downlevelling here would silently change the
          // theme's browser support matrix without anyone asking for it.
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
 * Copy `templates/*.html` into dist so the declared error/loading states can
 * actually be served.
 *
 * theme.json declares `error_template` and the plugin copies that PATH into
 * manifest.json — but nothing copies the FILE, so the host's
 * `error_template_url` resolves to a 404 on every theme in the fleet. Same
 * shape as the inert `locales/` bug: declared, carried through the manifest,
 * never wired. The durable fix belongs in `@numueg/theme-plugin`.
 */
function emitStaticTemplates(): PluginOption {
  return {
    name: "numu:emit-static-templates",
    enforce: "post",
    apply: "build",
    generateBundle(_options, bundle) {
      const dir = path.resolve(__dirname, "templates");
      if (!fs.existsSync(dir)) return;

      // Client build only — the plugin runs a second, nested build for
      // dist/theme.server.js and re-emitting would duplicate these.
      const isClientBuild = Object.entries(bundle).some(
        ([n, o]) => o.type === "chunk" && n === "theme.js",
      );
      if (!isClientBuild) return;

      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith(".html")) continue;
        this.emitFile({
          type: "asset",
          fileName: `templates/${file}`,
          source: fs.readFileSync(path.join(dir, file), "utf8"),
        });
      }
    },
  };
}

/**
 * Powell's (V3) build config.
 *
 * No Tailwind: src/main.tsx imports src/theme.css, which is plain scoped CSS
 * compiled by Vite's normal CSS pipeline. `cssFileName: "theme"` emits it as
 * dist/theme.css — the exact name the host loads via
 * `external_theme.css_url` — so the plugin's fallback copy no-ops.
 *
 * Typefaces come from the host's font loader via the `heading_font` /
 * `body_font` / `accent_font` settings, so there is nothing to self-host and
 * no `emitFonts` pass here.
 */
export default defineConfig({
  plugins: [
    react(),
    numuTheme({ federate: true }) as unknown as PluginOption,
    emitStaticTemplates(),
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
    // Emit assets as FILES, never base64: library mode ignores
    // assetsInlineLimit's default and inlines everything a stylesheet touches.
    assetsInlineLimit: 0,
  },
  // 5173 is genova's, 5174 is teen's.
  server: { port: 5175 },
});
