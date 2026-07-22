/**
 * Elegant (V3) — V3 entry point.
 * Dual mount-context shape, sanitised template selection, Tailwind-in-bundle.
 *
 * Section components live in src/sections/<type>.tsx and are lazy-loaded so
 * only sections the merchant actually uses pay the bundle cost.
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
// Tailwind-in-bundle: compiles @tailwind directives + ported V2 elegant
// styles into dist/theme.css (see vite.config.ts / tailwind.config.js).
import "./theme.css";
import {
  resolveSections,
  selectTemplateSections,
  type MaybeOrderedTemplate,
} from "./sections/_template-utils";

// Sections are imported EAGERLY (not React.lazy): lazy sections can't be
// server-rendered by renderToString (they suspend on a chunk fetch), and the
// per-chunk download waterfall caused the blank-content flash on every nav.
// Eager imports bundle every section into theme.js so the whole page renders
// in one commit — server-side (createApp) and client-side (mount) alike.
import ElegantHero from "./sections/elegant-hero";
import ElegantCategories from "./sections/elegant-categories";
import ElegantFeaturedCollection from "./sections/elegant-featured-collection";
import ElegantPromoBanner from "./sections/elegant-promo-banner";
import ElegantCollectionStrip from "./sections/elegant-collection-strip";
import ElegantTestimonials from "./sections/elegant-testimonials";
import ElegantNewsletter from "./sections/elegant-newsletter";
import ElegantProductDetail from "./sections/elegant-product-detail";
import ElegantProductsPage from "./sections/elegant-products-page";
import ElegantProfile from "./sections/elegant-profile";
import ElegantHeader from "./sections/elegant-header";
import ElegantFooter from "./sections/elegant-footer";

interface MountResult {
  cleanup: () => void;
  applyDraft: (next: ThemeSettingsV3) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_REGISTRY: Record<string, ComponentType<any>> = {
  // Home sections (faithful ports of the V2 elegant in-tree sections).
  "elegant-hero": ElegantHero,
  "elegant-categories": ElegantCategories,
  "elegant-featured-collection": ElegantFeaturedCollection,
  "elegant-promo-banner": ElegantPromoBanner,
  "elegant-collection-strip": ElegantCollectionStrip,
  "elegant-testimonials": ElegantTestimonials,
  "elegant-newsletter": ElegantNewsletter,
  // Page-level sections (ported from the proven vionne page sections).
  "elegant-product-detail": ElegantProductDetail,
  "elegant-products-page": ElegantProductsPage,
  "elegant-profile": ElegantProfile,
  // Chrome (header/footer). Registered under BOTH the prefixed type and the
  // generic alias so a section_groups entry written by the customizer (which
  // may use either) always resolves to a real component.
  "elegant-header": ElegantHeader,
  "elegant-footer": ElegantFooter,
  header: ElegantHeader,
  footer: ElegantFooter,
};

const HEADER_TYPES = new Set(["elegant-header", "header"]);
const FOOTER_TYPES = new Set(["elegant-footer", "footer"]);

const isKnownType = (t: string) => Boolean(SECTION_REGISTRY[t]);

const MANIFEST_PRESETS = (
  themeManifest as unknown as {
    presets?: {
      templates?: Record<string, MaybeOrderedTemplate>;
      section_groups?: Record<string, MaybeOrderedTemplate>;
    };
  }
).presets ?? {};

const BUILTIN_TEMPLATES = MANIFEST_PRESETS.templates ?? {};
const BUILTIN_GROUPS = MANIFEST_PRESETS.section_groups ?? {};

function RenderSection({ instance, sectionId, groupId }: {
  instance: SectionInstance; sectionId: string; groupId?: string;
}) {
  if (instance.disabled) return null;
  const Component = SECTION_REGISTRY[instance.type];
  if (!Component) {
    return (
      <Section id={sectionId} type={instance.type} groupId={groupId}>
        <section style={{ padding: "1rem", border: "1px dashed #ccc", color: "#666" }}>
          Unknown section: <strong>{instance.type}</strong>
        </section>
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
  const hostTemplate = settings.templates?.[currentTemplate] as MaybeOrderedTemplate | undefined;
  const builtinTemplate = BUILTIN_TEMPLATES[currentTemplate];
  const templateSections = selectTemplateSections(
    hostTemplate,
    builtinTemplate,
    isKnownType,
  );

  // Chrome can arrive two ways: (1) `settings.section_groups.header/.footer` —
  // what the V3 customizer writes — or (2) inline in the template's section
  // list. Read BOTH (groups win) and fall back to the manifest's preset groups
  // so a store that has never been customized still gets real navigation
  // instead of the host's generic fallback strip.
  const hostGroups = settings.section_groups as
    | Record<string, MaybeOrderedTemplate>
    | undefined;
  const pickGroup = (key: string) => {
    const fromHost = resolveSections(hostGroups?.[key]).filter(({ instance }) =>
      isKnownType(instance.type),
    );
    if (fromHost.length > 0) return fromHost;
    return resolveSections(BUILTIN_GROUPS[key]).filter(({ instance }) =>
      isKnownType(instance.type),
    );
  };

  const inlineHeader = templateSections.filter(({ instance }) =>
    HEADER_TYPES.has(instance.type),
  );
  const inlineFooter = templateSections.filter(({ instance }) =>
    FOOTER_TYPES.has(instance.type),
  );
  const body = templateSections.filter(
    ({ instance }) =>
      !HEADER_TYPES.has(instance.type) && !FOOTER_TYPES.has(instance.type),
  );

  const groupHeader = pickGroup("header");
  const groupFooter = pickGroup("footer");
  const header = groupHeader.length > 0 ? groupHeader : inlineHeader;
  const footer = groupFooter.length > 0 ? groupFooter : inlineFooter;

  // a11y: chrome renders its own <header>/<footer> landmarks OUTSIDE the single
  // <main> landmark; body sections live inside it.
  return (
    <div data-elegant-v3-app data-theme="elegant-v3">
      {header.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} groupId="header" />
      ))}
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

// ── Host contract: mount(el, ctx) returns a MountResult ────────────────────

/**
 * The host (numu-storefront ByotThemeBoundary) passes mount context as:
 *   { themeSettings, storeData, page, locale }
 *
 * Older drafts of the contract used { store, currentTemplate, ... }.
 * We accept both shapes and normalise via pickStore() so bundles
 * published to the marketplace stay defensive as the host evolves.
 */
export interface MountContext {
  storeData?: Store; store?: Store;
  page?: { type?: string; handle?: string; data?: Record<string, unknown> };
  currentTemplate?: string;
  themeSettings: ThemeSettingsV3;
  initialCart?: Cart; customer?: Customer | null;
  locale?: string; translations?: Record<string, string>;
  [extra: string]: unknown;
}

/** Normalize the two ctx shapes into one. SDK reads store.currency without
 *  optional chaining and would throw if undefined slipped through. */
function pickStore(ctx: MountContext): Store {
  const s = ctx.storeData ?? ctx.store;
  if (s) return s;
  return {
    id: "unknown",
    name: "Store",
    slug: "store",
    currency: "EGP",
    default_language: "en",
    use_nextjs_storefront: true,
  } as Store;
}

function pickTemplate(ctx: MountContext): string {
  if (typeof ctx.currentTemplate === "string" && ctx.currentTemplate) return ctx.currentTemplate;
  const pt = ctx.page?.type;
  if (typeof pt === "string" && pt) return pt;
  return "home";
}

// defineThemeEntry yields BOTH `mount` (client mount/hydrate) and `createApp`
// (host-side renderToString for SSR) from a single render function, so the
// server markup and the client hydration tree are identical by construction.
const entry = defineThemeEntry(({ currentTemplate }) => (
  <ThemeApp currentTemplate={currentTemplate} />
));

export const mount = entry.mount;
export const createApp = entry.createApp;

const v3Handle = {
  kind: "v3-mount" as const,
  numu_theme_version: 3 as const,
  mount_returns: "MountResult" as const,
  manifest: { id: "elegant-v3", name: "Elegant (V3)", version: "0.4.0" },
  mount,
};
export default v3Handle;

// ── Dev-only auto-mount ────────────────────────────────────────────────────
//
// In production the storefront host calls `mount(el, ctx)`. In `vite dev`
// nothing calls it. This block fakes the storefront's host contract shape
// (`{themeSettings, storeData, page, locale}`) so `pickStore` exercises the
// real production path — not the legacy `{store, ...}` shape.
if (import.meta.env.DEV && typeof document !== "undefined") {
  const rootEl = document.getElementById("root");
  if (rootEl && !rootEl.dataset.numuMounted) {
    rootEl.dataset.numuMounted = "1";
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    const tmpl = path.startsWith("/product/") ? "product"
      : path === "/cart" ? "cart"
      : path === "/checkout" ? "checkout"
      : path === "/products" ? "products"
      : path === "/profile" ? "profile"
      : "home";
    mount(rootEl, {
      storeData: {
        id: "dev-store",
        name: "Elegant Dev",
        slug: "elegant-dev",
        currency: "EGP",
        default_language: "en",
        use_nextjs_storefront: true,
      } as Store,
      page: { type: tmpl },
      themeSettings: {
        schema_version: 3,
        theme_id: "elegant-v3",
        global_settings: {},
        templates: {},
        section_groups: {},
      },
      currentTemplate: params.get("template") ?? tmpl,
      locale: "en",
    });
  }
}
