"use client";
import { useEffect, useId, useState } from "react";
import {
  Link,
  logoImgStyle,
  useCart,
  useLocale,
  useNavigation,
  useResolvedSettings,
  useShop,
  useThemeSettings,
} from "@numueg/theme-sdk";
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import {
  asImageUrl,
  asString,
  localized,
  type SectionRenderProps,
} from "./_shared";

/**
 * Tech Wave header — the theme's own chrome (replaces the host's generic
 * fallback strip). Built from Tech Wave's existing identity only:
 * the `.tw-header` dark glass bar + neon hairline from src/theme.css,
 * `.tw-neon-btn` / `.tw-btn-secondary` / `.tw-badge` / `.tw-inset` /
 * `.tw-chip` component classes, the `--primary` cyan + `--accent` violet
 * HSL tokens, `rounded-xl` (--radius: 0.75rem) corners and the 0.3s ease
 * motion language every other section uses.
 *
 * NOTE: Tech Wave already ships a dedicated `tw-announcement-bar` section,
 * so this header deliberately does NOT render an announcement strip —
 * duplicating it would give merchants two competing bars.
 */

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

const defaultNav = (locale: string | undefined): NavItem[] => [
  { label: localized(locale, "Home", "الرئيسية"), href: "/" },
  { label: localized(locale, "Shop", "تسوق"), href: "/products" },
  { label: localized(locale, "Collections", "الأقسام"), href: "/collections" },
  { label: localized(locale, "About", "عن المتجر"), href: "/about" },
  { label: localized(locale, "Contact", "اتصل بنا"), href: "/contact" },
];

const TechWaveHeader = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const { cart } = useCart();
  const themeSettings = useThemeSettings();
  const locale = useLocale();
  const uid = useId().replace(/[:]/g, "");
  const menuId = `tw-mobile-menu-${uid}`;

  const brandName =
    asString(s.brand_name) ||
    asString(themeSettings.global_settings?.brand_name) ||
    shop?.name ||
    localized(locale, "Store", "المتجر");

  const logoUrl =
    asImageUrl(s.logo_url) ||
    asImageUrl(themeSettings.global_settings?.logo_url) ||
    shop?.logo_url ||
    "";

  // Engine-level logo shape + size live in GLOBAL settings; the SDK computes
  // the crop so every theme renders a merchant logo identically.
  const logoShape = asString(themeSettings.global_settings?.logo_shape) || "none";
  const logoSize = asString(themeSettings.global_settings?.logo_size) || "small";
  const logoShaped = logoShape !== "none";
  const logoStyle = logoImgStyle(logoShape, logoSize);

  const showSearch = s.show_search !== false;
  const showAccount = s.show_account !== false;
  const showCart = s.show_cart !== false;
  const sticky = s.sticky !== false;
  const menuHandle = asString(s.menu_handle) || "main-menu";

  // Nav source priority: merchant menu (hub Navigation manager, already
  // pruned of hidden pages by the SDK) → the theme's bilingual default set.
  const mainMenu = useNavigation(menuHandle);
  const toItem = (i: {
    title: string;
    url: string;
    children?: { title: string; url: string }[];
  }): NavItem => ({
    label: i.title,
    href: i.url || "/",
    children: (i.children ?? [])
      .map((c) => ({ label: c.title, href: c.url || "/" }))
      .filter((c) => c.label),
  });
  const nav: NavItem[] =
    mainMenu.items.length > 0
      ? mainMenu.items.map(toItem).filter((n) => n.label)
      : defaultNav(locale);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const itemCount = cart?.items?.reduce((n, it) => n + it.quantity, 0) ?? 0;

  // Neon hairline deepens once the page scrolls — same 0.3s ease as .tw-card.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer when we cross to desktop.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const close = () => setMobileOpen(false);
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, []);

  // Lock body scroll + ESC-to-close while the drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    if (mobileOpen) document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    if (mobileOpen) window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const iconLink =
    "tw-chip flex items-center justify-center h-9 w-9 rounded-xl text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]";

  return (
    <div data-tw-section={sectionId}>
      <header
        className={`tw-header ${sticky ? "sticky top-0" : "relative"} z-50 transition-all duration-300 ${
          scrolled ? "shadow-[0_1px_24px_hsl(var(--primary)/0.12)]" : ""
        }`}
      >
        <div className="container mx-auto px-4 h-16 md:h-[4.5rem] flex items-center gap-3">
          {/* Burger (mobile) */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className={`md:hidden ${iconLink}`}
            aria-label={localized(locale, "Open menu", "افتح القائمة")}
            aria-expanded={mobileOpen}
            aria-controls={menuId}
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          {/* Brand */}
          <Link
            to="/"
            aria-label={brandName}
            className="flex items-center min-w-0 me-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] rounded-xl"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName}
                className={
                  logoShaped
                    ? "w-auto max-h-11"
                    : "h-8 sm:h-10 w-auto max-h-11 object-contain"
                }
                style={
                  logoShaped
                    ? { ...logoStyle, width: "auto", aspectRatio: "1 / 1" }
                    : logoStyle
                }
              />
            ) : (
              <span className="tw-neon-text text-lg sm:text-xl font-black tracking-tight truncate">
                {brandName}
              </span>
            )}
          </Link>

          {/* Primary nav (desktop) */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label={localized(locale, "Primary", "التنقل الرئيسي")}
          >
            {nav.map((n) => {
              const kids = n.children ?? [];
              return (
                <div key={`${n.label}-${n.href}`} className="relative group">
                  <Link
                    to={n.href}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.08)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                  >
                    {n.label}
                    {kids.length > 0 && (
                      <ChevronDown size={14} aria-hidden="true" />
                    )}
                  </Link>
                  {kids.length > 0 && (
                    <div className="tw-glass absolute top-full start-0 mt-1 min-w-[12rem] rounded-xl p-1.5 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 transition-all duration-300 z-50">
                      {kids.map((c) => (
                        <Link
                          key={`${c.label}-${c.href}`}
                          to={c.href}
                          className="block px-3 py-2 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 md:ms-3">
            {showSearch && (
              <Link
                to="/search"
                className={iconLink}
                aria-label={localized(locale, "Search", "بحث")}
              >
                <Search size={18} aria-hidden="true" />
              </Link>
            )}
            {showAccount && (
              <Link
                to="/account"
                className={`hidden sm:flex ${iconLink}`}
                aria-label={localized(locale, "Account", "حسابي")}
              >
                <User size={18} aria-hidden="true" />
              </Link>
            )}
            {showCart && (
              <Link
                to="/cart"
                className={`relative ${iconLink}`}
                aria-label={localized(
                  locale,
                  `Cart, ${itemCount} items`,
                  `السلة، ${itemCount} منتج`,
                )}
              >
                <ShoppingBag size={18} aria-hidden="true" />
                {itemCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="tw-badge absolute -top-1.5 -end-1.5 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full text-[10px] leading-none flex items-center justify-center"
                  >
                    {itemCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer — scrim + slide-in panel from the inline-start side. */}
      <div
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
        className={`md:hidden fixed inset-0 z-[55] bg-[hsl(var(--background)/0.7)] backdrop-blur-[2px] transition-opacity duration-300 ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-label={localized(locale, "Site navigation", "تنقل الموقع")}
        /* `aria-hidden` hides the closed drawer from screen readers but leaves
            its links in the TAB ORDER — focusable descendants of an aria-hidden
            subtree are an axe `aria-hidden-focus` violation, and a keyboard user
            tabbed through ~7 invisible off-canvas links before reaching the page.
            The drawer stays `display:flex` (it animates on a transform), so
            `inert` is what actually removes it from focus while closed. */
        aria-hidden={!mobileOpen}
        {...(!mobileOpen ? { inert: true } : {})}
        className={`md:hidden fixed inset-y-0 start-0 z-[60] flex w-[82%] max-w-[330px] flex-col tw-header border-e border-[hsl(var(--primary)/0.15)] transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-4 h-16 border-b border-[hsl(var(--primary)/0.15)]">
          <span className="tw-neon-text text-lg font-black truncate">
            {brandName}
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className={iconLink}
            aria-label={localized(locale, "Close menu", "إغلاق القائمة")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav
          className="flex flex-col gap-1 overflow-y-auto px-3 py-4"
          aria-label={localized(locale, "Mobile", "قائمة الجوال")}
        >
          {nav.map((n) => (
            <div key={`m-${n.label}-${n.href}`}>
              <Link
                to={n.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-3 rounded-xl text-base font-bold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.08)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              >
                {n.label}
              </Link>
              {(n.children ?? []).length > 0 && (
                <div className="ms-3 border-s border-[hsl(var(--border))] ps-2">
                  {(n.children ?? []).map((c) => (
                    <Link
                      key={`m-${c.label}-${c.href}`}
                      to={c.href}
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2.5 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          {showAccount && (
            <Link
              to="/account"
              onClick={() => setMobileOpen(false)}
              className="mt-2 inline-flex items-center gap-2 px-3 py-3 rounded-xl tw-btn-secondary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            >
              <User size={16} aria-hidden="true" />
              {localized(locale, "My account", "حسابي")}
            </Link>
          )}
        </nav>
      </aside>
    </div>
  );
};

export default TechWaveHeader;
