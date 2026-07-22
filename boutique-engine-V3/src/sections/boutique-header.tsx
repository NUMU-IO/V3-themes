"use client";
/**
 * boutique-header — Boutique (V3) storefront chrome.
 *
 * Identity is taken straight from this theme's own vocabulary (see
 * src/theme.css + boutique-hero / boutique-newsletter):
 *   • pink/magenta `--primary`, soft `--accent` / `--hero-bg` gradients
 *   • pill geometry (rounded-full) for every actionable chip
 *   • the line · dot · line ornament used by the hero and newsletter
 *   • `hover:shadow-[0_0_16px_hsl(var(--primary)/0.35)]` glow + scale motion
 *   • framer-motion easeOut entrances
 *
 * Boutique ships no separate announcement-bar section, so the promo strip
 * lives here behind `show_announcement`.
 */

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
import { motion } from "framer-motion";
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { asImageUrl, asString, localized, type SectionRenderProps } from "./_shared";

interface NavNode {
  label: string;
  href: string;
  children: { label: string; href: string }[];
}

const defaultNav = (locale: string | undefined): NavNode[] => [
  { label: localized(locale, "Home", "الرئيسية"), href: "/", children: [] },
  { label: localized(locale, "Shop", "تسوقي"), href: "/products", children: [] },
  { label: localized(locale, "Collections", "التشكيلات"), href: "/collections", children: [] },
  { label: localized(locale, "About", "عننا"), href: "/about", children: [] },
  { label: localized(locale, "Contact", "كلمينا"), href: "/contact", children: [] },
];

/** line · dot · line — Boutique's signature ornament. */
const Ornament = () => (
  <span className="flex items-center gap-2" aria-hidden="true">
    <span className="block w-5 h-px bg-primary/30" />
    <span className="block w-1.5 h-1.5 rounded-full bg-primary/50" />
    <span className="block w-5 h-px bg-primary/30" />
  </span>
);

const BoutiqueHeader = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const { cart } = useCart();
  const themeSettings = useThemeSettings();
  const locale = useLocale();
  const isAr = (locale || "").toLowerCase().startsWith("ar");

  const uid = useId().replace(/:/g, "");
  const drawerId = `boutique-menu-${uid}`;

  const brandName =
    asString(s.brand_name) ||
    asString(themeSettings.global_settings?.brand_name) ||
    shop?.name ||
    localized(locale, "Boutique", "بوتيك");

  const logoUrl =
    asImageUrl(s.logo_url) ||
    asImageUrl(themeSettings.global_settings?.logo_url) ||
    shop?.logo_url ||
    "";

  // Engine-level logo shape/size (global settings, shared SDK helper).
  const logoShape = asString(themeSettings.global_settings?.logo_shape) || "none";
  const logoSize = asString(themeSettings.global_settings?.logo_size) || "small";
  const logoShaped = logoShape !== "none";
  const logoStyle = logoImgStyle(logoShape, logoSize);

  const showSearch = s.show_search !== false;
  const showCart = s.show_cart !== false;
  const showAccount = s.show_account !== false;
  const sticky = s.sticky !== false;

  // Default-on (schema default true); an explicit `false` from the merchant hides it.
  const showAnnouncement = s.show_announcement !== false;
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

  // Nav: merchant menu first (the SDK already drops links to hidden CMS pages),
  // then the bilingual default set.
  const menuHandle = asString(s.menu_handle) || "main-menu";
  const mainMenu = useNavigation(menuHandle);
  const nav: NavNode[] =
    mainMenu.items.length > 0
      ? mainMenu.items
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
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const itemCount = cart?.items?.reduce((n, it) => n + it.quantity, 0) ?? 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 16);
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

  // Body-scroll lock + ESC while the drawer is open.
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
    if (mobileOpen) window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const iconChip =
    "inline-flex items-center justify-center w-10 h-10 rounded-full text-foreground/80 transition-all duration-300 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  const labels = {
    search: localized(locale, "Search", "البحث"),
    account: localized(locale, "Account", "حسابي"),
    cart: localized(locale, "Cart", "السلة"),
    openMenu: localized(locale, "Open menu", "افتحي القائمة"),
    closeMenu: localized(locale, "Close menu", "اقفلي القائمة"),
    primaryNav: localized(locale, "Primary", "التنقل الرئيسي"),
    mobileNav: localized(locale, "Mobile", "قائمة الموبايل"),
    menuTitle: localized(locale, "Menu", "القائمة"),
  };

  return (
    <div data-boutique-section={sectionId}>
      {/* Announcement strip — Boutique has no standalone announcement section. */}
      {showAnnouncement && announcement && (
        <div
          className="w-full text-center text-xs sm:text-sm font-medium py-2 px-4"
          style={{
            background: "hsl(var(--announcement-bg))",
            color: "hsl(var(--announcement-fg))",
          }}
        >
          {announcement}
        </div>
      )}

      <header
        className={`${sticky ? "sticky top-0" : "relative"} z-50 border-b transition-all duration-300 ${
          scrolled
            ? "bg-card/95 backdrop-blur-md border-border shadow-[0_4px_24px_hsl(var(--primary)/0.08)]"
            : "bg-card border-border/50"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-3 h-16 md:h-20">
            {/* Burger (mobile) */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={`md:hidden ${iconChip}`}
              aria-label={labels.openMenu}
              aria-expanded={mobileOpen}
              aria-controls={drawerId}
            >
              <Menu size={20} aria-hidden="true" />
            </button>

            {/* Brand */}
            <Link
              to="/"
              aria-label={brandName}
              className="flex items-center gap-2 min-w-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName}
                  className={
                    logoShaped
                      ? "w-auto max-h-11"
                      : "h-8 md:h-10 w-auto max-h-12 object-contain"
                  }
                  style={
                    logoShaped
                      ? { ...logoStyle, width: "auto", aspectRatio: "1 / 1" }
                      : logoStyle
                  }
                />
              ) : (
                <span className="text-xl md:text-2xl font-bold text-foreground truncate">
                  {brandName}
                </span>
              )}
            </Link>

            {/* Desktop nav */}
            <nav
              className="hidden md:flex items-center gap-1"
              aria-label={labels.primaryNav}
            >
              {nav.map((n) =>
                n.children.length > 0 ? (
                  <div
                    key={`${n.label}-${n.href}`}
                    className="relative"
                    onMouseEnter={() => setOpenSub(n.href)}
                    onMouseLeave={() => setOpenSub(null)}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenSub(openSub === n.href ? null : n.href)}
                      aria-expanded={openSub === n.href}
                      aria-controls={`${drawerId}-sub-${n.href.replace(/\W/g, "")}`}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium text-foreground/80 transition-all duration-300 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {n.label}
                      <ChevronDown size={14} aria-hidden="true" />
                    </button>
                    <div
                      id={`${drawerId}-sub-${n.href.replace(/\W/g, "")}`}
                      hidden={openSub !== n.href}
                      className="absolute top-full start-0 mt-2 min-w-[12rem] rounded-2xl border border-border/60 bg-popover p-2 shadow-xl"
                    >
                      <ul>
                        {n.children.map((c) => (
                          <li key={`${c.label}-${c.href}`}>
                            <Link
                              to={c.href}
                              className="block rounded-full px-4 py-2 text-sm text-popover-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                              {c.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={`${n.label}-${n.href}`}
                    to={n.href}
                    className="px-4 py-2 rounded-full text-sm font-medium text-foreground/80 transition-all duration-300 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {n.label}
                  </Link>
                ),
              )}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {showSearch && (
                <Link to="/search" aria-label={labels.search} className={iconChip}>
                  <Search size={19} aria-hidden="true" />
                </Link>
              )}
              {showAccount && (
                <Link
                  to="/account"
                  aria-label={labels.account}
                  className={`hidden sm:inline-flex ${iconChip}`}
                >
                  <User size={19} aria-hidden="true" />
                </Link>
              )}
              {showCart && (
                <Link
                  to="/cart"
                  aria-label={`${labels.cart} (${itemCount})`}
                  className={`relative ${iconChip}`}
                >
                  <ShoppingBag size={19} aria-hidden="true" />
                  {itemCount > 0 && (
                    <span
                      aria-live="polite"
                      className="absolute -top-0.5 -end-0.5 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full text-[10px] font-bold text-primary-foreground flex items-center justify-center"
                      style={{ background: "hsl(var(--primary))" }}
                    >
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer — scrim + off-canvas panel, RTL-safe via logical props. */}
      <div
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
        className={`md:hidden fixed inset-0 z-[55] bg-foreground/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        id={drawerId}
        role="dialog"
        aria-modal="true"
        aria-label={labels.menuTitle}
        /* `aria-hidden` hides the closed drawer from screen readers but leaves
            its links in the TAB ORDER — focusable descendants of an aria-hidden
            subtree are an axe `aria-hidden-focus` violation, and a keyboard user
            tabbed through ~7 invisible off-canvas links before reaching the page.
            The drawer stays `display:flex` (it animates on a transform), so
            `inert` is what actually removes it from focus while closed. */
        aria-hidden={!mobileOpen}
        {...(!mobileOpen ? { inert: true } : {})}
        className={`md:hidden fixed inset-y-0 start-0 z-[60] flex w-[82%] max-w-[340px] flex-col bg-card shadow-2xl transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        }`}
        style={{ borderStartEndRadius: "1.5rem", borderEndEndRadius: "1.5rem" }}
      >
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--hero-bg)))",
          }}
        >
          <span className="text-lg font-bold text-foreground truncate">
            {brandName}
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className={`-me-2 ${iconChip}`}
            aria-label={labels.closeMenu}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-3 flex justify-center">
          <Ornament />
        </div>

        <nav
          className="flex flex-col gap-1 overflow-y-auto px-3 pb-6"
          aria-label={labels.mobileNav}
        >
          {nav.map((n, i) => (
            <motion.div
              key={`m-${n.label}-${n.href}`}
              initial={false}
              animate={
                mobileOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: isAr ? 12 : -12 }
              }
              transition={{ duration: 0.3, delay: mobileOpen ? 0.08 + i * 0.05 : 0, ease: "easeOut" }}
            >
              <Link
                to={n.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-full px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {n.label}
              </Link>
              {n.children.length > 0 && (
                <ul className="ms-4 mt-1 space-y-1 border-s border-border/60 ps-3">
                  {n.children.map((c) => (
                    <li key={`m-${c.label}-${c.href}`}>
                      <Link
                        to={c.href}
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}

          {showAccount && (
            <Link
              to="/account"
              onClick={() => setMobileOpen(false)}
              className="mt-3 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-primary-foreground transition-all duration-300 hover:shadow-[0_0_16px_hsl(var(--primary)/0.35)] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              style={{ background: "hsl(var(--primary))" }}
            >
              <User size={16} aria-hidden="true" />
              {labels.account}
            </Link>
          )}
        </nav>
      </aside>
    </div>
  );
};

export default BoutiqueHeader;
