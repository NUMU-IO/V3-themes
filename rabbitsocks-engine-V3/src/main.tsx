/**
 * Mashkal (rabbitsocks-v3) — V3 entry point.
 * Dual mount-context shape, sanitised template selection, section_groups
 * chrome (header/footer guaranteed on every template), CMS page body.
 */

import { useMemo, type ComponentType } from "react";
import {
  Section, useThemeSettings, useLocale, sanitizeHtml, defineThemeEntry,
  type Cart, type Customer, type SectionInstance, type Store, type ThemeSettingsV3,
} from "@numueg/theme-sdk";
import themeManifest from "../theme.json";
// Tailwind-in-bundle: compiles @tailwind directives + Mashkal styles into
// dist/theme.css (see vite.config.ts / tailwind.config.js).
import "./theme.css";
import {
  resolveSections, selectTemplateSections, type MaybeOrderedTemplate,
} from "./sections/_template-utils";
import { DemoContext, PageDataContext, usePageData, type MountPageData } from "./sections/_shared";

// Sections are imported EAGERLY (not React.lazy): lazy sections can't be
// server-rendered by renderToString (they suspend on a chunk fetch), and the
// per-chunk download waterfall caused the blank-content flash on every nav.
import RsHeader from "./sections/rs-header";
import RsFooter from "./sections/rs-footer";
import RsHero from "./sections/rs-hero";
import RsCategories from "./sections/rs-categories";
import RsFeatured from "./sections/rs-featured";
import RsPromoBanner from "./sections/rs-promo-banner";
import RsTestimonials from "./sections/rs-testimonials";
import RsNewsletter from "./sections/rs-newsletter";
import RsMarquee from "./sections/rs-marquee";
import RsGalleryWall from "./sections/rs-gallery-wall";
import RsPickThree from "./sections/rs-pick-three";
import RsFitGuide from "./sections/rs-fit-guide";
import RsAbout from "./sections/rs-about";
import RsContact from "./sections/rs-contact";
import RsProductDetail from "./sections/rs-product-detail";
import RsProductsPage from "./sections/rs-products-page";
import RsCart from "./sections/rs-cart";
import RsProfile from "./sections/rs-profile";
import RsSearchResults from "./sections/rs-search-results";
import RsNotFound from "./sections/rs-not-found";
import RsOrderConfirmationSection from "./sections/rs-order-confirmation-section";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_REGISTRY: Record<string, ComponentType<any>> = {
  // Chrome — header / footer (rendered first/last on every template). Aliased
  // to the GENERIC "header"/"footer" types too, so chrome delivered via
  // section_groups (prefixed OR generic type) always resolves.
  "rs-header": RsHeader,
  "rs-footer": RsFooter,
  header: RsHeader,
  footer: RsFooter,
  // Home / storytelling
  "rs-hero": RsHero,
  "rs-categories": RsCategories,
  "rs-featured": RsFeatured,
  "rs-promo-banner": RsPromoBanner,
  "rs-testimonials": RsTestimonials,
  "rs-newsletter": RsNewsletter,
  "rs-marquee": RsMarquee,
  // Signature commerce sections
  "rs-gallery-wall": RsGalleryWall,
  "rs-pick-three": RsPickThree,
  "rs-fit-guide": RsFitGuide,
  // Content pages
  "rs-about": RsAbout,
  "rs-contact": RsContact,
  // Commerce pages
  "rs-product-detail": RsProductDetail,
  "rs-products-page": RsProductsPage,
  "rs-cart": RsCart,
  "rs-profile": RsProfile,
  "rs-search-results": RsSearchResults,
  "rs-not-found": RsNotFound,
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
      <article className="rs-cms-page" style={{ maxWidth: 760, margin: "0 auto", padding: "4rem 1.5rem" }}>
        {cmsTitle && (
          <header>
            <div className="rs-rule-double" style={{ marginBottom: "1.25rem" }} aria-hidden="true" />
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

  // Chrome (rs-header / rs-footer) reaches us either via the engine's
  // section_groups.header/.footer (what the V3 customizer writes) or inline in
  // the template's section list (theme.json builtin preset + fresh activation).
  // Read BOTH, prefer section_groups, and keep the CMS body above the footer.
  const HEADER_TYPES = new Set(["rs-header", "header"]);
  const FOOTER_TYPES = new Set(["rs-footer", "footer"]);
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
    <div data-rabbitsocks-v3-app data-theme="rabbitsocks-v3">
      {header.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} />
      ))}
      <div className="rs-page-body">
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
  manifest: { id: "rabbitsocks-v3", name: "Mashkal", version: "0.4.0" },
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
      store: { id: "dev", name: "Mashkal", slug: "rabbitsocks-v3", currency: "EGP", default_language: "en", use_nextjs_storefront: true },
      themeSettings: { schema_version: 3, theme_id: "rabbitsocks-v3", global_settings: {}, templates: {}, section_groups: {} },
      currentTemplate: params.get("template") ?? tmpl,
    });
  }
}
