/**
 * tn-header — Teen's floating capsule header.
 *
 * Anatomy, matching the reference:
 *   capsule (fixed, 1px ink outline, ~6px inset, 71px tall / 61px on mobile)
 *     └ lead    — hamburger · logo
 *     └ nav     — text links + an optional red promo pill  (desktop only)
 *     └ actions — search · account · bag with an orange count pill
 *   drawer      — full-bleed white sheet: links, manifesto, socials, a
 *                 featured collection card with its orange item-count pill
 *   bundle pill — fixed bottom-end, ink pill + lime badge
 *
 * Two things live here that look like they should be their own sections, and
 * both are deliberate (plan D4): the **promo badge** and the **build-a-bundle
 * pill**. The host already renders platform promotion bars; a free-floating
 * promo section is how a store ends up showing two of them. Keeping them as
 * header settings means there is exactly one of each, by construction.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Link,
  Logo,
  useCart,
  useCurrentTemplate,
  useCustomer,
  useDirection,
  useNavigation,
  useResolvedSettings,
  useShop,
  useThemeSettings,
} from "@numueg/theme-sdk";
import {
  asBool,
  asImageUrl,
  asString,
  collectionFields,
  cx,
  readBlockNodes,
  useFocusTrap,
  useInheritedChrome,
  useOverlayBehaviour,
  useStoreCollections,
  useTemplateOpensWithHero,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import {
  IconBag,
  IconBolt,
  IconClose,
  IconFacebook,
  IconInstagram,
  IconMenu,
  IconSearch,
  IconTikTok,
  IconUser,
  IconWhatsApp,
} from "../lib/icons";

interface NavLink {
  id: string;
  title: string;
  url: string;
  badge?: string;
  children?: NavLink[];
}

/**
 * The nav, in three tiers.
 *
 *   1. a merchant-managed menu (Online store → Navigation) — always wins, it is
 *      the thing they can edit without touching the theme;
 *   2. `nav_item` blocks on the header section;
 *   3. a built-in bilingual list.
 *
 * Tier 3 is not decoration. Schema `default` values are applied by the BACKEND
 * when it seeds a customization — they are absent from the instance at render
 * time. So a bare `{"type":"tn-header","settings":{}}` (an SSR fixture, the
 * marketplace preview, a freshly-seeded template) reaches this component with
 * nothing at all, and without a built-in fallback the header renders with no
 * navigation whatsoever.
 *
 * Only tier 2 can carry a per-item badge, which is why the section also has a
 * `promo_badge_text` setting — see `promoPill` in the component.
 */
function useHeaderNav(instance: SectionRenderProps["instance"], menuHandle: string): NavLink[] {
  const { items } = useNavigation(menuHandle);
  const withBlocks = useInheritedChrome(instance, "tn-header", "nav_item");
  const t = useT();

  const visible = items.filter((i) => i.target_visible !== false);
  if (visible.length > 0) {
    return visible.map((i) => ({
      id: i.id,
      title: i.title,
      url: i.url,
      children: (i.children ?? [])
        .filter((c) => c.target_visible !== false)
        .map((c) => ({ id: c.id, title: c.title, url: c.url })),
    }));
  }

  const blocks = readBlockNodes(withBlocks, "nav_item");
  if (blocks.length > 0) {
    return blocks.map((node, idx) => ({
      id: `nav-${idx}`,
      title: asString(node.settings.label),
      url: asString(node.settings.link, "/products"),
      badge: asString(node.settings.badge),
      children: readBlockNodes(node, "nav_child").map((child, ci) => ({
        id: `nav-${idx}-${ci}`,
        title: asString(child.settings.label),
        url: asString(child.settings.link, "/products"),
      })),
    }));
  }

  // `/pages/build-a-bundle`, NOT `/build-a-bundle`. The host promotes only a
  // fixed set of handles to top-level routes (about, contact, account,
  // order-confirmation — see numu-storefront `content-pages.ts`); everything
  // else lives under /pages/<handle>, and `TEMPLATE_BY_HANDLE` in main.tsx
  // upgrades the generic `page` type back to this theme's bundle template.
  return [
    { key: "nav.home", fallback: "Home", ar: "الرئيسية", url: "/" },
    {
      key: "nav.bundle",
      fallback: "Build a bundle",
      ar: "اعمل الباندل",
      url: "/pages/build-a-bundle",
      badge: true,
    },
    { key: "nav.new_in", fallback: "New in", ar: "وصل حديثًا", url: "/products" },
    { key: "nav.shop", fallback: "Shop", ar: "تسوق", url: "/collections" },
    { key: "nav.about", fallback: "About", ar: "عننا", url: "/about" },
  ].map((d, idx) => ({
    id: `nav-default-${idx}`,
    title: t(d.key, d.fallback),
    url: d.url,
    badge: undefined,
    children: [],
  }));
}

function NavEntry({ item }: { item: NavLink }) {
  const hasChildren = (item.children?.length ?? 0) > 0;
  if (!hasChildren) {
    return (
      <Link to={item.url} className="tn-nav-link">
        {item.title}
        {item.badge ? <span className="tn-nav-badge">{item.badge}</span> : null}
      </Link>
    );
  }
  // Hover OR focus opens it, and the panel stays inside the group so moving the
  // pointer down into it never crosses a gap. CSS-only: a dropdown that needs
  // JS to open is a dropdown that is closed while the bundle is still loading.
  return (
    <div className="tn-nav-group">
      <Link to={item.url} className="tn-nav-link">
        {item.title}
        {item.badge ? <span className="tn-nav-badge">{item.badge}</span> : null}
      </Link>
      <div className="tn-nav-panel">
        {item.children!.map((c) => (
          <Link key={c.id} to={c.url} className="tn-nav-sublink">
            {c.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function TnHeader({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const t = useT();
  const direction = useDirection();
  const { cart } = useCart();
  const customer = useCustomer();
  const template = useCurrentTemplate();
  const collections = useStoreCollections();
  const opensWithHero = useTemplateOpensWithHero();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(drawerOpen, drawerRef);
  useOverlayBehaviour(drawerOpen, () => setDrawerOpen(false));

  // Close the drawer when the shopper actually navigates. Without this the
  // sheet stays open over the page they just asked for, which reads as a
  // dead link rather than as an open menu.
  useEffect(() => {
    setDrawerOpen(false);
  }, [template]);

  /**
   * Logo sizing.
   *
   * The SDK's <Logo> sizes from the ENGINE globals `logo_shape` + `logo_size`
   * and writes the result as an INLINE style — a fixed square box when a shape
   * is chosen, a fixed `height` when not. A theme that also applies its own
   * `max-width`/`max-height` from a `logo_width` slider ends up with two
   * controls fighting over one dimension, and the merchant's slider loses
   * silently: it only ever acts as a cap on a box the engine already sized, so
   * moving it appears to do nothing. (Exactly this shipped on Genova.)
   *
   * <Logo> spreads `style` LAST in both branches, so passing style here wins
   * with no `!important` anywhere. `logo_shape` owns the SHAPE, `logo_width`
   * owns the SIZE, and this theme's schema deliberately has no `logo_size` —
   * a second, coarser control for the same dimension is the confusion, not the
   * fix.
   *
   * The value is the `--tn-logo-w` token rather than a raw number because
   * `--tn-header-h` is derived from the SAME token: the capsule grows to fit a
   * larger logo instead of cropping it. Two independently-computed caps is what
   * produces a squashed, off-aspect wordmark.
   */
  const themeSettings = useThemeSettings();
  const globals = (themeSettings?.global_settings ?? {}) as Record<string, unknown>;
  const logoShaped = String(globals.logo_shape ?? "none") !== "none";
  const logoStyle: CSSProperties = logoShaped
    ? // A shaped logo is square by construction, so one value drives both axes.
      // Keeps the SDK's border-radius / clip-path, just resizes its box.
      { width: "var(--tn-logo-h)", height: "var(--tn-logo-h)" }
    : // Unshaped: never stretch a wordmark. Bound the height, let width follow.
      { width: "auto", height: "auto", maxWidth: "var(--tn-logo-w)", maxHeight: "var(--tn-logo-h)" };

  const nav = useHeaderNav(instance, asString(s.menu_handle, "main-menu"));
  const anyItemBadged = nav.some((n) => Boolean(n.badge));

  const sticky = asBool(s.sticky, true);
  // Float only when this template actually OPENS with a hero — see HeroContext
  // in lib/shared. `template === "home"` is wrong in both directions.
  const floating = asBool(s.float_over_hero, true) && opensWithHero;

  const itemCount = (cart?.items ?? []).reduce((n, i) => n + (i.quantity ?? 0), 0);

  /**
   * The standalone promo pill.
   *
   * Only rendered when no menu item carries its own `badge`. A merchant using
   * a managed menu (tier 1) has no way to attach a badge to an item, so
   * without this their "UP TO 20% OFF" simply disappears the moment they start
   * managing navigation properly — which is the wrong incentive.
   */
  const promoText = asString(s.promo_badge_text);
  const promoPill =
    promoText && !anyItemBadged ? (
      <Link to={asString(s.promo_badge_link, "/pages/build-a-bundle")} className="tn-nav-promo">
        {promoText}
      </Link>
    ) : null;

  const searchLink = asBool(s.show_search, true) ? (
    <Link to="/search" className="tn-icon-btn" aria-label={t("a11y.open_search", "Open search")}>
      <IconSearch />
    </Link>
  ) : null;

  // ── Drawer content ──────────────────────────────────────────────────────
  const featuredSlug = asString(s.drawer_featured_collection);
  const featured = featuredSlug
    ? collections.map(collectionFields).find((c) => c.slug === featuredSlug || c.id === featuredSlug)
    : undefined;
  const featuredImage = featured?.image || asImageUrl(s.drawer_featured_image);

  const socials: Array<[string, string, React.ReactNode]> = [
    ["instagram", asString(globals.social_instagram), <IconInstagram key="ig" size={22} />],
    ["facebook", asString(globals.social_facebook), <IconFacebook key="fb" size={22} />],
    ["tiktok", asString(globals.social_tiktok), <IconTikTok key="tt" size={22} />],
    ["whatsapp", asString(globals.social_whatsapp), <IconWhatsApp key="wa" size={22} />],
  ];
  const shownSocials = asBool(s.drawer_show_socials, true)
    ? socials.filter(([, url]) => Boolean(url))
    : [];

  // ── Bundle pill ─────────────────────────────────────────────────────────
  const pillScope = asString(s.bundle_pill_scope, "product");
  const pillTemplates =
    pillScope === "all"
      ? null
      : pillScope === "catalog"
        ? new Set(["product", "collection", "products", "collections"])
        : new Set(["product"]);
  const showPill =
    asBool(s.show_bundle_pill, true) &&
    Boolean(asString(s.bundle_pill_text)) &&
    (pillTemplates === null || pillTemplates.has(template));

  return (
    <>
      <header className={cx("tn-header", floating && "is-floating", sticky && "is-sticky")}>
        <div className="tn-header-capsule">
          <div className="tn-header-lead">
            <button
              type="button"
              className="tn-icon-btn"
              aria-label={t("a11y.open_menu", "Open menu")}
              aria-expanded={drawerOpen}
              aria-controls="tn-drawer"
              onClick={() => setDrawerOpen(true)}
            >
              <IconMenu />
            </button>
            <Link to="/" className="tn-header-brand" aria-label={shop?.name ?? "Teen"}>
              <Logo
                style={logoStyle}
                fallback={<span className="tn-wordmark">{shop?.name ?? "TEEN"}</span>}
              />
            </Link>
          </div>

          <nav className="tn-header-nav" aria-label={t("common.menu", "Menu")}>
            {nav.map((item) => (
              <NavEntry key={item.id} item={item} />
            ))}
            {promoPill}
          </nav>

          <div className="tn-header-actions">
            {searchLink}
            {asBool(s.show_account, true) && (
              <Link
                to={customer ? "/account" : "/account/login"}
                className="tn-icon-btn"
                aria-label={t("a11y.account", "Account")}
              >
                <IconUser />
              </Link>
            )}
            {/* The count lives in the LABEL, not in a hidden sibling.
                `aria-label` replaces an element's descendant text entirely, so
                the visually-hidden "2 items in cart" span that used to sit
                inside this link was never announced — the label said "Cart" and
                the count was silent, which is the opposite of what it existed
                for. */}
            {asBool(s.show_cart, true) && (
              <Link
                to="/cart"
                className="tn-icon-btn tn-bag-btn"
                aria-label={
                  itemCount > 0
                    ? t("a11y.cart_items", "{{n}} items in cart").replace(
                        "{{n}}",
                        String(itemCount),
                      )
                    : t("a11y.cart", "Cart")
                }
              >
                <IconBag />
                {itemCount > 0 && (
                  <span className="tn-bag-count" aria-hidden="true">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Reserve the capsule's space in the flow whenever it is NOT floating
          over a hero. Without this the first section slides underneath a fixed
          header — which looks fine on the homepage (there is a hero there) and
          clips the title on every other page. */}
      {!floating && <div className="tn-header-spacer" aria-hidden="true" />}

      {/* ── Menu drawer ───────────────────────────────────────────────────
          One sheet for every breakpoint: a single column on mobile, links and
          the featured card side by side from 750px. */}
      {drawerOpen && (
        <div className="tn-scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}
      <div
        id="tn-drawer"
        className={cx("tn-drawer", drawerOpen && "is-open")}
        role="dialog"
        aria-modal="true"
        aria-label={t("common.menu", "Menu")}
        // Deliberately NOT `hidden`. The closed sheet is taken out of the tab
        // order with `visibility: hidden` in CSS, which does the same job for
        // keyboard and assistive tech but — unlike `display: none` — leaves the
        // element transitionable, so the drawer can actually animate open.
        ref={drawerRef}
      >
        <div className="tn-drawer-sheet">
          <button
            type="button"
            className="tn-drawer-close tn-icon-btn"
            aria-label={t("a11y.close_menu", "Close menu")}
            onClick={() => setDrawerOpen(false)}
          >
            <IconClose size={22} />
          </button>

          <div className="tn-drawer-grid">
            <div className="tn-drawer-main">
              <Link to="/" className="tn-drawer-brand" aria-label={shop?.name ?? "Teen"}>
                <Logo
                  style={logoStyle}
                  fallback={<span className="tn-wordmark">{shop?.name ?? "TEEN"}</span>}
                />
              </Link>

              <nav className="tn-drawer-links" aria-label={t("common.menu", "Menu")}>
                {nav.map((item) => (
                  <Link key={item.id} to={item.url} className="tn-drawer-link">
                    {item.title}
                    {item.badge ? <span className="tn-nav-badge">{item.badge}</span> : null}
                  </Link>
                ))}
              </nav>

              {asString(s.drawer_manifesto_title) || asString(s.drawer_manifesto_body) ? (
                <div className="tn-drawer-manifesto">
                  {asString(s.drawer_manifesto_title) ? (
                    <h2>{asString(s.drawer_manifesto_title)}</h2>
                  ) : null}
                  {asString(s.drawer_manifesto_body) ? (
                    <p>{asString(s.drawer_manifesto_body)}</p>
                  ) : null}
                </div>
              ) : null}

              {shownSocials.length > 0 && (
                <div className="tn-drawer-socials">
                  {shownSocials.map(([name, url, icon]) => (
                    <a
                      key={name}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tn-icon-btn"
                      aria-label={name}
                    >
                      {icon}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {featured ? (
              <Link to={`/collections/${featured.slug}`} className="tn-drawer-feature">
                {featuredImage ? (
                  <img src={featuredImage} alt="" loading="lazy" />
                ) : (
                  <span className="tn-drawer-feature-plate" aria-hidden="true" />
                )}
                <span className="tn-drawer-feature-card">
                  {featured.count > 0 && (
                    <span className="tn-count-pill">
                      {t("common.items_count", "{{n}} items").replace(
                        "{{n}}",
                        String(featured.count),
                      )}
                    </span>
                  )}
                  <span className="tn-drawer-feature-title">{featured.name}</span>
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Floating build-a-bundle pill ──────────────────────────────────
          `dir` decides which corner: bottom-end, so it never sits over the
          RTL reading path. */}
      {showPill && (
        <Link
          to={asString(s.bundle_pill_link, "/pages/build-a-bundle")}
          className="tn-bundle-pill"
          dir={direction}
        >
          <IconBolt size={16} />
          <span>{asString(s.bundle_pill_text)}</span>
          {asString(s.bundle_pill_badge) ? (
            <span className="tn-badge tn-badge-lime">{asString(s.bundle_pill_badge)}</span>
          ) : null}
        </Link>
      )}
    </>
  );
}
