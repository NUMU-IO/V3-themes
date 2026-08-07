/**
 * Vionne (V3) — V3 entry point.
 * Dual mount-context shape, sanitised template selection, dev HUD.
 */

import { useMemo, type ComponentType } from "react";
import {
  defineThemeEntry,
  sanitizeHtml,
  Section,
  selectChromeSections,
  useLocale,
  useThemeSettings,
  type Cart,
  type Customer,
  type SectionInstance,
  type Store,
  type ThemeSettingsV3,
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
import VionneFaq from "./sections/vionne-faq";

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
  "vionne-faq": VionneFaq,
};

/**
 * Content handles this theme ships a DESIGNED template for.
 *
 * The host maps a handful of handles to template types itself
 * (`TEMPLATE_TYPE_BY_HANDLE` in numu-storefront/src/lib/content-pages.ts —
 * about, contact, account, order-confirmation) and everything else arrives as
 * `page.type = "page"`. That map lives in the HOST, so a theme adding a new
 * designed page would otherwise have to wait for a storefront deploy before the
 * URL rendered anything but the generic CMS body.
 *
 * Resolving it theme-side removes that coupling: the bundle looks at the
 * handle it was given and picks its own template when it has one. Purely
 * additive — an unknown handle still falls through to whatever the host asked
 * for. Adding the same entry to the host's map is still worth doing (it makes
 * the intent visible from the storefront side), but nothing depends on it.
 */
const TEMPLATE_BY_HANDLE: Record<string, string> = {
  faq: "faq",
  faqs: "faq",
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
    <div data-vionne-v3-app data-theme="vionne-v3">
      {header.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} />
      ))}
      {/* Exactly one <main> landmark. It is also the slot the host fills when
          this theme ships no template for the route (e.g. /blogs): the body
          arrives here so the shopper keeps the theme's header, navigation and
          footer instead of a bare page. */}
      <main>
        {body.map(({ id, instance }) => (
          <RenderSection key={id} sectionId={id} instance={instance} />
        ))}
        {cmsBlock}
      </main>
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

// `pickStore` / `pickTemplate` used to live here and were dead: defineThemeEntry
// resolves the store and the current template itself and hands them to the
// render callback, so nothing ever called them. Removed rather than left to rot
// — the handle→template resolution below is the live version of that logic, and
// having two copies (one of them unreachable) is exactly how the next person
// "fixes" routing in the function that never runs.

/**
 * Upgrade the host's generic `page` template to a designed one when this theme
 * ships a template for the handle. Never DOWNgrades: an explicit non-page
 * template from the host is always respected, so a real route can't be hijacked.
 */
function resolveTemplate(hostTemplate: string, page: MountPageData | null): string {
  const handle = (page?.handle ?? "").toLowerCase();
  const mapped = TEMPLATE_BY_HANDLE[handle];
  if (mapped && (!hostTemplate || hostTemplate === "page")) return mapped;
  return hostTemplate || "home";
}

// defineThemeEntry yields BOTH `mount` (client mount/hydrate) and `createApp`
// (host-side renderToString for SSR) from a single render function, so the
// server markup and the client hydration tree are identical by construction.
const entry = defineThemeEntry(({ currentTemplate, demo, page }) => {
  const pageData = (page as MountPageData | null) ?? null;
  return (
    <DemoContext.Provider value={demo}>
      <PageDataContext.Provider value={pageData}>
        <ThemeApp currentTemplate={resolveTemplate(currentTemplate, pageData)} />
      </PageDataContext.Provider>
    </DemoContext.Provider>
  );
});

export const mount = entry.mount;
export const createApp = entry.createApp;

const v3Handle = {
  kind: "v3-mount" as const,
  numu_theme_version: 3 as const,
  mount_returns: "MountResult" as const,
  manifest: { id: "vionne-v3", name: "Vionne (V3)", version: "0.8.0" },
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
      : path === "/faq" || path === "/faqs" ? "faq"
      : path.startsWith("/pages/") ? "page"
      : "home";
    mount(rootEl, {
      store: { id: "dev", name: "Vionne (V3)", slug: "vionne-v3", currency: "EGP", default_language: "en", use_nextjs_storefront: true },
      themeSettings: { schema_version: 3, theme_id: "vionne-v3", global_settings: {}, templates: {}, section_groups: {} },
      currentTemplate: params.get("template") ?? tmpl,
    });
  }
}
