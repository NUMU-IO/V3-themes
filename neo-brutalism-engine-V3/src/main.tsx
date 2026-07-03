/**
 * Neo Brutalism (V3) — V3 entry point.
 * Dual mount-context shape, sanitised template selection.
 */

import { type ComponentType } from "react";
import {
  Section, useThemeSettings, defineThemeEntry,
  type Cart, type Customer, type SectionInstance, type Store, type ThemeSettingsV3,
} from "@numueg/theme-sdk";
import themeManifest from "../theme.json";
// Tailwind-in-bundle: compiles @tailwind directives + ported V2 neo-brutalism
// styles into dist/theme.css (see vite.config.ts / tailwind.config.js).
import "./theme.css";
import {
  selectTemplateSections, type MaybeOrderedTemplate,
} from "./sections/_template-utils";

// Sections are imported EAGERLY (not React.lazy): lazy sections can't be
// server-rendered by renderToString (they suspend on a chunk fetch), and the
// per-chunk download waterfall caused the blank-content flash on every nav.
// Eager imports bundle every section into theme.js so the whole page renders
// in one commit — server-side (createApp) and client-side (mount) alike.
import NbAnnouncementBar from "./sections/nb-announcement-bar";
import Nbhero from "./sections/nbhero";
import Nbmarquee from "./sections/nbmarquee";
import Nbcategories from "./sections/nbcategories";
import NbfeaturedCollection from "./sections/nbfeatured-collection";
import NbpromoBanner from "./sections/nbpromo-banner";
import Nbtestimonials from "./sections/nbtestimonials";
import Nbnewsletter from "./sections/nbnewsletter";
import NbProductDetail from "./sections/nb-product-detail";
import NbProductsPage from "./sections/nb-products-page";
import NbProfile from "./sections/nb-profile";
import NbAbout from "./sections/nb-about";
import NbContact from "./sections/nb-contact";
import NbOrderConfirmationSection from "./sections/nb-order-confirmation-section";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_REGISTRY: Record<string, ComponentType<any>> = {
  // Home sections (faithful V2 neo-brutalism ports)
  "nb-announcement-bar": NbAnnouncementBar,
  "nbhero": Nbhero,
  "nbmarquee": Nbmarquee,
  "nbcategories": Nbcategories,
  "nbfeatured-collection": NbfeaturedCollection,
  "nbpromo-banner": NbpromoBanner,
  "nbtestimonials": Nbtestimonials,
  "nbnewsletter": Nbnewsletter,
  // Page-level sections (full V2 parity — never a blank page)
  "nb-product-detail": NbProductDetail,
  "nb-products-page": NbProductsPage,
  "nb-profile": NbProfile,
  "nb-about": NbAbout,
  "nb-contact": NbContact,
  "nb-order-confirmation-section": NbOrderConfirmationSection,
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
        <section style={{ padding: "1rem", border: "1px dashed #fb923c", color: "#666" }}>
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
    <div data-neo-brutalism-v3-app data-theme="neo-brutalism-v3">
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
  manifest: { id: "neo-brutalism-v3", name: "Neo brutalism (V3)", version: "0.3.3" },
  mount,
};
export default v3Handle;

// Dev-only auto-mount
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
      : path === "/about" ? "about"
      : path === "/contact" ? "contact"
      : path === "/profile" ? "profile"
      : "home";
    mount(rootEl, {
      store: { id: "dev", name: "Neo brutalism (V3)", slug: "neo-brutalism-v3", currency: "EGP", default_language: "en", use_nextjs_storefront: true },
      themeSettings: { schema_version: 3, theme_id: "neo-brutalism-v3", global_settings: {}, templates: {}, section_groups: {} },
      currentTemplate: params.get("template") ?? tmpl,
    });
  }
}
