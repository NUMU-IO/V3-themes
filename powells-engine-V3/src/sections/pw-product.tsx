/**
 * pw-product — the book page.
 *
 * Laid out like an editorial page rather than a form: a large cover on a
 * lavender field on the left (55%), and a purchase panel on the right (45%)
 * that stays in view while the shopper reads. Under the cover sit the series'
 * reading order, the staff pick, and four sections — About the book, Details,
 * Condition, Shipping & Returns.
 *
 * The purchase panel reads top to bottom the way a bookseller would say it:
 * title, author, rating, "Paperback · New", the price, the edition selectors
 * (each showing its own price when editions differ), when it arrives, whether
 * it is in stock, Add to Cart, and the secure-checkout line.
 *
 * The edition picker, price line and quantity stepper live in lib/variants.tsx
 * so quick look buys exactly the way this page does.
 *
 * The page body is keyed by product id. `useVariantSelection` seeds its state
 * once, on mount, so a soft navigation from one book to another would otherwise
 * keep the previous book's selection — and match no edition of the new one.
 *
 * No invented social proof: every figure on this page comes from the catalog,
 * the reviews, or the merchant's own settings.
 *
 * ⚠ MONEY UNITS. `product.price` is in MAJOR units; variant prices are in
 * CENTS. See lib/variants.tsx, which owns every variant figure on this page.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Image,
  Link,
  RichText,
  useCart,
  useLocale,
  useMetafields,
  useProductOptional,
  useProducts,
  useRelatedProducts,
  useResolvedSettings,
  type Product,
} from "@numueg/theme-sdk";
import {
  asArray,
  asBool,
  asNumber,
  asRecord,
  asString,
  bookCondition,
  bookFormats,
  bookLabel,
  isFormatAxis,
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
import { GradingScale, gradeOf } from "../lib/condition";
import { SeriesPanel, seriesLine, seriesOf } from "../lib/series";
import { useShelfBooks } from "../lib/shelf-books";
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
  IconReturn,
  IconShield,
  IconTruck,
  IconWhatsapp,
  IconXLogo,
  Twinkle,
} from "../lib/ornaments";

type Network = "facebook" | "x" | "whatsapp";

const SHARE_URL: Record<Network, (url: string, text: string) => string> = {
  facebook: (url) => `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  x: (url, text) => `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
  whatsapp: (url, text) => `https://wa.me/?text=${text}%20${url}`,
};

const SHARE_ICONS: Array<[Network, string, ReactNode]> = [
  ["facebook", "Facebook", <IconFacebook key="facebook" />],
  ["x", "X", <IconXLogo key="x" />],
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

/**
 * "Order today, arrives Thu 18 Sep – Mon 22 Sep".
 *
 * Dates are computed after mount: the server's clock and time zone are not the
 * shopper's, and a date rendered on the server would mismatch on hydration.
 */
function DeliveryEstimate({ min, max }: { min: number; max: number }) {
  const t = useT();
  const locale = useLocale();
  const [range, setRange] = useState("");
  useEffect(() => {
    const format = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const on = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return format.format(date);
    };
    setRange(min >= max ? on(max) : `${on(min)} – ${on(max)}`);
  }, [locale, min, max]);
  if (!range) return null;
  return (
    <p className="pw-eta">
      <IconTruck size={18} />
      <span>{fill(t("product.eta", "Order today, arrives {{range}}"), { range })}</span>
    </p>
  );
}

function Fold({ title, open = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="pw-fold" open={open}>
      <summary>
        <span>{title}</span>
        <span className="pw-fold-sign" aria-hidden="true" />
      </summary>
      <div className="pw-fold-body">{children}</div>
    </details>
  );
}

function BookPage({ product, s }: { product: Product; s: Record<string, unknown> }) {
  const t = useT();
  const ornaments = useOrnaments();
  const metafields = useMetafields("product");
  const { addItem, loading: cartBusy } = useCart();
  const { items: related } = useRelatedProducts(product.id, {
    limit: asNumber(s.related_limit, 6),
  });
  // Real reviews when the shop has them. The books.rating pair below is the
  // fallback for a store with no review history yet — never the other way
  // round: a typed-in number must not override what customers actually said.
  const { stats: reviewStats } = useProductReviews(product.id, 1);
  const picker = useVariantPicker(product);

  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

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

  const raw = product as unknown as Record<string, unknown>;
  const offer = useBookOffer(String(product.id), asString(raw.category_id), picker.price, picker.currency);

  const images = productImages(product);
  const cover = images[imageIndex] ?? images[0];
  const { chosen, unavailableCombo, inStock, stock, tracksInventory, fulfillmentType } = picker;
  const shownQty = Math.min(qty, picker.maxQty);
  const branch = asString(metaMap["books.shelf_location"]);
  const category = asString(raw.category) || asString(asRecord(raw.category).name);
  const attributes = asRecord(raw.attributes);
  const series = seriesOf(product);

  const formatAxis = picker.options.find((option) => isFormatAxis(option.name));
  const chosenFormat = formatAxis ? asString(picker.selection[formatAxis.name]) : "";
  const condition = (chosen ? conditionOf(chosen) : "") || bookCondition(product);
  const label = bookLabel(product);
  const labelWord = label ? label.text.charAt(0).toUpperCase() + label.text.slice(1).toLowerCase() : "";
  const formatLine = [chosenFormat || (bookFormats(product).length === 1 ? bookFormats(product)[0] : ""), condition || labelWord]
    .filter(Boolean)
    .join(" · ");

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
    [t("product.author", "Author"), author],
    [t("series.kicker", "Series"), series ? `${series.name} — ${seriesLine(series, t)}` : ""],
    [t("product.formats", "Formats"), bookFormats(product).join(", ")],
    [t("product.isbn", "ISBN"), asString(metaMap["books.isbn"]) || asString(attributes.isbn)],
    [t("product.sku", "SKU"), picker.sku],
    [t("product.publisher", "Publisher"), asString(metaMap["books.publisher"])],
    [t("product.pages", "Pages"), asString(metaMap["books.pages"])],
    [t("product.language", "Language"), asString(metaMap["books.language"])],
    [t("product.edition_year", "Year"), asString(metaMap["books.edition_year"]) || asString(attributes.year)],
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

  const recentShown = asBool(s.show_recent, true) ? recent.slice(0, asNumber(s.recent_limit, 6)) : [];
  const galleryCount = asArray(images).length;

  // "You may also like": the book's own shelf first, topped up with new
  // arrivals, covers only, and nothing already shown above it on this page.
  const { products: pool } = useProducts({ limit: 60, fetchIfMissing: true });
  const categoryId = asString(raw.category_id);
  const sameShelf = useShelfBooks(pool, "collection", categoryId, 18, { withCovers: true });
  const newest = useShelfBooks(pool, "newest", "", 18, { withCovers: true });
  const shown = new Set([String(product.id), ...related.map((item) => String(item.id)), ...recentShown.map((entry) => entry.id)]);
  const alsoLike = asBool(s.show_also_like, true)
    ? [...(categoryId ? sameShelf : []), ...newest]
        .filter((item, i, list) => !shown.has(String(item.id)) && list.findIndex((x) => x.id === item.id) === i)
        .slice(0, asNumber(s.also_like_limit, 10))
    : [];

  return (
    <div className="pw-container pw-pdp-page">
      <nav className="pw-crumbs" aria-label="Breadcrumb">
        <Link to="/">{asString(s.home_label) || "Home"}</Link> /
        <Link to="/products">{category || asString(s.listing_label) || "Books"}</Link> /<span>{product.name}</span>
      </nav>

      <div className="pw-pdp">
        <div className="pw-pdp-media">
          <div className="pw-pdp-stage">
            {cover ? (
              <Image src={cover} alt={product.name} responsive={false} priority />
            ) : (
              <span className="pw-blank">{product.name}</span>
            )}
          </div>
          {galleryCount > 1 && (
            <div className="pw-pdp-thumbs">
              {images.slice(0, 6).map((src, i) => (
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

        <aside className="pw-pdp-buy" aria-label={t("product.buy_panel", "Buy this book")}>
          <div className="pw-pdp-panel">
            {label && <span className="pw-tag" data-kind={label.key}>{label.text}</span>}
            <h1 className="pw-pdp-title">{product.name}</h1>
            {author && (
              <p className="pw-pdp-author">
                <Link to={`/search?q=${encodeURIComponent(author)}`}>{author}</Link>
              </p>
            )}

            {asBool(s.show_rating, true) && ratingValue > 0 && (
              <p className="pw-stars">
                <span className="s" aria-hidden="true">★</span>
                <span>
                  {ratingValue.toFixed(1)}
                  {ratingCount > 0 &&
                    ` · ${fill(t("product.reviews_count", "{{count}} reviews"), { count: ratingCount.toLocaleString() })}`}
                </span>
              </p>
            )}

            {formatLine && <p className="pw-pdp-format">{formatLine}</p>}
            <PriceLine picker={picker} />
            {offer && <p className="pw-offer">{offer}</p>}

            <OptionChips picker={picker} />
            <EditionList picker={picker} productName={product.name} />

            {fulfillmentType !== "digital" && asBool(s.show_eta, true) && inStock && !unavailableCombo && (
              <DeliveryEstimate min={asNumber(s.delivery_min_days, 2)} max={asNumber(s.delivery_max_days, 5)} />
            )}

            {!unavailableCombo && (
              <p className={inStock ? "pw-stock" : "pw-stock out"}>
                {inStock ? <IconCheck size={16} /> : <span className="pw-dot-g" aria-hidden="true" />}
                {inStock ? t("product.in_stock", "In stock") : t("product.out_of_stock", "Currently unavailable")}
                {inStock && tracksInventory && stock > 0 && stock <= asNumber(s.low_stock_at, 3) && (
                  <em>{` — ${fill(t("product.copies_left", "{{count}} copies left"), { count: stock })}`}</em>
                )}
                {inStock && branch && <em>{` — ${branch}`}</em>}
              </p>
            )}

            {fulfillmentType === "digital" && (
              <p className="pw-synopsis">
                {t("product.digital_note", "Digital copy — available to download securely after payment. No shipping required.")}
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
              {asBool(s.show_wishlist, true) && <WishlistButton productId={String(product.id)} />}
            </div>

            <p className="pw-secure">
              <IconShield size={16} />
              {asString(s.secure_text) || t("product.secure", "Secure checkout")}
            </p>

            <div className="pw-share">
              <span>{t("product.share", "Share")}</span>
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
        </aside>

        <div className="pw-pdp-details">
          <SeriesPanel product={product} selection={picker.selection} />

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

          <div className="pw-folds">
            <Fold title={t("product.tab_description", "About the book")} open>
              <div className="pw-synopsis">
                {/* Merchant HTML goes through the SDK's sanitizer, never
                    dangerouslySetInnerHTML. */}
                <RichText html={product.description ?? ""} />
              </div>
            </Fold>
            {specs.length > 0 && (
              <Fold title={t("product.tab_specs", "Details")}>
                <table className="pw-specs">
                  <tbody>
                    {specs.map(([name, value]) => (
                      <tr key={name}>
                        <th scope="row">{name}</th>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Fold>
            )}
            <Fold title={t("product.tab_quality", "Condition")}>
              {condition && (
                <p className="pw-synopsis">
                  <b>{t("product.condition", "Condition")}:</b> {condition}
                </p>
              )}
              <p className="pw-synopsis">{qualityText}</p>
              {condition && gradeOf(condition) && <GradingScale current={gradeOf(condition)} />}
              {showTrust && trustList([packedRow])}
            </Fold>
            {(showTrust || deliveryText) && (
              <Fold title={t("product.tab_delivery", "Shipping & Returns")}>
                {showTrust && trustList(deliveryRows)}
                {deliveryText && <p className="pw-synopsis">{deliveryText}</p>}
              </Fold>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="pw-related">
          <h2>{asString(s.related_title) || t("product.related", "Customers Also Bought")}</h2>
          <div className="pw-rail-scroll">
            {related.map((item: Product) => (
              <div className="pw-rail-item" key={item.id}>
                <ProductCard product={item} />
              </div>
            ))}
          </div>
        </section>
      )}

      {recentShown.length > 0 && (
        <section className="pw-related">
          <h2>{asString(s.recent_title) || t("recent.title", "Recently viewed")}</h2>
          <div className="pw-rail-scroll">
            {recentShown.map((entry) => (
              <div className="pw-rail-item" key={entry.id}>
                <ProductCard product={entryAsProduct(entry)} showWishlist={false} />
              </div>
            ))}
          </div>
        </section>
      )}

      {alsoLike.length > 0 && (
        <section className="pw-related">
          <h2>{asString(s.also_like_title) || t("cart.also_like", "You may also like")}</h2>
          <div className="pw-rail-scroll">
            {alsoLike.map((item) => (
              <div className="pw-rail-item" key={item.id}>
                <ProductCard product={item} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
