# Fleet color-scheme + font rollout

Standard merchant **color scheme (5 colors)** + **typography (2 fonts)** global
settings for every V3 theme, wired so a change in the merchant hub Theme Settings
actually re-paints the storefront.

**Why:** an audit found the fleet shipped essentially dead color pickers and *no*
real font pickers — merchants could not recolor or re-font their store. This is the
moat item: every theme must expose the same 5-color + 2-font vocabulary and have it
visibly work.

Reference pattern: `numu-theme-cli` PR #15 (`templates/scaffold/`).

Status: **3 of 16 done** (bazar, empire, editorial). **13 remain** — see the table.

---

## 1. How the wiring works (read this first)

You do **not** hand-roll the settings→CSS bridge. The SDK does it.

Any theme mounted via `defineThemeEntry` gets `applyGlobalStyleTokens(global_settings, root)`
(SDK `src/utils/styleTokens.ts`) called on its mount root on mount **and** on every
live-preview `applyDraft`. For each global setting it writes CSS custom properties
onto the root:

- **id-based** — every color/font id → `--theme-<id>` (e.g. `--theme-primary_color`,
  `--theme-heading_font` resolved to a font stack).
- **role-based** — *known* ids are also aliased to a role token:
  - colors → `--theme-color-{background,text,primary,secondary,accent,border,button}`
  - fonts → `--theme-font-{heading,body}`

Known-id → role alias table (from `styleTokens.ts`):

| setting id (use these) | role token the SDK writes |
| --- | --- |
| `primary_color` | `--theme-color-primary` |
| `background_color` | `--theme-color-background` |
| `text_color` | `--theme-color-text` |
| `accent_color` | `--theme-color-accent` |
| `button_color` | `--theme-color-button` |
| `secondary_color` / `border_color` | `--theme-color-secondary` / `-border` |
| `heading_font` | `--theme-font-heading` |
| `body_font` | `--theme-font-body` |

**So a theme's job is only two things:**
1. **Schema** — declare the 5 color + 2 font settings using exactly these ids and the
   SDK `type` strings `"color"` / `"font"` (confirmed in
   `numu-theme-sdk/src/types/theme.ts` `SettingType`).
2. **CSS** — make the theme's own `--xx-*` tokens *read* the `--theme-*` tokens with the
   theme's current static value as the fallback, e.g.
   `--by-cream: var(--theme-color-background, #f7f1e8);`

Fonts: a `"font"` setting stores a token (e.g. `inter`, `cairo`, `poppins`) or a raw
family. Registry tokens (`cormorant, dm-sans, playfair, inter, poppins, montserrat,
lora, cairo, tajawal`) auto-resolve to a full stack **and** the SDK injects the Google
Fonts `<link>`. Unknown values pass through verbatim as the family.

> Most themes need **no `main.tsx` change** — they already rely on the SDK apply and
> only had unwired CSS. The one exception in the fleet was empire, which carried a
> legacy inline `styleVars` writing `--emp-*`; it was refactored to write the canonical
> `--theme-color-*` / `--theme-font-*` (belt-and-suspenders SSR parity, mirroring the
> scaffold). Adding that inline `styleVars` is *optional*; the SDK/host already emit the
> tokens.

---

## 2. The settings_schema block to paste

Two id/type-identical variants — pick the one matching the theme's existing schema
convention. **Keep every id and type exactly**; only edit the `default` hexes/labels to
match the theme's palette. Do not drop the theme's other groups (Layout / Social / etc.).

### 2a. Grouped + `label_ar` (most themes — bazar/editorial style)

```json
{
  "name": "Brand",
  "name_ar": "العلامة التجارية",
  "settings": [
    { "type": "color", "id": "primary_color",    "label": "Primary color",    "label_ar": "اللون الأساسي", "default": "#111111", "info": "Buttons, header, footer and primary brand surfaces." },
    { "type": "color", "id": "background_color",  "label": "Background color",  "label_ar": "لون الخلفية",  "default": "#ffffff" },
    { "type": "color", "id": "text_color",        "label": "Text color",        "label_ar": "لون النص",     "default": "#111111" },
    { "type": "color", "id": "accent_color",      "label": "Accent color",      "label_ar": "لون التمييز",  "default": "#d4af37", "info": "Links, focus rings and highlights." },
    { "type": "color", "id": "button_color",      "label": "Button color",      "label_ar": "لون الأزرار",  "default": "#111111", "info": "Primary button background." }
  ]
},
{
  "name": "Typography",
  "name_ar": "الخطوط",
  "settings": [
    { "type": "font", "id": "heading_font", "label": "Heading font", "label_ar": "خط العناوين", "default": "", "info": "Display headings. Leave empty to keep the theme's built-in typography." },
    { "type": "font", "id": "body_font",    "label": "Body font",    "label_ar": "خط النص",     "default": "", "info": "Body copy and UI text. Leave empty to keep the theme's built-in typography." }
  ]
}
```

### 2b. Flat + `locales` (empire/scaffold style)

Use a `{"type":"header","content":"Colors"}` separator instead of a group, and put
localized strings under `locales.ar`. See `empire-engine-V3/settings_schema.json` for
the exact copy-paste.

> `default` for a `font`: use a registry token (`"inter"`, `"cairo"`, …) to force+load
> that font, or `""` to leave the theme's built-in typography untouched until a merchant
> picks one.

---

## 3. The CSS wiring convention

Point the theme's own tokens at the role token, theme's static value as the fallback.
There are two theme architectures in this fleet:

### Pattern A — hex / BEM token themes (empire, bazar, bon-younes, vionne, …)

The theme already has hex `--xx-*` tokens. Just make them read `--theme-*`:

```css
--xx-ink:    var(--theme-color-primary,    #111111);
--xx-bg:     var(--theme-color-background,  #ffffff);
--xx-fg:     var(--theme-color-text,        #111111);
--xx-accent: var(--theme-color-accent,      #d4af37);
--xx-button: var(--theme-color-button, var(--xx-ink));   /* button falls back to primary */

--xx-font-heading: var(--theme-font-heading, var(--theme-heading_font, "<theme heading stack>"));
--xx-font-body:    var(--theme-font-body,    var(--theme-body_font,    "<theme body stack>"));
```

Then make sure the primary button background/border uses `--xx-button` (add the token if
the theme hard-coded a color there). For monochrome themes, aliasing the theme's "black"
ink token to `--theme-color-primary` (as empire does with `--emp-black`) makes all the
chrome recolor as one.

### Pattern B — Tailwind HSL themes (editorial, boutique, modern, skeuomorphic, …)

These consume colors as `hsl(var(--token))` where `--token` is an HSL **triplet**
(`153 45% 30%`), which cannot hold the hex the SDK writes. Add **hex bridge tokens** at
the top of the mount-root block and repoint the theme's brand-critical *custom* classes
(`.ed-btn`, `.ed-block`, footer, headings, body) to them:

```css
[data-<theme>-v3-app] {
  --xx-primary:  var(--theme-color-primary,    #2f6f52);
  --xx-ink:      var(--theme-color-text,        #1c1c1c);
  --xx-page-bg:  var(--theme-color-background,  #f0f1ec);
  --xx-accent:   var(--theme-color-accent,      #d4af37);
  --xx-btn-bg:   var(--theme-color-button, var(--xx-ink));
  --heading-font: var(--theme-font-heading, var(--theme-heading_font, "<stack>"));
  --body-font:    var(--theme-font-body,    var(--theme-body_font,    "<stack>"));
  /* …existing HSL tokens stay as-is… */
}
```

```css
[data-<theme>-v3-app] body        { background: var(--xx-page-bg); color: var(--xx-ink);
                                    font-family: var(--body-font), <stack>; }
[data-<theme>-v3-app] .xx-btn     { background: var(--xx-btn-bg); }
[data-<theme>-v3-app] .xx-block   { background: var(--xx-primary); }   /* signature surface */
```

The theme's remaining `hsl(var(--primary))` **Tailwind utility** usages stay on their
static values — that's fine for a first pass (the brand-critical surfaces recolor). Deeper
per-utility migration is optional follow-up.

---

## 4. Per-theme checklist (do for each remaining theme)

1. `git`-nothing yet — work on the shared branch.
2. Open `settings_schema.json`. Add/complete the 5-color + 2-font block from §2 (matching
   the theme's existing group/flat + `label_ar`/`locales` convention). Keep existing
   Layout/Social/etc. groups. Set the `default` hexes from the theme's real palette.
3. Open the token file (see table). Wire the `--xx-*` tokens per §3 (Pattern A or B),
   theme static values as fallbacks. Add + wire a `--xx-button` if missing.
4. Confirm the **primary button** background reads the button token.
5. `node -e "require('./settings_schema.json')"` — valid JSON; setting types are only
   `color` / `font` for the new block.
6. `cd <theme> && npx tsc --noEmit` (node_modules is present on all 16) — exit 0.
7. Grep the token file for `var(--theme-color-` / `var(--theme-font-` — present.
8. (Optional) `npm run build` + eyeball dev preview recoloring.

---

## 5. Remaining 13 themes

`reads --theme` = the token file already reads `--theme-*` for its *existing* colors
(so you only add the missing settings + fonts + button). Pattern from §3.

| # | theme | schema | color/font today | token file | prefix | reads --theme | pattern | notes |
|---|-------|--------|------------------|-----------|--------|---------------|---------|-------|
| 1 | bon-younes-engine-V3 | grouped | 3 / 0 | `styles.css` | `--by-` | yes | A | add text? + button + 2 fonts; has 3 select "fonts" to convert |
| 2 | boutique-engine-V3 | grouped | 2 / 0 | `src/theme.css` | HSL | no | B | dead pickers; bridge tokens |
| 3 | elegant-engine-V3 | grouped | 2 / 0 | `src/theme.css` | HSL | no | B | dead pickers; bridge tokens |
| 4 | gilded-glamour-boutique-engine-V3 | grouped | 4 / 0 | `src/theme.css` | `--gold-` | yes | A | add button + 2 fonts; convert 4 selects |
| 5 | kick-game-engine-V3 | grouped | 2 / 0 | `src/theme.css` | `--kg-` | no | B | dead pickers; bridge tokens |
| 6 | luxury-minimal-engine-V3 | grouped | 4 / 0 | `src/theme.css` | `--lux-` | yes | A | add button + 2 fonts; convert 4 selects |
| 7 | modern-engine-V3 | grouped | 2 / 0 | `src/theme.css` | HSL | no | B | dead pickers; bridge tokens |
| 8 | neo-brutalism-engine-V3 | grouped | 2 / 0 | `src/theme.css` | HSL | no | B | dead pickers; bridge tokens |
| 9 | rabbitsocks-engine-V3 | grouped | **5 / 2** | `src/theme.css` | `--rs-` | no | B | schema already complete — **CSS wiring only** |
| 10 | skeuomorphic-engine-V3 | grouped | 2 / 0 | `src/theme.css` | `--skeu-` | no | B | dead pickers; bridge tokens (careful: skeu shadows) |
| 11 | street-engine-V3 | grouped | 2 / 0 | `styles.css` | `--st-` | no | A | tokens exist but unwired |
| 12 | tech-wave-engine-V3 | grouped | 2 / 0 | `src/theme.css` | HSL | no | B | dead pickers; bridge tokens |
| 13 | vionne-engine-V3 | grouped | 8 / 0 | `src/theme.css` | `--vn-` | yes | A | rich palette; map 5 standard ids onto existing `--vn-*`, add 2 fonts |

(The `--skeu-` prefix the recon reported for boutique/elegant/kick-game/modern/
neo-brutalism/tech-wave is shared skeuo *reset* vars — confirm each theme's real brand
prefix when wiring.)

---

## 6. Done themes (reference implementations)

### bazar-engine-V3 (Tailwind + hex `--bz-*` bridge; was best-built, colors already wired)
- Schema: added `button_color` (5th color, default `#FFB300`); converted `heading_font` /
  `body_font` from `select` → `font` type (default `inter`).
- CSS (`src/theme.css`): added `--bz-button: var(--theme-color-button, var(--bz-amber))`;
  `.bz-btn-amber` now uses `--bz-button`. (Existing `--bz-amber/-cream/-dark/-navy` already
  read `--theme-primary_/background_/text_/accent_color`; fonts already read
  `--theme-font-heading/body`.)
- Roles wired: primary→amber, background→cream, text→ink, accent→navy, **button→amber CTA**,
  heading/body fonts.

### empire-engine-V3 (own BEM CSS / RTL; scaffold sibling)
- Schema: replaced with standard flat + `locales` block (5 color + 2 font).
- `src/main.tsx`: `styleVars` refactored to write `--theme-color-*` / `--theme-font-*`
  (was `--emp-*`); added `fontStack()`.
- `styles.css`: `.empire` tokens now read the role tokens with fallbacks
  (`--emp-black`/`--emp-primary`→primary, `--emp-bg`→background, `--emp-fg`→text,
  `--emp-accent`→accent, new `--emp-button`→button); `.empire-btn` uses `--emp-button`;
  fonts read `--theme-font-heading/body`.
- Note: existing `foreground_color` id → renamed to standard `text_color`;
  `font_family` (select) → `heading_font` + `body_font` (font type).

### editorial-engine-V3 (Tailwind HSL; pickers were fully dead)
- Schema: expanded 2 → 5 colors + 2 fonts (grouped + `label_ar`).
- CSS (`src/theme.css`): added hex/stack bridge tokens (`--ed-primary`, `--ed-ink`,
  `--ed-page-bg`, `--ed-accent-color`, `--ed-btn-bg`) + **defined** the previously
  undefined `--heading-font` / `--body-font`. Rewired `body` (bg/text/font), `.ed-block`
  + button hovers → primary (signature green), `.ed-btn` / `.vn-btn-filled` → button,
  `.ed-footer` / `.ed-chip-active` → ink, `.ed-inset:focus` → accent.
- Roles wired: primary→green blocks, background→cream, text→ink+dark chrome,
  accent→focus, button→buttons, heading/body fonts. HSL Tailwind utilities left static.

---

## 7. Caveats

- **Rebuild + republish required.** These are source edits. Each theme must be rebuilt
  (`npm run build`) and its bundle redeployed to R2 (`_deploy-bundle-r2.py` /
  `publish-theme.sh`) before merchants see it. Self-contained (`federate:false`) bundles
  freeze the SDK at build time.
- **Font-upload pipeline is a separate backend increment.** The `font` type currently
  offers the SDK's registry fonts (auto-loaded via Google Fonts `<link>`) + verbatim
  family names. Custom merchant font *uploads* are not part of this rollout.
- **Tailwind-HSL themes:** first-pass wiring covers the brand-critical custom classes;
  `hsl(var(--primary))`-style utility usages stay on static values until optionally
  migrated.
- **Id renames** (e.g. empire `foreground_color`→`text_color`, `font_family`→
  `heading_font`/`body_font`) orphan any previously-saved value under the old id. Given
  the pickers were non-functional, impact is nil, but note it when republishing.
