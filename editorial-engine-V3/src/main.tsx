/**
 * Manshet (editorial-v3) — V3 entry point.
 * Dual mount-context shape, sanitised template selection, section_groups
 * chrome (header/footer guaranteed on every template), CMS page body.
 */

import { useMemo, type ComponentType } from "react";
import {
  Section, useThemeSettings, useLocale, sanitizeHtml, defineThemeEntry,
  resolveSections, selectTemplateSections,
  type Cart, type Customer, type MaybeOrderedTemplate,
  type SectionInstance, type Store, type ThemeSettingsV3,
} from "@numueg/theme-sdk";
import themeManifest from "../theme.json";
// Tailwind-in-bundle: compiles @tailwind directives + Manshet styles into
// dist/theme.css (see vite.config.ts / tailwind.config.js).
import "./theme.css";
// Template + section-group resolution now comes from the SDK (was a byte-
// identical per-theme `_template-utils.ts` copy across the fleet). Headless:
// decides which sections render, never how they look.
import { DemoContext, PageDataContext, usePageData, type MountPageData } from "./sections/_shared";

// Sections are imported EAGERLY (not React.lazy): lazy sections can't be
// server-rendered by renderToString (they suspend on a chunk fetch), and the
// per-chunk download waterfall caused the blank-content flash on every nav.
import EdHeader from "./sections/ed-header";
import EdFooter from "./sections/ed-footer";
import EdHero from "./sections/ed-hero";
import EdCategories from "./sections/ed-categories";
import EdFeaturedCollection from "./sections/ed-featured-collection";
import EdPromoBanner from "./sections/ed-promo-banner";
import EdTestimonials from "./sections/ed-testimonials";
import EdNewsletter from "./sections/ed-newsletter";
import EdLookbook from "./sections/ed-lookbook";
import EdMarquee from "./sections/ed-marquee";
import EdFrontPage from "./sections/ed-front-page";
import EdContents from "./sections/ed-contents";
import EdEditorsNote from "./sections/ed-editors-note";
import EdAbout from "./sections/ed-about";
import EdContact from "./sections/ed-contact";
import EdProductDetailSection from "./sections/ed-product-detail-section";
import EdProductsPageSection from "./sections/ed-products-page-section";
import EdCart from "./sections/ed-cart";
import EdProfile from "./sections/ed-profile";
import EdSearchResults from "./sections/ed-search-results";
import EdNotFound from "./sections/ed-not-found";
import EdOrderConfirmationSection from "./sections/ed-order-confirmation-section";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_REGISTRY: Record<string, ComponentType<any>> = {
  // Chrome — header / footer (rendered first/last on every template). Aliased
  // to the GENERIC "header"/"footer" types too, so chrome delivered via
  // section_groups (prefixed OR generic type) always resolves.
  "ed-header": EdHeader,
  "ed-footer": EdFooter,
  header: EdHeader,
  footer: EdFooter,
  // Home / storytelling
  "ed-hero": EdHero,
  "ed-categories": EdCategories,
  "ed-featured-collection": EdFeaturedCollection,
  "ed-promo-banner": EdPromoBanner,
  "ed-testimonials": EdTestimonials,
  "ed-newsletter": EdNewsletter,
  "ed-lookbook": EdLookbook,
  "ed-marquee": EdMarquee,
  "ed-front-page": EdFrontPage,
  "ed-contents": EdContents,
  "ed-editors-note": EdEditorsNote,
  // Content pages
  "ed-about": EdAbout,
  "ed-contact": EdContact,
  // Commerce pages
  "ed-product-detail-section": EdProductDetailSection,
  "ed-products-page-section": EdProductsPageSection,
  "ed-cart": EdCart,
  "ed-profile": EdProfile,
  "ed-search-results": EdSearchResults,
  "ed-not-found": EdNotFound,
  "ed-order-confirmation-section": EdOrderConfirmationSection,
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
  // ships only chrome, so the body is bound here from the host page context
  // (bilingual via title_i18n/body_i18n). Sanitized before render.
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
      <article className="ed-cms-page" style={{ maxWidth: 760, margin: "0 auto", padding: "4rem 1.5rem" }}>
        {cmsTitle && (
          <header>
            <div className="ed-rule-double" style={{ marginBottom: "1.25rem" }} aria-hidden="true" />
            <h1
              className="vn-heading"
              style={{ fontSize: "clamp(1.9rem,3.5vw,2.75rem)", margin: "0 0 1.5rem", color: "var(--vn-ink)" }}
            >
              {cmsTitle}
            </h1>
          </header>
        )}
        {cmsBody && (
          <div className="vn-prose" dangerouslySetInnerHTML={{ __html: safeBody }} />
        )}
      </article>
    ) : null;

  // Chrome (ed-header / ed-footer) reaches us either via the engine's
  // section_groups.header/.footer (what the V3 customizer writes) or inline in
  // the template's section list (theme.json builtin preset + fresh activation).
  // Read BOTH, prefer section_groups, and keep the CMS body above the footer.
  const HEADER_TYPES = new Set(["ed-header", "header"]);
  const FOOTER_TYPES = new Set(["ed-footer", "footer"]);
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
  // Chrome renders ONLY from real editor data (section_groups preferred, else
  // the in-template header/footer sections). NO synthetic fallback — the
  // preview must never show chrome that isn't an editable section.
  const header = groupHeader.length > 0 ? groupHeader : inlineHeader;
  const footer = groupFooter.length > 0 ? groupFooter : inlineFooter;

  return (
    <div data-editorial-v3-app data-theme="editorial-v3">
      {header.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} />
      ))}
      <div className="ed-page-body">
        {body.map(({ id, instance }) => (
          <RenderSection key={id} sectionId={id} instance={instance} />
        ))}
        {cmsBlock}
      </div>
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
  manifest: { id: "editorial-v3", name: "Manshet", version: "0.4.0" },
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
    const tmpl = path.startsWith("/product/") || path.startsWith("/products/") ? "product"
      : path === "/cart" ? "cart"
      : path === "/checkout" ? "checkout"
      : path === "/products" ? "products"
      : path === "/search" ? "search"
      : path === "/about" ? "about"
      : path === "/contact" ? "contact"
      : path === "/account" || path === "/profile" ? "profile"
      : path === "/order-confirmation" ? "order-confirmation"
      : path === "/404" ? "404"
      : path.startsWith("/pages/") ? "page"
      : "home";
    mount(rootEl, {
      store: { id: "dev", name: "Manshet", slug: "editorial-v3", currency: "EGP", default_language: "en", use_nextjs_storefront: true },
      themeSettings: { schema_version: 3, theme_id: "editorial-v3", global_settings: {}, templates: {}, section_groups: {} },
      currentTemplate: params.get("template") ?? tmpl,
    });
  }
}
