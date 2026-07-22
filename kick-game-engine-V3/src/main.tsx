/**
 * Kick game (V3) — V3 entry point.
 * Dual mount-context shape, sanitised template selection, Tailwind-in-bundle.
 *
 * Section components live in src/sections/<type>.tsx and are lazy-loaded so
 * only sections the merchant actually uses pay the bundle cost.
 */

import { type ComponentType } from "react";
import {
  NuMuProvider,
  Section,
  useThemeSettings,
  defineThemeEntry,
  type Cart,
  type Customer,
  type SectionInstance,
  type Store,
  type ThemeSettingsV3,
} from "@numueg/theme-sdk";
import themeManifest from "../theme.json";
// Tailwind-in-bundle: compiles @tailwind directives + the ported V2 kick-game
// styles into dist/theme.css (see vite.config.ts / tailwind.config.js).
import "./theme.css";
import {
  resolveSections,
  selectTemplateSections,
  type MaybeOrderedTemplate,
} from "./sections/_template-utils";

// Sections are imported EAGERLY (not React.lazy): lazy sections can't be
// server-rendered by renderToString (they suspend on a chunk fetch), and the
// per-chunk download waterfall caused the blank-content flash on every nav.
// Eager imports bundle every section into theme.js so the whole page renders
// in one commit — server-side (createApp) and client-side (mount) alike.
import KgHero from "./sections/kghero";
import KgCategories from "./sections/kgcategories";
import KgFeatured from "./sections/kgfeatured";
import KgNewsletter from "./sections/kgnewsletter";
import KgPromoBanner from "./sections/kgpromo-banner";
import KgTestimonials from "./sections/kgtestimonials";
import KgProductDetail from "./sections/kg-product-detail";
import KgProductsPage from "./sections/kg-products-page";
import KgProfile from "./sections/kg-profile";
import KgOrderConfirmation from "./sections/kg-order-confirmation";
import KgAbout from "./sections/kg-about";
import KgContact from "./sections/kg-contact";
import KgHeader from "./sections/kg-header";
import KgFooter from "./sections/kg-footer";

/**
 * MountResult shape. The published @numueg/theme-sdk@0.1.0 doesn't re-export
 * this type yet, so we declare it inline. Matches the host contract documented
 * in ByotThemeBoundary.tsx on the storefront.
 */
interface MountResult {
  cleanup: () => void;
  applyDraft: (next: ThemeSettingsV3) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_REGISTRY: Record<string, ComponentType<any>> = {
  // Home sections (faithful V2 ports)
  "kghero": KgHero,
  "kgcategories": KgCategories,
  "kgfeatured": KgFeatured,
  "kgnewsletter": KgNewsletter,
  "kgpromo-banner": KgPromoBanner,
  "kgtestimonials": KgTestimonials,
  // Page-level sections (ported from the proven vionne V3, re-palette'd)
  "kg-product-detail": KgProductDetail,
  "kg-products-page": KgProductsPage,
  "kg-profile": KgProfile,
  "kg-order-confirmation": KgOrderConfirmation,
  "kg-about": KgAbout,
  "kg-contact": KgContact,
  // Chrome. Aliased to the GENERIC "header"/"footer" types too, so chrome
  // delivered via section_groups (prefixed OR generic) always resolves.
  "kg-header": KgHeader,
  "kg-footer": KgFooter,
  header: KgHeader,
  footer: KgFooter,
};

const HEADER_TYPES = new Set(["kg-header", "header"]);
const FOOTER_TYPES = new Set(["kg-footer", "footer"]);

const BUILTIN_GROUPS = (
  themeManifest as unknown as { presets?: { section_groups?: Record<string, MaybeOrderedTemplate> } }
).presets?.section_groups ?? {};

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
        <section style={{ padding: "1rem", border: "1px dashed #fb923c", color: "#666" }}>
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
  //   1. the engine's section_groups.header / .footer — what the V3 customizer
  //      writes. Present-but-empty means the merchant deliberately removed it,
  //      so we do NOT resurrect it from the preset;
  //   2. inline in the template's section list (legacy/seeded customizations);
  //   3. theme.json presets.section_groups — the bundled default, which covers
  //      every template at once on a fresh install.
  const groups = settings.section_groups as
    | Record<string, MaybeOrderedTemplate>
    | undefined;
  const chrome = (key: "header" | "footer", types: Set<string>) => {
    const hostGroup = groups?.[key];
    if (hostGroup) {
      return resolveSections(hostGroup).filter(({ instance }) =>
        isKnownType(instance.type),
      );
    }
    const inline = sections.filter(({ instance }) => types.has(instance.type));
    if (inline.length > 0) return inline;
    return resolveSections(BUILTIN_GROUPS[key]).filter(({ instance }) =>
      isKnownType(instance.type),
    );
  };
  const header = chrome("header", HEADER_TYPES);
  const footer = chrome("footer", FOOTER_TYPES);

  // a11y: exactly one main landmark. The chrome sections render their own
  // banner / contentinfo landmarks OUTSIDE it, never nested inside content.
  const body = sections.filter(
    ({ instance }) =>
      !HEADER_TYPES.has(instance.type) && !FOOTER_TYPES.has(instance.type),
  );

  return (
    <div data-kick-game-v3-app data-theme="kick-game-v3">
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
  manifest: { id: "kick-game-v3", name: "Kick game (V3)", version: "0.4.0" },
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
      store: { id: "dev", name: "Kick game (V3)", slug: "kick-game-v3", currency: "EGP", default_language: "en", use_nextjs_storefront: true },
      themeSettings: { schema_version: 3, theme_id: "kick-game-v3", global_settings: {}, templates: {}, section_groups: {} },
      currentTemplate: params.get("template") ?? tmpl,
    });
  }
}
