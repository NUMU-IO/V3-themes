/**
 * pw-product — the book page.
 *
 * The edition picker, price line and quantity stepper live in lib/variants.tsx
 * so quick look buys exactly the way this page does.
 *
 * The page body is keyed by product id. `useVariantSelection` seeds its state
 * once, on mount, so a soft navigation from one book to another would otherwise
 * keep the previous book's selection — and match no edition of the new one.
 *
 * ⚠ MONEY UNITS. `product.price` is in MAJOR units; variant prices are in
 * CENTS. See lib/variants.tsx, which owns every variant figure on this page.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Link,
  RichText,
  useCart,
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
import { useT } from "../lib/i18n";
import { ProductCard } from "../lib/product-card";
import { setCartDrawer } from "../lib/cart-drawer";
import { useBookOffer } from "../lib/promotions";
import { entryAsProduct, recordRecentlyViewed, useRecentlyViewed } from "../lib/recently-viewed";
import {
  buyLabel,
  conditionOf,
  EditionList,
  OptionChips,
  PriceLine,
  QtyStepper,
  useVariantPicker,
} from "../lib/variants";
import { IconHeart, IconReturn, IconShield, IconTruck, Twinkle } from "../lib/ornaments";

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

  const trust = [
    fulfillmentType !== "digital" && {
      icon: <IconTruck />,
      title: asString(s.trust_shipping_title) || t("product.trust_shipping", "Fast shipping"),
      text: asString(s.trust_shipping_text) || t("product.trust_shipping_text", "2–5 days"),
    },
    {
      icon: <IconReturn />,
      title: asString(s.trust_returns_title) || t("product.trust_returns", "Easy returns"),
      text: asString(s.trust_returns_text) || t("product.trust_returns_text", "14 days"),
    },
    {
      icon: <IconShield />,
      title: asString(s.trust_quality_title) || t("product.trust_packed", "Packed with care"),
      text: asString(s.trust_quality_text) || t("product.trust_packed_text", "Every copy checked"),
    },
  ].filter((row): row is Exclude<typeof row, false> => Boolean(row));

  const recentShown = asBool(s.show_recent, true) ? recent.slice(0, asNumber(s.recent_limit, 5)) : [];

  return (
    <div className="pw-container" style={{ paddingBlock: "30px 80px" }}>
      <nav className="pw-crumbs" aria-label="Breadcrumb">
        <Link to="/">{asString(s.home_label) || "Home"}</Link> ›<Link to="/products">
          {asString(s.listing_label) || "Books"}
        </Link>{" "}
        ›<span>{product.name}</span>
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

        <div>
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
              <span className="pw-dot-g" aria-hidden="true" />
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
            {asBool(s.show_wishlist, true) && (
              <button type="button" className="pw-btn pw-btn-ghost" aria-label={t("product.wishlist", "Add to wishlist")}>
                <IconHeart size={19} />
              </button>
            )}
          </div>

          {asBool(s.show_trust, true) && trust.length > 0 && (
            <ul className="pw-trust">
              {trust.map((row) => (
                <li key={row.title}>
                  {row.icon}
                  <span>
                    <b>{row.title}</b>
                    {row.text && ` · ${row.text}`}
                  </span>
                </li>
              ))}
            </ul>
          )}

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

      <div className="pw-pdp-sections">
        <section>
          <h2>{t("product.synopsis", "Synopsis")}</h2>
          <div className="pw-synopsis">
            {/* Merchant HTML goes through the SDK's sanitizer, never
                dangerouslySetInnerHTML. */}
            <RichText html={product.description ?? ""} />
          </div>
        </section>

        {specs.length > 0 && (
          <section>
            <h2>{t("product.details", "Product Details")}</h2>
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
          </section>
        )}
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
