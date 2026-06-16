/**
 * Empire (V3) — entry point.
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
  Suspense,
  forwardRef,
  lazy,
  useImperativeHandle,
  useState,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  NuMuProvider,
  Section,
  mountTheme,
  useThemeSettings,
  type Cart,
  type Customer,
  type SectionInstance,
  type Store,
  type ThemeSettingsV3,
} from "@numueg/theme-sdk";
import themeManifest from "../theme.json";
import { DemoContext, PageDataContext, type MountPageData } from "./sections/_shared";
import "./theme.css";

/**
 * MountResult shape. The published @numueg/theme-sdk@0.1.0 doesn't
 * re-export this type yet, so we declare it inline. Matches the host
 * contract documented in ByotThemeBoundary.tsx on the storefront.
 */
interface MountResult {
  cleanup: () => void;
  applyDraft: (next: ThemeSettingsV3) => void;
}

const SECTION_REGISTRY: Record<string, ReturnType<typeof lazy>> = {
  // Home / content sections (Phase 0–2)
  "emp-about-section": lazy(() => import("./sections/emp-about-section")),
  "emp-categories": lazy(() => import("./sections/emp-categories")),
  "emp-hero": lazy(() => import("./sections/emp-hero")),
  "emp-image-with-text": lazy(() => import("./sections/emp-image-with-text")),
  "emp-marquee": lazy(() => import("./sections/emp-marquee")),
  "emp-newsletter": lazy(() => import("./sections/emp-newsletter")),
  "emp-promo-banner": lazy(() => import("./sections/emp-promo-banner")),
  "emp-rich-text": lazy(() => import("./sections/emp-rich-text")),
  "emp-testimonials": lazy(() => import("./sections/emp-testimonials")),
  // Chrome + commerce sections (Phase 3 — multipage templates)
  "emp-header": lazy(() => import("./sections/emp-header")),
  "emp-footer": lazy(() => import("./sections/emp-footer")),
  "emp-featured-collection": lazy(() => import("./sections/emp-featured-collection")),
  "emp-product-grid": lazy(() => import("./sections/emp-product-grid")),
  "emp-product-detail": lazy(() => import("./sections/emp-product-detail")),
  "emp-related-products": lazy(() => import("./sections/emp-related-products")),
  "emp-cart": lazy(() => import("./sections/emp-cart")),
  "emp-order-confirmation": lazy(() => import("./sections/emp-order-confirmation")),
  "emp-search-results": lazy(() => import("./sections/emp-search-results")),
  "emp-profile-section": lazy(() => import("./sections/emp-profile-section")),
  "emp-not-found": lazy(() => import("./sections/emp-not-found")),
};

function UnknownSection({ type }: { type: string }) {
  return (
    <section
      style={{
        padding: "1rem",
        border: "1px dashed #0099FF",
        fontFamily: "system-ui",
        color: "#000000",
        background: "#EFEEED",
      }}
    >
      Unknown section: <strong>{type}</strong>
    </section>
  );
}

import {
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
      <Suspense fallback={<div style={{ minHeight: "20vh" }} />}>
        <Component instance={instance} sectionId={sectionId} />
      </Suspense>
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

  return (
    <div data-empire-v3-app data-theme="empire">
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

export function mount(el: HTMLElement, ctx: MountContext): MountResult {
  return mountTheme(el, ctx, ({ currentTemplate, demo, page }) => (
    <DemoContext.Provider value={demo}>
      <PageDataContext.Provider value={(page as MountPageData | null) ?? null}>
        <ThemeApp currentTemplate={currentTemplate} />
      </PageDataContext.Provider>
    </DemoContext.Provider>
  ));
}

const v3Handle = {
  kind: "v3-mount" as const,
  numu_theme_version: 3 as const,
  mount_returns: "MountResult" as const,
  manifest: { id: "empire-v3", name: "Empire (V3)", version: "0.3.0" },
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
        name: "Empire",
        slug: "empire-v3",
        currency: "EGP",
        default_language: "en",
        use_nextjs_storefront: true,
      },
      themeSettings: {
        schema_version: 3,
        theme_id: "empire-v3",
        global_settings: {},
        templates: {},
        section_groups: {},
      },
      currentTemplate: resolveTemplate(),
    };
    mount(rootEl, devCtx);
  }
}
