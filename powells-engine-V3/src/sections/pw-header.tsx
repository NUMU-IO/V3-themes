/**
 * pw-header — the masthead and the navigation row.
 *
 * Two bands, and the split is deliberate: the lavender masthead carries
 * identity and search, the pale row below carries only navigation. That is
 * what makes a bookshop header feel like a shopfront sign over a shelf label
 * rather than one dense toolbar.
 *
 * Navigation comes from merchant blocks when the merchant has added any, and
 * falls back to the store's own menu (`useNavigation`) otherwise — so a store
 * that has never opened the customizer still gets its real menu rather than
 * this theme's invented one.
 *
 * ⚠ The masthead is global chrome, so it renders on `/cart`, `/checkout` and
 * `/account` too — routes the host ships NO page data for. Nothing in here may
 * read `page.data`; the cart count comes from `useCart`, which fetches for
 * itself.
 */

import { useState, type FormEvent } from "react";
import {
  Link,
  requestNavigate,
  useCart,
  useNavigation,
  useResolvedSettings,
  useShop,
} from "@numueg/theme-sdk";
import { asBool, asString, readBlockNodes, useOrnaments, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { IconCart, IconChevron, IconSearch, LogoSprig, Storefront, Twinkle } from "../lib/ornaments";

export default function PwHeader({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const shop = useShop();
  const { cart } = useCart();
  const { items: menuItems } = useNavigation(asString(s.menu_handle) || "main-menu");
  const ornaments = useOrnaments();

  const [query, setQuery] = useState("");

  const storeName = asString(s.brand_name) || shop?.name || "";
  const established = asString(s.established);
  const strapline = asString(s.strapline);
  const tagline = asString(s.tagline);
  const showSearch = asBool(s.show_search, true);
  const showCart = asBool(s.show_cart, true);

  const blockLinks = readBlockNodes(instance, "nav_item").map((b) => ({
    label: asString(b.settings.label),
    href: asString(b.settings.link) || "/",
    hasChildren: asBool(b.settings.show_caret, false),
  }));
  const links =
    blockLinks.length > 0
      ? blockLinks
      : (menuItems ?? []).map((item) => ({
          label: item.title ?? "",
          href: item.url ?? "/",
          hasChildren: Boolean(item.children?.length),
        }));

  const itemCount = cart?.items?.reduce((n, i) => n + (i.quantity ?? 0), 0) ?? 0;

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    requestNavigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header>
      <div className="pw-band">
        <div className="pw-band-inner">
          <Link to="/" className="pw-logo">
            {/* One drawing, mirrored — two hand-authored vines would drift. */}
            {ornaments && (
              <span className="pw-logo-vine">
                <LogoSprig size={62} />
              </span>
            )}
            <span className="pw-logo-type">
              {established && <span className="pw-est">{`→  ${established}  ←`}</span>}
              <span className="pw-wordmark">{storeName}</span>
              {strapline && <span className="pw-sub">{strapline}</span>}
            </span>
            {ornaments && (
              <span className="pw-logo-vine flipped">
                <LogoSprig size={62} />
              </span>
            )}
          </Link>

          {showSearch ? (
            <form className="pw-search" role="search" onSubmit={onSearch}>
              <label className="pw-sr" htmlFor={`pw-q-${instance.type}`}>
                {t("search.label", "Search for books")}
              </label>
              <input
                id={`pw-q-${instance.type}`}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  asString(s.search_placeholder) ||
                  t("search.placeholder", "Search for books, authors, titles...")
                }
              />
              <button type="submit" aria-label={t("search.submit", "Search")}>
                <IconSearch />
              </button>
            </form>
          ) : (
            <span />
          )}

          <div className="pw-band-art" style={{ color: "var(--pw-ink-soft)" }}>
            {ornaments && tagline && (
              <span className="pw-tagline">
                {/* The strapline is written as one string with line breaks so a
                    merchant controls where it wraps — this is set at a rakish
                    angle and an automatic wrap lands wrong every time. */}
                {tagline.split("\n").map((line, i) => (
                  <span key={`${line}-${i}`} style={{ display: "block" }}>
                    {line}
                  </span>
                ))}
              </span>
            )}
            {ornaments && (
              <>
                <span className="pw-storefront">
                  <Storefront signText={storeName} width={430} />
                </span>
                <span className="pw-twinkle">
                  <Twinkle size={40} />
                </span>
              </>
            )}
            {showCart && (
              <Link to="/cart" className="pw-cartpill">
                <IconCart />
                {t("nav.cart", "Cart")} <b>({itemCount})</b>
              </Link>
            )}
          </div>
        </div>
      </div>

      {links.length > 0 && (
        <nav className="pw-nav" aria-label={t("collection.browse", "Browse")}>
          <div className="pw-nav-inner">
            {links.map((link, i) => (
              <Link key={`${link.href}-${i}`} to={link.href}>
                {link.label}
                {link.hasChildren && <IconChevron size={11} />}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
