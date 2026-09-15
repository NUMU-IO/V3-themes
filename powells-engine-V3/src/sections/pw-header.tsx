/**
 * pw-header — the announcement strip, the masthead and the menu row.
 *
 * The masthead is one band: the shop's mark on the inline-start edge, a wide
 * search field in the middle, and the shopper's own controls on the
 * inline-end edge — wishlist (with its count), account, and a cart pill that
 * shows the running total. The menu sits in a quieter row beneath.
 *
 * The shop's mark is the Powells lockup — the store name set large in caps
 * with the line beneath it, between two mirrored vines — unless the merchant
 * uploads a logo in THIS section. The store-level logo is deliberately not
 * used: it is often a profile photo, not a wordmark, and it replaced the name
 * on live stores.
 *
 * Navigation comes from merchant blocks when the merchant has added any, and
 * falls back to the store's own menu (`useNavigation`) otherwise. On narrow
 * screens the menu row collapses into a drawer behind a menu button and the
 * search field drops to its own row. The cart pill is a real link to /cart that
 * opens the cart drawer once JavaScript is running; the wishlist heart opens
 * the wishlist drawer, because the platform has no wishlist page.
 *
 * The announcement strip is merchant blocks above the masthead. Scrolling
 * renders the messages twice and slides the track by half its width, so the
 * loop has no seam. The duplicate is hidden from assistive tech and
 * unfocusable; the loop pauses on hover and focus; reduced motion shows the
 * messages still. Outside the marketplace demo, no blocks means no strip.
 *
 * ⚠ The masthead is global chrome, so it renders on `/cart`, `/checkout` and
 * `/account` too — routes the host ships NO page data for. Nothing in here may
 * read `page.data`; cart and wishlist state come from their own hooks.
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  Image,
  Link,
  Money,
  requestNavigate,
  useCart,
  useNavigation,
  useResolvedSettings,
  useSearch,
  useShop,
  type Product,
} from "@numueg/theme-sdk";
import {
  asBool,
  asImageUrl,
  asNumber,
  asString,
  isInlineImage,
  productAuthor,
  productImages,
  readBlockNodes,
  useDemo,
  useOrnaments,
  type SectionRenderProps,
} from "../lib/shared";
import { fill, useT } from "../lib/i18n";
import { Drawer, setCartDrawer } from "../lib/cart-drawer";
import { setWishlistDrawer, useShopWishlist } from "../lib/wishlist";
import {
  IconCart,
  IconChevron,
  IconHeart,
  IconMenu,
  IconSearch,
  IconUser,
  LogoSprig,
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
  const ornaments = useOrnaments();
  const { cart } = useCart();
  const wishlist = useShopWishlist();
  const { items: menuItems } = useNavigation(asString(s.menu_handle) || "main-menu");

  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const storeName = asString(s.brand_name) || shop?.name || "";
  const strapline = asString(s.strapline);
  const logo = asImageUrl(s.logo);
  const showName = !logo || asBool(s.show_name_with_logo, false);
  const showSearch = asBool(s.show_search, true);
  const showCart = asBool(s.show_cart, true);
  const showWishlist = asBool(s.show_wishlist, true);
  const showAccount = asBool(s.show_account, true);

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
  // Cart money is MAJOR units — never divide.
  const cartTotal = cart?.total ?? cart?.subtotal ?? 0;
  const wishCount = wishlist.items.length;

  /**
   * Live results under the search field.
   *
   * Predictive mode, so the SDK debounces keystrokes and the endpoint caps the
   * list — six books is a dropdown, not a results page, and the last row always
   * offers the full page. Two characters before it opens: one letter matches
   * half the shop and the list would flicker on every key.
   */
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const searchRef = useRef<HTMLFormElement>(null);
  const term = query.trim();
  const wantsSuggest = suggestOpen && term.length >= 2;
  const { results, loading: searching } = useSearch(wantsSuggest ? term : "", {
    mode: "predictive",
    types: ["products"],
    limit: 6,
  });
  const hits: Product[] = wantsSuggest ? (results?.products ?? []) : [];
  const listId = `pw-suggest-${instance.type}`;
  const hrefOf = (product: Product) => `/products/${product.slug ?? product.id}`;

  useEffect(() => {
    if (!suggestOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [suggestOpen]);

  const go = (href: string) => {
    setSuggestOpen(false);
    setActive(-1);
    if (!requestNavigate(href) && typeof window !== "undefined") window.location.assign(href);
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!term) return;
    go(`/search?q=${encodeURIComponent(term)}`);
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setSuggestOpen(false);
      return;
    }
    if (hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestOpen(true);
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? hits.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0 && hits[active]) {
      e.preventDefault();
      go(hrefOf(hits[active]));
    }
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
        <div className="pw-band-inner">
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

          <Link to="/" className="pw-logo" aria-label={storeName}>
            {logo && (
              <span className="pw-logo-img">
                <Image src={logo} alt={showName ? "" : storeName} responsive={!isInlineImage(logo)} priority />
              </span>
            )}
            {showName && (
              <>
                {/* One drawing, mirrored — two hand-authored vines would drift. */}
                {ornaments && !logo && (
                  <span className="pw-logo-vine" aria-hidden="true">
                    <LogoSprig size={46} />
                  </span>
                )}
                <span className="pw-logo-type">
                  <span className="pw-wordmark">{storeName}</span>
                  {strapline && (
                    <span className="pw-sub">
                      {strapline
                        .split(/(\s+of\s+)/i)
                        .map((part, i) => (/^\s+of\s+$/i.test(part) ? <i key={i}> of </i> : part))}
                    </span>
                  )}
                </span>
                {ornaments && !logo && (
                  <span className="pw-logo-vine flipped" aria-hidden="true">
                    <LogoSprig size={46} />
                  </span>
                )}
              </>
            )}
          </Link>

          {showSearch && (
            <form ref={searchRef} className="pw-search" role="search" onSubmit={onSearch}>
              <label className="pw-sr" htmlFor={`pw-q-${instance.type}`}>
                {t("search.label", "Search for books")}
              </label>
              <button type="submit" aria-label={t("search.submit", "Search")}>
                <IconSearch size={19} />
              </button>
              <input
                id={`pw-q-${instance.type}`}
                type="search"
                role="combobox"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={wantsSuggest}
                aria-controls={listId}
                aria-activedescendant={active >= 0 && hits[active] ? `${listId}-${active}` : undefined}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(-1);
                  setSuggestOpen(true);
                }}
                onFocus={() => setSuggestOpen(true)}
                onKeyDown={onSearchKey}
                placeholder={
                  asString(s.search_placeholder) ||
                  t("search.placeholder", "Search for books, authors, titles...")
                }
              />

              {wantsSuggest && (
                <div className="pw-suggest" id={listId} role="listbox" aria-label={t("search.suggestions", "Suggestions")}>
                  {hits.length === 0 ? (
                    <p className="pw-suggest-empty">
                      {searching
                        ? t("search.searching", "Searching…")
                        : t("search.no_results", "No books matched that search.")}
                    </p>
                  ) : (
                    hits.map((product, i) => {
                      const cover = productImages(product)[0];
                      const author = productAuthor(product);
                      const raw = product as unknown as Record<string, unknown>;
                      return (
                        <Link
                          key={product.id}
                          id={`${listId}-${i}`}
                          role="option"
                          aria-selected={i === active}
                          className="pw-suggest-row"
                          to={hrefOf(product)}
                          onClick={() => setSuggestOpen(false)}
                          onMouseEnter={() => setActive(i)}
                        >
                          {cover ? (
                            <Image src={cover} alt="" responsive={false} loading="lazy" />
                          ) : (
                            <span className="pw-blank" />
                          )}
                          <span>
                            <span className="pw-suggest-title">{product.name}</span>
                            {author && (
                              <span className="pw-suggest-by">{`${t("product.by", "by")} ${author}`}</span>
                            )}
                          </span>
                          <span className="pw-suggest-price">
                            <Money
                              amount={Number(product.price ?? 0)}
                              currency={asString(raw.price_currency) || product.currency}
                            />
                          </span>
                        </Link>
                      );
                    })
                  )}
                  <button type="submit" className="pw-suggest-all">
                    {fill(t("search.see_all", "See all results for “{{q}}”"), { q: term })}
                  </button>
                </div>
              )}
            </form>
          )}

          <div className="pw-actions">
            {showWishlist && (
              <button
                type="button"
                className="pw-iconbtn"
                aria-label={`${t("nav.wishlist", "Wishlist")} (${wishCount})`}
                aria-haspopup="dialog"
                onClick={() => setWishlistDrawer(true)}
              >
                <IconHeart size={19} />
                {wishCount > 0 && (
                  <span className="pw-count-badge" aria-hidden="true">
                    {wishCount}
                  </span>
                )}
              </button>
            )}
            {showAccount && (
              <Link to="/account" className="pw-iconbtn pw-account-btn" aria-label={t("nav.account", "My account")}>
                <IconUser />
              </Link>
            )}
            {showCart && (
              <Link
                to="/cart"
                className="pw-cartpill"
                aria-label={`${t("nav.cart", "Cart")} (${itemCount})`}
                onClick={openCart}
              >
                <IconCart size={18} />
                <span className="amt">
                  <Money amount={cartTotal} currency={cart?.currency} />
                </span>
                <span className="pw-count-badge" aria-hidden="true">
                  {itemCount}
                </span>
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
                {link.hasChildren && <IconChevron size={10} />}
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
