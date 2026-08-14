import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { numuTheme } from "@numueg/theme-plugin";
import { transform } from "esbuild";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Whitespace-minify the emitted theme chunks.
 *
 * `build.minify` cannot do this in an ES **library** build. Vite hard-codes the
 * carve-out (`resolveEsbuildTranspileOptions`): when `isEsLibBuild` it forces
 * `minifyWhitespace: false` even when the option is set explicitly. So
 * identifiers get shortened and syntax compacted (`autoplay: !0`) but every
 * block comment and all 2-space indentation survives — which is why all 16 V3
 * themes shipped unminified and Lighthouse charged vionne 37 KiB of
 * `unminified-javascript` before this pass was added there.
 *
 * Vite's reason for the carve-out is that a published ES library is normally
 * re-bundled (and thus minified) by its consumer. A NUMU theme is the opposite:
 * it is a LEAF artifact the storefront `import()`s straight over the network
 * from an immutable-cached CDN URL. Nothing downstream will ever minify it.
 *
 * `generateBundle`, NOT `renderChunk`: Vite appends its internal
 * `vite:esbuild-transpile` plugin AFTER user "post" plugins, so a renderChunk
 * hook here runs first and Vite's pass then re-prints the AST with
 * `minifyWhitespace: false`, pretty-printing our output straight back. Every
 * renderChunk has completed by the time generateBundle runs, so rewriting the
 * chunk here is the last word.
 *
 * NOTE: this belongs in `@numueg/theme-plugin` (0.6.0 doesn't do it). Until it
 * lands there, every theme needs its own copy — this is the vionne one.
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
 * Emit the self-hosted webfonts as real files and prepend their @font-face
 * rules to dist/theme.css.
 *
 * Why not just `@import "./fonts.css"` and let Vite handle it: in LIBRARY mode
 * Vite inlines every asset referenced from CSS as a base64 data URI and ignores
 * `build.assetsInlineLimit` while doing it. Measured: theme.css went 51 KB →
 * 368 KB (248 KB gzipped), it became render-blocking at that size, and — worst
 * of all — inlining destroys `unicode-range`, so every shopper downloaded the
 * six Arabic faces even on a page with no Arabic character on it.
 *
 * Writing the CSS text ourselves at generateBundle time keeps the url()
 * opaque to Vite. `_deploy-bundle-r2.py` walks dist/ recursively and already
 * maps `.woff2`, so `dist/fonts/*` reaches the CDN beside theme.css and the
 * relative URL resolves.
 */
function emitFonts(): PluginOption {
  return {
    name: "numu:emit-fonts",
    // "post" for the same reason the minifier needs it: Vite's own CSS plugin
    // runs after normal-phase user plugins, so theme.css is not in the bundle
    // yet at that point and the prepend silently no-ops.
    enforce: "post",
    apply: "build",
    generateBundle(_options, bundle) {
      const dir = path.resolve(__dirname, "src/fonts");
      if (!fs.existsSync(dir)) return;

      // The plugin runs a SECOND, nested build for dist/theme.server.js. Skip
      // it: there is no stylesheet to patch there, and re-emitting the fonts
      // would duplicate them.
      //
      // The discriminator is the `theme.js` CHUNK, not "does a .css asset
      // exist" — the SSR pass still emits a stray `style-*.css`, which is
      // exactly what made the first version of this guard fail the build.
      const isClientBuild = Object.entries(bundle).some(
        ([n, o]) => o.type === "chunk" && n === "theme.js",
      );
      if (!isClientBuild) return;

      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith(".woff2")) continue;
        this.emitFile({
          type: "asset",
          // Exact name, not a hash: the CSS below references it literally, and
          // the CDN path is already immutable per theme VERSION.
          fileName: `fonts/${file}`,
          source: fs.readFileSync(path.join(dir, file)),
        });
      }

      const faceCss = fs.readFileSync(path.resolve(__dirname, "src/fonts.css"), "utf8");
      let patched = false;
      for (const [name, output] of Object.entries(bundle)) {
        if (name !== "theme.css" || output.type !== "asset") continue;
        output.source = `${faceCss}\n${String(output.source)}`;
        patched = true;
      }
      // Fail the build rather than no-op. Without the `enforce: "post"` above,
      // theme.css is not in the bundle yet and this loop silently matched
      // nothing — producing a theme that renders in a system fallback on every
      // device. Visually plausible, completely wrong, and invisible in CI.
      if (!patched) {
        this.error("numu:emit-fonts: no theme.css asset to prepend @font-face to");
      }
    },
  };
}

/**
 * Copy `templates/*.html` into dist so the declared error/loading states can
 * actually be served.
 *
 * theme.json declares `error_template: "templates/error.html"` and the plugin
 * copies that PATH into manifest.json — but nothing copies the FILE. dist/ has
 * no `templates/` directory, `_deploy-bundle-r2.py` uploads dist/ recursively,
 * so nothing ever reaches `<slug>/<version>/templates/error.html` on the CDN.
 * The host resolves `external_theme.error_template_url` and gets a 404.
 *
 * Verified fleet-wide: vionne, bazar and luxury-minimal all declare the same
 * path and none of them ship the file either — so every V3 theme currently
 * promises a branded failure state and delivers the host's generic one. Same
 * shape as the inert `locales/` bug: declared, carried through the manifest,
 * never actually wired.
 *
 * Fixing it here fixes Genova. The durable fix belongs in
 * `@numueg/theme-plugin`, which is what writes the manifest entry in the first
 * place and is the only place that can fix it for the other fifteen themes.
 */
function emitStaticTemplates(): PluginOption {
  return {
    name: "numu:emit-static-templates",
    enforce: "post",
    apply: "build",
    generateBundle(_options, bundle) {
      const dir = path.resolve(__dirname, "templates");
      if (!fs.existsSync(dir)) return;

      // Client build only — the nested SSR pass would duplicate these.
      // Same discriminator as emitFonts(), and for the same reason.
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
 * Genova V3 build config.
 *
 * Tailwind-in-bundle: src/main.tsx imports src/theme.css, whose `@tailwind`
 * directives + the `gn-*` component classes are compiled by Vite's PostCSS
 * step. `cssFileName: "theme"` makes Vite emit the COMPILED stylesheet as
 * dist/theme.css — the exact name the host loads via
 * `external_theme.css_url` — so the plugin's fallback copy of the root
 * styles.css no-ops.
 */
export default defineConfig({
  plugins: [
    react(),
    numuTheme({ federate: true }) as unknown as PluginOption,
    emitFonts(),
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
    /**
     * Emit assets as FILES, never base64.
     *
     * Vite's library mode inlines assets far more aggressively than an app
     * build — a library can't assume its consumer will serve an asset
     * directory. For a theme that assumption is wrong: `_deploy-bundle-r2.py`
     * uploads the whole `dist/` tree recursively (and already maps `.woff2`),
     * so files resolve fine relative to theme.css on the CDN.
     *
     * Leaving it at the default inlined all 8 self-hosted font faces into the
     * stylesheet: **51 KB → 368 KB (248 KB gzipped)**, render-blocking, and it
     * destroyed the whole point of `unicode-range` — every shopper downloaded
     * the Arabic faces whether or not the page had a single Arabic character.
     */
    assetsInlineLimit: 0,
  },
  server: { port: 5173 },
});
