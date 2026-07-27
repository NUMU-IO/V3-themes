/**
 * Modern (V3) — V3 entry point.
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
// Tailwind-in-bundle: compiles @tailwind directives + ported V2 modern
// styles into dist/theme.css (see vite.config.ts / tailwind.config.js).
import "./theme.css";
import {
  resolveSections, selectTemplateSections, type MaybeOrderedTemplate,
} from "./sections/_template-utils";

// Sections are imported EAGERLY (not React.lazy): lazy sections can't be
// server-rendered by renderToString (they suspend on a chunk fetch), and the
// per-chunk download waterfall caused the blank-content flash on every nav.
// Eager imports bundle every section into theme.js so the whole page renders
// in one commit — server-side (createApp) and client-side (mount) alike.
import ModernHero from "./sections/modern-hero";
import ModernCategories from "./sections/modern-categories";
import ModernFeaturedCollection from "./sections/modern-featured-collection";
import ModernPromoBanner from "./sections/modern-promo-banner";
import ModernTestimonials from "./sections/modern-testimonials";
import ModernNewsletter from "./sections/modern-newsletter";
import ModernProductDetail from "./sections/modern-product-detail";
import ModernProductsPage from "./sections/modern-products-page";
import ModernProfile from "./sections/modern-profile";
// Chrome — the storefront renders these OUTSIDE <main>.
import ModernHeader from "./sections/modern-header";
import ModernFooter from "./sections/modern-footer";

interface MountResult {
  cleanup: () => void;
  applyDraft: (next: ThemeSettingsV3) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_REGISTRY: Record<string, ComponentType<any>> = {
  // Home sections
  "modern-hero": ModernHero,
  "modern-categories": ModernCategories,
  "modern-featured-collection": ModernFeaturedCollection,
  "modern-promo-banner": ModernPromoBanner,
  "modern-testimonials": ModernTestimonials,
  "modern-newsletter": ModernNewsletter,
  // Page-level sections (product / products / profile)
  "modern-product-detail": ModernProductDetail,
  "modern-products-page": ModernProductsPage,
  "modern-profile": ModernProfile,
  // Chrome. Aliased to the GENERIC "header"/"footer" types too, so chrome
  // delivered via section_groups (prefixed OR generic) always resolves.
  "modern-header": ModernHeader,
  "modern-footer": ModernFooter,
  header: ModernHeader,
  footer: ModernFooter,
};

const HEADER_TYPES = new Set(["modern-header", "header"]);
const FOOTER_TYPES = new Set(["modern-footer", "footer"]);

const isKnownType = (t: string) => Boolean(SECTION_REGISTRY[t]);

const PRESETS = (
  themeManifest as unknown as {
    presets?: {
      templates?: Record<string, MaybeOrderedTemplate>;
      section_groups?: Record<string, MaybeOrderedTemplate>;
    };
  }
).presets ?? {};
const BUILTIN_TEMPLATES = PRESETS.templates ?? {};
const BUILTIN_GROUPS = PRESETS.section_groups ?? {};

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

  // Chrome (header/footer) can reach us from three places, in priority order:
  //   1. settings.section_groups.header / .footer — what the V3 customizer
  //      writes, so a merchant's edits always win;
  //   2. inline in the template's own section list (legacy / seeded data);
  //   3. the theme.json preset section_groups — the guarantee that a store
  //      that was never customised still gets real navigation instead of the
  //      host's generic fallback strip.
  const groups = settings.section_groups as
    | Record<string, MaybeOrderedTemplate>
    | undefined;
  const known = (list: ReturnType<typeof resolveSections>) =>
    list.filter(({ instance }) => isKnownType(instance.type));

  const inlineHeader = sections.filter(({ instance }) =>
    HEADER_TYPES.has(instance.type),
  );
  const inlineFooter = sections.filter(({ instance }) =>
    FOOTER_TYPES.has(instance.type),
  );
  const body = sections.filter(
    ({ instance }) =>
      !HEADER_TYPES.has(instance.type) && !FOOTER_TYPES.has(instance.type),
  );

  const hostHeader = known(resolveSections(groups?.header));
  const hostFooter = known(resolveSections(groups?.footer));
  const presetHeader = known(resolveSections(BUILTIN_GROUPS.header));
  const presetFooter = known(resolveSections(BUILTIN_GROUPS.footer));

  const header =
    hostHeader.length > 0
      ? hostHeader
      : inlineHeader.length > 0
        ? inlineHeader
        : presetHeader;
  const footer =
    hostFooter.length > 0
      ? hostFooter
      : inlineFooter.length > 0
        ? inlineFooter
        : presetFooter;

  // a11y: exactly one main landmark. The chrome's own header/footer
  // landmarks render outside it, never nested inside main.
  return (
    <div data-modern-v3-app data-theme="modern-v3">
      {header.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} groupId="header" />
      ))}
      <main>
        {body.map(({ id, instance }) => (
          <RenderSection key={id} sectionId={id} instance={instance} />
        ))}
      </main>
      {footer.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} groupId="footer" />
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
  manifest: { id: "modern-v3", name: "Modern (V3)", version: "0.4.0" },
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
      store: { id: "dev", name: "Modern (V3)", slug: "modern-v3", currency: "EGP", default_language: "en", use_nextjs_storefront: true },
      themeSettings: { schema_version: 3, theme_id: "modern-v3", global_settings: {}, templates: {}, section_groups: {} },
      currentTemplate: params.get("template") ?? tmpl,
    });
  }
}
