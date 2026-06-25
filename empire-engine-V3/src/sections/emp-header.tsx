"use client";

import { useEffect, useRef, useState } from "react";
import {
  Link,
  logoImgStyle,
  useCart,
  useCollections,
  useLocale,
  useResolvedSettings,
  useShop,
  useThemeSettings,
} from "@numueg/theme-sdk";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
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

/**
 * emp-header — faithful V3 port of V2 EmpStoreHeader
 * (numu-egyptian-bazaar/src/components/store/empire/EmpStoreHeader.tsx).
 *
 * A FIXED, transparent header that frosts to white-on-scroll
 * (`bg-white/95 backdrop-blur-md`). A BLACK announcement bar sits on top.
 * Layout: primary nav on the start side (Home / Shop [+ mega-menu] /
 * Contact), a CENTERED logo / brand wordmark, and search + account + cart
 * actions on the end side. Over the black slideshow hero the chrome is
 * white; once scrolled it flips to dark ink on the frosted bar — Empire's
 * signature. NOT the navy/amber bar it inherited from the Bazar clone.
 *
 * Settings: brand_name, logo_url, show_announcement, announcement_text,
 * show_search, show_cart. Nav links come from `nav_item` blocks (fallback
 * to Home / Shop / Contact). The Shop mega-menu lists collections.
 */
export default function EmpHeader({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const { cart } = useCart();
  const { collections } = useCollections();
  const themeSettings = useThemeSettings();
  const locale = useLocale();

  const brandName =
    asString(s.brand_name) ||
    asString(themeSettings.global_settings?.brand_name) ||
    shop?.name ||
    "NUMU";

  const logoUrl =
    asImageUrl(s.logo_url) ||
    asImageUrl(themeSettings.global_settings?.logo_url) ||
    shop?.logo_url ||
    "";

  // Merchant-chosen logo appearance, now an ENGINE-LEVEL feature: shape + size
  // live in GLOBAL settings and the shaping is computed by the SDK's shared
  // `logoImgStyle` (inline styles, GIF-safe). `none` keeps the original artwork
  // (the theme's own h-10 sizing); the shapes crop a 1:1 box.
  const logoShape = asString(themeSettings.global_settings?.logo_shape) || "none";
  const logoSize = asString(themeSettings.global_settings?.logo_size) || "small";
  const logoShaped = logoShape !== "none";
  const logoStyle = logoImgStyle(logoShape, logoSize);

  const announcement = asString(s.announcement_text);
  const showAnnouncement = (s.show_announcement as boolean) !== false;
  const showSearch = (s.show_search as boolean) !== false;
  const showCart = (s.show_cart as boolean) !== false;

  // Nav: editor blocks → fall back to Home / Shop / Contact (V2 set).
  const navBlocks = readBlocks(instance, "nav_item");
  const nav: NavItem[] =
    navBlocks.length > 0
      ? navBlocks
          .map((r) => ({ label: asString(r.label), href: asString(r.href) || "/" }))
          .filter((n) => n.label)
      : [
          { label: localized(locale, "Home", "الرئيسية"), href: "/" },
          { label: localized(locale, "Shop", "المتجر"), href: "/products" },
          { label: localized(locale, "Contact", "تواصل"), href: "/contact" },
        ];

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [shopHover, setShopHover] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemCount = cart?.items?.reduce((n, it) => n + it.quantity, 0) ?? 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleShopEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setShopHover(true);
  };
  const handleShopLeave = () => {
    hoverTimeout.current = setTimeout(() => setShopHover(false), 200);
  };

  const linkColor = scrolled
    ? "text-foreground hover:text-[hsl(var(--emp-blue))]"
    : "text-white hover:text-white/70";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md border-b border-[hsl(var(--border)/0.3)]"
          : "bg-transparent"
      }`}
      data-emp-section={sectionId}
    >
      {/* Announcement bar */}
      {showAnnouncement && announcement && (
        <div className="bg-black text-white text-center py-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
          <InlineEditable
            sectionId={sectionId}
            settingKey="announcement_text"
            value={announcement}
          />
        </div>
      )}

      {/* Main nav: start links | center logo | end actions */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 relative">
          {/* Start: nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {nav.map((n, i) => {
              const isShop = n.href === "/products";
              if (!isShop) {
                return (
                  <Link key={`${n.label}-${i}`} to={n.href} className={`text-[13px] font-medium transition-colors ${linkColor}`}>
                    {n.label}
                  </Link>
                );
              }
              return (
                <div
                  key={`${n.label}-${i}`}
                  className="relative"
                  onMouseEnter={handleShopEnter}
                  onMouseLeave={handleShopLeave}
                >
                  <Link to={n.href} className={`text-[13px] font-medium transition-colors ${linkColor}`}>
                    {n.label}
                  </Link>

                  {/* Shop mega-menu (collections) */}
                  {shopHover && collections.length > 0 && (
                    <div
                      className="absolute top-full start-0 mt-2 bg-white rounded-lg shadow-xl border border-[hsl(var(--border)/0.5)] p-5 min-w-[500px] z-50"
                      onMouseEnter={handleShopEnter}
                      onMouseLeave={handleShopLeave}
                    >
                      <div className="flex gap-6">
                        <div className="w-40 border-e border-[hsl(var(--border))] pe-5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[hsl(var(--emp-blue))] mb-3">
                            {localized(locale, "Shop", "المتجر")}
                          </p>
                          <Link to="/products" className="block text-sm font-semibold text-foreground hover:text-[hsl(var(--emp-blue))] transition-colors mb-2">
                            {localized(locale, "All Products", "كل المنتجات")}
                          </Link>
                          {collections.slice(0, 5).map((cat) => (
                            <Link key={cat.id} to={`/collections/${cat.slug}`} onClick={() => setShopHover(false)} className="block text-sm text-muted-foreground hover:text-foreground transition-colors mb-1.5">
                              {cat.name}
                            </Link>
                          ))}
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          {collections.slice(0, 3).map((cat) => (
                            <Link key={cat.id} to={`/collections/${cat.slug}`} onClick={() => setShopHover(false)} className="group">
                              <div className="aspect-square bg-black rounded-lg overflow-hidden">
                                {cat.image_url ? (
                                  <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-white/30 text-2xl font-black">{cat.name?.[0]}</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-center mt-2">{cat.name}</p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden p-2 ${scrolled ? "text-foreground" : "text-white"}`}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Center: logo */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <Link to="/" className={`block ${scrolled ? "text-foreground" : "text-white"}`} aria-label={brandName}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName}
                  className={logoShaped ? undefined : "h-10 object-contain"}
                  style={logoStyle}
                />
              ) : (
                <span className="text-lg font-black uppercase tracking-wider">{brandName}</span>
              )}
            </Link>
          </div>

          {/* End: actions */}
          <div className="flex items-center gap-1">
            {showSearch && (
              <Link
                to="/search"
                className={`p-2 transition-colors ${scrolled ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white"}`}
                aria-label="Search"
              >
                <Search size={18} />
              </Link>
            )}
            <Link
              to="/account"
              className={`p-2 transition-colors ${scrolled ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white"}`}
              aria-label="Account"
            >
              <User size={18} />
            </Link>
            {showCart && (
              <Link
                to="/cart"
                className={`flex items-center gap-1.5 p-2 transition-colors ${scrolled ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white"}`}
                aria-label={`Cart (${itemCount})`}
              >
                <ShoppingBag size={18} />
                <span className="text-[13px] font-medium">{itemCount}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-[hsl(var(--border))] px-4 py-4 space-y-3">
          {nav.map((n, i) => (
            <Link key={`mob-${n.label}-${i}`} to={n.href} onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-foreground py-1">
              {n.label}
            </Link>
          ))}
          {collections.slice(0, 5).map((cat) => (
            <Link key={cat.id} to={`/collections/${cat.slug}`} onClick={() => setMenuOpen(false)} className="block text-sm text-muted-foreground py-1 ps-4">
              {cat.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
