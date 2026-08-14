/**
 * gn-header — Genova global chrome.
 *
 * Anatomy (matches the reference's global shell):
 *   ┌ announcement ticker — inverted band, seamless marquee
 *   └ bar — logo (start) · nav (centred) · search/account/cart (end)
 *
 * Two contexts, one component: on the home template the bar sits ON the hero
 * with light text and no background; everywhere else it is ink-on-canvas. It
 * flips to the solid treatment as soon as the page scrolls, so the nav never
 * ends up as white text over a white section.
 *
 * The ticker lives HERE rather than in its own section on purpose (decision
 * D4): a separate announcement section stacks on top of the platform's own
 * promotion bar and stores end up with two.
 */

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  Link,
  Logo,
  useCart,
  useCustomer,
  useDirection,
  useNavigation,
  useShop,
  useThemeSettings,
  Image,
} from "@numueg/theme-sdk";
import { asBool, asNumber, asString } from "@numueg/theme-kit";
import {
  collectionFields,
  cx,
  readBlockNodes,
  useFocusTrap,
  useInheritedChrome,
  useIsCompact,
  useMotionOn,
  useStoreCollections,
  useTemplateOpensWithHero,
  type SectionRenderProps,
} from "../lib/shared";
import {
  IconBag,
  IconChevronDown,
  IconClose,
  IconMenu,
  IconSearch,
  IconUser,
} from "../lib/icons";
import { useT } from "../lib/i18n";
import { useCartDrawer } from "../lib/bag-context";

interface NavLink {
  id: string;
  title: string;
  url: string;
  children: { id: string; title: string; url: string }[];
}

/**
 * The nav, in three tiers.
 *
 *   1. a merchant-managed menu (Navigation → menu handle) — always wins, it is
 *      the thing they can edit without touching the theme;
 *   2. `nav_item` blocks on the header section;
 *   3. a built-in bilingual list.
 *
 * Tier 3 is not decoration. Schema `default` values are applied by the BACKEND
 * when it seeds a customization — they are absent from the instance at render
 * time. So a bare `{"type":"gn-header","settings":{}}` (SSR fixture,
 * marketplace preview, a freshly-seeded template) reaches this component with
 * nothing at all, and without a built-in fallback the header renders with no
 * navigation whatsoever.
 */
function useHeaderNav(instance: SectionRenderProps["instance"], menuHandle: string): NavLink[] {
  const { items } = useNavigation(menuHandle);
  const withBlocks = useInheritedChrome(instance, "gn-header", "nav_item");
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
      children: readBlockNodes(node, "nav_child").map((child, ci) => ({
        id: `nav-${idx}-${ci}`,
        title: asString(child.settings.label),
        url: asString(child.settings.link, "/products"),
      })),
    }));
  }

  // `/pages/fit-guide`, NOT `/fit-guide`. The host promotes only a fixed set of
  // handles to top-level routes (about, contact, account, order-confirmation —
  // see numu-storefront content-pages.ts); everything else lives under
  // /pages/<handle>. Measured on a real host: `/fit-guide` 404s while
  // `/pages/fit-guide` renders this theme's fit-guide template correctly,
  // because TEMPLATE_BY_HANDLE upgrades the generic `page` type by handle.
  return [
    { key: "nav_new_in", fallback: "New in", url: "/products" },
    { key: "nav_jeans", fallback: "Jeans", url: "/collections/jeans" },
    { key: "nav_tops", fallback: "Tops", url: "/collections/tops" },
    { key: "nav_fit_guide", fallback: "Fit guide", url: "/pages/fit-guide" },
    { key: "nav_about", fallback: "About", url: "/about" },
  ].map((d, idx) => ({
    id: `nav-default-${idx}`,
    title: t(`header.${d.key}`, d.fallback),
    url: d.url,
    children: [],
  }));
}

/** Desktop nav entry — a plain link, or a hover/focus dropdown when it has children. */
function NavEntry({ item }: { item: NavLink }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  if (item.children.length === 0) {
    return (
      <Link to={item.url} className="gn-nav-link">
        {item.title}
      </Link>
    );
  }

  // A short close delay keeps the menu usable while the pointer crosses the gap
  // between the trigger and the panel — without it the panel closes mid-travel.
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  return (
    <div
      className="gn-nav-group"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Link
        to={item.url}
        className="gn-nav-link gn-nav-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        // Touch: the first tap opens the panel instead of navigating, so the
        // children are reachable on a device with no hover.
        onClick={(e) => {
          if (!open && window.matchMedia?.("(hover: none)").matches) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {item.title}
        <IconChevronDown size={14} className={cx("gn-nav-caret", open && "is-open")} />
      </Link>
      {/* Closed state is `visibility: hidden` in CSS rather than the `hidden`
          attribute: `display: none` cannot be transitioned, so the panel would
          pop instead of fading. Visibility keeps it out of the tab order. */}
      <div id={menuId} className={cx("gn-nav-panel", open && "is-open")}>
        {item.children.map((child) => (
          <Link key={child.id} to={child.url} className="gn-nav-child">
            {child.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function GnHeader({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const shop = useShop();


  /**
   * Logo sizing.
   *
   * TWO controls were fighting over one dimension and the merchant's slider was
   * losing silently. The SDK's <Logo> sizes from the ENGINE globals
   * `logo_shape` + `logo_size` and writes the result as an INLINE style — a
   * fixed square box when a shape is chosen (`rounded` + `large` = 80x80),
   * `height: 28|36|48px` when not. Genova's own `logo_width` slider was applied
   * as a CSS `max-width`, and inline beats CSS, so the slider only ever acted
   * as a cap on a box the engine had already sized. With the store at an 80px
   * box and the slider at 132, the cap never bound: moving it did nothing.
   *
   * <Logo> spreads `style` LAST in both branches, so passing style here wins
   * with no `!important` anywhere, and the two settings stop competing:
   * `logo_shape` owns the SHAPE, `logo_width` owns the SIZE. (`logo_size` was
   * dropped from this theme's schema — a second, coarser size control for the
   * same dimension is the confusion, not the fix.)
   *
   * The value is `var(--gn-logo-size)`, not a number: the token already folds
   * in the merchant's setting and a 40vw guard, and `--gn-header-h` is derived
   * from the SAME token, so the bar grows to fit instead of cropping. Two
   * independently-computed caps is exactly what produced the earlier 56x52
   * squashed box.
   */
  const themeSettings = useThemeSettings();
  const globals = (themeSettings?.global_settings ?? {}) as Record<string, unknown>;
  const logoShaped = String(globals.logo_shape ?? "none") !== "none";
  const logoStyle: CSSProperties = logoShaped
    ? // Keep the SDK's border-radius / clip-path, just resize its box. A shaped
      // logo is square by construction, so one value drives both axes.
      { width: "var(--gn-logo-size)", height: "var(--gn-logo-size)" }
    : // Unshaped: preserve the natural aspect ratio — a wordmark must never be
      // stretched — and let the token bound both axes.
      {
        width: "auto",
        height: "auto",
        maxWidth: "var(--gn-logo-size)",
        maxHeight: "var(--gn-logo-size)",
      };
  const { cart } = useCart();
  const customer = useCustomer();
  const direction = useDirection();
  const t = useT();
  const motionOn = useMotionOn();
  const collections = useStoreCollections();
  const bag = useCartDrawer();

  const nav = useHeaderNav(instance, asString(s.menu_handle, "main-menu"));

  const sticky = asBool(s.sticky, true);
  // Overlay only when this template actually OPENS with a hero. Keying off
  // `template === "home"` was wrong both ways: a merchant who deletes the hero
  // from home got a white-on-white header floating over the next section, and a
  // hero placed on any other template never got the overlay it was drawn for.
  const overHero = asBool(s.transparent_over_hero, true) && useTemplateOpensWithHero();
  const showAnnouncement = asBool(s.show_announcement, true);

  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  /**
   * Below the desktop breakpoint the search control moves to the LEFT group,
   * beside the burger.
   *
   * Not decoration — it is what makes the centred logo read as centred. The
   * grid centres the brand to 0.00px at every width (measured), but with one
   * icon on the left and three on the right the eye reads the empty left gap
   * as the logo being off-centre, which is exactly what got reported. Two
   * icons a side balances the visual weight so the true centre is believable.
   *
   * The button is MOVED, never duplicated: rendering it twice under a
   * `display: none` would put a second "Search" control in the a11y tree.
   */
  const compact = useIsCompact();
  const searchButton = asBool(s.show_search, true) ? (
    <button
      type="button"
      className="gn-icon-btn"
      aria-label={t("general.search", "Search")}
      aria-expanded={searchOpen}
      onClick={() => setSearchOpen((v) => !v)}
    >
      {searchOpen ? <IconClose /> : <IconSearch />}
    </button>
  ) : null;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useFocusTrap(drawerOpen, drawerRef);

  // Transparent → solid on scroll. Only wired when the header can actually be
  // transparent, so interior pages attach no scroll listener at all.
  useEffect(() => {
    if (!overHero || typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overHero]);

  // Esc closes whichever overlay is open; the body scroll-lock stops the page
  // behind the drawer from scrolling under it on iOS.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const anyOpen = drawerOpen || searchOpen;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setDrawerOpen(false);
      setSearchOpen(false);
    };
    if (anyOpen) document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    if (drawerOpen) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen, searchOpen]);

  // Move focus INTO each overlay when it opens — without this a keyboard user
  // tabs from the trigger straight into the page behind the panel.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    if (drawerOpen) drawerCloseRef.current?.focus();
  }, [drawerOpen]);

  const itemCount = (cart?.items ?? []).reduce((n, i) => n + (i.quantity ?? 0), 0);
  const transparent = overHero && !scrolled && !drawerOpen && !searchOpen;

  // Ticker messages. Repeated inside a duplicated track so the loop is seamless;
  // one pass is repeated enough times to fill a wide viewport.
  //
  // The first two fall back to bilingual built-ins for the same reason the nav
  // does: schema defaults do not exist on the instance at render time, so a
  // bare preset would otherwise show a black bar with nothing in it. The third
  // has no fallback — it is genuinely optional.
  const messages = [
    asString(s.announcement_text_1) || t("header.announcement_1", "Free shipping on all orders over 3,000 EGP"),
    asString(s.announcement_text_2) || t("header.announcement_2", "New denim drop — now in store"),
    asString(s.announcement_text_3),
  ].filter(Boolean);
  const tickerRun = messages.length > 0 ? Array.from({ length: 4 }, () => messages).flat() : [];
  const speed = asNumber(s.ticker_speed, 28);

  const drawerCollections = collections.slice(0, asNumber(s.drawer_collections_limit, 6));

  return (
    <header
      role="banner"
      // `role="banner"` is explicit, not redundant. `<header>` only maps to the
      // banner landmark when its nearest sectioning ancestor is `<body>` — and
      // the SDK wraps every section in a `<Section>` that renders a `<section>`
      // element, so this header is generic without it. Same story for the
      // footer's contentinfo. Cost: one attribute. Benefit: the whole page is
      // inside a landmark, which is what axe's `region` rule is checking.
      className={cx(
        "gn-header",
        sticky && "is-sticky",
        // STRUCTURE — stays constant for the whole page, so the bar never
        // re-enters flow mid-scroll and shoves the content down 80px.
        overHero && "is-over",
        // PAINT — flips on scroll.
        transparent ? "is-transparent" : "is-painted",
      )}
      data-scrolled={scrolled ? "true" : "false"}
    >
      <a href="#gn-main" className="gn-skip-link">
        {t("general.skip_to_content", "Skip to content")}
      </a>

      {showAnnouncement && tickerRun.length > 0 && (
        <div className="gn-ticker" role="region" aria-label={t("general.announcement", "Announcement")}>
          <div
            className="gn-marquee"
            data-paused={motionOn ? "false" : "true"}
            data-pause-on-hover={asBool(s.pause_on_hover, true) ? "true" : "false"}
            data-direction={direction === "rtl" ? "right" : "left"}
          >
            {/* Two identical tracks translated by -50% — the seamless-loop
                pattern. The second is aria-hidden so a screen reader announces
                each message once, not twice. */}
            {[0, 1].map((track) => (
              <div
                key={track}
                className="gn-marquee-track"
                style={{ animationDuration: `${speed}s` }}
                aria-hidden={track === 1 ? true : undefined}
              >
                {tickerRun.map((msg, i) => (
                  <span key={`${track}-${i}`} className="gn-ticker-item">
                    {msg}
                    <span className="gn-ticker-dot" aria-hidden="true">
                      •
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="gn-header-bar">
        <div className="gn-header-inner">
          <div className="gn-header-lead">
            <button
              type="button"
              className="gn-icon-btn gn-header-burger"
              aria-label={t("general.menu", "Menu")}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <IconMenu />
            </button>
            {compact && searchButton}
          </div>

          <div className="gn-header-brand">
            <Link to="/" aria-label={shop?.name ?? "Genova"}>
              <Logo
                style={logoStyle}
                fallback={<span className="gn-wordmark">{shop?.name ?? "GENOVA"}</span>}
              />
            </Link>
          </div>

          <nav className="gn-header-nav" aria-label={t("general.menu", "Menu")}>
            {nav.map((item) => (
              <NavEntry key={item.id} item={item} />
            ))}
          </nav>

          <div className="gn-header-actions">
            {!compact && searchButton}
            {asBool(s.show_account, true) && (
              <Link
                to={customer ? "/account" : "/account/login"}
                className="gn-icon-btn"
                aria-label={t("general.account", "Account")}
              >
                <IconUser />
              </Link>
            )}
            {asBool(s.show_cart, true) && (
              <Link
                to="/cart"
                className="gn-icon-btn gn-cart-btn"
                aria-label={t("general.cart", "Cart")}
                // Open the drawer instead of navigating — but keep the real
                // href so middle-click, ⌘-click and "open in new tab" still
                // reach the bag page, and so it degrades to a plain link with
                // no JS. Modified clicks are left alone.
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  bag.open();
                }}
              >
                <IconBag />
                {itemCount > 0 && (
                  <span className="gn-cart-count" aria-hidden="true">
                    {itemCount}
                  </span>
                )}
                {/* The count again, for screen readers, as words rather than a
                    bare digit floating next to an icon. */}
                {itemCount > 0 && <span className="gn-sr-only">{`${itemCount}`}</span>}
              </Link>
            )}
          </div>
        </div>

        {searchOpen && (
          <div className="gn-search-panel">
            <form className="gn-search-form" action="/search" method="get" role="search">
              <IconSearch size={18} />
              <input
                ref={searchInputRef}
                type="search"
                name="q"
                className="gn-search-input"
                placeholder={
                  asString(s.search_placeholder) ||
                  t("header.search_placeholder", "Search jeans, sizes, styles")
                }
                aria-label={t("general.search", "Search")}
              />
              <button type="submit" className="gn-btn gn-btn-outline gn-search-submit">
                {t("general.search", "Search")}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      <div
        className={cx("gn-drawer-scrim", drawerOpen && "is-open")}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        className={cx("gn-drawer", drawerOpen && "is-open")}
        role="dialog"
        aria-modal="true"
        aria-label={t("general.menu", "Menu")}
        // Closed state is `visibility: hidden` in CSS, not the `hidden`
        // attribute — see the drawer rules in theme.css for why.
        aria-hidden={drawerOpen ? undefined : true}
      >
        <div className="gn-drawer-head">
          <span className="gn-label">{t("general.menu", "Menu")}</span>
          <button
            ref={drawerCloseRef}
            type="button"
            className="gn-icon-btn"
            aria-label={t("general.close", "Close")}
            onClick={() => setDrawerOpen(false)}
          >
            <IconClose />
          </button>
        </div>

        <nav className="gn-drawer-nav" aria-label={t("general.menu", "Menu")}>
          {nav.map((item) =>
            item.children.length > 0 ? (
              <details key={item.id} className="gn-drawer-group">
                <summary className="gn-drawer-link">
                  {item.title}
                  <IconChevronDown size={16} />
                </summary>
                {item.children.map((child) => (
                  <Link key={child.id} to={child.url} className="gn-drawer-child">
                    {child.title}
                  </Link>
                ))}
              </details>
            ) : (
              <Link key={item.id} to={item.url} className="gn-drawer-link">
                {item.title}
              </Link>
            ),
          )}
        </nav>

        {/* Visual collection index. Reads through useStoreCollections so it is
            populated on /cart and /pages/* too, not just catalog routes. */}
        {asBool(s.drawer_collection_images, true) && drawerCollections.length > 0 && (
          <div className="gn-drawer-collections">
            <span className="gn-label gn-drawer-section-label">
              {asString(s.drawer_collections_title, t("general.shop", "Shop"))}
            </span>
            <div className="gn-drawer-grid">
              {drawerCollections.map(collectionFields).map((c) => (
                <Link key={c.id} to={`/collections/${c.slug}`} className="gn-drawer-tile">
                  <span className="gn-plate">
                    {c.image ? <Image src={c.image} alt="" sizes="120px" loading="lazy" /> : null}
                  </span>
                  <span className="gn-drawer-tile-label">{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {asBool(s.drawer_show_offer, false) && asString(s.drawer_offer_text) && (
          <Link to={asString(s.drawer_offer_link, "/products")} className="gn-drawer-offer">
            {asString(s.drawer_offer_text)}
          </Link>
        )}
      </div>
    </header>
  );
}
