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
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { asBool, asImageUrl, asString, localized, type StSectionProps } from "./_shared";

interface NavLink {
  label: string;
  href: string;
}

/** Bilingual fallback so a store with no menu wired is still navigable. */
const defaultNav = (locale: string | undefined): NavLink[] => [
  { label: localized(locale, "Home", "الرئيسية"), href: "/" },
  { label: localized(locale, "Shop", "تسوق"), href: "/products" },
  { label: localized(locale, "Collections", "التشكيلات"), href: "/collections" },
  { label: localized(locale, "About", "من احنا"), href: "/about" },
  { label: localized(locale, "Contact", "كلمنا"), href: "/contact" },
];

/**
 * st-header — Street's chrome header.
 *
 * Street's identity, read straight off `styles.css`: the yellow bar with the
 * 3px black rule under it (`.st-header`), 900-weight uppercase nav with wide
 * tracking (`.st-header-nav-link`), the navy announcement strip
 * (`.st-announcement`) and the black/yellow marquee (`.st-marquee-strip`).
 * No new palette is introduced.
 */
export default function StHeader({ instance, sectionId }: StSectionProps) {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const { cart } = useCart();
  const themeSettings = useThemeSettings();
  const locale = useLocale();
  const isAr = (locale || "").toLowerCase().startsWith("ar");

  const brandName = asString(s.brand_name) || shop?.name || "";
  const logoUrl = asImageUrl(s.logo_url) || shop?.logo_url || "";
  const gs = (themeSettings.global_settings ?? {}) as Record<string, unknown>;
  const logoStyle = logoImgStyle(
    asString(gs.logo_shape) || "none",
    asString(gs.logo_size) || "small",
  );

  const showSearch = asBool(s.show_search, true);
  const showAccount = asBool(s.show_account, true);
  const showCart = asBool(s.show_cart, true);

  // NO invented fallback: the host renders the merchant's own announcement bar
  // above the theme, so a hardcoded default here would stack a second bar
  // saying something the merchant never wrote.
  const showAnnouncement = asBool(s.show_announcement, true);
  const announcement = isAr
    ? asString(s.announcement_text_ar) || asString(s.announcement_text)
    : asString(s.announcement_text) || asString(s.announcement_text_ar);

  const marquee = isAr
    ? asString(s.marquee_text_ar) || asString(s.marquee_text)
    : asString(s.marquee_text) || asString(s.marquee_text_ar);

  const menu = useNavigation(asString(s.menu_handle) || "main-menu");
  const nav: NavLink[] =
    menu.items.length > 0
      ? menu.items
          .filter((i) => i.target_visible !== false && i.title)
          .map((i) => ({ label: i.title, href: i.url || "/" }))
      : defaultNav(locale);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const itemCount = cart?.items?.reduce((n, it) => n + it.quantity, 0) ?? 0;
  const drawerId = `st-menu-${sectionId}`;

  // Close on desktop, lock scroll + ESC while open, move focus into the panel.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const close = () => setOpen(false);
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prev || "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    if (open) closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const goSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    const href = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
    if (!requestNavigate(href) && typeof window !== "undefined") {
      window.location.href = href;
    }
  };

  const iconBtn =
    "inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-transparent hover:border-[var(--st-dark)] transition-colors";

  return (
    <div data-st-section={sectionId}>
      {showAnnouncement && announcement && (
        <div className="st-announcement">{announcement}</div>
      )}

      <header className="st-header sticky top-0 z-50">
        <div className="mx-auto max-w-[1400px] px-4 h-16 md:h-20 flex items-center gap-3 md:gap-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`md:hidden ${iconBtn}`}
            aria-label={localized(locale, "Open menu", "افتح القائمة")}
            aria-expanded={open}
            aria-controls={drawerId}
          >
            <Menu size={22} aria-hidden="true" />
          </button>

          <Link
            to="/"
            className="flex items-center min-w-0 shrink-0"
            aria-label={brandName || localized(locale, "Home", "الرئيسية")}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName}
                style={logoStyle}
                className="max-h-10 w-auto object-contain"
              />
            ) : (
              <span className="st-logo-text truncate">{brandName}</span>
            )}
          </Link>

          <nav
            className="hidden md:flex items-center gap-7 flex-1"
            aria-label={localized(locale, "Main", "الرئيسية")}
          >
            {nav.map((l) => (
              <Link key={`${l.href}-${l.label}`} to={l.href} className="st-header-nav-link">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-1 md:gap-2">
            {showSearch && (
              <form onSubmit={goSearch} className="hidden lg:block w-52">
                <label className="sr-only" htmlFor={`st-q-${sectionId}`}>
                  {localized(locale, "Search products", "دور على منتج")}
                </label>
                <input
                  id={`st-q-${sectionId}`}
                  className="st-input !py-2 !text-xs"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={localized(locale, "Search products", "دور على منتج")}
                />
              </form>
            )}
            {showSearch && (
              <Link
                to="/search"
                className={`lg:hidden ${iconBtn}`}
                aria-label={localized(locale, "Search", "بحث")}
              >
                <Search size={20} aria-hidden="true" />
              </Link>
            )}
            {showAccount && (
              <Link
                to="/account"
                className={iconBtn}
                aria-label={localized(locale, "Account", "حسابي")}
              >
                <User size={20} aria-hidden="true" />
              </Link>
            )}
            {showCart && (
              <Link
                to="/cart"
                className={`relative ${iconBtn}`}
                // The count belongs in the accessible name — the badge is
                // decorative, so a screen reader would otherwise hear "Cart"
                // whether it holds nothing or nine items.
                aria-label={
                  itemCount > 0
                    ? `${localized(locale, "Cart", "السلة")} (${itemCount})`
                    : localized(locale, "Cart", "السلة")
                }
              >
                <ShoppingBag size={20} aria-hidden="true" />
                {itemCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -end-0.5 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-[var(--st-pink)] text-white text-[10px] font-black flex items-center justify-center"
                  >
                    {itemCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {marquee && (
        <div className="st-marquee-strip" aria-hidden="true">
          <div className="st-marquee-inner">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i}>{marquee}</span>
            ))}
          </div>
        </div>
      )}

      {/* Mobile drawer. Scrim is click-through while closed. */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`md:hidden fixed inset-0 z-[55] bg-black/50 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        id={drawerId}
        role="dialog"
        aria-modal="true"
        aria-label={localized(locale, "Site navigation", "تنقل الموقع")}
        /* `aria-hidden` hides the closed drawer from screen readers but leaves
            its links in the TAB ORDER — focusable descendants of an aria-hidden
            subtree are an axe `aria-hidden-focus` violation. The panel stays in
            flow so it can animate, so `inert` is what removes it from focus. */
        aria-hidden={!open}
        {...(!open ? { inert: true } : {})}
        className={`md:hidden fixed inset-y-0 start-0 z-[60] flex w-[82%] max-w-[330px] flex-col bg-[var(--st-cream)] border-e-[3px] border-[var(--st-dark)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-5 h-16 border-b-[3px] border-[var(--st-dark)] st-header">
          <span className="st-logo-text truncate">{brandName}</span>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            className={iconBtn}
            aria-label={localized(locale, "Close menu", "اقفل القائمة")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-5">
          {nav.map((l) => (
            <Link
              key={`m-${l.href}-${l.label}`}
              to={l.href}
              onClick={() => setOpen(false)}
              className="st-header-nav-link !text-sm"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-3 border-t-2 border-[var(--st-dark)] pt-5">
            {showAccount && (
              <Link to="/account" onClick={() => setOpen(false)} className="st-header-nav-link !text-sm">
                {localized(locale, "My account", "حسابي")}
              </Link>
            )}
            {showCart && (
              <Link to="/cart" onClick={() => setOpen(false)} className="st-header-nav-link !text-sm">
                {localized(locale, "Cart", "السلة")}
                {itemCount > 0 ? ` (${itemCount})` : ""}
              </Link>
            )}
          </div>
        </nav>
      </aside>
    </div>
  );
}
