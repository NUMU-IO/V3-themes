# NUMU V3 Themes

The fleet of **V3 (BYOT) theme bundles** for the NUMU storefront. Each directory is an independently-versioned Vite project that builds to a federated ESM bundle (`dist/theme.js` + `theme.css` + `manifest.json`) mounted at runtime by [`numu-storefront`](../numu-storefront)'s `ByotThemeBoundary`.

Built on the V3 toolchain: [`@numueg/theme-sdk`](../numu-theme-sdk) · [`@numueg/theme-plugin`](../numu-theme-plugin) · [`@numueg/theme-cli`](../numu-theme-cli).

## Themes

| Theme | Directory |
|-------|-----------|
| Bazar | `bazar-engine-V3/` |
| Bon Younes | `bon-younes-engine-V3/` |
| Boutique | `boutique-engine-V3/` |
| Editorial | `editorial-engine-V3/` |
| Elegant | `elegant-engine-V3/` |
| Empire | `empire-engine-V3/` |
| Gilded Glamour Boutique | `gilded-glamour-boutique-engine-V3/` |
| Kick Game | `kick-game-engine-V3/` |
| Luxury Minimal *(new-store default)* | `luxury-minimal-engine-V3/` |
| Modern | `modern-engine-V3/` |
| Neo Brutalism | `neo-brutalism-engine-V3/` |
| Rabbitsocks | `rabbitsocks-engine-V3/` |
| Skeuomorphic | `skeuomorphic-engine-V3/` |
| Street | `street-engine-V3/` |
| Tech Wave | `tech-wave-engine-V3/` |
| Vionne | `vionne-engine-V3/` |

> Versions live in each theme's `theme.json` (the CLI reads versions from there, **not** `package.json`). Check `theme.json` for the current number before bumping.

## Anatomy of a theme

```text
<name>-engine-V3/
├── theme.json               # id · name · semver version · templates/presets · error/loading templates
├── settings_schema.json     # global settings (Shopify-style SettingDefinition union)
├── schemas/sections/*.json  # one schema per section type (registry-synced with src/sections/)
├── styles.css
├── src/
│   ├── main.tsx             # exports mount() — calls SDK mountTheme(el, ctx, renderApp)
│   ├── sections/            # section components (+ _shared.ts helpers: useDemo, MountPageData, …)
│   └── theme.css
├── templates/               # error.html · loading.html (static fallbacks)
├── vite.config.ts           # wired with @numueg/theme-plugin (federate: true)
└── dist/                    # build output: theme.js · theme.css · manifest.json · import-map.json
```

Shared conventions:
- Every theme has `src/sections/_shared.ts` — `useDemo()` (marketplace-preview vs production), `MountPageData`, CSS prefix (`bz-`, `by-`, …), image-transform helpers.
- Demo imagery is `FALLBACK_*` literals gated by the demo context — never store demo URLs in customizations.
- Image focal/zoom/rotation transforms are non-destructive (`ImageValue.transform`).

## Working on a theme

```bash
cd <name>-engine-V3
npm install
numu-theme dev --store <store-id>   # local dev wired to a store
numu-theme lint --strict            # 12 rules incl. a11y
numu-theme build                    # validate + vite build (warn > 5 MB)
```

**Deploying a new version** (non-destructive, snapshot-first):
1. Bump `version` in `theme.json`.
2. Build; verify `dist/` contents.
3. Upload the bundle; verify the R2/CDN URL returns 200 (fresh uploads can briefly 403 at the edge).
4. Register the version — activation/SSR read the **`theme_versions`** table (`is_latest`), not the marketplace tables.
5. Re-sync `themes.settings_schema` / `section_schemas` from `dist/manifest.json` so the hub editor shows current forms.
6. Snapshot the store's customization, then activate. QA from the **editor** (`/online-store/themes/editor-v3`) first, storefront second.

## Compatibility

- Bundles are **federated** by default: react/react-dom/SDK are externals resolved through the host import map (`/__numu-runtime/`).
- Host refuses bundles whose `sdk_compat_major` ≠ host's (currently `0`).
- The mount contract (`ctx = {storeData, page, …}`) is defined by `ByotThemeBoundary` in numu-storefront.
