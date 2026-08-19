/**
 * Teen (V3) — theme entry point.
 *
 * Responsibilities, in order:
 *   1. own the section registry (type string → component),
 *   2. pick the section list for the current template,
 *   3. guarantee chrome (header/footer) on EVERY route, including ones this
 *      theme ships no template for,
 *   4. bind CMS page bodies,
 *   5. expose `mount` (client) and `createApp` (host SSR) from one definition.
 */

import { useMemo, type ComponentType } from "react";
import {
  defineThemeEntry,
  sanitizeHtml,
  Section,
  selectChromeSections,
  useLocale,
  useThemeSettings,
  type SectionInstance,
} from "@numueg/theme-sdk";
import themeManifest from "../theme.json";
// Tailwind-in-bundle: compiles the @tailwind directives + the tn-* component
// classes into dist/theme.css (see vite.config.ts / tailwind.config.js).
import "./theme.css";
// Private helpers live in src/lib/, NOT src/sections/. `numu-theme check`
// treats every file under src/sections/ as a renderable section and demands a
// matching schemas/sections/<name>.json, so a helper parked there produces a
// permanent warning for a file no merchant will ever add. src/lib/ is the
// layout the CLI's own scaffold uses.
import {
  resolveSections,
  selectTemplateSections,
  type MaybeOrderedTemplate,
} from "./lib/template-utils";
import {
  DemoContext,
  HeroContext,
  PageDataContext,
  usePageData,
  type MountPageData,
} from "./lib/shared";

/**
 * Section registry — the single source of truth for what this bundle can
 * render. Four things must agree for a section to work, and the plugin fails
 * the build if they don't: the component filename, the schema `type` in
 * schemas/sections/<type>.json, the key here, and the type used in a
 * theme.json preset.
 *
 * Sections are imported EAGERLY, never via React.lazy: a lazy section suspends
 * on a chunk fetch, which `renderToString` cannot await, so it would silently
 * drop out of the server-rendered HTML — and client-side it produces a
 * per-section download waterfall that flashes blank on every navigation.
 *
 * Chrome is additionally aliased to the GENERIC "header"/"footer" types so
 * chrome delivered through `section_groups` resolves whether the customizer
 * wrote the prefixed type or the bare one.
 */
import TnHeader from "./sections/tn-header";
import TnFooter from "./sections/tn-footer";
import TnHero from "./sections/tn-hero";
import TnBundleBanner from "./sections/tn-bundle-banner";
import TnProductRail from "./sections/tn-product-rail";
import TnReviewStrip from "./sections/tn-review-strip";
import TnShopTheLook from "./sections/tn-shop-the-look";
import TnCollectionLinks from "./sections/tn-collection-links";
import TnCollection from "./sections/tn-collection";
import TnCollectionsIndex from "./sections/tn-collections-index";
import TnSearch from "./sections/tn-search";
import TnProduct from "./sections/tn-product";
import TnCart from "./sections/tn-cart";
import TnAbout from "./sections/tn-about";
import TnContact from "./sections/tn-contact";
import TnFaq from "./sections/tn-faq";
import TnAccount from "./sections/tn-account";
import TnOrderConfirmation from "./sections/tn-order-confirmation";
import TnNotFound from "./sections/tn-not-found";
import TnBundleBuilder from "./sections/tn-bundle-builder";
import TnSizeGuide from "./sections/tn-size-guide";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_REGISTRY: Record<string, ComponentType<any>> = {
  "tn-header": TnHeader,
  "tn-footer": TnFooter,
  // Generic aliases — chrome delivered via `section_groups` may carry either
  // the prefixed type or the bare one depending on how it was written.
  header: TnHeader,
  footer: TnFooter,
  "tn-hero": TnHero,
  "tn-bundle-banner": TnBundleBanner,
  "tn-product-rail": TnProductRail,
  "tn-review-strip": TnReviewStrip,
  "tn-shop-the-look": TnShopTheLook,
  "tn-collection-links": TnCollectionLinks,
  // One listing section serves both `/collections/<slug>` and `/products` —
  // see the header of tn-collection.tsx for why they are not two sections.
  "tn-collection": TnCollection,
  "tn-collections-index": TnCollectionsIndex,
  "tn-search": TnSearch,
  "tn-product": TnProduct,
  "tn-cart": TnCart,
  "tn-about": TnAbout,
  "tn-contact": TnContact,
  "tn-faq": TnFaq,
  "tn-account": TnAccount,
  "tn-order-confirmation": TnOrderConfirmation,
  "tn-not-found": TnNotFound,
  "tn-bundle-builder": TnBundleBuilder,
  "tn-size-guide": TnSizeGuide,
};

/** Sections that render edge-to-edge media the header capsule can sit on. */
const HERO_TYPES = new Set(["tn-hero"]);

/**
 * Content handles this theme ships a DESIGNED template for.
 *
 * The host maps only a handful of handles to template types itself
 * (`TEMPLATE_TYPE_BY_HANDLE` in numu-storefront/src/lib/content-pages.ts);
 * everything else arrives as `page.type = "page"`. Resolving the rest here
 * means a new designed page works without waiting on a storefront deploy.
 * Purely additive — an unknown handle still falls through to the host's choice.
 */
const TEMPLATE_BY_HANDLE: Record<string, string> = {
  // The storefront's account route sends `page.type: "profile"` while this
  // theme declares the template as "account". Without both keys the boundary
  // finds no match and falls back to the host's built-in AccountHome, so a
  // signed-in /account renders chrome and nothing else.
  profile: "account",
  account: "account",
  faq: "faq",
  faqs: "faq",
  "build-a-bundle": "bundle",
  bundle: "bundle",
  bundles: "bundle",
  باندل: "bundle",
  "size-guide": "size-guide",
  sizing: "size-guide",
  sizes: "size-guide",
  المقاسات: "size-guide",
};

const isKnownType = (t: string) => Boolean(SECTION_REGISTRY[t]);

const BUILTIN_TEMPLATES =
  (themeManifest as unknown as { presets?: { templates?: Record<string, MaybeOrderedTemplate> } })
    .presets?.templates ?? {};

const HEADER_TYPES = new Set(["tn-header", "header"]);
const FOOTER_TYPES = new Set(["tn-footer", "footer"]);

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
    // Only reachable in the editor (an unknown type is filtered out of the
    // storefront render). A visible marker beats a silent gap when a merchant
    // is looking at the section they just added.
    return (
      <Section id={sectionId} type={instance.type} groupId={groupId}>
        <section className="tn-container" style={{ padding: "1rem 0" }}>
          <p className="tn-label" style={{ color: "var(--tn-muted)" }}>
            Unknown section: {instance.type}
          </p>
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
  const locale = useLocale();
  const pageCtx = usePageData();

  const hostTemplate = settings.templates?.[currentTemplate] as MaybeOrderedTemplate | undefined;
  const templateSections = selectTemplateSections(
    hostTemplate,
    BUILTIN_TEMPLATES[currentTemplate],
    isKnownType,
  );

  // Motion switch. The merchant's `enableAnimations` global is one of two
  // independent off-switches (the other is the OS `prefers-reduced-motion`,
  // handled purely in CSS). Both must stop autoplay and transitions, and both
  // must leave content in its FINISHED state — never a hidden pre-state.
  const globals = (settings.global_settings ?? {}) as Record<string, unknown>;
  const motionOff = globals.enableAnimations === false;

  // ── CMS page body ────────────────────────────────────────────────────────
  // /pages/<handle> resolves to template "page", which ships chrome only, so
  // the body is bound here from the host page context. Bilingual, sanitized.
  const cmsPage =
    currentTemplate === "page" && pageCtx?.type === "page" ? pageCtx.data?.page : null;
  const cmsTitle = cmsPage
    ? cmsPage.title_i18n?.[locale] || cmsPage.title || pageCtx?.title || ""
    : "";
  const cmsBody = cmsPage ? cmsPage.body_i18n?.[locale] || cmsPage.body || "" : "";
  const safeBody = useMemo(() => sanitizeHtml(cmsBody), [cmsBody]);

  const cmsBlock =
    cmsTitle || cmsBody ? (
      <section className="tn-container" style={{ maxWidth: "72ch", padding: "4rem 0" }}>
        {cmsTitle && (
          <h1 style={{ fontSize: "var(--tn-fs-title)", margin: "0 0 1.5rem" }}>{cmsTitle}</h1>
        )}
        {cmsBody && (
          <div
            style={{ lineHeight: 1.75, color: "var(--tn-ink-soft)" }}
            dangerouslySetInnerHTML={{ __html: safeBody }}
          />
        )}
      </section>
    ) : null;

  // ── Chrome, in three tiers ───────────────────────────────────────────────
  // 1. `section_groups` — what the V3 customizer writes once chrome is edited.
  // 2. header/footer sitting inline in THIS template — theme.json presets and
  //    a fresh activation.
  // 3. BORROW from any other template. A route this theme ships no template
  //    for (/blogs is the one that always surfaces it) resolves to zero
  //    sections, so tiers 1 and 2 are both empty and the shopper gets correct
  //    content wrapped in nothing: no logo, no menu, no cart, no way back into
  //    the store. Borrowing keeps them real, editable sections rather than a
  //    synthetic strip — there is deliberately NO hardcoded fallback chrome,
  //    because chrome the customizer cannot see is chrome nobody can fix.
  const groups = settings.section_groups as Record<string, MaybeOrderedTemplate> | undefined;
  const groupHeader = resolveSections(groups?.header).filter(({ instance }) =>
    isKnownType(instance.type),
  );
  const groupFooter = resolveSections(groups?.footer).filter(({ instance }) =>
    isKnownType(instance.type),
  );
  const inlineHeader = templateSections.filter(({ instance }) => HEADER_TYPES.has(instance.type));
  const inlineFooter = templateSections.filter(({ instance }) => FOOTER_TYPES.has(instance.type));
  const body = templateSections.filter(
    ({ instance }) => !HEADER_TYPES.has(instance.type) && !FOOTER_TYPES.has(instance.type),
  );

  const chromeCandidates = [
    (settings.templates as Record<string, MaybeOrderedTemplate> | undefined)?.home,
    BUILTIN_TEMPLATES.home,
    ...Object.values((settings.templates ?? {}) as Record<string, MaybeOrderedTemplate>),
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

  // First body section only — a hero further down the page is not behind the
  // header, so overlaying the capsule for it would be wrong.
  const opensWithHero = body.length > 0 && HERO_TYPES.has(body[0].instance.type);

  return (
    <HeroContext.Provider value={opensWithHero}>
      <div
        data-teen-v3-app
        data-theme="teen-v3"
        data-template={currentTemplate}
        data-tn-motion={motionOff ? "off" : "on"}
        data-tn-hero={opensWithHero ? "true" : "false"}
      >
        {header.map(({ id, instance }) => (
          <RenderSection key={id} sectionId={id} instance={instance} />
        ))}
        {/* Exactly one <main> landmark. It is also the slot the host fills when
            this theme ships no template for the route, so the shopper keeps the
            theme's header, navigation and footer instead of a bare page. */}
        <main id="tn-main">
          {body.map(({ id, instance }) => (
            <RenderSection key={id} sectionId={id} instance={instance} />
          ))}
          {cmsBlock}
        </main>
        {footer.map(({ id, instance }) => (
          <RenderSection key={id} sectionId={id} instance={instance} />
        ))}
      </div>
    </HeroContext.Provider>
  );
}

/**
 * Template types the host asks for under a name this theme does not use.
 *
 * `/account` is the live case. The storefront's account route mounts with
 * `page = { type: "profile", title: "Account", data: {...} }` and **no
 * `handle`** — so the handle map above cannot see it, `currentTemplate` stays
 * `"profile"`, this theme (which declares `account`, the SDK's own canonical
 * name) matches nothing, and the signed-in customer gets chrome wrapped around
 * an empty page. Declaring the template twice under both names would work and
 * would then drift, since chrome is per-template.
 */
const TEMPLATE_ALIASES: Record<string, string> = {
  // `profile` is what /account sends a SIGNED-IN customer.
  profile: "account",
  // ...and these are the other nine the host sends across the customer
  // surface. Live QA found every one of them falling through to the host's
  // unstyled built-in form: `/account/login` mounts the bundle with
  // `page.type = "login"`, this theme declared no `login` template, so
  // `routeFallback` won and the shopper left Teen entirely — no header, no
  // footer, no theme at all, on the most-visited page after the PDP.
  //
  // `tn-account` already implements both sign-in and registration behind its
  // own mode toggle, so all of these resolve to the one designed template
  // rather than nine near-copies that would drift apart.
  login: "account",
  register: "account",
  recover: "account",
  reset: "account",
  account_profile: "account",
  account_orders: "account",
  account_order: "account",
  account_addresses: "account",
  account_gift_cards: "account",
};

/**
 * Upgrade the host's generic `page` template to a designed one when this theme
 * ships a template for the handle. Never DOWNgrades: an explicit non-page
 * template from the host is always respected, so a real route cannot be
 * hijacked by a CMS page that happens to share its handle.
 */
function resolveTemplate(hostTemplate: string, page: MountPageData | null): string {
  const handle = (page?.handle ?? "").toLowerCase();
  const mapped = TEMPLATE_BY_HANDLE[handle];
  if (mapped && (!hostTemplate || hostTemplate === "page")) return mapped;
  // Alias ONLY when this theme genuinely has no template of that name, so a
  // future version that adds a real `profile` template silently wins.
  if (hostTemplate && !BUILTIN_TEMPLATES[hostTemplate] && TEMPLATE_ALIASES[hostTemplate]) {
    return TEMPLATE_ALIASES[hostTemplate];
  }
  return hostTemplate || "home";
}

// defineThemeEntry yields BOTH halves of the contract from one component:
// `mount` (client mount/hydrate) and `createApp` (host-side renderToString).
// Routing both through one definition is what makes the server markup and the
// client tree identical by construction — the precondition for hydration.
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
  // ⚠ Version lives in THREE places and they must match: theme.json,
  // package.json, and this literal.
  manifest: { id: "teen-v3", name: "Teen (V3)", version: "1.0.0" },
  mount,
};
export default v3Handle;

// Dev-only auto-mount for `npm run dev` (vite serves index.html at :5174).
// `import.meta.env.DEV` alone already dead-code-eliminates this out of both the
// client and SSR bundles; the explicit window/document guards are belt-and-
// braces so the block stays obviously server-safe to a reader and to the linter.
if (import.meta.env.DEV && typeof window !== "undefined" && typeof document !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  const rootEl = document.getElementById("root");
  if (rootEl && !rootEl.dataset.numuMounted) {
    rootEl.dataset.numuMounted = "1";
    const byPrefix: Array<[string, string]> = [
      ["/products/", "product"],
      ["/collections/", "collection"],
      ["/pages/", "page"],
    ];
    const byExact: Record<string, string> = {
      "/products": "products",
      "/collections": "collections",
      "/cart": "cart",
      "/checkout": "checkout",
      "/search": "search",
      "/account": "account",
      "/profile": "account",
      "/about": "about",
      "/contact": "contact",
      "/faq": "faq",
      "/bundle": "bundle",
      "/size-guide": "size-guide",
      "/404": "404",
    };
    const tmpl =
      byExact[path] ?? byPrefix.find(([p]) => path.startsWith(p))?.[1] ?? "home";

    mount(rootEl, {
      store: {
        id: "dev",
        name: "Teen",
        slug: "teen-v3",
        currency: "EGP",
        default_language: "en",
        use_nextjs_storefront: true,
      },
      themeSettings: {
        schema_version: 3,
        theme_id: "teen-v3",
        global_settings: {},
        templates: {},
        section_groups: {},
      },
      currentTemplate: params.get("template") ?? tmpl,
    });
  }
}
