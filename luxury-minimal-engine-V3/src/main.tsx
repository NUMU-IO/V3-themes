/**
 * Luxury Minimal (V3) — entry point.
 *
 * Pattern matches bon-younes: dual mount-context, sanitised template
 * selection, dev-only auto-mount + HUD. Renders sections from
 * `themeSettings.templates.<currentTemplate>` with built-in preset
 * fallback when the host's saved customisation references unknown
 * section types.
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
// Tailwind-in-bundle: compiles @tailwind directives + ported V2 luxury-minimal
// styles into dist/theme.css (see vite.config.ts / tailwind.config.js).
import "./theme.css";
import {
  selectTemplateSections,
  type MaybeOrderedTemplate,
} from "./sections/_template-utils";

interface MountResult {
  cleanup: () => void;
  applyDraft: (next: ThemeSettingsV3) => void;
}

const SECTION_REGISTRY: Record<string, ReturnType<typeof lazy>> = {
  "lux-hero": lazy(() => import("./sections/lux-hero")),
  "lux-featured-collection": lazy(() => import("./sections/lux-featured-collection")),
  "lux-categories": lazy(() => import("./sections/lux-categories")),
  "lux-promo-banner": lazy(() => import("./sections/lux-promo-banner")),
  "lux-collection-strip": lazy(() => import("./sections/lux-collection-strip")),
  "lux-testimonials": lazy(() => import("./sections/lux-testimonials")),
  "lux-newsletter": lazy(() => import("./sections/lux-newsletter")),
  "lux-product-detail-section": lazy(() => import("./sections/lux-product-detail-section")),
  "lux-products-page-section": lazy(() => import("./sections/lux-products-page-section")),
  "lux-profile-section": lazy(() => import("./sections/lux-profile-section")),
  "lux-order-confirmation-section": lazy(() => import("./sections/lux-order-confirmation-section")),
};

const isKnownType = (t: string) => Boolean(SECTION_REGISTRY[t]);

function UnknownSection({ type }: { type: string }) {
  return (
    <section
      style={{
        padding: "1rem",
        border: "1px dashed #d4af37",
        fontFamily: "system-ui",
        color: "#111",
        background: "#fafafa",
      }}
    >
      Unknown section: <strong>{type}</strong>
    </section>
  );
}

const BUILTIN_TEMPLATES = (
  themeManifest as unknown as {
    presets?: { templates?: Record<string, MaybeOrderedTemplate> };
  }
).presets?.templates ?? {};

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
  const sections = selectTemplateSections(
    hostTemplate,
    builtinTemplate,
    isKnownType,
  );
  return (
    <div data-luxury-minimal-v3-app data-theme="luxury-minimal">
      {sections.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} />
      ))}
    </div>
  );
}

export interface MountContext {
  storeData?: Store;
  store?: Store;
  page?: { type?: string; handle?: string; data?: Record<string, unknown> };
  currentTemplate?: string;
  themeSettings: ThemeSettingsV3;
  initialCart?: Cart;
  customer?: Customer | null;
  locale?: string;
  translations?: Record<string, string>;
  [extra: string]: unknown;
}

interface DraftHandle {
  applyDraft: (next: ThemeSettingsV3) => void;
}

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
  return mountTheme(el, ctx, ({ currentTemplate }) => (
    <ThemeApp currentTemplate={currentTemplate} />
  ));
}

const v3Handle = {
  kind: "v3-mount" as const,
  numu_theme_version: 3 as const,
  mount_returns: "MountResult" as const,
  manifest: {
    id: "luxury-minimal-v3",
    name: "Luxury Minimal (V3)",
    version: "0.3.3",
  },
  mount,
};
export default v3Handle;

// ── Dev-only auto-mount ──
if (import.meta.env.DEV && typeof document !== "undefined") {
  const rootEl = document.getElementById("root");
  if (rootEl && !rootEl.dataset.numuMounted) {
    rootEl.dataset.numuMounted = "1";
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    const templateFromPath = path.startsWith("/products/")
      ? "product"
      : path === "/cart"
        ? "cart"
        : path === "/checkout"
          ? "checkout"
          : path === "/products"
            ? "products"
            : "home";
    const devCtx: MountContext = {
      store: {
        id: "dev-store",
        name: "Luxury Minimal",
        slug: "luxury-minimal",
        currency: "EGP",
        default_language: "en",
        use_nextjs_storefront: true,
      },
      themeSettings: {
        schema_version: 3,
        theme_id: "luxury-minimal-v3",
        global_settings: { brand_name: "Luxury Minimal" },
        templates: {},
        section_groups: {},
      },
      currentTemplate: params.get("template") ?? templateFromPath,
    };
    mount(rootEl, devCtx);
  }
}
