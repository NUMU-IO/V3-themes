/**
 * Rabbitsocks (V3) — V3 entry point.
 * Dual mount-context shape, sanitised template selection.
 */

import { type ComponentType } from "react";
import {
  Section, useThemeSettings, defineThemeEntry,
  type Cart, type Customer, type SectionInstance, type Store, type ThemeSettingsV3,
} from "@numueg/theme-sdk";
import themeManifest from "../theme.json";
// Tailwind-in-bundle: compiles @tailwind directives + ported V2 rabbitsocks
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
import RsHero from "./sections/rs-hero";
import RsMarquee from "./sections/rs-marquee";
import RsFeatured from "./sections/rs-featured";
import RsCategories from "./sections/rs-categories";
import RsImageWithText from "./sections/rs-image-with-text";
import RsPromoBanner from "./sections/rs-promo-banner";
import RsNewsletter from "./sections/rs-newsletter";
import RsEditorial from "./sections/rs-editorial";
import RsProductDetail from "./sections/rs-product-detail";
import RsProductsPage from "./sections/rs-products-page";
import RsProfile from "./sections/rs-profile";
import RsOrderConfirmationSection from "./sections/rs-order-confirmation-section";

/**
 * MountResult shape. The published @numueg/theme-sdk@0.1.0 doesn't
 * re-export this type yet, so we declare it inline. Matches the host
 * contract documented in ByotThemeBoundary.tsx on the storefront.
 */
interface MountResult {
  cleanup: () => void;
  applyDraft: (next: ThemeSettingsV3) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_REGISTRY: Record<string, ComponentType<any>> = {
  // ── Home sections (faithful V2 ports) ──────────────────────────────
  "rs-hero": RsHero,
  "rs-marquee": RsMarquee,
  "rs-featured": RsFeatured,
  "rs-categories": RsCategories,
  "rs-image-with-text": RsImageWithText,
  "rs-promo-banner": RsPromoBanner,
  "rs-newsletter": RsNewsletter,
  "rs-editorial": RsEditorial,
  // ── Page-level sections (full V2 parity) ───────────────────────────
  "rs-product-detail": RsProductDetail,
  "rs-products-page": RsProductsPage,
  "rs-profile": RsProfile,
  "rs-order-confirmation-section": RsOrderConfirmationSection,
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
    <div data-rabbitsocks-v3-app data-theme="rabbitsocks-v3">
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
  locale?: string;
  translations?: Record<string, string>;
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
  manifest: { id: "rabbitsocks-v3", name: "Rabbitsocks (V3)", version: "0.3.3" },
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
      : path === "/profile" ? "profile"
      : "home";
    mount(rootEl, {
      store: { id: "dev", name: "Rabbitsocks (V3)", slug: "rabbitsocks-v3", currency: "EGP", default_language: "en", use_nextjs_storefront: true } as Store,
      themeSettings: { schema_version: 3, theme_id: "rabbitsocks-v3", global_settings: {}, templates: {}, section_groups: {} },
      currentTemplate: params.get("template") ?? tmpl,
    });
  }
}
