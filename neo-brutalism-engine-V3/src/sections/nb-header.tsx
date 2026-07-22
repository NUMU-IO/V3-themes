"use client";

/**
 * nb-header — Neo Brutalism chrome header.
 *
 * Identity comes straight from this theme's own tokens (src/theme.css):
 * the `.nb-header` band (primary yellow-green + 3px black bottom border),
 * `.nb-chip` / `.nb-btn` hard-offset shadows, `.nb-badge` for the cart
 * count and uppercase 800/900 type. Nothing new is invented — only the
 * chrome-specific bits (`.nb-navlink`, `.nb-dropdown`, `.nb-drawer`) are
 * added to theme.css in the same `nb-*` naming convention.
 *
 * The theme already ships a separate `nb-announcement-bar` section, so
 * this header deliberately does NOT render an announcement strip.
 */

import { useEffect, useRef, useState } from "react";
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

interface NavItem {
  label: string;
  href: string;
  children: { label: string; href: string }[];
}

const defaultNav = (locale: string | undefined): NavItem[] => [
  { label: localized(locale, "HOME", "الرئيسية"), href: "/", children: [] },
  { label: localized(locale, "SHOP", "تسوّق"), href: "/products", children: [] },
  {
    label: localized(locale, "COLLECTIONS", "التشكيلات"),
    href: "/collections",
    children: [],
  },
  { label: localized(locale, "ABOUT", "من إحنا"), href: "/about", children: [] },
  {
    label: localized(locale, "CONTACT", "كلّمنا"),
    href: "/contact",
    children: [],
  },
];

const NbHeader = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const { cart } = useCart();
  const themeSettings = useThemeSettings();
  const locale = useLocale();

  const globals = (themeSettings.global_settings ?? {}) as Record<
    string,
    unknown
  >;

  const brandName =
    asString(s.brand_name) || shop?.name || localized(locale, "STORE", "المتجر");

  const logoUrl =
    asImageUrl(s.logo_url) ||
    asImageUrl(globals.logo_url) ||
    asString(shop?.logo_url) ||
    "";

  // Engine-level logo shaping (global settings + SDK helper), same as the
  // rest of the V3 fleet. "none" keeps the original artwork.
  const logoShape = asString(globals.logo_shape) || "none";
  const logoSize = asString(globals.logo_size) || "small";
  const logoShaped = logoShape !== "none";
  const logoStyle = logoImgStyle(logoShape, logoSize);

  const sticky = s.sticky !== false;
  const showSearch = s.show_search !== false;
  const showAccount = s.show_account !== false;
  const showCart = s.show_cart !== false;

  const menuHandle = asString(s.menu_handle) || "main-menu";
  const menu = useNavigation(menuHandle);
  const nav: NavItem[] =
    menu.items.length > 0
      ? menu.items
          .map((i) => ({
            label: i.title,
            href: i.url || "/",
            children: (i.children ?? [])
              .map((c) => ({ label: c.title, href: c.url || "/" }))
              .filter((c) => c.label),
          }))
          .filter((n) => n.label)
      : defaultNav(locale);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const itemCount = cart?.items?.reduce((n, it) => n + it.quantity, 0) ?? 0;

  // ESC closes the drawer / dropdown; body scroll is locked while the
  // drawer is open and restored on close.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    if (mobileOpen) document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMobileOpen(false);
      setOpenMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  // Close the desktop dropdown on outside click.
  useEffect(() => {
    if (typeof document === "undefined" || !openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenu]);

  const drawerId = `nb-drawer-${sectionId}`;
  const cartLabel = localized(locale, "Cart", "السلة");
  const searchLabel = localized(locale, "Search", "بحث");
  const accountLabel = localized(locale, "Account", "حسابي");

  const iconLink = (to: string, label: string, icon: JSX.Element) => (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="nb-icon-btn h-10 w-10 rounded-lg flex items-center justify-center"
    >
      {icon}
    </Link>
  );

  return (
    <header
      data-nb-section={sectionId}
      className={`nb-header ${sticky ? "sticky top-0" : "relative"} z-50`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center gap-3">
        {/* Burger — mobile only */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls={drawerId}
          aria-label={localized(locale, "Open menu", "افتح القائمة")}
          className="nb-icon-btn md:hidden h-10 w-10 rounded-lg flex items-center justify-center"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Logo / wordmark */}
        <Link
          to="/"
          aria-label={brandName}
          className="flex items-center shrink-0 me-auto"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brandName}
              className={
                logoShaped
                  ? "w-auto max-h-11 nb-img-frame rounded-lg"
                  : "h-9 w-auto max-h-11 object-contain nb-img-frame rounded-lg bg-white p-0.5"
              }
              style={
                logoShaped
                  ? { ...logoStyle, width: "auto", aspectRatio: "1 / 1" }
                  : logoStyle
              }
            />
          ) : (
            <span className="nb-wordmark text-lg sm:text-xl px-2.5 py-1 rounded-lg truncate max-w-[46vw]">
              {brandName}
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden md:flex items-center gap-1.5 lg:gap-2"
          aria-label={localized(locale, "Primary", "التنقل الرئيسي")}
          ref={dropdownRef}
        >
          {nav.map((n) =>
            n.children.length > 0 ? (
              <div key={`${n.label}-${n.href}`} className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenu((cur) => (cur === n.label ? null : n.label))
                  }
                  aria-expanded={openMenu === n.label}
                  aria-controls={`nb-sub-${sectionId}-${n.label}`}
                  className="nb-navlink inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs"
                >
                  {n.label}
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <div
                  id={`nb-sub-${sectionId}-${n.label}`}
                  hidden={openMenu !== n.label}
                  className="nb-dropdown absolute top-full mt-2 start-0 min-w-[12rem] rounded-lg p-2 z-50"
                >
                  {n.children.map((c) => (
                    <Link
                      key={`${c.label}-${c.href}`}
                      to={c.href}
                      onClick={() => setOpenMenu(null)}
                      className="nb-navlink block px-3 py-2 rounded-lg text-xs"
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={`${n.label}-${n.href}`}
                to={n.href}
                className="nb-navlink px-3 py-2 rounded-lg text-xs"
              >
                {n.label}
              </Link>
            ),
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 ms-auto md:ms-3">
          {showSearch &&
            iconLink(
              "/search",
              searchLabel,
              <Search className="h-[18px] w-[18px]" aria-hidden="true" />,
            )}
          {showAccount &&
            iconLink(
              "/account",
              accountLabel,
              <User className="h-[18px] w-[18px]" aria-hidden="true" />,
            )}
          {showCart && (
            <Link
              to="/cart"
              aria-label={`${cartLabel} (${itemCount})`}
              title={cartLabel}
              className="nb-icon-btn relative h-10 w-10 rounded-lg flex items-center justify-center"
            >
              <ShoppingBag className="h-[18px] w-[18px]" aria-hidden="true" />
              {itemCount > 0 && (
                <span
                  aria-hidden="true"
                  className="nb-badge nb-badge-pink absolute -top-2 -end-2 min-w-[20px] h-5 px-1 rounded-md text-[10px] leading-none flex items-center justify-center"
                >
                  {itemCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id={drawerId}
        hidden={!mobileOpen}
        className="md:hidden nb-drawer"
      >
        <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="vn-label">
              {localized(locale, "Menu", "القائمة")}
            </span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label={localized(locale, "Close menu", "اقفل القائمة")}
              className="nb-icon-btn h-10 w-10 rounded-lg flex items-center justify-center"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <nav
            className="flex flex-col gap-2"
            aria-label={localized(locale, "Mobile", "التنقل للموبايل")}
          >
            {nav.map((n) => (
              <div key={`m-${n.label}-${n.href}`} className="flex flex-col gap-1">
                <Link
                  to={n.href}
                  onClick={() => setMobileOpen(false)}
                  className="nb-navlink px-3 py-2.5 rounded-lg text-sm"
                >
                  {n.label}
                </Link>
                {n.children.map((c) => (
                  <Link
                    key={`m-${c.label}-${c.href}`}
                    to={c.href}
                    onClick={() => setMobileOpen(false)}
                    className="nb-navlink ms-4 px-3 py-2 rounded-lg text-xs"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default NbHeader;
