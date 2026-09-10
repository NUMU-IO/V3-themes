/**
 * Powell's (V3) — theme entry point.
 *
 * Responsibilities, in order:
 *   1. own the section registry (type string → component),
 *   2. pick the section list for the current template,
 *   3. guarantee chrome (masthead/footer) on EVERY route, including ones this
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
import "./theme.css";
// Private helpers live in src/lib/, NOT src/sections/. `numu-theme check`
// treats every file under src/sections/ as a renderable section and demands a
// matching schemas/sections/<name>.json, so a helper parked there produces a
// permanent warning for a file no merchant will ever add.
import {
  resolveSections,
  selectTemplateSections,
  type MaybeOrderedTemplate,
} from "./lib/template-utils";
import { DemoContext, PageDataContext, usePageData, type MountPageData } from "./lib/shared";

/**
 * Section registry — the single source of truth for what this bundle can
 * render. Four things must agree for a section to work, and the plugin fails
 * the build if they don't: the component filename, the schema `type` in
 * schemas/sections/<type>.json, the key here, and the type used in a
 * theme.json preset.
 *
 * Sections are imported EAGERLY, never via React.lazy: a lazy section suspends
 * on a chunk fetch, which `renderToString` cannot await, so it would silently
 * drop out of the server-rendered HTML.
 */
import PwHeader from "./sections/pw-header";
import PwFooter from "./sections/pw-footer";
import PwHero from "./sections/pw-hero";
import PwShelf from "./sections/pw-shelf";
import PwShelfLinks from "./sections/pw-shelf-links";
import PwEditorial from "./sections/pw-editorial";
import PwCollection from "./sections/pw-collection";
import PwProduct from "./sections/pw-product";
import PwCart from "./sections/pw-cart";
import PwCheckout from "./sections/pw-checkout";
import PwSearch from "./sections/pw-search";
import PwAccount from "./sections/pw-account";
import PwOrderConfirmation from "./sections/pw-order-confirmation";
import PwCollectionsIndex from "./sections/pw-collections-index";
import PwBlog from "./sections/pw-blog";
import PwReviews from "./sections/pw-reviews";
import PwNotFound from "./sections/pw-not-found";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_REGISTRY: Record<string, ComponentType<any>> = {
  "pw-header": PwHeader,
  "pw-footer": PwFooter,
  // Generic aliases — chrome delivered via `section_groups` may carry either
  // the prefixed type or the bare one depending on how it was written.
  header: PwHeader,
  footer: PwFooter,
  // One listing section serves `/collections/<slug>` AND `/products`: they are
  // the same page with a different heading and a different product source.
  "pw-hero": PwHero,
  "pw-shelf": PwShelf,
  "pw-shelf-links": PwShelfLinks,
  "pw-editorial": PwEditorial,
  "pw-collection": PwCollection,
  "pw-product": PwProduct,
  "pw-cart": PwCart,
  "pw-checkout": PwCheckout,
  "pw-search": PwSearch,
  "pw-account": PwAccount,
  "pw-order-confirmation": PwOrderConfirmation,
  "pw-collections-index": PwCollectionsIndex,
  "pw-blog": PwBlog,
  "pw-reviews": PwReviews,
  "pw-not-found": PwNotFound,
};

const isKnownType = (t: string) => Boolean(SECTION_REGISTRY[t]);

const BUILTIN_TEMPLATES =
  (
    themeManifest as unknown as {
      presets?: { templates?: Record<string, MaybeOrderedTemplate> };
    }
  ).presets?.templates ?? {};

const HEADER_TYPES = new Set(["pw-header", "header"]);
const FOOTER_TYPES = new Set(["pw-footer", "footer"]);

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
        <div className="pw-container" style={{ padding: "1rem 0", color: "var(--pw-muted)" }}>
          Unknown section: {instance.type}
        </div>
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
  // handled purely in CSS). Both must leave content in its FINISHED state.
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
      <div className="pw-container" style={{ maxWidth: "72ch", padding: "56px 0" }}>
        {cmsTitle && (
          <h1
            style={{
              fontFamily: "var(--pw-font-heading)",
              fontWeight: 500,
              fontSize: "2.6rem",
              margin: "0 0 1.5rem",
            }}
          >
            {cmsTitle}
          </h1>
        )}
        {cmsBody && (
          <div
            style={{ lineHeight: 1.7, color: "var(--pw-ink-soft)" }}
            dangerouslySetInnerHTML={{ __html: safeBody }}
          />
        )}
      </div>
    ) : null;

  // ── Chrome, in three tiers ───────────────────────────────────────────────
  // 1. `section_groups` — what the V3 customizer writes once chrome is edited.
  // 2. header/footer sitting inline in THIS template — theme.json presets and
  //    a fresh activation.
  // 3. BORROW from any other template. A route this theme ships no template
  //    for resolves to zero sections, so tiers 1 and 2 are both empty and the
  //    shopper gets correct content wrapped in nothing: no logo, no menu, no
  //    cart, no way back into the store. Borrowing keeps them real, editable
  //    sections rather than a synthetic strip — there is deliberately NO
  //    hardcoded fallback chrome, because chrome the customizer cannot see is
  //    chrome nobody can fix.
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
    (settings.templates as Record<string, MaybeOrderedTemplate> | undefined)?.collection,
    BUILTIN_TEMPLATES.collection,
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

  return (
    <div
      data-powells-v3-app
      data-theme="powells-v3"
      data-template={currentTemplate}
      data-pw-motion={motionOff ? "off" : "on"}
    >
      {header.map(({ id, instance }) => (
        <RenderSection key={id} sectionId={id} instance={instance} />
      ))}
      {/* Exactly one <main> landmark. It is also the slot the host fills when
          this theme ships no template for the route, so the shopper keeps the
          masthead, navigation and footer instead of a bare page. */}
      <main id="pw-main">
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

/**
 * Template types the host asks for under a name this theme does not use.
 *
 * `/account` is the live case: the storefront mounts it with
 * `page = { type: "profile" }`, and a theme that declares only `account`
 * matches nothing, so a signed-in customer gets chrome around an empty page.
 * The customer surface sends nine more (`login`, `register`, `recover`, …).
 *
 * This theme ships no designed account surface yet, so every one of them is
 * deliberately left to the host's built-in form — wrapped in this theme's
 * chrome by the borrowing rule above, which is the honest outcome until
 * `pw-account` exists.
 */
const TEMPLATE_ALIASES: Record<string, string> = {
  products: "collection",
  // The host sends `profile` to a signed-in customer and nine more names
  // across the rest of the customer surface. Every one resolves to the single
  // `account` template, which is what stops /account/login leaving the theme
  // entirely — the failure this fleet has hit before.
  profile: "account",
  login: "account",
  register: "account",
  recover: "account",
  reset: "account",
  account_profile: "account",
  account_orders: "account",
  account_order: "account",
  account_addresses: "account",
  account_gift_cards: "account",
  // Blog routes: index, one blog, one post — one section renders all three.
  blogs: "blog",
  article: "blog",
  // The platform's own thank-you route.
  thank_you: "order-confirmation",
  order_confirmation: "order-confirmation",
};

/**
 * Upgrade the host's generic `page` template to a designed one when this theme
 * ships a template for the handle. Never DOWNgrades: an explicit non-page
 * template from the host is always respected, so a real route cannot be
 * hijacked by a CMS page that happens to share its handle.
 */
function resolveTemplate(hostTemplate: string, _page: MountPageData | null): string {
  // Alias ONLY when this theme genuinely has no template of that name, so a
  // future version that adds a real one silently wins.
  if (hostTemplate && !BUILTIN_TEMPLATES[hostTemplate] && TEMPLATE_ALIASES[hostTemplate]) {
    return TEMPLATE_ALIASES[hostTemplate];
  }
  return hostTemplate || "collection";
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
  manifest: { id: "powells-v3", name: "Powell's (V3)", version: "1.0.0" },
  mount,
};
export default v3Handle;

// Dev-only auto-mount for `npm run dev` (vite serves index.html at :5175).
// `import.meta.env.DEV` alone already dead-code-eliminates this out of both
// bundles; the window/document guards keep the block obviously server-safe.
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
      "/": "home",
      "/products": "collection",
      "/collections": "collection",
      "/cart": "cart",
      "/checkout": "checkout",
      "/search": "search",
      "/account": "account",
      "/blogs": "blog",
      "/404": "404",
    };
    const tmpl = byExact[path] ?? byPrefix.find(([p]) => path.startsWith(p))?.[1] ?? "collection";

    const template = params.get("template") ?? tmpl;
    const slug = path.startsWith("/products/") ? path.slice("/products/".length) : undefined;

    // Fixtures are imported lazily and only under DEV, so the module never
    // reaches either shipped bundle.
    void import("./lib/dev-fixtures").then(({ DEV_CART, devPage }) => {
      mount(rootEl, {
        store: {
          id: "dev",
          name: "Powell's",
          slug: "powells-v3",
          currency: "USD",
          default_language: params.get("locale") === "ar" ? "ar" : "en",
          use_nextjs_storefront: true,
        },
        themeSettings: {
          schema_version: 3,
          theme_id: "powells-v3",
          global_settings: {},
          templates: {},
          section_groups: {},
        },
        locale: params.get("locale") === "ar" ? "ar" : "en",
        initialCart: DEV_CART as never,
        page: devPage(template, slug) as never,
        currentTemplate: template,
      });
    });
  }
}
