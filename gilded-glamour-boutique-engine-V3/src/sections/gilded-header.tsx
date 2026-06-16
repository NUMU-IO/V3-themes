"use client";

import { useState } from "react";
import {
  Link,
  useCart,
  useCollections,
  useLocale,
  useResolvedSettings,
  useShop,
  useThemeSettings,
} from "@numueg/theme-sdk";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from "lucide-react";
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
  hasDropdown?: boolean;
}

/**
 * gilded-header — faithful V3 port of V2 GildedHeader
 * (numu-egyptian-bazaar/src/components/store/gilded-glamour-boutique/GildedHeader.tsx).
 *
 * A STICKY, frosted-white header (`bg-card/95 backdrop-blur-sm border-b`)
 * with an optional BLACK announcement bar (`bg-foreground text-card`,
 * centered uppercase). Layout: logo on the START (image if set, else a GOLD
 * wordmark — uppercase, tracking-[0.2em]), a desktop nav (gap-8) on the
 * center/end, and language / search / cart / account icons on the end. The
 * COLLECTIONS link reveals a hover dropdown listing the store's collections.
 * A mobile hamburger toggles an animated gilded dropdown menu.
 *
 * Settings: brand_name, logo_url, show_announcement, announcement_text,
 * show_search, show_cart. Nav links come from `nav_item` blocks (fallback to
 * the V2 set: Home / Shop / Collections / Lookbook / About / FAQ / Contact).
 */
export default function GildedHeader({ instance, sectionId }: SectionRenderProps) {
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
    "SAW SAW";

  const logoUrl =
    asImageUrl(s.logo_url) ||
    asImageUrl(themeSettings.global_settings?.logo_url) ||
    shop?.logo_url ||
    "";

  const announcement = asString(s.announcement_text);
  const showAnnouncement = (s.show_announcement as boolean) !== false;
  const showSearch = (s.show_search as boolean) !== false;
  const showCart = (s.show_cart as boolean) !== false;

  // Nav: editor blocks → fall back to the V2 Gilded set.
  const navBlocks = readBlocks(instance, "nav_item");
  const nav: NavItem[] =
    navBlocks.length > 0
      ? navBlocks
          .map((r) => ({
            label: asString(r.label),
            href: asString(r.href) || "/",
            hasDropdown: asString(r.href) === "/collections",
          }))
          .filter((n) => n.label)
      : [
          { label: localized(locale, "HOME", "الرئيسية"), href: "/" },
          { label: localized(locale, "SHOP", "المتجر"), href: "/products" },
          {
            label: localized(locale, "COLLECTIONS", "التشكيلات"),
            href: "/collections",
            hasDropdown: true,
          },
          { label: localized(locale, "LOOKBOOK", "الكتالوج"), href: "/pages/lookbook" },
          { label: localized(locale, "ABOUT", "عن المتجر"), href: "/pages/about" },
          { label: localized(locale, "FAQ", "الأسئلة الشائعة"), href: "/pages/faq" },
          { label: localized(locale, "CONTACT", "تواصل"), href: "/pages/contact" },
        ];

  const [menuOpen, setMenuOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [mobileCollectionsOpen, setMobileCollectionsOpen] = useState(false);
  const itemCount = cart?.items?.reduce((n, it) => n + it.quantity, 0) ?? 0;

  const isAr = (locale || "").toLowerCase().startsWith("ar");

  const navLinkClass =
    "text-[13px] font-medium tracking-[0.2em] text-foreground hover:text-[hsl(var(--gold))] transition-colors";

  return (
    <header
      className="sticky top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b"
      data-gilded-section={sectionId}
    >
      {/* Announcement bar */}
      {showAnnouncement && announcement && (
        <div className="bg-foreground text-card text-center py-2 text-xs font-medium tracking-[0.15em] uppercase">
          <InlineEditable
            sectionId={sectionId}
            settingKey="announcement_text"
            value={announcement}
          />
        </div>
      )}

      {/* Main header */}
      <div>
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" aria-label={brandName}>
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-10 w-auto object-contain" />
            ) : (
              <span className="text-lg font-bold tracking-[0.2em] uppercase text-[hsl(var(--gold))]">
                <InlineEditable sectionId={sectionId} settingKey="brand_name" value={brandName} />
              </span>
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {nav.map((link, i) => (
              <div key={`${link.label}-${i}`} className="relative">
                {link.hasDropdown ? (
                  <button
                    type="button"
                    onMouseEnter={() => setCollectionsOpen(true)}
                    onMouseLeave={() => setCollectionsOpen(false)}
                    className={`${navLinkClass} inline-flex items-center gap-1`}
                  >
                    {link.label}
                    <ChevronDown
                      size={12}
                      className={`transition-transform ${collectionsOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                ) : (
                  <Link to={link.href} className={navLinkClass}>
                    {link.label}
                  </Link>
                )}

                {/* Collections Dropdown */}
                {link.hasDropdown && (
                  <div
                    onMouseEnter={() => setCollectionsOpen(true)}
                    onMouseLeave={() => setCollectionsOpen(false)}
                    className={`absolute top-full start-0 pt-4 transition-opacity ${
                      collectionsOpen ? "opacity-100 visible" : "opacity-0 invisible"
                    }`}
                  >
                    <div className="bg-card border border-border shadow-xl rounded-sm py-4 min-w-[220px]">
                      <div className="px-4 pb-2 mb-2 border-b border-border">
                        <Link
                          to="/collections"
                          className="text-xs font-bold tracking-[0.15em] uppercase text-[hsl(var(--gold))] hover:underline"
                        >
                          {localized(locale, "All Collections", "كل التشكيلات")}
                        </Link>
                      </div>
                      {collections.length > 0 ? (
                        collections.map((cat) => (
                          <Link
                            key={cat.id}
                            to={`/collections/${cat.slug}`}
                            className="block px-4 py-2 text-xs tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                          >
                            {cat.name}
                          </Link>
                        ))
                      ) : (
                        <p className="px-4 py-2 text-xs text-muted-foreground">
                          {localized(locale, "No collections yet", "لا توجد تشكيلات بعد")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Icons — desktop */}
          <div className="hidden md:flex items-center gap-4">
            <button
              type="button"
              className="text-foreground hover:text-[hsl(var(--gold))] transition-colors text-[11px] font-semibold tracking-[0.15em] uppercase"
              aria-label="Language"
              dir="ltr"
              // Language toggle is a host-driven concern in V3 (LocaleSwitcher);
              // we render the affordance to match V2 but defer the switch to
              // the storefront's locale routing.
            >
              {isAr ? "EN" : "AR"}
            </button>
            {showSearch && (
              <Link
                to="/search"
                className="text-foreground hover:text-[hsl(var(--gold))] transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </Link>
            )}
            {showCart && (
              <Link
                to="/cart"
                className="text-foreground hover:text-[hsl(var(--gold))] transition-colors relative"
                aria-label={`Cart (${itemCount})`}
              >
                <ShoppingBag size={20} />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -end-1 w-4 h-4 bg-[hsl(var(--gold))] text-foreground text-[10px] flex items-center justify-center font-bold">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}
            <Link
              to="/account"
              className="text-foreground hover:text-[hsl(var(--gold))] transition-colors"
              aria-label="Account"
            >
              <User size={20} />
            </Link>
          </div>

          {/* Mobile: menu button next to the logo */}
          <button
            type="button"
            className="md:hidden text-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-card border-b overflow-hidden"
          >
            <nav className="flex flex-col items-center gap-4 py-8">
              {nav.map((link, i) =>
                link.hasDropdown ? (
                  <div key={`mob-${link.label}-${i}`} className="w-full text-center">
                    <button
                      type="button"
                      dir="ltr"
                      onClick={() => setMobileCollectionsOpen(!mobileCollectionsOpen)}
                      className={`${navLinkClass} inline-flex items-center justify-center gap-1`}
                    >
                      {link.label}
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${mobileCollectionsOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    <AnimatePresence>
                      {mobileCollectionsOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2"
                        >
                          <Link
                            to="/collections"
                            onClick={() => setMenuOpen(false)}
                            className="block py-2 text-xs font-bold tracking-[0.1em] uppercase text-[hsl(var(--gold))]"
                          >
                            {localized(locale, "All Collections", "كل التشكيلات")}
                          </Link>
                          {collections.map((cat) => (
                            <Link
                              key={cat.id}
                              to={`/collections/${cat.slug}`}
                              onClick={() => setMenuOpen(false)}
                              className="block py-2 text-xs tracking-[0.1em] uppercase text-muted-foreground"
                            >
                              {cat.name}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    key={`mob-${link.label}-${i}`}
                    to={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={navLinkClass}
                  >
                    {link.label}
                  </Link>
                ),
              )}
              <Link
                to="/account"
                onClick={() => setMenuOpen(false)}
                className={navLinkClass}
              >
                {localized(locale, "ACCOUNT", "حسابي")}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
