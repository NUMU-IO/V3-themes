"use client";

import { useEffect, useRef, useState } from "react";
import {
  Link,
  logoImgStyle,
  requestNavigate,
  useCart,
  useLocale,
  useNavigation,
  useResolvedSettings,
  useShop,
  useThemeSettings,
} from "@numueg/theme-sdk";
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import {
  asBool,
  asImageUrl,
  asString,
  localized,
  type SectionRenderProps,
} from "./_shared";

interface NavLink {
  label: string;
  href: string;
  children: { label: string; href: string }[];
}

/**
 * Bilingual fallback menu — used when the merchant hasn't wired a
 * "main-menu" in the hub Navigation manager yet, so the store is never
 * left without navigation.
 */
const defaultNav = (locale: string | undefined): NavLink[] => [
  { label: localized(locale, "Home", "الرئيسية"), href: "/", children: [] },
  { label: localized(locale, "Shop", "تسوق"), href: "/products", children: [] },
  {
    label: localized(locale, "Collections", "التشكيلات"),
    href: "/collections",
    children: [],
  },
  { label: localized(locale, "About", "من احنا"), href: "/about", children: [] },
  {
    label: localized(locale, "Contact", "كلمنا"),
    href: "/contact",
    children: [],
  },
];

/**
 * modern-header — Modern (V3) chrome header.
 *
 * Written in Modern's own visual language, read straight off the theme's
 * `src/theme.css`: the light `--background` surface, teal `--primary`,
 * `--border` hairlines, the generous `rounded-2xl` radius, the soft
 * `store-gradient` accent and the same easing/duration (200–300ms) the
 * hero and newsletter sections use. No new palette is introduced.
 */
export default function ModernHeader({
  instance,
  sectionId,
}: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const { cart } = useCart();
  const themeSettings = useThemeSettings();
  const locale = useLocale();
  const isAr = (locale || "").toLowerCase().startsWith("ar");

  const brandName = asString(s.brand_name) || shop?.name || "";

  const logoUrl = asImageUrl(s.logo_url) || shop?.logo_url || "";
  // Engine-level logo shape/size lives in GLOBAL settings; the SDK computes the
  // inline style so every theme crops identically.
  const gs = (themeSettings.global_settings ?? {}) as Record<string, unknown>;
  const logoShape = asString(gs.logo_shape) || "none";
  const logoSize = asString(gs.logo_size) || "small";
  const logoShaped = logoShape !== "none";
  const logoStyle = logoImgStyle(logoShape, logoSize);

  const showSearch = asBool(s.show_search, true);
  const showAccount = asBool(s.show_account, true);
  const showCart = asBool(s.show_cart, true);

  // Announcement strip — Modern ships no separate announcement-bar section,
  // so the header owns it.
  const showAnnouncement = asBool(s.show_announcement, true);
  const announcementText = isAr
    ? asString(s.announcement_text_ar) || asString(s.announcement_text)
    : asString(s.announcement_text) || asString(s.announcement_text_ar);
  const announcement =
    announcementText ||
    localized(
      locale,
      "Free shipping on orders over 1000 EGP",
      "شحن مجاني للطلبات فوق ١٠٠٠ جنيه",
    );

  const menu = useNavigation(asString(s.menu_handle) || "main-menu");
  const nav: NavLink[] =
    menu.items.length > 0
      ? menu.items
          .filter((i) => i.target_visible !== false && i.title)
          .map((i) => ({
            label: i.title,
            href: i.url || "/",
            children: (i.children ?? [])
              .filter((c) => c.target_visible !== false && c.title)
              .map((c) => ({ label: c.title, href: c.url || "/" })),
          }))
      : defaultNav(locale);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const itemCount = cart?.items?.reduce((n, it) => n + it.quantity, 0) ?? 0;

  // Soft shadow once the page scrolls — same 300ms transition as the hero.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer when crossing to desktop.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const close = () => setMobileOpen(false);
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, []);

  // Lock body scroll + ESC-to-close while the drawer is open; move focus onto
  // the close button so the panel is keyboard-reachable.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : prev || "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setOpenDropdown(null);
      }
    };
    window.addEventListener("keydown", onKey);
    if (mobileOpen) closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const goSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    const href = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
    if (!requestNavigate(href) && typeof window !== "undefined") {
      window.location.href = href;
    }
  };

  const iconButton =
    "inline-flex items-center justify-center w-10 h-10 rounded-2xl text-foreground/70 hover:text-primary hover:bg-accent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <div data-modern-section={sectionId}>
      {showAnnouncement && announcement && (
        <div className="bg-[hsl(var(--announcement-bg))] text-[hsl(var(--announcement-fg))]">
          <div className="container mx-auto px-4 py-2 text-center text-xs md:text-sm font-semibold tracking-wide">
            {announcement}
          </div>
        </div>
      )}

      <header
        className={`sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border transition-shadow duration-300 ${
          scrolled ? "shadow-md" : "shadow-none"
        }`}
      >
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center gap-3 md:gap-6">
          {/* Burger (mobile) */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className={`md:hidden ${iconButton}`}
            aria-label={localized(locale, "Open menu", "افتح القائمة")}
            aria-expanded={mobileOpen}
            aria-controls="modern-mobile-menu"
          >
            <Menu size={22} aria-hidden="true" />
          </button>

          {/* Logo / brand */}
          <Link
            to="/"
            aria-label={brandName || localized(locale, "Home", "الرئيسية")}
            className="flex items-center min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName || localized(locale, "Store logo", "شعار المتجر")}
                className={
                  logoShaped
                    ? "w-auto max-h-10 md:max-h-12"
                    : "h-9 md:h-11 w-auto object-contain"
                }
                style={
                  logoShaped
                    ? { ...logoStyle, width: "auto", aspectRatio: "1 / 1" }
                    : logoStyle
                }
              />
            ) : (
              <span className="text-lg md:text-xl font-black text-foreground truncate">
                {brandName}
              </span>
            )}
          </Link>

          {/* Primary nav (desktop) */}
          <nav
            className="hidden md:flex items-center gap-1 lg:gap-2 me-auto ms-2"
            aria-label={localized(
              locale,
              "Primary navigation",
              "التنقل الرئيسي",
            )}
          >
            {nav.map((n) => {
              const key = `${n.label}-${n.href}`;
              const hasChildren = n.children.length > 0;
              if (!hasChildren) {
                return (
                  <Link
                    key={key}
                    to={n.href}
                    className="px-3 py-2 rounded-2xl text-sm font-bold text-foreground/75 hover:text-primary hover:bg-accent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {n.label}
                  </Link>
                );
              }
              const open = openDropdown === key;
              return (
                <div
                  key={key}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(key)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(open ? null : key)}
                    aria-expanded={open}
                    aria-controls={`modern-dd-${key}`}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl text-sm font-bold text-foreground/75 hover:text-primary hover:bg-accent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {n.label}
                    <ChevronDown
                      size={15}
                      aria-hidden="true"
                      className={`transition-transform duration-300 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div
                    id={`modern-dd-${key}`}
                    className={`absolute top-full start-0 mt-2 min-w-[13rem] rounded-2xl border border-border bg-card shadow-lg p-2 transition-all duration-200 ${
                      open
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 -translate-y-1 pointer-events-none"
                    }`}
                  >
                    {n.children.map((c) => (
                      <Link
                        key={`${key}-${c.label}`}
                        to={c.href}
                        className="block px-3 py-2 rounded-xl text-sm text-foreground/75 hover:text-primary hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 md:gap-2 ms-auto md:ms-0">
            {showSearch && (
              <>
                <form
                  onSubmit={goSearch}
                  role="search"
                  className="hidden lg:flex items-center gap-2 h-10 ps-4 pe-1 rounded-2xl border border-border bg-secondary/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25 transition-all duration-300"
                >
                  <label htmlFor="modern-header-search" className="sr-only">
                    {localized(locale, "Search products", "دور على منتج")}
                  </label>
                  <input
                    id="modern-header-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={localized(
                      locale,
                      "Search products",
                      "دور على منتج",
                    )}
                    className="w-40 xl:w-52 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-primary hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label={localized(locale, "Search", "بحث")}
                  >
                    <Search size={17} aria-hidden="true" />
                  </button>
                </form>
                <Link
                  to="/search"
                  className={`lg:hidden ${iconButton}`}
                  aria-label={localized(locale, "Search", "بحث")}
                >
                  <Search size={20} aria-hidden="true" />
                </Link>
              </>
            )}

            {showAccount && (
              <Link
                to="/account"
                className={iconButton}
                aria-label={localized(locale, "My account", "حسابي")}
              >
                <User size={20} aria-hidden="true" />
              </Link>
            )}

            {showCart && (
              <Link
                to="/cart"
                className={`relative ${iconButton}`}
                // The count belongs in the accessible name: the badge below is
                // aria-hidden by virtue of being decorative markup, so a
                // screen-reader user otherwise hears "Cart" whether the cart
                // holds nothing or nine items. Matches the other five themes.
                aria-label={
                  itemCount > 0
                    ? `${localized(locale, "Cart", "السلة")} (${itemCount})`
                    : localized(locale, "Cart", "السلة")
                }
              >
                <ShoppingBag size={20} aria-hidden="true" />
                {itemCount > 0 && (
                  <span
                    aria-live="polite"
                    className="absolute -top-0.5 -end-0.5 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full store-gradient text-white text-[10px] font-bold flex items-center justify-center shadow-sm"
                  >
                    {itemCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer — scrim + panel, always mounted so it animates both ways */}
      <div
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
        className={`md:hidden fixed inset-0 z-[55] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        id="modern-mobile-menu"
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
        className={`md:hidden fixed inset-y-0 start-0 z-[60] flex w-[82%] max-w-[330px] flex-col bg-background shadow-2xl rounded-e-3xl transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-5 h-16 border-b border-border">
          <span className="text-lg font-black text-foreground truncate">
            {brandName}
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setMobileOpen(false)}
            className={iconButton}
            aria-label={localized(locale, "Close menu", "اقفل القائمة")}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <nav
          className="flex flex-col gap-1 overflow-y-auto px-3 py-4"
          aria-label={localized(locale, "Mobile navigation", "تنقل الموبايل")}
        >
          {nav.map((n) => (
            <div key={`m-${n.label}-${n.href}`}>
              <Link
                to={n.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-2xl px-4 py-3 text-base font-bold text-foreground hover:text-primary hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {n.label}
              </Link>
              {n.children.length > 0 && (
                <div className="ms-3 ps-3 border-s border-border flex flex-col">
                  {n.children.map((c) => (
                    <Link
                      key={`m-${n.label}-${c.label}`}
                      to={c.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="mt-auto px-3 pb-5 pt-3 border-t border-border flex flex-col gap-1">
          {showAccount && (
            <Link
              to="/account"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-foreground hover:text-primary hover:bg-accent transition-colors"
            >
              <User size={18} aria-hidden="true" />
              {localized(locale, "My account", "حسابي")}
            </Link>
          )}
          {showCart && (
            <Link
              to="/cart"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-foreground hover:text-primary hover:bg-accent transition-colors"
            >
              <ShoppingBag size={18} aria-hidden="true" />
              {localized(locale, "Cart", "السلة")}
              {itemCount > 0 && (
                <span className="ms-auto min-w-[1.25rem] h-5 px-1.5 rounded-full store-gradient text-white text-[11px] font-bold flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}
