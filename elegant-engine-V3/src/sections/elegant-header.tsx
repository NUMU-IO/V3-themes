"use client";

/**
 * elegant-header — Elegant's chrome header.
 *
 * Visual identity is taken straight from this theme's own vocabulary
 * (src/theme.css): the warm-brown HSL tokens (`--background`,
 * `--foreground`, `--primary`, `--border`, `--announcement-bg`), the
 * serif `.eg-heading` wordmark, the uppercase wide-tracked `.eg-label`
 * nav, hairline `--eg-border` dividers and the 200ms opacity/colour
 * transitions the rest of the theme uses. Classic-elegant layout:
 * a slim announcement strip, a centred wordmark, and the primary nav
 * on its own centred row beneath a hairline rule.
 */

import { useEffect, useState } from "react";
import {
  Link,
  logoImgStyle,
  useCart,
  useLocale,
  useNavigation,
  useResolvedSettings,
  useShop,
  useThemeSettings,
  type NavigationItem,
} from "@numueg/theme-sdk";
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { asImageUrl, asString, localized, type SectionRenderProps } from "./_shared";

interface NavEntry {
  label: string;
  href: string;
  children: { label: string; href: string }[];
}

/** Bilingual fallback menu — used when the merchant has no menu configured. */
const defaultNav = (locale: string | undefined): NavEntry[] => [
  { label: localized(locale, "Home", "الرئيسية"), href: "/", children: [] },
  { label: localized(locale, "Shop", "تسوق"), href: "/products", children: [] },
  {
    label: localized(locale, "Collections", "التشكيلات"),
    href: "/collections",
    children: [],
  },
  { label: localized(locale, "About", "من إحنا"), href: "/about", children: [] },
  { label: localized(locale, "Contact", "كلمنا"), href: "/contact", children: [] },
];

const toEntries = (items: NavigationItem[]): NavEntry[] =>
  items
    .filter((i) => i.target_visible !== false)
    .map((i) => ({
      label: i.title,
      href: i.url || "/",
      children: (i.children ?? [])
        .filter((c) => c.target_visible !== false)
        .map((c) => ({ label: c.title, href: c.url || "/" }))
        .filter((c) => c.label),
    }))
    .filter((n) => n.label);

const ElegantHeader = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const { cart } = useCart();
  const themeSettings = useThemeSettings();
  const locale = useLocale();
  const isAr = (locale || "").toLowerCase().startsWith("ar");

  const globals = (themeSettings.global_settings ?? {}) as Record<string, unknown>;

  const brandName =
    asString(s.brand_name) || asString(globals.brand_name) || shop?.name || "";
  const logoUrl =
    asImageUrl(s.logo_url) || asImageUrl(globals.logo_url) || shop?.logo_url || "";

  // Engine-level logo shaping (global settings + SDK helper), same as the
  // rest of the fleet — `none` keeps the artwork at the theme's own height.
  const logoShape = asString(globals.logo_shape) || "none";
  const logoSize = asString(globals.logo_size) || "small";
  const logoShaped = logoShape !== "none";
  const logoStyle = logoImgStyle(logoShape, logoSize);

  const showSearch = s.show_search !== false;
  const showAccount = s.show_account !== false;
  const showCart = s.show_cart !== false;
  const sticky = s.sticky !== false;
  const showAnnouncement = s.show_announcement !== false;

  // NO invented fallback. The HOST already renders the merchant's configured
  // announcement bar above the theme, so a hardcoded default here stacked a
  // second bar underneath it saying something the merchant never wrote. The
  // render below is gated on this being non-empty — which the old fallback
  // made permanently true, so the gate never actually gated anything.
  // Also read the AR field: it was ignored entirely, so an Arabic shopper got
  // the English string even when the merchant had filled in Arabic copy.
  const announcementText = isAr
    ? asString(s.announcement_text_ar) || asString(s.announcement_text)
    : asString(s.announcement_text) || asString(s.announcement_text_ar);
  const announcementLink = asString(s.announcement_link);

  const menuHandle = asString(s.menu_handle) || "main-menu";
  const menu = useNavigation(menuHandle);
  const nav: NavEntry[] =
    menu.items.length > 0 ? toEntries(menu.items) : defaultNav(locale);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const itemCount = cart?.items?.reduce((n, it) => n + it.quantity, 0) ?? 0;

  const searchLabel = localized(locale, "Search", "بحث");
  const accountLabel = localized(locale, "Account", "حسابي");
  const cartLabel = localized(locale, "Cart", "السلة");
  const menuLabel = localized(locale, "Menu", "القائمة");
  const closeLabel = localized(locale, "Close menu", "اقفل القائمة");
  const navLabel = localized(locale, "Primary", "التنقل الرئيسي");

  // Close the drawer when crossing to desktop.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const close = () => setMobileOpen(false);
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, []);

  // Lock body scroll + close on Escape while the drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : prev || "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setOpenSub(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const wordmark = logoUrl ? (
    <img
      src={logoUrl}
      alt={brandName || "Logo"}
      className={
        logoShaped ? "w-auto max-h-12" : "h-9 sm:h-11 w-auto max-h-12 object-contain"
      }
      style={logoShaped ? { ...logoStyle, width: "auto", aspectRatio: "1 / 1" } : logoStyle}
    />
  ) : (
    <span className="eg-heading text-xl sm:text-2xl text-foreground tracking-wide truncate">
      {brandName}
    </span>
  );

  return (
    <div data-elegant-section={sectionId}>
      {/* Announcement strip — warm brown band, cream ink, wide-tracked label. */}
      {showAnnouncement && announcementText.trim() !== "" && (
        <div className="bg-[hsl(var(--announcement-bg))] text-[hsl(var(--announcement-fg))]">
          <div className="container mx-auto px-4 py-2 text-center">
            {announcementLink ? (
              <Link
                to={announcementLink}
                className="eg-label text-[hsl(var(--announcement-fg))] hover:opacity-80 transition-opacity"
              >
                {announcementText}
              </Link>
            ) : (
              <p className="eg-label text-[hsl(var(--announcement-fg))]">
                {announcementText}
              </p>
            )}
          </div>
        </div>
      )}

      <header
        className={`${sticky ? "sticky top-0" : "relative"} z-50 bg-background/95 backdrop-blur-sm border-b border-border`}
      >
        {/* Row 1 — burger / wordmark / actions */}
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 md:py-4">
            <div className="flex items-center justify-self-start">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label={menuLabel}
                aria-expanded={mobileOpen}
                aria-controls="elegant-mobile-menu"
                className="md:hidden inline-flex h-10 w-10 items-center justify-center -ms-2 text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              {showSearch && (
                <Link
                  to="/search"
                  aria-label={searchLabel}
                  className="hidden md:inline-flex items-center gap-2 h-10 px-1 text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                >
                  <Search className="h-[18px] w-[18px]" aria-hidden="true" />
                  <span className="eg-label">{searchLabel}</span>
                </Link>
              )}
            </div>

            <Link
              to="/"
              aria-label={brandName || "Home"}
              className="justify-self-center flex items-center justify-center max-w-[46vw] md:max-w-[32vw] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            >
              {wordmark}
            </Link>

            <div className="flex items-center gap-1 sm:gap-2 justify-self-end">
              {showSearch && (
                <Link
                  to="/search"
                  aria-label={searchLabel}
                  className="md:hidden inline-flex h-10 w-10 items-center justify-center text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                >
                  <Search className="h-[18px] w-[18px]" aria-hidden="true" />
                </Link>
              )}
              {showAccount && (
                <Link
                  to="/account"
                  aria-label={accountLabel}
                  className="inline-flex h-10 w-10 items-center justify-center text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                >
                  <User className="h-[18px] w-[18px]" aria-hidden="true" />
                </Link>
              )}
              {showCart && (
                <Link
                  to="/cart"
                  aria-label={`${cartLabel} (${itemCount})`}
                  className="relative inline-flex h-10 w-10 -me-2 items-center justify-center text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                >
                  <ShoppingBag className="h-[18px] w-[18px]" aria-hidden="true" />
                  {itemCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center"
                    >
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Row 2 — centred primary nav under a hairline rule (desktop). */}
        <nav
          aria-label={navLabel}
          className="hidden md:block border-t border-border/70"
        >
          <ul className="container mx-auto px-4 flex items-center justify-center gap-7 lg:gap-9 py-3">
            {nav.map((n) => (
              <li key={`${n.label}-${n.href}`} className="relative group">
                <Link
                  to={n.href}
                  className="eg-label inline-flex items-center gap-1 min-h-[24px] text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                >
                  {n.label}
                  {n.children.length > 0 && (
                    <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
                  )}
                </Link>
                {n.children.length > 0 && (
                  <div className="absolute top-full start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-50 min-w-[190px] pt-3 opacity-0 invisible transition-opacity duration-200 group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible">
                    <ul className="bg-card border border-border shadow-sm py-2">
                      {n.children.map((c) => (
                        <li key={`${c.label}-${c.href}`}>
                          <Link
                            to={c.href}
                            className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-[hsl(var(--hero-bg))] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                          >
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Mobile drawer — scrim + panel sliding from the inline-start edge. */}
      <div
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
        className={`md:hidden fixed inset-0 z-[55] bg-[hsl(30_20%_12%/0.45)] transition-opacity duration-300 ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        id="elegant-mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label={navLabel}
        /* `aria-hidden` hides the closed drawer from screen readers but leaves
            its links in the TAB ORDER — focusable descendants of an aria-hidden
            subtree are an axe `aria-hidden-focus` violation, and a keyboard user
            tabbed through ~7 invisible off-canvas links before reaching the page.
            The drawer stays `display:flex` (it animates on a transform), so
            `inert` is what actually removes it from focus while closed. */
        aria-hidden={!mobileOpen}
        {...(!mobileOpen ? { inert: true } : {})}
        className={`md:hidden fixed inset-y-0 start-0 z-[60] flex w-[82%] max-w-[320px] flex-col bg-background border-e border-border shadow-xl transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <span className="eg-heading text-lg text-foreground truncate">
            {brandName}
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={closeLabel}
            className="-me-2 inline-flex h-10 w-10 items-center justify-center text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label={navLabel} className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col">
            {nav.map((n) => {
              const key = `${n.label}-${n.href}`;
              const expanded = openSub === key;
              return (
                <li key={key} className="border-b border-border/60 last:border-b-0">
                  <div className="flex items-center">
                    <Link
                      to={n.href}
                      onClick={() => setMobileOpen(false)}
                      className="eg-heading flex-1 px-2 py-3 min-h-[44px] text-base text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                    >
                      {n.label}
                    </Link>
                    {n.children.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setOpenSub(expanded ? null : key)}
                        aria-expanded={expanded}
                        aria-controls={`elegant-sub-${key.replace(/[^a-zA-Z0-9]/g, "-")}`}
                        aria-label={n.label}
                        className="inline-flex h-11 w-11 items-center justify-center text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                      </button>
                    )}
                  </div>
                  {n.children.length > 0 && expanded && (
                    <ul
                      id={`elegant-sub-${key.replace(/[^a-zA-Z0-9]/g, "-")}`}
                      className="pb-2 ps-3"
                    >
                      {n.children.map((c) => (
                        <li key={`${c.label}-${c.href}`}>
                          <Link
                            to={c.href}
                            onClick={() => setMobileOpen(false)}
                            className="block px-2 py-2.5 min-h-[24px] text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                          >
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border px-3 py-4 flex flex-col gap-1">
          {showSearch && (
            <Link
              to="/search"
              onClick={() => setMobileOpen(false)}
              className="eg-label flex items-center gap-3 px-2 py-3 min-h-[44px] text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {searchLabel}
            </Link>
          )}
          {showAccount && (
            <Link
              to="/account"
              onClick={() => setMobileOpen(false)}
              className="eg-label flex items-center gap-3 px-2 py-3 min-h-[44px] text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              {accountLabel}
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
};

export default ElegantHeader;
