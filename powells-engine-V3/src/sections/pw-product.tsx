/**
 * pw-product — the book page.
 *
 * The whole design turns on one idea a general-purpose PDP does not have: in a
 * used bookshop the shopper is choosing a COPY, not a product. The same title
 * exists as a $6.50 mass-market with a cracked spine and a $17.95 like-new
 * hardcover, and the price, the condition and the branch it sits in all change
 * together. So the variant picker is not a row of swatches — it is a list of
 * priced editions, each with its own condition line, and it is the tallest
 * thing on the page after the cover.
 *
 * ⚠ MONEY UNITS. `product.price` is in MAJOR units; `variant.price.amount` is
 * in CENTS. Both appear on this page. Every variant figure below goes through
 * `centsToMajor` and every product figure does not — mixing them up is a
 * silent 100× error that looks plausible on a cheap paperback.
 */

import { useMemo, useState } from "react";
import {
  Image,
  Link,
  Money,
  RichText,
  useCart,
  useMetafields,
  useProductOptional,
  useRelatedProducts,
  useResolvedSettings,
  useVariantSelection,
  type Product,
  type ProductVariant,
} from "@numueg/theme-sdk";
import { centsToMajor } from "@numueg/theme-kit";
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
import { IconHeart, Twinkle } from "../lib/ornaments";

/**
 * The line under an edition's name: what shape the book is in.
 *
 * A bookseller records this as a `condition` option axis on the variant, or as
 * a `books.condition` metafield when the whole copy shares one. Neither is
 * mandatory, and a variant with no condition simply shows its option values
 * instead — better than printing an invented grade next to a real price.
 */
function conditionOf(variant: ProductVariant): string {
  const v = variant as unknown as Record<string, unknown>;
  const values = (v.option_values ?? {}) as Record<string, unknown>;
  for (const [axis, value] of Object.entries(values)) {
    if (axis.toLowerCase().includes("condition")) return asString(value);
  }
  return "";
}

function variantLabel(variant: ProductVariant, fallback: string): string {
  const v = variant as unknown as Record<string, unknown>;
  const values = Object.values((v.option_values ?? {}) as Record<string, unknown>)
    .map((x) => asString(x))
    .filter(Boolean);
  return values.join(" · ") || asString(v.name) || fallback;
}

export default function PwProduct({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();
  const product = useProductOptional();
  const metafields = useMetafields("product");
  const { addItem, loading: cartBusy } = useCart();
  const { items: related } = useRelatedProducts(product?.id, {
    limit: asNumber(s.related_limit, 5),
  });
  // Real reviews when the shop has them. The books.rating pair below is the
  // fallback for a store with no review history yet — never the other way
  // round: a typed-in number must not override what customers actually said.
  const { stats: reviewStats } = useProductReviews(product?.id, 1);

  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  const variants = useMemo(
    () => ((product as unknown as { variants?: ProductVariant[] })?.variants ?? []),
    [product],
  );
  const selection = useVariantSelection(product ?? ({} as never));
  const [chosenId, setChosenId] = useState<string | null>(null);
  const chosen =
    variants.find((v) => String(v.id) === chosenId) ?? selection.variant ?? variants[0] ?? null;

  const metaMap = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const field of metafields) {
      const f = field as unknown as Record<string, unknown>;
      out[`${asString(f.namespace)}.${asString(f.key)}`] = f.value;
    }
    return out;
  }, [metafields]);

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

  const images = productImages(product);
  const author = productAuthor(product, metaMap);
  const cover = images[imageIndex] ?? images[0];

  const stock = asNumber((chosen as unknown as Record<string, unknown>)?.inventory_quantity, 0);
  const inStock = stock > 0;
  const branch = asString(metaMap["books.shelf_location"]);

  const onAdd = async () => {
    if (!inStock) return;
    const result = await addItem(
      String(product.id),
      chosen ? String(chosen.id) : undefined,
      qty,
      (chosen as unknown as { option_values?: Record<string, string> })?.option_values,
    );
    if (result?.ok) {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 2500);
    }
  };

  const specs: Array<[string, string]> = [
    ["ISBN", asString(metaMap["books.isbn"])],
    [t("product.sku", "SKU"), asString((chosen as unknown as Record<string, unknown>)?.sku)],
    ["Publisher", asString(metaMap["books.publisher"])],
    ["Pages", asString(metaMap["books.pages"])],
    ["Language", asString(metaMap["books.language"])],
    ["Edition year", asString(metaMap["books.edition_year"])],
    [t("product.condition", "Condition"), chosen ? conditionOf(chosen) : ""],
    ["Shelf location", branch],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  // Reviews win over the typed-in fallback whenever the shop has any.
  const ratingValue = reviewStats.count > 0 ? reviewStats.average : asNumber(metaMap["books.rating"], 0);
  const ratingCount = reviewStats.count > 0 ? reviewStats.count : asNumber(metaMap["books.rating_count"], 0);

  const staffPick = asString(metaMap["books.staff_pick"]) || asString(s.staff_pick_text);
  const staffPickBy = asString(metaMap["books.staff_pick_by"]) || asString(s.staff_pick_by);

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

          {variants.length > 0 && (
            <div className="pw-editions" role="radiogroup" aria-label={t("product.choose_edition", "Choose an edition")}>
              {variants.map((variant) => {
                const v = variant as unknown as Record<string, unknown>;
                const isChosen = chosen ? String(variant.id) === String(chosen.id) : false;
                const available = asNumber(v.inventory_quantity, 0) > 0;
                // Cents → major. `variant.price.amount` is the trap this whole
                // theme's money handling is written around.
                const amount = centsToMajor(
                  asNumber((v.price as Record<string, unknown> | undefined)?.amount, 0),
                );
                const compareAt = asNumber(v.compare_at_price, 0);
                return (
                  <button
                    key={String(variant.id)}
                    type="button"
                    role="radio"
                    className="pw-edition"
                    aria-checked={isChosen}
                    disabled={!available}
                    onClick={() => setChosenId(String(variant.id))}
                  >
                    <span className="pw-dot" aria-hidden="true" />
                    <span>
                      {variantLabel(variant, product.name)}
                      {conditionOf(variant) && <small>{conditionOf(variant)}</small>}
                    </span>
                    <span className="amt">
                      <Money amount={amount} />
                      {compareAt > 0 && (
                        <s>
                          <Money amount={centsToMajor(compareAt)} />
                        </s>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <p className={inStock ? "pw-stock" : "pw-stock out"}>
            <span className="pw-dot-g" aria-hidden="true" />
            {inStock ? t("product.in_stock", "In stock") : t("product.out_of_stock", "Currently unavailable")}
            {inStock && stock <= asNumber(s.low_stock_at, 5) && (
              <em>
                {" — "}
                {t("product.copies_left", "{{count}} copies left").replace("{{count}}", String(stock))}
              </em>
            )}
            {inStock && branch && <em>{` — ${branch}`}</em>}
          </p>

          <div className="pw-buyrow">
            <div className="pw-qty">
              <button
                type="button"
                aria-label={t("product.decrease", "Decrease quantity")}
                onClick={() => setQty((n) => Math.max(1, n - 1))}
              >
                −
              </button>
              <output aria-live="polite">{qty}</output>
              <button
                type="button"
                aria-label={t("product.increase", "Increase quantity")}
                onClick={() => setQty((n) => Math.min(Math.max(stock, 1), n + 1))}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="pw-btn pw-btn-primary"
              style={{ flex: 1 }}
              disabled={!inStock || cartBusy}
              onClick={onAdd}
            >
              {added
                ? t("product.added", "Added to cart")
                : cartBusy
                  ? t("product.adding", "Adding...")
                  : t("product.add_to_cart", "Add to Cart")}
            </button>
            {asBool(s.show_wishlist, true) && (
              <button type="button" className="pw-btn pw-btn-ghost" aria-label={t("product.wishlist", "Add to wishlist")}>
                <IconHeart size={19} />
              </button>
            )}
          </div>

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
    </div>
  );
}
