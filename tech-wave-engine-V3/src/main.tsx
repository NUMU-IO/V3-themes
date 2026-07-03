/**
 * Tech Wave (V3) — V3 entry point.
 * Dual mount-context shape, sanitised template selection, dev auto-mount.
 *
 * Section components live in src/sections/<type>.tsx and are lazy-loaded so
 * only sections the merchant actually uses pay the bundle cost. ThemeApp
 * routes by `currentTemplate` (home / product / products / about / contact /
 * profile / order-confirmation / cart / checkout) via selectTemplateSections,
 * exactly like the Vionne V3 theme.
 */

import { type ComponentType } from "react";
import {
  Section, useThemeSettings, defineThemeEntry,
  type Cart, type Customer, type SectionInstance, type Store, type ThemeSettingsV3,
} from "@numueg/theme-sdk";
import themeManifest from "../theme.json";
// Tailwind-in-bundle: compiles @tailwind directives + ported V2 tech-wave
// styles into dist/theme.css (see vite.config.ts / tailwind.config.js).
import "./theme.css";
import {
  selectTemplateSections, type MaybeOrderedTemplate,
} from "./sections/_template-utils";

// Eager section imports (no React.lazy): sections bundle into theme.js so the
// whole page renders in one commit — no chunk-download flash, SSR-safe.
import TwAnnouncementBar from "./sections/tw-announcement-bar";
import TechWaveHero from "./sections/tech-wave-hero";
import TechWaveCategories from "./sections/tech-wave-categories";
import TechWaveFeaturedCollection from "./sections/tech-wave-featured-collection";
import TechWavePromoBanner from "./sections/tech-wave-promo-banner";
import TechWaveTestimonials from "./sections/tech-wave-testimonials";
import TechWaveNewsletter from "./sections/tech-wave-newsletter";
import TechWaveProductDetail from "./sections/tech-wave-product-detail";
import TechWaveProductsPage from "./sections/tech-wave-products-page";
import TechWaveProfile from "./sections/tech-wave-profile";
import TechWaveAbout from "./sections/tech-wave-about";
import TechWaveContact from "./sections/tech-wave-contact";
import TechWaveOrderConfirmationSection from "./sections/tech-wave-order-confirmation-section";

interface MountResult {
  cleanup: () => void;
  applyDraft: (next: ThemeSettingsV3) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_REGISTRY: Record<string, ComponentType<any>> = {
  // Home sections (faithful ports of the V2 in-tree tech-wave sections)
  "tw-announcement-bar": TwAnnouncementBar,
  "tech-wave-hero": TechWaveHero,
  "tech-wave-categories": TechWaveCategories,
  "tech-wave-featured-collection": TechWaveFeaturedCollection,
  "tech-wave-promo-banner": TechWavePromoBanner,
  "tech-wave-testimonials": TechWaveTestimonials,
  "tech-wave-newsletter": TechWaveNewsletter,
  // Page-level sections (ported from the Vionne V3 page sections, re-skinned)
  "tech-wave-product-detail": TechWaveProductDetail,
  "tech-wave-products-page": TechWaveProductsPage,
  "tech-wave-profile": TechWaveProfile,
  "tech-wave-about": TechWaveAbout,
  "tech-wave-contact": TechWaveContact,
  "tech-wave-order-confirmation-section": TechWaveOrderConfirmationSection,
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
        <section style={{ padding: "1rem", border: "1px dashed #fb923c", color: "#aaa" }}>
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
    <div data-tech-wave-v3-app data-theme="tech-wave-v3">
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

// defineThemeEntry yields both mount (client) and createApp (server SSR).
const entry = defineThemeEntry(({ currentTemplate }) => (
  <ThemeApp currentTemplate={currentTemplate} />
));

export const mount = entry.mount;
export const createApp = entry.createApp;

const v3Handle = {
  kind: "v3-mount" as const,
  numu_theme_version: 3 as const,
  mount_returns: "MountResult" as const,
  manifest: { id: "tech-wave-v3", name: "Tech wave (V3)", version: "0.3.3" },
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
      store: { id: "dev", name: "Tech wave (V3)", slug: "tech-wave-v3", currency: "EGP", default_language: "en", use_nextjs_storefront: true },
      themeSettings: { schema_version: 3, theme_id: "tech-wave-v3", global_settings: {}, templates: {}, section_groups: {} },
      currentTemplate: params.get("template") ?? tmpl,
    });
  }
}
