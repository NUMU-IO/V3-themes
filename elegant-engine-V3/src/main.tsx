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
};

const isKnownType = (t: string) => Boolean(SECTION_REGISTRY[t]);

const BUILTIN_TEMPLATES = (
  themeManifest as unknown as { presets?: { templates?: Record<string, MaybeOrderedTemplate> } }
).presets?.templates ?? {};

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
  const sections = selectTemplateSections(hostTemplate, builtinTemplate, isKnownType);
  return (
    <div data-elegant-v3-app data-theme="elegant-v3">
      {sections.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} />
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
  manifest: { id: "elegant-v3", name: "Elegant (V3)", version: "0.3.3" },
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
