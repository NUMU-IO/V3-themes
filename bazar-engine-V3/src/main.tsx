/**
 * Bazar (V3) — entry point.
 *
 * Renders sections from `themeSettings.templates.<currentTemplate>`
 * (host-provided) or falls back to the manifest's preset home template.
 * Sections lazy-load so each page only pays for what it shows.
 *
 * Phase 3 adds the full multipage set — chrome (header/footer) plus the
 * commerce templates (products / product / collection / cart / checkout /
 * search / page / 404). `pickTemplate(ctx.page.type)` routes between them;
 * each template's section list lives in theme.json's `presets.templates`.
 */

import {
  StrictMode,
  forwardRef,
  useImperativeHandle,
  useState,
  type ComponentType,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  defineThemeEntry,
  NuMuProvider,
  Section,
  selectChromeSections,
  useThemeSettings,
  type Cart,
  type Customer,
  type SectionInstance,
  type Store,
  type ThemeSettingsV3,
} from "@numueg/theme-sdk";
import themeManifest from "../theme.json";
import { DemoContext, PageDataContext, type MountPageData } from "./sections/_shared";
import BzWhatsAppFab from "./sections/_whatsapp-fab";
import "./theme.css";

// Sections are imported EAGERLY (not React.lazy): lazy sections can't be
// server-rendered by renderToString (they suspend on a chunk fetch), and the
// per-chunk download waterfall caused the blank-content flash on every nav.
// Eager imports bundle every section into theme.js so the whole page renders
// in one commit — server-side (createApp) and client-side (mount) alike.
import BzAboutSection from "./sections/bz-about-section";
import BzHero from "./sections/bz-hero";
import BzImageWithText from "./sections/bz-image-with-text";
import BzMarquee from "./sections/bz-marquee";
import BzNewsletter from "./sections/bz-newsletter";
import BzPromoBanner from "./sections/bz-promo-banner";
import BzRichText from "./sections/bz-rich-text";
import BzTestimonials from "./sections/bz-testimonials";
import BzHeader from "./sections/bz-header";
import BzFooter from "./sections/bz-footer";
import BzFeaturedCollection from "./sections/bz-featured-collection";
import BzProductGrid from "./sections/bz-product-grid";
import BzProductDetail from "./sections/bz-product-detail";
import BzRelatedProducts from "./sections/bz-related-products";
import BzCart from "./sections/bz-cart";
import BzSearchResults from "./sections/bz-search-results";
import BzNotFound from "./sections/bz-not-found";
import BzContact from "./sections/bz-contact";
import BzProfile from "./sections/bz-profile";
import BzOrderConfirmation from "./sections/bz-order-confirmation";

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
  // Home / content sections (Phase 0–2)
  "bz-about-section": BzAboutSection,
  "bz-hero": BzHero,
  "bz-image-with-text": BzImageWithText,
  "bz-marquee": BzMarquee,
  "bz-newsletter": BzNewsletter,
  "bz-promo-banner": BzPromoBanner,
  "bz-rich-text": BzRichText,
  "bz-testimonials": BzTestimonials,
  // Chrome + commerce sections (Phase 3 — multipage templates). Header/footer
  // aliased to the GENERIC "header"/"footer" types too, so chrome delivered via
  // section_groups (prefixed OR generic type) always resolves.
  "bz-header": BzHeader,
  "bz-footer": BzFooter,
  header: BzHeader,
  footer: BzFooter,
  "bz-featured-collection": BzFeaturedCollection,
  "bz-product-grid": BzProductGrid,
  "bz-product-detail": BzProductDetail,
  "bz-related-products": BzRelatedProducts,
  "bz-cart": BzCart,
  "bz-search-results": BzSearchResults,
  "bz-not-found": BzNotFound,
  // Standalone page sections (Phase 4 — V2 parity: about/contact/profile/order)
  "bz-contact": BzContact,
  "bz-profile": BzProfile,
  "bz-order-confirmation": BzOrderConfirmation,
};

function UnknownSection({ type }: { type: string }) {
  return (
    <section
      style={{
        padding: "1rem",
        border: "1px dashed #FFB300",
        fontFamily: "system-ui",
        color: "#0a0a14",
        background: "#FFF5E1",
      }}
    >
      Unknown section: <strong>{type}</strong>
    </section>
  );
}

import {
  resolveSections,
  selectTemplateSections,
  type MaybeOrderedTemplate,
} from "./sections/_template-utils";

const BUILTIN_TEMPLATES = (
  themeManifest as unknown as {
    presets?: { templates?: Record<string, MaybeOrderedTemplate> };
  }
).presets?.templates ?? {};

const isKnownType = (t: string) => Boolean(SECTION_REGISTRY[t]);

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
  const templateSections = selectTemplateSections(
    hostTemplate,
    builtinTemplate,
    isKnownType,
  );

  // Chrome (header/footer) reaches us in TWO possible places: (1) the engine's
  // section_groups.header / .footer (what the V3 customizer writes), or (2)
  // inline in the template's section list (the theme.json builtin preset + a
  // fresh activation seed). Rendering only (2) meant chrome silently vanished
  // once a saved customization moved header/footer into section_groups or
  // shipped a body-only template. Read BOTH, prefer section_groups, and
  // GUARANTEE chrome always renders.
  const groups = settings.section_groups as
    | Record<string, MaybeOrderedTemplate>
    | undefined;
  const HEADER_TYPES = new Set(["bz-header", "header"]);
  const FOOTER_TYPES = new Set(["bz-footer", "footer"]);
  const groupHeader = resolveSections(groups?.header).filter(({ instance }) =>
    isKnownType(instance.type),
  );
  const groupFooter = resolveSections(groups?.footer).filter(({ instance }) =>
    isKnownType(instance.type),
  );

  // a11y: a single <main> landmark. Chrome renders its own <header>/<footer>
  // banners OUTSIDE main (avoids banner/contentinfo nested-in-main warnings);
  // body sections wrap inside it.
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
  // Chrome renders ONLY from real editor data (section_groups preferred, else the
  // in-template header/footer sections). NO synthetic fallback — the preview must
  // never show chrome that isn't an editable section in the customizer.
  // Chrome, in priority order: the customizer's section_groups, then the
  // header/footer sections sitting inline in THIS template.
  //
  // Third tier: borrow. A route this theme ships no template for — /blogs was
  // the one that surfaced it — resolves to zero sections, so both tiers above
  // are empty and the shopper got correct content wrapped in nothing: no logo,
  // no menu, no cart, no footer, no way back into the store except Back.
  // Borrowing the chrome the theme already renders on every other page is
  // strictly better than rendering none, and it stays real editable sections
  // rather than a synthetic strip.
  const chromeCandidates = [
    (settings.templates as Record<string, MaybeOrderedTemplate> | undefined)?.home,
    BUILTIN_TEMPLATES.home,
    ...Object.values(
      (settings.templates ?? {}) as Record<string, MaybeOrderedTemplate>,
    ),
    ...Object.values(BUILTIN_TEMPLATES as Record<string, MaybeOrderedTemplate>),
  ];
  const header =
    groupHeader.length > 0
      ? groupHeader
      : inlineHeader.length > 0
        ? inlineHeader
        : selectChromeSections({
            templates: chromeCandidates,
            isChrome: (t) => HEADER_TYPES.has(t),
            isKnown: isKnownType,
          });
  const footer =
    groupFooter.length > 0
      ? groupFooter
      : inlineFooter.length > 0
        ? inlineFooter
        : selectChromeSections({
            templates: chromeCandidates,
            isChrome: (t) => FOOTER_TYPES.has(t),
            isKnown: isKnownType,
          });

  return (
    // pb on mobile clears the fixed bottom tab bar (h-14 + safe-area) so the
    // footer / page end is never hidden behind it; no padding on md+ where the
    // tab bar is hidden.
    <div
      data-bazar-v3-app
      data-theme="bazar"
      className="pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0"
    >
      {/* The separate, editable announcement strip is rendered by bz-header
          (above its nav), driven by the header's announcement message blocks. */}
      {header.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} />
      ))}
      <main>
        {body.map(({ id, instance }) => (
          <RenderSection key={id} sectionId={id} instance={instance} />
        ))}
      </main>
      {footer.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} />
      ))}
      {/* Floating WhatsApp button (real glyph) — renders only when the merchant
          set a number; raised clear of the mobile tab bar. */}
      <BzWhatsAppFab />
    </div>
  );
}

// ── Host contract: mount(el, ctx) returns a MountResult ────────────────────

/**
 * The host (numu-storefront ByotThemeBoundary) passes mount context as:
 *   { themeSettings, storeData, page, locale }
 *
 * Older drafts of the contract used { store, currentTemplate, ... }.
 * We accept both shapes and normalise so bundles published to the
 * marketplace stay defensive as the host evolves.
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
  [extra: string]: unknown;
}

interface DraftHandle {
  applyDraft: (next: ThemeSettingsV3) => void;
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
  if (typeof ctx.currentTemplate === "string" && ctx.currentTemplate) {
    return ctx.currentTemplate;
  }
  const pageType = ctx.page?.type;
  if (typeof pageType === "string" && pageType) return pageType;
  return "home";
}

// defineThemeEntry yields BOTH `mount` (client mount/hydrate) and `createApp`
// (host-side renderToString for SSR) from a single render function, so the
// server markup and the client hydration tree are identical by construction.
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
  manifest: { id: "bazar-v3", name: "Bazar (V3)", version: "0.4.5" },
  mount,
};
export default v3Handle;

// ── Dev-only auto-mount ────────────────────────────────────────────────────
//
// In production the storefront host calls `mount(el, ctx)`. In `vite dev`
// nothing calls it, so we'd see an empty page. Bootstrap a minimal context
// against #root so theme developers can iterate locally with `npm run dev`.
//
// We map the URL path → template so clicking links inside the dev preview
// (a product card → `/products/<id>`, the cart icon → `/cart`, …) swaps the
// rendered template instead of always remounting `home`.
function templateFromPath(pathname: string): string {
  if (pathname.startsWith("/products/") || pathname.startsWith("/product/")) {
    return "product";
  }
  if (pathname === "/products") return "products";
  if (pathname === "/cart") return "cart";
  if (pathname === "/checkout") return "checkout";
  if (pathname === "/search") return "search";
  if (pathname === "/collections" || pathname.startsWith("/collections/")) {
    return "collection";
  }
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
        name: "Bazar",
        slug: "bazar",
        currency: "EGP",
        default_language: "en",
        use_nextjs_storefront: true,
      },
      themeSettings: {
        schema_version: 3,
        theme_id: "bazar-v3",
        global_settings: {},
        templates: {},
        section_groups: {},
      },
      currentTemplate: resolveTemplate(),
    };
    mount(rootEl, devCtx);
  }
}
