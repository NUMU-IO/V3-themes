/**
 * pw-header — the announcement strip, the masthead and the navigation row.
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
 * On narrow screens the storefront art (and the cart pill drawn into it) is
 * hidden and the navigation row collapses, so the masthead grows a menu button
 * and a cart button of its own. Both cart entry points are real links to
 * /cart that open the cart drawer instead once JavaScript is running.
 *
 * The announcement strip is merchant blocks above the masthead. Scrolling
 * renders the messages twice and slides the track by half its width, so the
 * copy lands exactly where the original started and the loop has no seam. The
 * duplicate is hidden from assistive tech and unfocusable; the loop pauses on
 * hover and focus; reduced motion (the OS setting or the theme's own switch)
 * shows the messages still. Outside the marketplace demo, no blocks means no
 * strip — this theme never invents an offer for a real store.
 *
 * ⚠ The masthead is global chrome, so it renders on `/cart`, `/checkout` and
 * `/account` too — routes the host ships NO page data for. Nothing in here may
 * read `page.data`; the cart count comes from `useCart`, which fetches for
 * itself.
 */

import { useState, type CSSProperties, type FormEvent, type MouseEvent } from "react";
import {
  Link,
  requestNavigate,
  useCart,
  useNavigation,
  useResolvedSettings,
  useShop,
} from "@numueg/theme-sdk";
import {
  asBool,
  asNumber,
  asString,
  readBlockNodes,
  useDemo,
  useOrnaments,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { Drawer, setCartDrawer } from "../lib/cart-drawer";
import {
  IconCart,
  IconChevron,
  IconMenu,
  IconSearch,
  LogoSprig,
  Storefront,
  Twinkle,
} from "../lib/ornaments";

interface NavLink {
  label: string;
  href: string;
  hasChildren: boolean;
  children: Array<{ label: string; href: string }>;
}

interface Message {
  text: string;
  link: string;
}

function MessageText({ text, link, hidden = false }: Message & { hidden?: boolean }) {
  const tabIndex = hidden ? -1 : undefined;
  if (!link) return <>{text}</>;
  if (/^https?:\/\//.test(link)) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" tabIndex={tabIndex}>
        {text}
      </a>
    );
  }
  return (
    <Link to={link} tabIndex={tabIndex}>
      {text}
    </Link>
  );
}

export default function PwHeader({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const shop = useShop();
  const demo = useDemo();
  const { cart } = useCart();
  const { items: menuItems } = useNavigation(asString(s.menu_handle) || "main-menu");
  const ornaments = useOrnaments();

  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const storeName = asString(s.brand_name) || shop?.name || "";
  const established = asString(s.established);
  const strapline = asString(s.strapline);
  const tagline = asString(s.tagline);
  const showSearch = asBool(s.show_search, true);
  const showCart = asBool(s.show_cart, true);

  const blockMessages: Message[] = readBlockNodes(instance, "announcement")
    .map((b) => ({ text: asString(b.settings.text), link: asString(b.settings.link) }))
    .filter((m) => m.text);
  const messages: Message[] =
    blockMessages.length > 0
      ? blockMessages
      : demo
        ? [
            { text: t("announce.demo_1", "New arrivals on the shelves every week"), link: "/products" },
            { text: t("announce.demo_2", "Staff picks, hand-chosen by our booksellers"), link: "" },
          ]
        : [];
  const scroll = asBool(s.announcement_scroll, true);
  const loopSeconds = asNumber(s.announcement_speed, 35);

  const blockLinks: NavLink[] = readBlockNodes(instance, "nav_item").map((b) => ({
    label: asString(b.settings.label),
    href: asString(b.settings.link) || "/",
    hasChildren: asBool(b.settings.show_caret, false),
    children: [],
  }));
  const links: NavLink[] =
    blockLinks.length > 0
      ? blockLinks
      : (menuItems ?? []).map((item) => ({
          label: item.title ?? "",
          href: item.url ?? "/",
          hasChildren: Boolean(item.children?.length),
          children: (item.children ?? []).map((child) => ({
            label: child.title ?? "",
            href: child.url ?? "/",
          })),
        }));

  const itemCount = cart?.items?.reduce((n, i) => n + (i.quantity ?? 0), 0) ?? 0;
  const cartLabel = `${t("nav.cart", "Cart")} (${itemCount})`;

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    requestNavigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const openCart = (e: MouseEvent) => {
    e.preventDefault();
    setCartDrawer(true);
  };
  const closeMenu = () => setMenuOpen(false);

  return (
    <header>
      {messages.length > 0 && (
        <div
          className="pw-announce"
          data-scroll={scroll ? "on" : "off"}
          style={{ "--pw-announce-duration": `${loopSeconds}s` } as CSSProperties}
        >
          {scroll ? (
            <div className="pw-announce-track">
              <ul className="pw-announce-group" aria-label={t("announce.label", "Announcements")}>
                {messages.map((m, i) => (
                  <li key={i}>
                    <MessageText {...m} />
                  </li>
                ))}
              </ul>
              <ul className="pw-announce-group" aria-hidden="true">
                {messages.map((m, i) => (
                  <li key={i}>
                    <MessageText {...m} hidden />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="pw-announce-group static" aria-label={t("announce.label", "Announcements")}>
              {messages.map((m, i) => (
                <li key={i}>
                  <MessageText {...m} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="pw-band">
        {links.length > 0 && (
          <button
            type="button"
            className="pw-iconbtn pw-menu-btn"
            aria-label={t("nav.menu", "Menu")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <IconMenu />
          </button>
        )}
        {showCart && (
          <Link to="/cart" className="pw-iconbtn pw-cart-btn" aria-label={cartLabel} onClick={openCart}>
            <IconCart size={20} />
            {itemCount > 0 && (
              <span className="pw-count-badge" aria-hidden="true">
                {itemCount}
              </span>
            )}
          </Link>
        )}

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
              <Link to="/cart" className="pw-cartpill" onClick={openCart}>
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

      {menuOpen && (
        <Drawer
          side="start"
          title={t("nav.menu", "Menu")}
          closeLabel={t("drawer.close", "Close")}
          onClose={closeMenu}
        >
          <ul className="pw-menu-list">
            {links.map((link, i) => (
              <li key={`${link.href}-${i}`}>
                <Link to={link.href} onClick={closeMenu}>
                  {link.label}
                </Link>
                {link.children.length > 0 && (
                  <ul>
                    {link.children.map((child, j) => (
                      <li key={`${child.href}-${j}`}>
                        <Link to={child.href} onClick={closeMenu}>
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            <li>
              <Link to="/account" onClick={closeMenu}>
                {t("nav.account", "My account")}
              </Link>
            </li>
          </ul>
        </Drawer>
      )}
    </header>
  );
}
