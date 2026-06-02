"use client";

import { Fragment, useEffect, useState } from "react";
import { Link, useCart, useNavigation, useResolvedSettings, useShop, useThemeSettings } from "@numueg/theme-sdk";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { asImageUrl, asString, resolveBlocks, useBlockResolveContext, type SectionRenderProps } from "./_shared";

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

const DEFAULT_NAV: NavItem[] = [
  { label: "Products", href: "/products" },
  { label: "About us", href: "/about" },
  { label: "Testimonial", href: "/testimonial" },
  { label: "Contact", href: "/contact" },
];

/** Map an SDK `useNavigation` item (localized `title` + resolved `url` +
 *  nested `children`) onto the header's local NavItem shape. */
function toNavItem(item: {
  title: string;
  url: string;
  children?: Array<{ title: string; url: string; children?: unknown[] }>;
}): NavItem {
  return {
    label: item.title,
    href: item.url || "/",
    children: (item.children ?? []).map((c) =>
      toNavItem(c as Parameters<typeof toNavItem>[0]),
    ),
  };
}

/**
 * A single primary-nav entry. Renders a hover/focus-revealed dropdown when
 * the menu item has children (multi-level menus from the Navigation
 * manager). Styling stays in the Bon Younes palette via CSS custom props,
 * so no extra stylesheet rule is needed.
 */
function HeaderNavItem({ node }: { node: NavItem }) {
  const [open, setOpen] = useState(false);
  const children = node.children ?? [];
  if (children.length === 0) {
    return <Link to={node.href}>{node.label}</Link>;
  }
  return (
    <span
      className="by-header-navitem"
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <Link
        to={node.href}
        aria-haspopup="true"
        aria-expanded={open}
        onFocus={() => setOpen(true)}
      >
        {node.label}
      </Link>
      {open && (
        <span
          role="menu"
          style={{
            position: "absolute",
            insetBlockStart: "100%",
            insetInlineStart: 0,
            minWidth: "12rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.15rem",
            padding: "0.5rem",
            background: "var(--by-paper, #fffaf2)",
            border: "1px solid var(--by-line, rgba(58,36,24,0.14))",
            borderRadius: "0.6rem",
            boxShadow: "0 12px 30px rgba(31,20,13,0.16)",
            zIndex: 60,
          }}
        >
          {children.map((c) => (
            <Link
              key={`${c.label}-${c.href}`}
              to={c.href}
              role="menuitem"
              style={{ whiteSpace: "nowrap", padding: "0.35rem 0.5rem" }}
            >
              {c.label}
            </Link>
          ))}
        </span>
      )}
    </span>
  );
}

export default function ByHeader({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const { cart } = useCart();
  const themeSettings = useThemeSettings();
  const blkCtx = useBlockResolveContext();

  const brandName =
    asString(s.brand_name) ||
    asString(themeSettings.global_settings?.brand_name) ||
    shop?.name ||
    "Bon Younes";

  const brandTagline =
    asString(s.brand_tagline) ||
    asString(themeSettings.global_settings?.brand_name_ar) ||
    "Specialty coffee";

  // Single source of truth for the logo: the Theme-Settings global logo
  // (with the store's own logo as the API fallback). There is intentionally
  // NO section-level logo control — the footer points at this same source —
  // so the merchant edits the logo in exactly one place and it syncs
  // everywhere.
  const logoUrl =
    asImageUrl(themeSettings.global_settings?.logo_url) ||
    shop?.logo_url ||
    "";
  const monogram = asString(s.brand_monogram) || "BY";

  // Phase 2.4 — prefer the merchant-managed menu (Online Store →
  // Navigation, chosen via the `nav_menu_handle` link_list setting); fall
  // back to legacy `nav_item` blocks, then DEFAULT_NAV. The host injects
  // menus into NuMuProvider, so this resolves with no client round-trip.
  const navMenuHandle = asString(s.nav_menu_handle) || "main-menu";
  const { items: menuItems } = useNavigation(navMenuHandle);

  const navBlocks = resolveBlocks(instance, "nav_item", blkCtx);
  const nav: NavItem[] =
    menuItems.length > 0
      ? menuItems.map(toNavItem)
      : navBlocks.length > 0
        ? navBlocks
            .map((r) => ({
              label: asString(r.label),
              href: asString(r.href) || "/",
            }))
            .filter((n) => n.label)
        : DEFAULT_NAV;

  const showSearch = (s.show_search as boolean) !== false;
  const showCart = (s.show_cart as boolean) !== false;

  const [mobileOpen, setMobileOpen] = useState(false);
  const itemCount = cart?.items?.reduce((n, it) => n + it.quantity, 0) ?? 0;

  // Close mobile panel on viewport resize so navigation looks correct
  // if the user rotates / resizes mid-session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const close = () => setMobileOpen(false);
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, []);

  // Lock body scroll when the mobile panel is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <header className="by-header" data-by-section={sectionId}>
      <div className="by-shell by-header-row">
        <button
          type="button"
          className="by-header-icon-btn by-header-burger"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={20} />
        </button>

        <Link to="/" className="by-header-brand" aria-label={brandName}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="by-header-brand-mark"
              style={{ background: "transparent", objectFit: "cover" }}
              width={36}
              height={36}
            />
          ) : (
            <span className="by-header-brand-mark" aria-hidden="true">
              {monogram}
            </span>
          )}
          <span className="by-header-brand-text">
            <span>{brandName}</span>
            {brandTagline && (
              <span className="by-header-brand-sub">{brandTagline}</span>
            )}
          </span>
        </Link>

        <nav className="by-header-nav" aria-label="Primary">
          {nav.map((n) => (
            <HeaderNavItem key={`${n.label}-${n.href}`} node={n} />
          ))}
        </nav>

        <div className="by-header-actions">
          {showSearch && (
            <Link
              to="/search"
              className="by-header-icon-btn"
              aria-label="Search"
            >
              <Search size={18} />
            </Link>
          )}
          {showCart && (
            <Link
              to="/cart"
              className="by-header-icon-btn"
              aria-label={`Cart (${itemCount} items)`}
            >
              <ShoppingBag size={18} />
              {itemCount > 0 && (
                <span className="by-header-cart-count">{itemCount}</span>
              )}
            </Link>
          )}
        </div>
      </div>

      <div
        className={`by-mobile-panel ${mobileOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!mobileOpen}
        {...(mobileOpen ? {} : { inert: "" })}
      >
        <div className="by-mobile-panel-head">
          <span className="by-header-brand">
            <span className="by-header-brand-mark" aria-hidden="true">{monogram}</span>
            <span className="by-header-brand-text">
              <span>{brandName}</span>
              <span className="by-header-brand-sub">{brandTagline}</span>
            </span>
          </span>
          <button
            type="button"
            className="by-header-icon-btn"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="by-mobile-panel-nav" aria-label="Mobile primary">
          {nav.map((n) => (
            <Fragment key={`mob-${n.label}-${n.href}`}>
              <Link to={n.href} onClick={() => setMobileOpen(false)}>
                {n.label}
              </Link>
              {n.children?.map((c) => (
                <Link
                  key={`mob-${n.label}-${c.label}-${c.href}`}
                  to={c.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    paddingInlineStart: "1.25rem",
                    opacity: 0.8,
                    fontSize: "0.95em",
                  }}
                >
                  {c.label}
                </Link>
              ))}
            </Fragment>
          ))}
        </nav>
      </div>
    </header>
  );
}
