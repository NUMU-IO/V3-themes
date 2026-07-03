/**
 * Editorial (V3) — V3 entry point.
 * Dual mount-context shape, sanitised template selection, dev HUD.
 */

import {
  StrictMode, forwardRef, useImperativeHandle, useState, type ComponentType,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  NuMuProvider, Section, useThemeSettings, defineThemeEntry,
  type Cart, type Customer, type SectionInstance, type Store, type ThemeSettingsV3,
} from "@numueg/theme-sdk";
import themeManifest from "../theme.json";
// Tailwind-in-bundle: compiles @tailwind directives + ported V2 editorial
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
import EdHero from "./sections/ed-hero";
import EdCategories from "./sections/ed-categories";
import EdFeaturedCollection from "./sections/ed-featured-collection";
import EdPromoBanner from "./sections/ed-promo-banner";
import EdTestimonials from "./sections/ed-testimonials";
import EdNewsletter from "./sections/ed-newsletter";
import EdProductDetailSection from "./sections/ed-product-detail-section";
import EdProductsPageSection from "./sections/ed-products-page-section";
import EdProfile from "./sections/ed-profile";
import EdOrderConfirmationSection from "./sections/ed-order-confirmation-section";

interface MountResult {
  cleanup: () => void;
  applyDraft: (next: ThemeSettingsV3) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_REGISTRY: Record<string, ComponentType<any>> = {
  "ed-hero": EdHero,
  "ed-categories": EdCategories,
  "ed-featured-collection": EdFeaturedCollection,
  "ed-promo-banner": EdPromoBanner,
  "ed-testimonials": EdTestimonials,
  "ed-newsletter": EdNewsletter,
  "ed-product-detail-section": EdProductDetailSection,
  "ed-products-page-section": EdProductsPageSection,
  "ed-profile": EdProfile,
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
    <div data-editorial-v3-app data-theme="editorial-v3">
      {sections.map(({ id, instance }) => (
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
const entry = defineThemeEntry(({ currentTemplate }) => (
  <ThemeApp currentTemplate={currentTemplate} />
));

export const mount = entry.mount;
export const createApp = entry.createApp;

const v3Handle = {
  kind: "v3-mount" as const,
  numu_theme_version: 3 as const,
  mount_returns: "MountResult" as const,
  manifest: { id: "editorial-v3", name: "Editorial (V3)", version: "0.3.5" },
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
      : path === "/profile" ? "profile"
      : path === "/order-confirmation" ? "order-confirmation"
      : "home";
    mount(rootEl, {
      store: { id: "dev", name: "Editorial (V3)", slug: "editorial-v3", currency: "EGP", default_language: "en", use_nextjs_storefront: true },
      themeSettings: { schema_version: 3, theme_id: "editorial-v3", global_settings: {}, templates: {}, section_groups: {} },
      currentTemplate: params.get("template") ?? tmpl,
    });
  }
}
