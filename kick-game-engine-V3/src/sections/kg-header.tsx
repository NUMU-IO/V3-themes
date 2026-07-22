"use client";
import { useEffect, useState } from "react";
import {
  Link,
  logoImgStyle,
  useCart,
  useLocale,
  useNavigation,
  useShop,
  useThemeSettings,
  type NavigationItem,
} from "@numueg/theme-sdk";
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import {
  asImageUrl,
  asNumber,
  asString,
  localized,
  type SectionRenderProps,
} from "./_shared";

interface NavEntry {
  label: string;
  href: string;
  children: { label: string; href: string }[];
}

/**
 * Fallback nav — used only when the merchant hasn't wired a menu in the hub's
 * Navigation manager. Same routes the rest of the theme links to
 * (kghero → /products, kg-about → /about, kg-contact → /contact).
 */
const defaultNav = (locale: string | undefined): NavEntry[] => [
  { label: localized(locale, "HOME", "الرئيسية"), href: "/", children: [] },
  { label: localized(locale, "SHOP", "المتجر"), href: "/products", children: [] },
  {
    label: localized(locale, "COLLECTIONS", "المجموعات"),
    href: "/collections",
    children: [],
  },
  { label: localized(locale, "ABOUT", "عن المتجر"), href: "/about", children: [] },
  { label: localized(locale, "CONTACT", "كلمنا"), href: "/contact", children: [] },
];

const toEntries = (items: NavigationItem[]): NavEntry[] =>
  items
    .filter((i) => i.target_visible !== false && i.title)
    .map((i) => ({
      label: i.title,
      href: i.url || "/",
      children: (i.children ?? [])
        .filter((c) => c.target_visible !== false && c.title)
        .map((c) => ({ label: c.title, href: c.url || "/" })),
    }));

/**
 * kg-header — Kick Game's own chrome header.
 *
 * Cream bar, hairline bottom rule, black uppercase micro-labels with the gold
 * accent on hover — the same language as kghero / kgcategories. Logo (or the
 * brand wordmark) sits at the inline start, primary nav next to it on desktop,
 * search / account / cart at the inline end with a live cart badge. Below
 * `md` the nav collapses into a keyboard-reachable slide-in drawer. The
 * optional announcement strip lives here because Kick Game ships no separate
 * announcement-bar section.
 */
const KGHeader = ({ instance, sectionId }: SectionRenderProps) => {
  const s = instance.settings ?? {};
  const locale = useLocale();
  const isAr = (locale || "").toLowerCase().startsWith("ar");
  const shop = useShop();
  const { cart } = useCart();
  const themeSettings = useThemeSettings();
  const globals = themeSettings.global_settings ?? {};

  const brandName =
    (isAr ? asString(s.brand_name_ar) : "") ||
    asString(s.brand_name) ||
    shop?.name ||
    "KICK GAME";
  const logoUrl =
    asImageUrl(s.logo_url) || asImageUrl(globals.logo_url) || shop?.logo_url || "";
  const logoHeight = asNumber(s.logo_height, 32);
  const logoShape = asString(globals.logo_shape) || "none";
  const logoShaped = logoShape !== "none";
  const logoStyle = logoImgStyle(logoShape, asString(globals.logo_size) || "small");

  const sticky = s.sticky !== false;
  const showSearch = s.show_search !== false;
  const showAccount = s.show_account !== false;
  const showCart = s.show_cart !== false;

  // Kick Game ships no separate announcement-bar section, so the strip lives
  // here. Blank merchant copy falls back to a neutral bilingual line rather
  // than collapsing the bar while the toggle is on.
  const showAnnouncement = s.show_announcement !== false;
  const announcement =
    (isAr ? asString(s.announcement_text_ar) : "") ||
    asString(s.announcement_text) ||
    asString(s.announcement_text_ar) ||
    localized(locale, "NEW DROPS EVERY WEEK", "دروبات جديدة كل أسبوع");

  const menuHandle = asString(s.menu_handle) || "main-menu";
  const menu = useNavigation(menuHandle);
  const fromMenu = toEntries(menu.items ?? []);
  const nav = fromMenu.length > 0 ? fromMenu : defaultNav(locale);

  const itemCount = cart?.items?.reduce((n, it) => n + it.quantity, 0) ?? 0;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const drawerId = `${sectionId}-drawer`;

  // Escape closes both the drawer and any open dropdown; body scroll is locked
  // only while the drawer is up (and always restored on unmount).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setDrawerOpen(false);
      setOpenIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    if (drawerOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Crossing to desktop closes the drawer so it can't linger off-screen.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const close = () => setDrawerOpen(false);
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, []);

  const searchLabel = localized(locale, "Search", "بحث");
  const accountLabel = localized(locale, "Account", "حسابي");
  const cartLabel = localized(locale, "Cart", "السلة");
  const menuLabel = localized(locale, "Menu", "القائمة");
  const closeLabel = localized(locale, "Close menu", "اقفل القائمة");
  const navLabel = localized(locale, "Primary", "التنقل الرئيسي");

  const brandInner = logoUrl ? (
    <img
      src={logoUrl}
      alt={brandName}
      style={
        logoShaped
          ? { ...logoStyle, width: "auto", aspectRatio: "1 / 1" }
          : { height: `${logoHeight}px`, maxHeight: "48px" }
      }
    />
  ) : (
    <span className="kg-chrome-brand-text">{brandName}</span>
  );

  return (
    <div data-kg-section={sectionId}>
      {showAnnouncement && announcement.trim() !== "" && (
        <div className="kg-chrome-announce">
          <p>{announcement}</p>
        </div>
      )}

      <header className={sticky ? "kg-chrome-header is-sticky" : "kg-chrome-header"}>
        <div className="kg-chrome-bar">
          <button
            type="button"
            className="kg-chrome-icon kg-chrome-burger"
            aria-label={menuLabel}
            aria-expanded={drawerOpen}
            aria-controls={drawerId}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <Link to="/" className="kg-chrome-brand" aria-label={brandName}>
            {brandInner}
          </Link>

          <nav className="kg-chrome-nav" aria-label={navLabel}>
            {nav.map((item, i) =>
              item.children.length > 0 ? (
                <div
                  key={`${item.label}-${item.href}`}
                  className={
                    openIndex === i
                      ? "kg-chrome-navitem is-open"
                      : "kg-chrome-navitem"
                  }
                >
                  <button
                    type="button"
                    className="kg-chrome-navlink"
                    aria-expanded={openIndex === i}
                    aria-controls={`${sectionId}-sub-${i}`}
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  >
                    {item.label}
                    <ChevronDown
                      size={13}
                      className="kg-chrome-caret"
                      aria-hidden="true"
                    />
                  </button>
                  {openIndex === i && (
                    <ul className="kg-chrome-menu" id={`${sectionId}-sub-${i}`}>
                      <li>
                        <Link to={item.href} onClick={() => setOpenIndex(null)}>
                          {item.label}
                        </Link>
                      </li>
                      {item.children.map((c) => (
                        <li key={`${c.label}-${c.href}`}>
                          <Link to={c.href} onClick={() => setOpenIndex(null)}>
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  key={`${item.label}-${item.href}`}
                  to={item.href}
                  className="kg-chrome-navlink"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="kg-chrome-actions">
            {showSearch && (
              <Link to="/search" className="kg-chrome-icon" aria-label={searchLabel}>
                <Search size={19} aria-hidden="true" />
              </Link>
            )}
            {showAccount && (
              <Link
                to="/account"
                className="kg-chrome-icon"
                aria-label={accountLabel}
              >
                <User size={19} aria-hidden="true" />
              </Link>
            )}
            {showCart && (
              <Link
                to="/cart"
                className="kg-chrome-icon"
                aria-label={`${cartLabel} (${itemCount})`}
              >
                <ShoppingBag size={19} aria-hidden="true" />
                {itemCount > 0 && (
                  <span className="kg-chrome-badge" aria-hidden="true">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer — always mounted so it animates both ways. */}
      <div
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
        className={drawerOpen ? "kg-chrome-scrim" : "kg-chrome-scrim is-hidden"}
      />
      <div
        id={drawerId}
        className={drawerOpen ? "kg-chrome-drawer" : "kg-chrome-drawer is-closed"}
        role="dialog"
        aria-modal="true"
        aria-label={navLabel}
        /* `aria-hidden` hides the closed drawer from screen readers but leaves
            its links in the TAB ORDER — focusable descendants of an aria-hidden
            subtree are an axe `aria-hidden-focus` violation, and a keyboard user
            tabbed through ~7 invisible off-canvas links before reaching the page.
            The drawer stays `display:flex` (it animates on a transform), so
            `inert` is what actually removes it from focus while closed. */
        aria-hidden={!drawerOpen}
        {...(!drawerOpen ? { inert: true } : {})}
      >
        <div className="kg-chrome-drawer-head">
          <span className="kg-chrome-brand-text">{brandName}</span>
          <button
            type="button"
            className="kg-chrome-icon"
            aria-label={closeLabel}
            onClick={() => setDrawerOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav className="kg-chrome-drawer-nav" aria-label={navLabel}>
          {nav.map((item) => (
            <div key={`m-${item.label}-${item.href}`}>
              <Link to={item.href} onClick={() => setDrawerOpen(false)}>
                {item.label}
              </Link>
              {item.children.map((c) => (
                <Link
                  key={`m-${c.label}-${c.href}`}
                  to={c.href}
                  className="is-child"
                  onClick={() => setDrawerOpen(false)}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default KGHeader;
