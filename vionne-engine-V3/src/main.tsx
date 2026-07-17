/**
 * Vionne (V3) — V3 entry point.
 * Dual mount-context shape, sanitised template selection, dev HUD.
 */

import { useMemo, type ComponentType } from "react";
import {
  Section, useThemeSettings, useLocale, sanitizeHtml, defineThemeEntry,
  type Cart, type Customer, type SectionInstance, type Store, type ThemeSettingsV3,
} from "@numueg/theme-sdk";
import themeManifest from "../theme.json";
// Tailwind-in-bundle: compiles @tailwind directives + ported V2 vionne
// styles into dist/theme.css (see vite.config.ts / tailwind.config.js).
import "./theme.css";
import {
  resolveSections, selectTemplateSections, type MaybeOrderedTemplate,
} from "./sections/_template-utils";
import { DemoContext, PageDataContext, usePageData, type MountPageData } from "./sections/_shared";

// Sections are imported EAGERLY (not React.lazy): lazy sections can't be
// server-rendered by renderToString (they suspend on a chunk fetch), and the
// per-chunk download waterfall caused the blank-content flash on every nav.
// Eager imports bundle every section into theme.js so the whole page renders
// in one commit — server-side (createApp) and client-side (mount) alike.
import VionneHeader from "./sections/vionne-header";
import VionneFooter from "./sections/vionne-footer";
import VionneSlideshow from "./sections/vionne-slideshow";
import VionneFeaturedCollection from "./sections/vionne-featured-collection";
import VionneMarquee from "./sections/vionne-marquee";
import VionneImageComparison from "./sections/vionne-image-comparison";
import VionneUgcCarousel from "./sections/vionne-ugc-carousel";
import VionneAbout from "./sections/vionne-about";
import VionneContact from "./sections/vionne-contact";
import VionneOrderConfirmationSection from "./sections/vionne-order-confirmation-section";
import VionnePromoBanner from "./sections/vionne-promo-banner";
import VionneCollectionStrip from "./sections/vionne-collection-strip";
import VionneProductDetail from "./sections/vionne-product-detail";
import VionneProductsPage from "./sections/vionne-products-page";
import VionneCart from "./sections/vionne-cart";
import VionneProfile from "./sections/vionne-profile";
import VionneSearchResults from "./sections/vionne-search-results";
import VionneNotFound from "./sections/vionne-not-found";
import VionneCollectionsIndex from "./sections/vionne-collections-index";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_REGISTRY: Record<string, ComponentType<any>> = {
  // Chrome — header / footer (included first/last on every template). Aliased
  // to the GENERIC "header"/"footer" types too, so chrome delivered via
  // section_groups (prefixed OR generic type) always resolves.
  "vionne-header": VionneHeader,
  "vionne-footer": VionneFooter,
  header: VionneHeader,
  footer: VionneFooter,
  "vionne-slideshow": VionneSlideshow,
  "vionne-featured-collection": VionneFeaturedCollection,
  "vionne-marquee": VionneMarquee,
  "vionne-image-comparison": VionneImageComparison,
  "vionne-ugc-carousel": VionneUgcCarousel,
  "vionne-about": VionneAbout,
  "vionne-contact": VionneContact,
  "vionne-order-confirmation-section": VionneOrderConfirmationSection,
  // Phase A — full V2 parity: home extras + page-level sections.
  "vionne-promo-banner": VionnePromoBanner,
  "vionne-collection-strip": VionneCollectionStrip,
  "vionne-product-detail": VionneProductDetail,
  "vionne-products-page": VionneProductsPage,
  "vionne-cart": VionneCart,
  "vionne-profile": VionneProfile,
  "vionne-search-results": VionneSearchResults,
  "vionne-not-found": VionneNotFound,
  "vionne-collections-index": VionneCollectionsIndex,
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
        <section style={{ padding: "1rem", border: "1px dashed var(--vn-border)", color: "var(--vn-muted)" }}>
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
  const templateSections = selectTemplateSections(hostTemplate, builtinTemplate, isKnownType);

  // CMS content page (/pages/<handle> → template "page"). The `page` template
  // ships only chrome (header + footer), so the body is bound here from the
  // host page context (bilingual via title_i18n/body_i18n). Sanitized before
  // dangerouslySetInnerHTML. Null/empty on every other template.
  const pageCtx = usePageData();
  const locale = useLocale();
  const cmsPage =
    currentTemplate === "page" && pageCtx?.type === "page" ? pageCtx.data?.page : null;
  const cmsTitle = cmsPage
    ? cmsPage.title_i18n?.[locale] || cmsPage.title || pageCtx?.title || ""
    : "";
  const cmsBody = cmsPage ? cmsPage.body_i18n?.[locale] || cmsPage.body || "" : "";
  const safeBody = useMemo(() => sanitizeHtml(cmsBody), [cmsBody]);

  const cmsBlock =
    cmsTitle || cmsBody ? (
      <section
        className="vn-cms-page"
        style={{ maxWidth: 760, margin: "0 auto", padding: "4rem 1.5rem" }}
      >
        {cmsTitle && (
          <h1
            className="vn-heading"
            style={{
              fontSize: "clamp(1.9rem,3.5vw,2.75rem)",
              margin: "0 0 1.5rem",
              color: "var(--vn-ink)",
            }}
          >
            {cmsTitle}
          </h1>
        )}
        {cmsBody && (
          <div
            style={{ lineHeight: 1.75, color: "var(--vn-muted)", fontSize: "1.05rem" }}
            dangerouslySetInnerHTML={{ __html: safeBody }}
          />
        )}
      </section>
    ) : null;

  // Chrome (vionne-header / vionne-footer) reaches us either via the engine's
  // section_groups.header/.footer (what the V3 customizer writes) or inline in
  // the template's section list (theme.json builtin preset + fresh activation).
  // Rendering only the inline copy meant chrome silently vanished once a saved
  // customization moved header/footer into section_groups — or shipped a
  // body-only template. Read BOTH, prefer section_groups, GUARANTEE chrome, and
  // keep the CMS page body just above the footer.
  const HEADER_TYPES = new Set(["vionne-header", "header"]);
  const FOOTER_TYPES = new Set(["vionne-footer", "footer"]);
  const groups = settings.section_groups as
    | Record<string, MaybeOrderedTemplate>
    | undefined;
  const groupHeader = resolveSections(groups?.header).filter(({ instance }) =>
    isKnownType(instance.type),
  );
  const groupFooter = resolveSections(groups?.footer).filter(({ instance }) =>
    isKnownType(instance.type),
  );
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
  const header = groupHeader.length > 0 ? groupHeader : inlineHeader;
  const footer = groupFooter.length > 0 ? groupFooter : inlineFooter;

  return (
    <div data-vionne-v3-app data-theme="vionne-v3">
      {header.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} />
      ))}
      {body.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} />
      ))}
      {cmsBlock}
      {footer.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} />
      ))}
    </div>
  );
}

export interface MountContext {
  storeData?: Store; store?: Store;
  page?: { type?: string; handle?: string; data?: Record<string, unknown> };
  currentTemplate?: string;
  themeSettings: ThemeSettingsV3;
  initialCart?: Cart; customer?: Customer | null;
  locale?: string; translations?: Record<string, string>;
  [extra: string]: unknown;
}

interface DraftHandle { applyDraft: (next: ThemeSettingsV3) => void; }

function pickStore(ctx: MountContext): Store {
  const s = ctx.storeData ?? ctx.store;
  if (s) return s;
  return { id: "unknown", name: "Store", slug: "store", currency: "EGP", default_language: "en", use_nextjs_storefront: true } as Store;
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
  manifest: { id: "vionne-v3", name: "Vionne (V3)", version: "0.6.1" },
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
    const tmpl = path.startsWith("/products/") ? "product"
      : path === "/cart" ? "cart"
      : path === "/checkout" ? "checkout"
      : path === "/products" ? "products"
      : path === "/search" ? "search"
      : path === "/account" || path === "/profile" ? "account"
      : path === "/404" ? "404"
      : path.startsWith("/pages/") ? "page"
      : "home";
    mount(rootEl, {
      store: { id: "dev", name: "Vionne (V3)", slug: "vionne-v3", currency: "EGP", default_language: "en", use_nextjs_storefront: true },
      themeSettings: { schema_version: 3, theme_id: "vionne-v3", global_settings: {}, templates: {}, section_groups: {} },
      currentTemplate: params.get("template") ?? tmpl,
    });
  }
}
