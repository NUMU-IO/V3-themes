import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { numuTheme } from "@numueg/theme-plugin";

// The @numueg/theme-plugin handles all the NUMU-specific glue:
//   - validates theme.json + settings_schema.json + entry point
//   - emits dist/manifest.json + dist/import-map.json after build
//
// federate:false → bundle React + @numueg/theme-sdk into the theme bundle
// (self-contained), matching every other v3 theme. Empire was the only theme
// left on the default (federate:true) AND built via `numu-theme build`, which
// emitted an EMPTY manifest (0 sections) + host-federated output the storefront
// couldn't satisfy → the deployed theme was broken. Building with `vite build`
// + federate:false produces the full manifest and a self-contained bundle.

export default defineConfig({
  plugins: [react(), numuTheme({ federate: false })],
  server: { port: 5173 },
});
