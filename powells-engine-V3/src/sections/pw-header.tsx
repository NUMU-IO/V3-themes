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
 * falls back to the store's own menu (`useNavigation`) otherwise. A menu link
 * with column blocks opens a mega-menu: titled columns of links and one visual
 * tile — a photograph, or a book's own cover. It opens on hover with a short
 * grace period so a diagonal mouse path does not close it, and on click and
 * keyboard. On narrow screens the menu row collapses into a drawer and the
 * columns become groups in it.
 *
 * Search autocompletes while typing, grouped the way a reader thinks: books,
 * authors, series, collections. It reads the search route directly because the
 * SDK hook keeps only products and collections; when the route sends no author
 * group, authors are taken from the matching books themselves.
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
  useCachedResource,
  useCart,
  useNavigation,
  useResolvedSettings,
  useShop,
  type Product,
} from "@numueg/theme-sdk";
import {
  asArray,
  asBool,
  asImageUrl,
  asNumber,
  asRecord,
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
import { BookJacket } from "../lib/jacket";
import { useProductDetail } from "../lib/product-detail";
import { slugOf } from "../lib/shelf-books";
import {
  IconArrow,
  IconCart,
  IconChevron,
  IconHeart,
  IconMenu,
  IconSearch,
  IconUser,
  LogoSprig,
} from "../lib/ornaments";

interface MegaColumn {
  title: string;
  links: Array<{ label: string; href: string }>;
}

interface NavLink {
  label: string;
  href: string;
  hasChildren: boolean;
  columns: MegaColumn[];
  promo: { image: string; book: string; eyebrow: string; title: string; link: string } | null;
}

interface Message {
  text: string;
  link: string;
}

interface Suggestions {
  products: Product[];
  collections: Array<Record<string, unknown>>;
  authors: Array<Record<string, unknown>>;
  series: Array<Record<string, unknown>>;
}

type Row =
  | { kind: "book"; href: string; product: Product }
  | { kind: "author" | "series" | "collection"; href: string; label: string; count: number };

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

function PromoCover({ handle }: { handle: string }) {
  const { product } = useProductDetail(handle);
  const cover = productImages(product)[0];
  return cover ? (
    <span className="pw-mega-book">
      <Image src={cover} alt="" responsive={false} loading="lazy" />
    </span>
  ) : null;
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

  const blockLinks: NavLink[] = readBlockNodes(instance, "nav_item").map((b) => {
    const columns = readBlockNodes(b, "mega_column")
      .map((column) => ({
        title: asString(column.settings.title),
        links: readBlockNodes(column, "mega_link")
          .map((l) => ({ label: asString(l.settings.label), href: asString(l.settings.link) || "/" }))
          .filter((l) => l.label),
      }))
      .filter((column) => column.links.length > 0);
    const promo = {
      image: asImageUrl(b.settings.promo_image),
      book: slugOf(asString(b.settings.promo_book)),
      eyebrow: asString(b.settings.promo_eyebrow),
      title: asString(b.settings.promo_title),
      link: asString(b.settings.promo_link) || asString(b.settings.link) || "/products",
    };
    return {
      label: asString(b.settings.label),
      href: asString(b.settings.link) || "/",
      hasChildren: columns.length > 0 || asBool(b.settings.show_caret, false),
      columns,
      promo: promo.image || promo.book || promo.title ? promo : null,
    };
  });
  const links: NavLink[] =
    blockLinks.length > 0
      ? blockLinks
      : (menuItems ?? []).map((item) => {
          const children = (item.children ?? []).map((child) => ({ label: child.title ?? "", href: child.url ?? "/" }));
          return {
            label: item.title ?? "",
            href: item.url ?? "/",
            hasChildren: children.length > 0,
            columns: children.length > 0 ? [{ title: "", links: children }] : [],
            promo: null,
          };
        });

  const itemCount = cart?.items?.reduce((n, i) => n + (i.quantity ?? 0), 0) ?? 0;
  // Cart money is MAJOR units — never divide.
  const cartTotal = cart?.total ?? cart?.subtotal ?? 0;
  const wishCount = wishlist.items.length;

  /* ── Mega-menu ─────────────────────────────────────────────────────────── */
  const [megaIndex, setMegaIndex] = useState<number | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const navRef = useRef<HTMLElement>(null);
  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setMegaIndex(null), 180);
  };
  const closeMega = () => {
    cancelClose();
    setMegaIndex(null);
  };
  useEffect(() => {
    if (megaIndex === null) return;
    const onDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setMegaIndex(null);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setMegaIndex(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [megaIndex]);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  const mega = megaIndex !== null ? links[megaIndex] : null;

  /* ── Search suggestions ────────────────────────────────────────────────── */
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const searchRef = useRef<HTMLFormElement>(null);
  const term = query.trim();
  const [settled, setSettled] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(term), 180);
    return () => window.clearTimeout(id);
  }, [term]);
  const wantsSuggest = suggestOpen && term.length >= 2;
  const lookup = wantsSuggest && settled.length >= 2 ? settled : "";

  const { data: found } = useCachedResource<Suggestions>(
    lookup ? `pw-suggest:${lookup.toLowerCase()}` : null,
    async (signal) => {
      const params = new URLSearchParams({
        q: lookup,
        mode: "predictive",
        types: "products,collections,authors,series",
        limit: "6",
      });
      const res = await fetch(`/api/storefront/search?${params}`, { signal, cache: "no-store" });
      const json = res.ok ? asRecord(await res.json()) : {};
      const body = asRecord(json.data ?? json);
      return {
        products: asArray(body.products) as Product[],
        collections: asArray(body.collections).map(asRecord),
        authors: asArray(body.authors).map(asRecord),
        series: asArray(body.series).map(asRecord),
      };
    },
  );
  const searching = wantsSuggest && (lookup !== term || !found);
  const hrefOf = (product: Product) => `/products/${product.slug ?? product.id}`;
  const books = wantsSuggest ? (found?.products ?? []).slice(0, 5) : [];
  const lowered = lookup.toLowerCase();
  const sentAuthors = (found?.authors ?? []).map((a) => asString(a.name)).filter(Boolean);
  const bookAuthors = [
    ...new Set(books.map((p) => productAuthor(p)).filter((name) => name && name.toLowerCase().includes(lowered))),
  ];
  const rows: Row[] = wantsSuggest
    ? [
        ...books.map((product): Row => ({ kind: "book", href: hrefOf(product), product })),
        ...(sentAuthors.length > 0 ? sentAuthors : bookAuthors).slice(0, 3).map(
          (name): Row => ({ kind: "author", href: `/search?q=${encodeURIComponent(name)}`, label: name, count: 0 }),
        ),
        ...(found?.series ?? []).slice(0, 3).map(
          (entry): Row => ({
            kind: "series",
            href: `/search?q=${encodeURIComponent(asString(entry.name))}`,
            label: asString(entry.name),
            count: asNumber(entry.product_count, 0),
          }),
        ),
        ...(found?.collections ?? []).slice(0, 3).map(
          (entry): Row => ({
            kind: "collection",
            href: `/collections/${asString(entry.slug) || asString(entry.id)}`,
            label: asString(entry.name),
            count: asNumber(entry.product_count, 0),
          }),
        ),
      ]
    : [];
  const listId = `pw-suggest-${instance.type}`;
  const groups: Array<{ kind: Row["kind"]; title: string }> = [
    { kind: "book", title: t("search.group_books", "Books") },
    { kind: "author", title: t("search.group_authors", "Authors") },
    { kind: "series", title: t("search.group_series", "Series") },
    { kind: "collection", title: t("search.group_collections", "Collections") },
  ];

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
    if (rows.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestOpen(true);
      setActive((i) => (i + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? rows.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0 && rows[active]) {
      e.preventDefault();
      go(rows[active].href);
    }
  };

  const openCart = (e: MouseEvent) => {
    e.preventDefault();
    setCartDrawer(true);
  };
  const closeMenu = () => setMenuOpen(false);

  const renderRow = (row: Row, index: number) => {
    const common = {
      id: `${listId}-${index}`,
      role: "option" as const,
      "aria-selected": index === active,
      to: row.href,
      onClick: () => setSuggestOpen(false),
      onMouseEnter: () => setActive(index),
    };
    if (row.kind === "book") {
      const cover = productImages(row.product)[0];
      const author = productAuthor(row.product);
      const raw = row.product as unknown as Record<string, unknown>;
      return (
        <Link key={`book-${row.product.id}`} className="pw-suggest-row" {...common}>
          {cover ? (
            <Image src={cover} alt="" responsive={false} loading="lazy" />
          ) : (
            <BookJacket title={row.product.name} size="mini" />
          )}
          <span>
            <span className="pw-suggest-title">{row.product.name}</span>
            {author && <span className="pw-suggest-by">{author}</span>}
          </span>
          <span className="pw-suggest-price">
            <Money amount={Number(row.product.price ?? 0)} currency={asString(raw.price_currency) || row.product.currency} />
          </span>
        </Link>
      );
    }
    return (
      <Link key={`${row.kind}-${row.label}`} className="pw-suggest-row pw-suggest-row--text" {...common}>
        <span className="pw-suggest-mark" aria-hidden="true">
          {row.label.slice(0, 1)}
        </span>
        <span>
          <span className="pw-suggest-title">{row.label}</span>
          {row.count > 0 && (
            <span className="pw-suggest-by">{fill(t("collection.count_many", "{{count}} books"), { count: row.count })}</span>
          )}
        </span>
        <IconArrow size={14} />
      </Link>
    );
  };

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
                aria-activedescendant={active >= 0 && rows[active] ? `${listId}-${active}` : undefined}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(-1);
                  setSuggestOpen(true);
                }}
                onFocus={() => setSuggestOpen(true)}
                onKeyDown={onSearchKey}
                placeholder={
                  asString(s.search_placeholder) || t("search.placeholder", "Search by title, author, series or ISBN")
                }
              />

              {wantsSuggest && (
                <div className="pw-suggest" id={listId} role="listbox" aria-label={t("search.suggestions", "Suggestions")}>
                  {rows.length === 0 ? (
                    <p className="pw-suggest-empty">
                      {searching ? t("search.searching", "Searching…") : t("search.no_results", "No books matched that search.")}
                    </p>
                  ) : (
                    groups.map((group) => {
                      const members = rows
                        .map((row, index) => ({ row, index }))
                        .filter(({ row }) => row.kind === group.kind);
                      if (members.length === 0) return null;
                      return (
                        <div key={group.kind} role="group" aria-label={group.title} className="pw-suggest-group">
                          <p className="pw-suggest-head" aria-hidden="true">
                            {group.title}
                          </p>
                          {members.map(({ row, index }) => renderRow(row, index))}
                        </div>
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
        <nav className="pw-nav" ref={navRef} aria-label={t("collection.browse", "Browse")}>
          <div className="pw-nav-inner">
            {links.map((link, i) =>
              link.columns.length > 0 ? (
                <button
                  key={`${link.href}-${i}`}
                  type="button"
                  className="pw-nav-trigger"
                  aria-expanded={megaIndex === i}
                  aria-controls={`pw-mega-${i}`}
                  onMouseEnter={() => {
                    cancelClose();
                    setMegaIndex(i);
                  }}
                  onMouseLeave={scheduleClose}
                  onClick={() => setMegaIndex(megaIndex === i ? null : i)}
                >
                  {link.label}
                  <IconChevron size={10} />
                </button>
              ) : (
                <Link key={`${link.href}-${i}`} to={link.href}>
                  {link.label}
                  {link.hasChildren && <IconChevron size={10} />}
                </Link>
              ),
            )}
          </div>

          {mega && megaIndex !== null && (
            <div className="pw-mega" id={`pw-mega-${megaIndex}`} onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
              <div className="pw-mega-inner" data-promo={mega.promo ? "" : undefined}>
                {mega.columns.map((column, i) => (
                  <div className="pw-mega-col" key={`${column.title}-${i}`}>
                    {column.title && <p className="pw-kicker">{column.title}</p>}
                    <ul>
                      {column.links.map((l, j) => (
                        <li key={`${l.href}-${j}`}>
                          <Link to={l.href} onClick={closeMega}>
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {mega.promo && (
                  <Link className="pw-mega-promo" to={mega.promo.link} onClick={closeMega}>
                    {mega.promo.image ? (
                      <span className="pw-mega-photo">
                        <Image src={mega.promo.image} alt="" responsive={!isInlineImage(mega.promo.image)} loading="lazy" />
                      </span>
                    ) : (
                      mega.promo.book && <PromoCover handle={mega.promo.book} />
                    )}
                    <span className="pw-mega-copy">
                      {mega.promo.eyebrow && <span className="pw-kicker">{mega.promo.eyebrow}</span>}
                      {mega.promo.title && <span className="pw-mega-title">{mega.promo.title}</span>}
                      <IconArrow />
                    </span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </nav>
      )}

      {menuOpen && (
        <Drawer side="start" title={t("nav.menu", "Menu")} closeLabel={t("drawer.close", "Close")} onClose={closeMenu}>
          <ul className="pw-menu-list">
            {links.map((link, i) => (
              <li key={`${link.href}-${i}`}>
                {link.columns.length > 0 ? (
                  <details className="pw-menu-fold">
                    <summary>{link.label}</summary>
                    {link.columns.map((column, j) => (
                      <div className="pw-menu-group" key={`${column.title}-${j}`}>
                        {column.title && <p className="pw-kicker">{column.title}</p>}
                        <ul>
                          {column.links.map((l, k) => (
                            <li key={`${l.href}-${k}`}>
                              <Link to={l.href} onClick={closeMenu}>
                                {l.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </details>
                ) : (
                  <Link to={link.href} onClick={closeMenu}>
                    {link.label}
                  </Link>
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
