/**
 * pw-product — the book page.
 *
 * Layout: the cover on one side; on the other the title, price (the old price
 * struck through before the current one), the edition picker, stock, quantity,
 * add to cart and the wishlist link, then the category and share row. Below,
 * tabs for the description, the book specification, quality and delivery.
 *
 * The edition picker, price line and quantity stepper live in lib/variants.tsx
 * so quick look buys exactly the way this page does.
 *
 * The page body is keyed by product id. `useVariantSelection` seeds its state
 * once, on mount, so a soft navigation from one book to another would otherwise
 * keep the previous book's selection — and match no edition of the new one.
 *
 * No invented social proof ("13 people watching"): every figure on this page
 * comes from the catalog, the reviews, or the merchant's own settings.
 *
 * ⚠ MONEY UNITS. `product.price` is in MAJOR units; variant prices are in
 * CENTS. See lib/variants.tsx, which owns every variant figure on this page.
 */

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  Image,
  Link,
  RichText,
  useCart,
  useLocale,
  useMetafields,
  useProductOptional,
  useRelatedProducts,
  useResolvedSettings,
  type Product,
} from "@numueg/theme-sdk";
import {
  asBool,
  asNumber,
  asString,
  productAuthor,
  productImages,
  useOrnaments,
  type SectionRenderProps,
} from "../lib/shared";
import { useProductReviews } from "../lib/store-data";
import { fill, useT } from "../lib/i18n";
import { ProductCard } from "../lib/product-card";
import { setCartDrawer } from "../lib/cart-drawer";
import { useBookOffer } from "../lib/promotions";
import { entryAsProduct, recordRecentlyViewed, useRecentlyViewed } from "../lib/recently-viewed";
import { WishlistButton } from "../lib/wishlist";
import {
  buyLabel,
  conditionOf,
  EditionList,
  OptionChips,
  PriceLine,
  QtyStepper,
  useVariantPicker,
} from "../lib/variants";
import {
  IconCheck,
  IconFacebook,
  IconLinkedin,
  IconReturn,
  IconShield,
  IconTruck,
  IconWhatsapp,
  IconXLogo,
  Twinkle,
} from "../lib/ornaments";

type TabId = "description" | "specs" | "quality" | "delivery";
type Network = "facebook" | "x" | "linkedin" | "whatsapp";

const SHARE_URL: Record<Network, (url: string, text: string) => string> = {
  facebook: (url) => `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  x: (url, text) => `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
  linkedin: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
  whatsapp: (url, text) => `https://wa.me/?text=${text}%20${url}`,
};

const SHARE_ICONS: Array<[Network, string, ReactNode]> = [
  ["facebook", "Facebook", <IconFacebook key="facebook" />],
  ["x", "X", <IconXLogo key="x" />],
  ["linkedin", "LinkedIn", <IconLinkedin key="linkedin" />],
  ["whatsapp", "WhatsApp", <IconWhatsapp key="whatsapp" />],
];

export default function PwProduct({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance) as Record<string, unknown>;
  const product = useProductOptional();

  if (!product) {
    // The customizer mounts this template with no product in context. A blank
    // section would look broken; naming the reason is what tells the merchant
    // to open a real book instead.
    return (
      <div className="pw-container" style={{ padding: "70px 0" }}>
        <p className="pw-synopsis">{asString(s.no_product_hint) || "Open a book to preview this page."}</p>
      </div>
    );
  }

  return <BookPage key={product.id} product={product} s={s} />;
}

function BookPage({ product, s }: { product: Product; s: Record<string, unknown> }) {
  const t = useT();
  const locale = useLocale();
  const ornaments = useOrnaments();
  const metafields = useMetafields("product");
  const { addItem, loading: cartBusy } = useCart();
  const { items: related } = useRelatedProducts(product.id, {
    limit: asNumber(s.related_limit, 5),
  });
  // Real reviews when the shop has them. The books.rating pair below is the
  // fallback for a store with no review history yet — never the other way
  // round: a typed-in number must not override what customers actually said.
  const { stats: reviewStats } = useProductReviews(product.id, 1);
  const picker = useVariantPicker(product);

  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);
  const [tab, setTab] = useState<TabId>("description");

  const metaMap = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const field of metafields) {
      const f = field as unknown as Record<string, unknown>;
      out[`${asString(f.namespace)}.${asString(f.key)}`] = f.value;
    }
    return out;
  }, [metafields]);

  const author = productAuthor(product, metaMap);
  useEffect(() => {
    recordRecentlyViewed(product, author);
  }, [product, author]);
  const recent = useRecentlyViewed(String(product.id));

  const offer = useBookOffer(
    String(product.id),
    asString((product as unknown as Record<string, unknown>).category_id),
    picker.price,
    picker.currency,
  );

  const images = productImages(product);
  const cover = images[imageIndex] ?? images[0];
  const { chosen, unavailableCombo, inStock, stock, tracksInventory, fulfillmentType } = picker;
  const shownQty = Math.min(qty, picker.maxQty);
  const branch = asString(metaMap["books.shelf_location"]);
  const category = asString((product as unknown as Record<string, unknown>).category);

  const onAdd = async () => {
    if (!inStock || unavailableCombo) return;
    const result = await addItem(
      String(product.id),
      chosen ? String(chosen.id) : undefined,
      shownQty,
      picker.optionValues,
    );
    if (result?.ok) {
      setAdded(true);
      setCartDrawer(true);
      window.setTimeout(() => setAdded(false), 2500);
    }
  };

  const share = (network: Network) => {
    const w = typeof window !== "undefined" ? window : null;
    if (!w) return;
    w.open(SHARE_URL[network](encodeURIComponent(w.location.href), encodeURIComponent(product.name)), "_blank", "noopener,noreferrer");
  };

  const specs: Array<[string, string]> = [
    [t("product.isbn", "ISBN"), asString(metaMap["books.isbn"])],
    [t("product.sku", "SKU"), picker.sku],
    [t("product.publisher", "Publisher"), asString(metaMap["books.publisher"])],
    [t("product.pages", "Pages"), asString(metaMap["books.pages"])],
    [t("product.language", "Language"), asString(metaMap["books.language"])],
    [t("product.edition_year", "Edition year"), asString(metaMap["books.edition_year"])],
    [t("product.condition", "Condition"), chosen ? conditionOf(chosen) : ""],
    [t("product.shelf_location", "Shelf location"), branch],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  // Reviews win over the typed-in fallback whenever the shop has any.
  const ratingValue = reviewStats.count > 0 ? reviewStats.average : asNumber(metaMap["books.rating"], 0);
  const ratingCount = reviewStats.count > 0 ? reviewStats.count : asNumber(metaMap["books.rating_count"], 0);

  const staffPick = asString(metaMap["books.staff_pick"]) || asString(s.staff_pick_text);
  const staffPickBy = asString(metaMap["books.staff_pick_by"]) || asString(s.staff_pick_by);

  const showTrust = asBool(s.show_trust, true);
  const shippingRow = {
    icon: <IconTruck />,
    title: asString(s.trust_shipping_title) || t("product.trust_shipping", "Fast shipping"),
    text: asString(s.trust_shipping_text) || t("product.trust_shipping_text", "2–5 days"),
  };
  const returnsRow = {
    icon: <IconReturn />,
    title: asString(s.trust_returns_title) || t("product.trust_returns", "Easy returns"),
    text: asString(s.trust_returns_text) || t("product.trust_returns_text", "14 days"),
  };
  const packedRow = {
    icon: <IconShield />,
    title: asString(s.trust_quality_title) || t("product.trust_packed", "Packed with care"),
    text: asString(s.trust_quality_text) || t("product.trust_packed_text", "Every copy checked"),
  };
  const deliveryRows = fulfillmentType === "digital" ? [returnsRow] : [shippingRow, returnsRow];
  const qualityText =
    asString(s.quality_text) ||
    t(
      "product.quality_default",
      "Every copy is checked by hand before it ships and graded honestly, so the condition you choose is the condition you receive.",
    );
  const deliveryText = asString(s.delivery_text);

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "description", label: t("product.tab_description", "Description") },
    ...(specs.length > 0 ? [{ id: "specs" as const, label: t("product.tab_specs", "Book specification") }] : []),
    { id: "quality", label: t("product.tab_quality", "Quality") },
    ...(showTrust || deliveryText ? [{ id: "delivery" as const, label: t("product.tab_delivery", "Delivery") }] : []),
  ];
  const activeTab = tabs.some((x) => x.id === tab) ? tab : "description";

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const forward = (e.key === "ArrowRight") !== (locale === "ar");
    const index = tabs.findIndex((x) => x.id === activeTab);
    const next = tabs[(index + (forward ? 1 : tabs.length - 1)) % tabs.length];
    setTab(next.id);
    e.currentTarget.querySelector<HTMLElement>(`#pw-tab-${next.id}`)?.focus();
  };

  const trustList = (rows: Array<{ icon: ReactNode; title: string; text: string }>) => (
    <ul className="pw-trust">
      {rows.map((row) => (
        <li key={row.title}>
          {row.icon}
          <span>
            <b>{row.title}</b>
            {row.text && ` · ${row.text}`}
          </span>
        </li>
      ))}
    </ul>
  );

  const recentShown = asBool(s.show_recent, true) ? recent.slice(0, asNumber(s.recent_limit, 5)) : [];

  return (
    <div className="pw-container" style={{ paddingBlock: "30px 80px" }}>
      <nav className="pw-crumbs" aria-label="Breadcrumb">
        <Link to="/">{asString(s.home_label) || "Home"}</Link> /<Link to="/products">
          {category || asString(s.listing_label) || "Books"}
        </Link>{" "}
        /<span>{product.name}</span>
      </nav>

      <div className="pw-pdp">
        <div className="pw-pdp-media">
          <div className="pw-pdp-stage">
            {cover ? (
              <Image src={cover} alt={product.name} responsive={false} />
            ) : (
              <span className="pw-blank">{product.name}</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="pw-pdp-thumbs">
              {images.slice(0, 5).map((src, i) => (
                <button
                  key={src}
                  type="button"
                  aria-current={i === imageIndex}
                  aria-label={`${product.name} — ${i + 1}`}
                  onClick={() => setImageIndex(i)}
                >
                  <Image src={src} alt="" responsive={false} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pw-pdp-info">
          <h1 className="pw-pdp-title">{product.name}</h1>
          {author && (
            <p className="pw-pdp-author">
              {t("product.by", "by")} <i>{author}</i>
            </p>
          )}

          {asBool(s.show_rating, true) && ratingValue > 0 && (
            <p className="pw-stars">
              <span className="s" aria-hidden="true">
                {"★".repeat(Math.round(ratingValue))}
                {"☆".repeat(Math.max(0, 5 - Math.round(ratingValue)))}
              </span>
              <span>
                {ratingValue.toFixed(1)}
                {ratingCount > 0 && ` — ${ratingCount.toLocaleString()} ${t("product.ratings", "ratings")}`}
              </span>
            </p>
          )}

          <PriceLine picker={picker} />
          {offer && <p className="pw-offer">{offer}</p>}

          <OptionChips picker={picker} />
          <EditionList picker={picker} productName={product.name} />

          {!unavailableCombo && (
            <p className={inStock ? "pw-stock" : "pw-stock out"}>
              {inStock ? <IconCheck size={16} /> : <span className="pw-dot-g" aria-hidden="true" />}
              {inStock ? t("product.in_stock", "In stock") : t("product.out_of_stock", "Currently unavailable")}
              {inStock && tracksInventory && stock > 0 && stock <= asNumber(s.low_stock_at, 5) && (
                <em>
                  {" — "}
                  {t("product.copies_left", "{{count}} copies left").replace("{{count}}", String(stock))}
                </em>
              )}
              {inStock && branch && <em>{` — ${branch}`}</em>}
            </p>
          )}

          {fulfillmentType === "digital" && (
            <p className="pw-synopsis">
              {t(
                "product.digital_note",
                "Digital copy — available to download securely after payment. No shipping required.",
              )}
            </p>
          )}

          <div className="pw-buyrow">
            <QtyStepper value={shownQty} max={picker.maxQty} onChange={setQty} />
            <button
              type="button"
              className="pw-btn pw-btn-primary"
              disabled={!inStock || unavailableCombo || cartBusy}
              onClick={onAdd}
            >
              {buyLabel(picker, t, added, cartBusy)}
            </button>
            {asBool(s.show_wishlist, true) && <WishlistButton productId={String(product.id)} variant="link" />}
          </div>

          <div className="pw-pdp-meta">
            {category && (
              <p>
                <span>{t("product.category", "Category")}:</span> {category}
              </p>
            )}
            <div className="pw-share">
              <span>{t("product.share", "Share")}:</span>
              {SHARE_ICONS.map(([network, name, icon]) => (
                <button
                  key={network}
                  type="button"
                  aria-label={fill(t("product.share_on", "Share on {{network}}"), { network: name })}
                  title={name}
                  onClick={() => share(network)}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {(product.series ?? []).slice(0, 1).map((series) => (
            <aside className="pw-staffpick" key={series.id}>
              <div>
                <h4>{t("product.series_part", "Part of {{name}}").replace("{{name}}", series.name)}</h4>
                <p>
                  {series.volume_label &&
                    `${t("product.series_book", "Book {{volume}}").replace("{{volume}}", series.volume_label)} · `}
                  {t("product.series_count", "{{count}} books in this series").replace(
                    "{{count}}",
                    String(series.count),
                  )}
                </p>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {series.previous && (
                    <Link to={`/products/${series.previous.slug}`}>
                      {t("product.series_prev", "← Previous book")}
                    </Link>
                  )}
                  <Link to={`/series/${series.slug}`}>{t("product.series_view", "View series")}</Link>
                  {series.next && (
                    <Link to={`/products/${series.next.slug}`}>{t("product.series_next", "Next book →")}</Link>
                  )}
                </div>
              </div>
            </aside>
          ))}

          {staffPick && (
            <aside className="pw-staffpick">
              {ornaments && (
                <span style={{ color: "var(--pw-ink-soft)", opacity: 0.6, flex: "0 0 auto" }}>
                  <Twinkle size={42} />
                </span>
              )}
              <div>
                <h4>{asString(s.staff_pick_title) || t("product.staff_pick", "A Staff Pick")}</h4>
                <p>{staffPick}</p>
                {staffPickBy && <div className="who">— {staffPickBy}</div>}
              </div>
            </aside>
          )}
        </div>
      </div>

      <div className="pw-tabs-wrap">
        <div className="pw-tabs" role="tablist" aria-label={product.name} onKeyDown={onTabKey}>
          {tabs.map((x) => (
            <button
              key={x.id}
              id={`pw-tab-${x.id}`}
              type="button"
              role="tab"
              className="pw-tab"
              aria-selected={activeTab === x.id}
              aria-controls={`pw-tabpanel-${x.id}`}
              tabIndex={activeTab === x.id ? 0 : -1}
              onClick={() => setTab(x.id)}
            >
              {x.label}
            </button>
          ))}
        </div>
        <div
          className="pw-tabpanel"
          role="tabpanel"
          id={`pw-tabpanel-${activeTab}`}
          aria-labelledby={`pw-tab-${activeTab}`}
          tabIndex={0}
        >
          {activeTab === "description" && (
            <div className="pw-synopsis">
              {/* Merchant HTML goes through the SDK's sanitizer, never
                  dangerouslySetInnerHTML. */}
              <RichText html={product.description ?? ""} />
            </div>
          )}
          {activeTab === "specs" && (
            <table className="pw-specs">
              <tbody>
                {specs.map(([label, value]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab === "quality" && (
            <>
              <p className="pw-synopsis">{qualityText}</p>
              {chosen && conditionOf(chosen) && (
                <p className="pw-synopsis">
                  <b>{t("product.condition", "Condition")}:</b> {conditionOf(chosen)}
                </p>
              )}
              {showTrust && trustList([packedRow])}
            </>
          )}
          {activeTab === "delivery" && (
            <>
              {showTrust && trustList(deliveryRows)}
              {deliveryText && <p className="pw-synopsis">{deliveryText}</p>}
            </>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="pw-related">
          <h2>{asString(s.related_title) || t("product.related", "Customers Also Bought")}</h2>
          <div className="pw-grid">
            {related.map((item: Product) => (
              <ProductCard key={item.id} product={item} showWishlist={false} />
            ))}
          </div>
        </section>
      )}

      {recentShown.length > 0 && (
        <section className="pw-related">
          <h2>{asString(s.recent_title) || t("recent.title", "Recently viewed")}</h2>
          <div className="pw-grid">
            {recentShown.map((entry) => (
              <ProductCard key={entry.id} product={entryAsProduct(entry)} showWishlist={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
