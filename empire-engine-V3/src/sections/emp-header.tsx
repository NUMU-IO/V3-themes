"use client";

import { useEffect, useState } from "react";
import {
  Link,
  useCart,
  useLocale,
  useResolvedSettings,
  useShop,
  useThemeSettings,
} from "@numueg/theme-sdk";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import {
  asImageUrl,
  asString,
  localized,
  readBlocks,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";

interface NavItem {
  label: string;
  href: string;
}

const defaultNav = (locale: string | undefined): NavItem[] => [
  { label: localized(locale, "HOME", "الرئيسية"), href: "/" },
  { label: localized(locale, "SHOP", "تسوّق"), href: "/products" },
  { label: localized(locale, "ABOUT", "من نحن"), href: "/about" },
  { label: localized(locale, "CONTACT", "تواصل معنا"), href: "/contact" },
];

/**
 * emp-header — Empire's chrome header. Ported from the V2 EmpStoreHeader:
 * navy bar with amber labels, an amber announcement marquee strip on
 * top, a centered logo / monogram, primary nav (from `nav_item` blocks
 * → falls back to a sensible default set), and search + cart icons. The
 * cart count is live from `useCart()`. A burger opens a full-screen
 * overlay on mobile.
 */
export default function EmpHeader({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const { cart } = useCart();
  const themeSettings = useThemeSettings();
  const locale = useLocale();

  const brandName =
    asString(s.brand_name) ||
    asString(themeSettings.global_settings?.brand_name) ||
    shop?.name ||
    "EMPIRE";

  const logoUrl =
    asImageUrl(s.logo_url) ||
    asImageUrl(themeSettings.global_settings?.logo_url) ||
    shop?.logo_url ||
    "";

  const announcement =
    asString(s.announcement_text) ||
    localized(
      locale,
      "FREE SHIPPING OVER 500 EGP • NEW ARRIVALS WEEKLY • SHOP THE EDIT",
      "شحن مجاني للطلبات فوق ٥٠٠ ج.م • وصل حديثًا كل أسبوع • تسوّق التشكيلة",
    );

  const showAnnouncement = (s.show_announcement as boolean) !== false;
  const showSearch = (s.show_search as boolean) !== false;
  const showCart = (s.show_cart as boolean) !== false;

  const navBlocks = readBlocks(instance, "nav_item");
  const nav: NavItem[] =
    navBlocks.length > 0
      ? navBlocks
          .map((r) => ({
            label: asString(r.label),
            href: asString(r.href) || "/",
          }))
          .filter((n) => n.label)
      : defaultNav(locale);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const itemCount = cart?.items?.reduce((n, it) => n + it.quantity, 0) ?? 0;

  // Shadow + blur once the page scrolls a little, matching V2.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile overlay when crossing to desktop.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const close = () => setMobileOpen(false);
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, []);

  // Lock body scroll while the overlay is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <div data-emp-section={sectionId}>
      {/* Announcement marquee */}
      {showAnnouncement && announcement && (
        <div
          className="bg-[var(--emp-amber)] overflow-hidden"
          aria-label={announcement}
        >
          <div className="emp-marquee-track py-1.5" aria-hidden="true">
            {[...Array(4)].map((_, i) => (
              <span
                key={i}
                className="emp-label text-[var(--emp-dark)] whitespace-nowrap mx-8"
              >
                {i === 0 ? (
                  <InlineEditable
                    sectionId={sectionId}
                    settingKey="announcement_text"
                    value={announcement}
                  />
                ) : (
                  announcement
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main bar */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[var(--emp-dark)]/95 backdrop-blur-md shadow-lg"
            : "bg-[var(--emp-dark)]"
        }`}
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3 relative">
          {/* Left — burger (mobile) + inline nav (desktop) */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden emp-label text-[var(--emp-amber)] flex items-center hover:opacity-80 transition-opacity"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="emp-mobile-menu"
            >
              <Menu size={20} aria-hidden="true" />
            </button>

            <nav
              className="hidden md:flex items-center gap-5 lg:gap-6"
              aria-label="Primary"
            >
              {nav.map((n) => (
                <Link
                  key={`${n.label}-${n.href}`}
                  to={n.href}
                  className="emp-label text-[var(--emp-amber)] text-xs font-bold tracking-[0.2em] hover:opacity-80 transition-opacity"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Centered logo / monogram */}
          <Link
            to="/"
            aria-label={brandName}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[45%] md:max-w-[35%] truncate text-center"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName}
                className="h-7 sm:h-8 w-auto inline-block"
              />
            ) : (
              <span className="emp-heading text-base sm:text-xl text-[var(--emp-amber)] truncate block">
                {brandName}
              </span>
            )}
          </Link>

          {/* Right — search + cart */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {showSearch && (
              <Link
                to="/search"
                className="emp-label text-[var(--emp-amber)] hover:opacity-80 transition-opacity"
                aria-label="Search"
              >
                <Search size={18} aria-hidden="true" />
              </Link>
            )}
            {showCart && (
              <Link
                to="/cart"
                className="emp-label text-[var(--emp-amber)] flex items-center gap-2 hover:opacity-80 transition-opacity relative"
                aria-label={`Cart (${itemCount} items)`}
              >
                <span className="hidden sm:inline text-xs font-bold tracking-[0.2em]">
                  {localized(locale, "CART", "السلة")}
                </span>
                <ShoppingBag size={18} aria-hidden="true" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -end-2 sm:-end-3 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[var(--emp-amber)] text-[var(--emp-dark)] text-[9px] sm:text-[10px] font-bold flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          id="emp-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          className="fixed inset-0 z-[60] bg-[var(--emp-dark)] flex flex-col items-center justify-center gap-6 overflow-y-auto py-16"
        >
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 end-4 text-[var(--emp-amber)]"
            aria-label="Close menu"
          >
            <X size={28} aria-hidden="true" />
          </button>
          {nav.map((n) => (
            <Link
              key={`mob-${n.label}-${n.href}`}
              to={n.href}
              onClick={() => setMobileOpen(false)}
              className="emp-heading text-3xl md:text-5xl text-[var(--emp-amber)] hover:text-[var(--emp-cream)] transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
