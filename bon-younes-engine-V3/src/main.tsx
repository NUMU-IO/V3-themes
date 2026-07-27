/**
 * Bon Younes (V3) — entry point.
 *
 * Renders sections from `themeSettings.templates.<currentTemplate>`
 * (host-provided) or falls back to the manifest's preset home template.
 *
 * Sections are imported EAGERLY (not React.lazy): lazy sections can't be
 * server-rendered by renderToString (they suspend on a chunk fetch), and the
 * per-chunk download waterfall caused the blank-content flash on every nav.
 * Eager imports bundle every section into theme.js so the whole page renders
 * in one commit — server-side (createApp) and client-side (mount) alike.
 */

import { type ComponentType } from "react";
import {
  Section,
  useThemeSettings,
  defineThemeEntry,
  type Cart,
  type Customer,
  type SectionInstance,
  type Store,
  type ThemeSettingsV3,
} from "@numueg/theme-sdk";
import themeManifest from "../theme.json";
import { DemoContext, PageDataContext, type MountPageData } from "./sections/_shared";

import ByHeader from "./sections/by-header";
import ByHero from "./sections/by-hero";
import ByScrollStory from "./sections/by-scroll-story";
import ByMenu from "./sections/by-menu";
import ByProductDetail from "./sections/by-product-detail";
import ByFooter from "./sections/by-footer";
// Phase 2 — multipage templates
import ByProductGrid from "./sections/by-product-grid";
import ByRelatedProducts from "./sections/by-related-products";
import ByCart from "./sections/by-cart";
import ByOrderConfirmation from "./sections/by-order-confirmation";
import ByRichText from "./sections/by-rich-text";
import ByNotFound from "./sections/by-not-found";
import BySearchResults from "./sections/by-search-results";
import ByProfileSection from "./sections/by-profile-section";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_REGISTRY: Record<string, ComponentType<any>> = {
  "by-header": ByHeader,
  "by-hero": ByHero,
  "by-scroll-story": ByScrollStory,
  "by-menu": ByMenu,
  "by-product-detail": ByProductDetail,
  "by-footer": ByFooter,
  // Phase 2 — multipage templates
  "by-product-grid": ByProductGrid,
  "by-related-products": ByRelatedProducts,
  "by-cart": ByCart,
  "by-order-confirmation": ByOrderConfirmation,
  "by-rich-text": ByRichText,
  "by-not-found": ByNotFound,
  "by-search-results": BySearchResults,
  "by-profile-section": ByProfileSection,
};

function UnknownSection({ type }: { type: string }) {
  return (
    <section
      style={{
        padding: "1rem",
        border: "1px dashed #b07a4a",
        fontFamily: "system-ui",
        color: "#3a2418",
        background: "#fdf8ee",
      }}
    >
      Unknown section: <strong>{type}</strong>
    </section>
  );
}

// Template + chrome resolution comes from the SDK — the local
// `_template-utils.ts` was the same engine policy copy-pasted.
import {
  selectChromeSections,
  selectTemplateSections,
  type MaybeOrderedTemplate,
} from "@numueg/theme-sdk";

const BUILTIN_TEMPLATES = (
  themeManifest as unknown as {
    presets?: { templates?: Record<string, MaybeOrderedTemplate> };
  }
).presets?.templates ?? {};

const isKnownType = (t: string) => Boolean(SECTION_REGISTRY[t]);

// Chrome section types. Aliased to the generic names too, so chrome
// delivered through section_groups resolves whichever form the customizer
// wrote.
const HEADER_TYPES = new Set(["by-header", "header"]);
const FOOTER_TYPES = new Set(["by-footer", "footer"]);

function RenderSection({
  instance,
  sectionId,
  groupId,
}: {
  instance: SectionInstance;
  sectionId: string;
  groupId?: string;
}) {
  if (instance.disabled) return null;
  const Component = SECTION_REGISTRY[instance.type];
  if (!Component) {
    return (
      <Section id={sectionId} type={instance.type} groupId={groupId}>
        <UnknownSection type={instance.type} />
      </Section>
    );
  }
  return (
    <Section id={sectionId} type={instance.type} groupId={groupId}>
      <Component instance={instance} sectionId={sectionId} />
    </Section>
  );
}

function ThemeApp({ currentTemplate }: { currentTemplate: string }) {
  const settings = useThemeSettings();
  const hostTemplate = settings.templates?.[currentTemplate] as
    | MaybeOrderedTemplate
    | undefined;
  const builtinTemplate = BUILTIN_TEMPLATES[currentTemplate];

  // selectTemplateSections handles three cases:
  //   1. host customisation has known sections → render it (filtered).
  //   2. host customisation has only UNKNOWN sections (theme just got
  //      switched, stale data) → fall back to bundled preset.
  //   3. no host customisation at all → use bundled preset.
  const sections = selectTemplateSections(
    hostTemplate,
    builtinTemplate,
    isKnownType,
  );

  // This theme used to render ONE flat list, so header and footer only ever
  // appeared because every preset template happens to include them inline.
  // A route the theme ships no template for — /blogs, say — resolved to zero
  // sections and therefore rendered no navigation at all: no logo, no menu,
  // no cart, no footer, no way back into the store.
  const inlineHeader = sections.filter(({ instance }) =>
    HEADER_TYPES.has(instance.type),
  );
  const inlineFooter = sections.filter(({ instance }) =>
    FOOTER_TYPES.has(instance.type),
  );
  const body = sections.filter(
    ({ instance }) =>
      !HEADER_TYPES.has(instance.type) && !FOOTER_TYPES.has(instance.type),
  );

  const groups = settings.section_groups as
    | Record<string, MaybeOrderedTemplate>
    | undefined;
  const chromeCandidates = [
    (settings.templates as Record<string, MaybeOrderedTemplate> | undefined)
      ?.home,
    BUILTIN_TEMPLATES.home,
    ...Object.values(
      (settings.templates ?? {}) as Record<string, MaybeOrderedTemplate>,
    ),
    ...Object.values(BUILTIN_TEMPLATES),
  ];
  const chrome = (
    inline: typeof inlineHeader,
    group: MaybeOrderedTemplate | undefined,
    types: Set<string>,
  ) =>
    selectChromeSections({
      hostGroup: group,
      inline,
      templates: chromeCandidates,
      isChrome: (t) => types.has(t),
      isKnown: isKnownType,
    });
  const header = chrome(inlineHeader, groups?.header, HEADER_TYPES);
  const footer = chrome(inlineFooter, groups?.footer, FOOTER_TYPES);

  return (
    <div data-bon-younes-v3-app data-theme="bon-younes">
      {header.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} groupId="header" />
      ))}
      {/* Exactly one <main> landmark. It is also the slot the host fills with
          the page body on routes this theme has no template for. */}
      <main>
        {body.map(({ id, instance }) => (
          <RenderSection key={id} sectionId={id} instance={instance} />
        ))}
      </main>
      {footer.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} groupId="footer" />
      ))}
    </div>
  );
}

/**
 * The host (numu-storefront ByotThemeBoundary) passes mount context as:
 *   { themeSettings, storeData, page, locale }
 *
 * Older drafts of the contract used `{ store, currentTemplate, ... }`.
 * We accept both shapes — the SDK's defineThemeEntry normalises them
 * (pickStore / pickTemplate / catalog forwarding / style tokens / nav).
 */
export interface MountContext {
  // V3 storefront contract (current host)
  storeData?: Store;
  page?: { type?: string; handle?: string; data?: Record<string, unknown> };
  // Legacy / dev contract
  store?: Store;
  currentTemplate?: string;
  initialCart?: Cart;
  customer?: Customer | null;
  // Common to both
  themeSettings: ThemeSettingsV3;
  /** Optional explicit demo/marketplace-preview flag from the host. When
   *  omitted, the bundle infers it from empty templates (preview ships none). */
  demo?: boolean;
  locale?: string;
  translations?: Record<string, string>;
  /** Phase 2.4 — store navigation menus keyed by handle (`main-menu`,
   *  `footer`, …), resolved server-side by the host. */
  navigation?: Record<string, unknown[]>;
  [extra: string]: unknown;
}

// defineThemeEntry yields BOTH `mount` (client mount/hydrate) and `createApp`
// (host-side renderToString for SSR) from a single render function, so the
// server markup and the client hydration tree are identical by construction.
// It owns the provider stack (catalog + nav + style tokens + demo inference);
// the theme only wraps its LOCAL DemoContext / PageDataContext and renders
// its section list.
const entry = defineThemeEntry(({ currentTemplate, demo, page }) => (
  <DemoContext.Provider value={demo}>
    <PageDataContext.Provider value={(page as MountPageData | null) ?? null}>
      <ThemeApp currentTemplate={currentTemplate} />
    </PageDataContext.Provider>
  </DemoContext.Provider>
));

export const mount = entry.mount;
export const createApp = entry.createApp;

const v3Handle = {
  kind: "v3-mount" as const,
  numu_theme_version: 3 as const,
  mount_returns: "MountResult" as const,
  manifest: {
    id: "bon-younes-v3",
    name: "Bon Younes (V3)",
    version: "0.2.0",
  },
  mount,
};
export default v3Handle;

// ── Dev-only auto-mount ────────────────────────────────────────────────────
//
// In production the storefront host calls `mount(el, ctx)`. In `vite dev`
// nothing calls it, so we'd see an empty page. Bootstrap a minimal context
// against #root so theme developers can iterate locally with just
// `npm run dev`.
//
// We also map the URL path to a template so that clicking on links inside
// the dev preview (e.g. a product card → `/products/<id>`) actually swaps
// the rendered template — otherwise every URL just remounts `home` and the
// preview looks frozen.
function templateFromPath(pathname: string): string {
  if (pathname.startsWith("/products/") || pathname.startsWith("/product/")) {
    return "product";
  }
  if (pathname === "/cart") return "cart";
  if (pathname === "/checkout") return "checkout";
  if (pathname === "/collections" || pathname.startsWith("/collections/")) {
    return "collection";
  }
  if (pathname === "/products") return "products";
  return "home";
}

if (import.meta.env.DEV && typeof document !== "undefined") {
  const rootEl = document.getElementById("root");
  if (rootEl && !rootEl.dataset.numuMounted) {
    rootEl.dataset.numuMounted = "1";

    const resolveTemplate = () =>
      new URLSearchParams(window.location.search).get("template") ??
      templateFromPath(window.location.pathname);

    const devCtx: MountContext = {
      store: {
        id: "dev-store",
        name: "Bon Younes",
        slug: "bon-younes",
        currency: "EGP",
        default_language: "en",
        use_nextjs_storefront: true,
        social_links: {
          facebook: "https://www.facebook.com/younesscafee/",
          instagram: "https://instagram.com/younesscafee",
        },
      },
      themeSettings: {
        schema_version: 3,
        theme_id: "bon-younes-v3",
        global_settings: {
          brand_name: "Bon Younes",
          brand_name_ar: "بن يونس",
          currency: "EGP",
        },
        templates: {},
        section_groups: {},
      },
      currentTemplate: resolveTemplate(),
    };
    mount(rootEl, devCtx);

    // Small dev-preview HUD: shows which template is rendered + lets you
    // jump between them without typing URLs. Only injected in dev.
    const hud = document.createElement("nav");
    hud.setAttribute("aria-label", "Dev preview navigation");
    hud.style.cssText = [
      "position:fixed",
      "left:50%",
      "bottom:14px",
      "transform:translateX(-50%)",
      "z-index:9999",
      "background:rgba(58,36,24,.92)",
      "color:#f7f1e8",
      "border-radius:9999px",
      "padding:6px 10px",
      "display:flex",
      "gap:4px",
      "font:500 11px/1 'DM Sans',system-ui,sans-serif",
      "letter-spacing:.12em",
      "text-transform:uppercase",
      "box-shadow:0 10px 30px rgba(0,0,0,.25)",
    ].join(";");
    const buttons: Array<[string, string]> = [
      ["Home", "/"],
      ["Product", "/products/vanilla-latte"],
      ["Cart", "/cart"],
      ["Checkout", "/checkout"],
    ];
    for (const [label, href] of buttons) {
      const b = document.createElement("a");
      b.textContent = label;
      b.href = href;
      b.style.cssText =
        "color:inherit;text-decoration:none;padding:6px 10px;border-radius:9999px";
      b.addEventListener("mouseenter", () => {
        b.style.background = "rgba(247,241,232,.12)";
      });
      b.addEventListener("mouseleave", () => {
        b.style.background = "transparent";
      });
      hud.appendChild(b);
    }
    document.body.appendChild(hud);
  }
}
