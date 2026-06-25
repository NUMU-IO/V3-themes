"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  Link,
  useCart,
  useCollections,
  useLocale,
  useNavigation,
  useResolvedSettings,
  useShop,
  useThemeSettings,
} from "@numueg/theme-sdk";
import { Menu, Search, ShoppingCart, User, X } from "lucide-react";
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
 * lux-header — faithful V3 port of V2 LuxStoreHeader
 * (numu-egyptian-bazaar/src/components/store/luxury-minimal/LuxStoreHeader.tsx).
 *
 * A STICKY, monochrome, airy header (`lux-header sticky top-0 z-50`: white bg,
 * single hairline `border-border`). Optional small announcement bar
 * (`py-1.5 text-center text-[9px] uppercase tracking-[0.3em]`, configurable
 * bg/text colour). Four layout bodies ported verbatim from V2:
 *   - logo-center (DEFAULT): mobile hamburger on the start, logo CENTERED
 *     (image if set, else the store name in `lux-heading text-foreground
 *     text-lg`), actions on the end; below, a centered desktop nav row.
 *   - logo-left / stacked / logo-right.
 * Actions: search → /search, account → /account, cart → /cart with a tiny
 * count badge (`bg-foreground text-background rounded-full`). The V2
 * ThemeSwitcher is dropped (V2-only).
 *
 * Settings: brand_name, logo_url, header_layout, show_announcement,
 * announcement_text, announcement_color, announcement_text_color, show_search,
 * show_cart. Nav links come from `nav_item` blocks → fall back to the store's
 * collections (V2 lux nav was category links).
 */
export default function LuxHeader({ instance, sectionId }: SectionRenderProps) {
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

  // Merchant-chosen logo appearance. `none` keeps the original artwork
  // (object-contain, no crop); square/rounded/circle/triangle crop the logo
  // into that shape (object-cover in a 1:1 box). A plain <img> renders the
  // source as-is, so animated GIF logos keep spinning under every shape.
  const { className: logoClass, style: logoStyle } = logoImgProps(
    asString(s.logo_shape) || "none",
    asString(s.logo_size) || "small",
  );

  const announcement = asString(s.announcement_text);
  const showAnnouncement = (s.show_announcement as boolean) !== false;
  const showSearch = (s.show_search as boolean) !== false;
  const showCart = (s.show_cart as boolean) !== false;
  const headerLayout = asString(s.header_layout) || "logo-center";
  const announcementColor = asString(s.announcement_color);
  const announcementTextColor = asString(s.announcement_text_color);

  // Nav source priority (§5 hide-page → hide-nav-link):
  //   1. the merchant's `main-menu` (hub Navigation manager) via useNavigation —
  //      the SDK drops items whose target CMS page is unpublished/deleted, so a
  //      hidden page's link disappears automatically;
  //   2. theme `nav_item` blocks (explicit per-theme override);
  //   3. the store's collections (V2 lux nav was category links — in V3 those
  //      are `/collections/{slug}`).
  const mainMenu = useNavigation("main-menu");
  const navBlocks = readBlocks(instance, "nav_item");
  const nav: NavItem[] =
    mainMenu.items.length > 0
      ? mainMenu.items
          .map((i) => ({ label: i.title, href: i.url || "/" }))
          .filter((n) => n.label)
      : navBlocks.length > 0
        ? navBlocks
            .map((r) => ({ label: asString(r.label), href: asString(r.href) || "/" }))
            .filter((n) => n.label)
        : collections.map((cat) => ({
            label: cat.name,
            href: `/collections/${cat.slug}`,
          }));

  const [menuOpen, setMenuOpen] = useState(false);
  const itemCount = cart?.items?.reduce((n, it) => n + it.quantity, 0) ?? 0;

  /* ── Reusable pieces (ported from V2 LuxStoreHeader) ── */

  const logoSmall: ReactNode = logoUrl ? (
    <img src={logoUrl} alt={brandName} className={logoClass} style={logoStyle} />
  ) : (
    <span className="lux-heading text-foreground text-lg">
      <InlineEditable sectionId={sectionId} settingKey="brand_name" value={brandName} />
    </span>
  );

  const logoWithName = (
    <Link to="/" className="flex items-center gap-2" aria-label={brandName}>
      {logoSmall}
    </Link>
  );

  const logoOnly = (
    <Link to="/" className="flex items-center" aria-label={brandName}>
      {logoSmall}
    </Link>
  );

  const desktopNav = (
    <nav className="hidden md:flex items-center gap-8">
      {nav.map((link, i) => (
        <Link key={`${link.label}-${i}`} to={link.href} className="lux-nav-link">
          {link.label}
        </Link>
      ))}
    </nav>
  );

  const menuButton = (
    <button
      type="button"
      onClick={() => setMenuOpen(!menuOpen)}
      className="md:hidden p-2 text-muted-foreground"
      aria-label="Menu"
      aria-expanded={menuOpen}
    >
      {menuOpen ? <X size={18} /> : <Menu size={18} />}
    </button>
  );

  const centerNav = (
    <div className="hidden md:flex items-center justify-center gap-8 h-10">
      {nav.map((link, i) => (
        <Link key={`c-${link.label}-${i}`} to={link.href} className="lux-nav-link">
          {link.label}
        </Link>
      ))}
    </div>
  );

  const actionsGroup = (
    <div className="flex items-center gap-4">
      {showSearch && (
        <Link
          to="/search"
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Search"
        >
          <Search size={16} />
        </Link>
      )}
      <Link
        to="/account"
        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Account"
      >
        <User size={16} />
      </Link>
      {showCart && (
        <Link
          to="/cart"
          className="relative p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`Cart (${itemCount})`}
        >
          <ShoppingCart size={16} />
          {itemCount > 0 && (
            <span className="absolute -top-1 -end-1.5 w-3.5 h-3.5 flex items-center justify-center bg-foreground text-background text-[8px] font-medium rounded-full">
              {itemCount}
            </span>
          )}
        </Link>
      )}
    </div>
  );

  /* ── Layout renderers (ported verbatim from V2) ── */

  const renderHeaderBody = () => {
    switch (headerLayout) {
      case "logo-left":
        return (
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between min-h-[3.5rem] py-2 border-b border-border">
              {actionsGroup}
              {desktopNav}
              <div className="flex items-center gap-3">
                {logoWithName}
                {menuButton}
              </div>
            </div>
          </div>
        );

      case "stacked":
        return (
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-3 items-center min-h-[3.5rem] border-b border-border">
              <div className="flex items-center justify-start">{menuButton}</div>
              <div className="flex items-center justify-center py-2">{logoWithName}</div>
              <div className="flex items-center justify-end">{actionsGroup}</div>
            </div>
            <div className="hidden md:flex items-center justify-center gap-8 h-10 border-b border-border">
              {nav.map((link, i) => (
                <Link key={`st-${link.label}-${i}`} to={link.href} className="lux-nav-link">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        );

      case "logo-right":
        return (
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between min-h-[3.5rem] py-2 border-b border-border">
              <div className="flex items-center gap-3">
                {menuButton}
                {logoWithName}
              </div>
              {desktopNav}
              {actionsGroup}
            </div>
          </div>
        );

      case "logo-center":
      default:
        return (
          <div className="container mx-auto px-4">
            {/* 3-column grid keeps the logo perfectly centered while letting it
                sit in normal flow, so a larger circle/rounded logo grows the row
                (min-height) instead of spilling over the border into the nav. */}
            <div className="grid grid-cols-3 items-center min-h-[3.5rem] border-b border-border">
              <div className="flex items-center justify-start">{menuButton}</div>
              <div className="flex items-center justify-center py-2">{logoOnly}</div>
              <div className="flex items-center justify-end">{actionsGroup}</div>
            </div>
            {centerNav}
          </div>
        );
    }
  };

  return (
    <header className="lux-header sticky top-0 z-50" data-lux-section={sectionId}>
      {/* Announcement bar */}
      {showAnnouncement && announcement && (
        <div
          className="py-1.5 text-center text-[9px] uppercase tracking-[0.3em]"
          style={{
            backgroundColor: announcementColor || "hsl(var(--announcement-bg))",
            color: announcementTextColor || "hsl(var(--announcement-fg))",
          }}
        >
          <InlineEditable
            sectionId={sectionId}
            settingKey="announcement_text"
            value={announcement}
          />
        </div>
      )}

      {renderHeaderBody()}

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border px-4 py-4 space-y-3 bg-background">
          {nav.map((link, i) => (
            <Link
              key={`mob-${link.label}-${i}`}
              to={link.href}
              onClick={() => setMenuOpen(false)}
              className="block lux-nav-link py-1"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/account"
            onClick={() => setMenuOpen(false)}
            className="block lux-nav-link py-1"
          >
            {localized(locale, "Account", "حسابي")}
          </Link>
        </div>
      )}
    </header>
  );
}

/**
 * Logo <img> className + style for the merchant-chosen shape and size.
 * `none` keeps the original artwork (height-only, object-contain); square /
 * rounded / circle / triangle crop a 1:1 box with object-cover. All class
 * strings are literal so Tailwind's JIT keeps them in the build. Triangle has
 * no Tailwind utility, so it uses an inline clip-path.
 */
function logoImgProps(
  shape: string,
  size: string,
): { className: string; style?: CSSProperties } {
  if (shape === "none" || !shape) {
    const h = size === "large" ? "h-12" : size === "medium" ? "h-9" : "h-7";
    return { className: `${h} object-contain` };
  }
  // Circle and rounded only reveal the inscribed disc, so they read smaller
  // than a square/triangle at the same box — give them a larger frame so the
  // logo stays legible.
  const rounded = shape === "circle" || shape === "rounded";
  const box = rounded
    ? size === "large"
      ? "h-20 w-20"
      : size === "medium"
        ? "h-16 w-16"
        : "h-12 w-12"
    : size === "large"
      ? "h-14 w-14"
      : size === "medium"
        ? "h-10 w-10"
        : "h-8 w-8";
  const base = `${box} object-cover`;
  switch (shape) {
    case "circle":
      return { className: `${base} rounded-full` };
    case "rounded":
      return { className: `${base} rounded-lg` };
    case "triangle":
      return {
        className: base,
        style: { clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" },
      };
    case "square":
    default:
      return { className: base };
  }
}
