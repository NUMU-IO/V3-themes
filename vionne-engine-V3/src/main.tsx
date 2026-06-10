/**
 * Vionne (V3) — V3 entry point.
 * Dual mount-context shape, sanitised template selection, dev HUD.
 */

import {
  StrictMode, Suspense, forwardRef, lazy, useImperativeHandle, useMemo, useState,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  NuMuProvider, Section, useThemeSettings, mountTheme, useLocale, sanitizeHtml,
  type Cart, type Customer, type SectionInstance, type Store, type ThemeSettingsV3,
} from "@numueg/theme-sdk";
import themeManifest from "../theme.json";
// Tailwind-in-bundle: compiles @tailwind directives + ported V2 vionne
// styles into dist/theme.css (see vite.config.ts / tailwind.config.js).
import "./theme.css";
import {
  selectTemplateSections, type MaybeOrderedTemplate,
} from "./sections/_template-utils";
import VionneFooter from "./sections/vionne-footer";
import { DemoContext, PageDataContext, usePageData, type MountPageData } from "./sections/_shared";

interface MountResult {
  cleanup: () => void;
  applyDraft: (next: ThemeSettingsV3) => void;
}

const SECTION_REGISTRY: Record<string, ReturnType<typeof lazy>> = {
  "vionne-slideshow": lazy(() => import("./sections/vionne-slideshow")),
  "vionne-featured-collection": lazy(() => import("./sections/vionne-featured-collection")),
  "vionne-marquee": lazy(() => import("./sections/vionne-marquee")),
  "vionne-image-comparison": lazy(() => import("./sections/vionne-image-comparison")),
  "vionne-ugc-carousel": lazy(() => import("./sections/vionne-ugc-carousel")),
  "vionne-about": lazy(() => import("./sections/vionne-about")),
  "vionne-contact": lazy(() => import("./sections/vionne-contact")),
  "vionne-order-confirmation-section": lazy(() => import("./sections/vionne-order-confirmation-section")),
  // Phase A — full V2 parity: home extras + page-level sections.
  "vionne-promo-banner": lazy(() => import("./sections/vionne-promo-banner")),
  "vionne-collection-strip": lazy(() => import("./sections/vionne-collection-strip")),
  "vionne-product-detail": lazy(() => import("./sections/vionne-product-detail")),
  "vionne-products-page": lazy(() => import("./sections/vionne-products-page")),
  "vionne-profile": lazy(() => import("./sections/vionne-profile")),
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
      <Suspense fallback={<div style={{ minHeight: "20vh" }} />}>
        <Component instance={instance} sectionId={sectionId} />
      </Suspense>
    </Section>
  );
}

function ThemeApp({ currentTemplate }: { currentTemplate: string }) {
  const settings = useThemeSettings();
  const hostTemplate = settings.templates?.[currentTemplate] as MaybeOrderedTemplate | undefined;
  const builtinTemplate = BUILTIN_TEMPLATES[currentTemplate];
  const sections = selectTemplateSections(hostTemplate, builtinTemplate, isKnownType);

  // CMS content page (/pages/<handle> → template "page"). Vionne ships no
  // `page` template AND renders global chrome on every route, so the host's
  // empty-detection backstop can't fire here (the container is non-empty).
  // Bind the real CMS title + body ourselves (bilingual via title_i18n/
  // body_i18n), else a content page renders only chrome. Sanitized before
  // dangerouslySetInnerHTML.
  const pageCtx = usePageData();
  const locale = useLocale();
  const cmsPage =
    currentTemplate === "page" && pageCtx?.type === "page" ? pageCtx.data?.page : null;
  const cmsTitle = cmsPage
    ? cmsPage.title_i18n?.[locale] || cmsPage.title || pageCtx?.title || ""
    : "";
  const cmsBody = cmsPage ? cmsPage.body_i18n?.[locale] || cmsPage.body || "" : "";
  const safeBody = useMemo(() => sanitizeHtml(cmsBody), [cmsBody]);

  // Vionne ships no footer *section*, so render one globally — BUT only when
  // the route actually has content (sections or the CMS body). On a route
  // vionne doesn't template (cart / 404 / search), the bundle must render
  // NOTHING so the host's empty-detection backstop fires (BuiltInCart, themed
  // 404). Rendering the footer there left the container non-empty → suppressed
  // the backstop → cart/404 showed only a footer (no cart UI / no 404 message).
  const hasContent = sections.length > 0 || Boolean(cmsTitle) || Boolean(cmsBody);
  return (
    <div data-vionne-v3-app data-theme="vionne-v3">
      {sections.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} />
      ))}
      {(cmsTitle || cmsBody) && (
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
                color: "var(--vn-ink,#1a1a1a)",
              }}
            >
              {cmsTitle}
            </h1>
          )}
          {cmsBody && (
            <div
              style={{ lineHeight: 1.75, color: "var(--vn-muted,#444)", fontSize: "1.05rem" }}
              dangerouslySetInnerHTML={{ __html: safeBody }}
            />
          )}
        </section>
      )}
      {hasContent && currentTemplate !== "checkout" && <VionneFooter />}
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

export function mount(el: HTMLElement, ctx: MountContext) {
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
  manifest: { id: "vionne-v3", name: "Vionne (V3)", version: "0.4.7" },
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
      : "home";
    mount(rootEl, {
      store: { id: "dev", name: "Vionne (V3)", slug: "vionne-v3", currency: "EGP", default_language: "en", use_nextjs_storefront: true },
      themeSettings: { schema_version: 3, theme_id: "vionne-v3", global_settings: {}, templates: {}, section_groups: {} },
      currentTemplate: params.get("template") ?? tmpl,
    });
  }
}
