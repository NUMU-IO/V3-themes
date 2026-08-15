/**
 * gn-product-detail — the PDP.
 *
 * Two columns on desktop: gallery on the start side, information panel on the
 * end side. Stacked on mobile, gallery first.
 *
 * Panel order follows the reference exactly: title · price · colour swatches ·
 * rating · size chips + size guide · quantity · Add to cart · Buy it now ·
 * return note · accordions · reviews · you-may-also-like · recently viewed.
 *
 * Denim fit data (rise, leg, stretch, inseam, model height) comes from public
 * METAFIELDS (decision D5) and renders only when present — no new columns, and
 * a store that hasn't filled them in shows nothing rather than empty rows.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  sanitizeHtml,
  useCart,
  useLocale,
  useMetafields,
  useProductOptional,
  type Product,
  useProductSizeChart,
  useRelatedProducts,
  useVariantSelection,
} from "@numueg/theme-sdk";
import { asBool, asString } from "@numueg/theme-kit";
import {
  cx,
  productImages,
  productName,
  useFocusTrap,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { Price } from "../lib/price";
import { Gallery } from "../lib/gallery";
import { AccordionItem } from "../lib/accordion";
import { ProductCard } from "../lib/product-card";
import { optionAxes, QuickAddSheet, useQuickAdd } from "../lib/quick-add";
import { useCartDrawer } from "../lib/bag-context";
import { PaymentMarks } from "../lib/payment-marks";
import { ProductOfferLine } from "../lib/offers";
import { roundHalf, useProductReviews } from "../lib/reviews";
import { IconClose, IconShield } from "../lib/icons";

const COLOR_AXIS = /colou?r|لون/i;
const SIZE_AXIS = /size|مقاس/i;

/** Metafield keys this theme understands, in display order. */
/** Stable stand-in so `useVariantSelection` still runs when there is no product
 *  — hooks must be called unconditionally, and a fresh literal each render
 *  would churn the hook's internal memo. */
const NO_PRODUCT = { options: [], variants: [] } as Pick<Product, "options" | "variants">;

const FIT_KEYS = ["rise", "leg", "stretch", "inseam", "fabric", "model_height"] as const;

export default function GnProductDetail({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const locale = useLocale();
  // `useProductOptional`, NOT `useProduct`: the latter THROWS outside a
  // ProductProvider, and a merchant can drag this section onto any template
  // from the customizer. That throw escapes the section and takes the whole
  // bundle down — a blank storefront, not a missing section. Optional + an
  // early return degrades to nothing instead.
  const product = useProductOptional();
  const { addItem } = useCart();
  // The SDK derives `availability` and `isComplete` from `product.options`, so
  // handing it the raw product would have turned H3's silent wrong-size add
  // into a button that can never complete. Give it the derived axes as well.
  const productForVariants = useMemo(() => {
    if (!product) return NO_PRODUCT;
    if (product.options && product.options.length > 0) return product;
    const derived = optionAxes(product);
    if (derived.length === 0) return product;
    return {
      ...product,
      options: derived.map((a, i) => ({ name: a.name, position: i, values: a.values })),
    };
  }, [product]);
  const vs = useVariantSelection(productForVariants);
  const sizeChart = useProductSizeChart();
  const metafields = useMetafields("product");
  const quickAdd = useQuickAdd();
  const bag = useCartDrawer();

  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const guideRef = useRef<HTMLDivElement>(null);
  useFocusTrap(guideOpen, guideRef);

  // RelatedProductsState is { items, loading, error } — NOT { products }.
  const { items: related } = useRelatedProducts(product?.id, { limit: 8 });
  const { stats } = useProductReviews(product?.id ? [String(product.id)] : []);

  useEffect(() => {
    if (!guideOpen || typeof document === "undefined") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setGuideOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [guideOpen]);

  // The added-confirmation is transient; without the cleanup a fast second add
  // leaves a stale timer that hides the new confirmation early.
  useEffect(() => {
    if (!added) return;
    const id = setTimeout(() => setAdded(false), 4000);
    return () => clearTimeout(id);
  }, [added]);

  const images = useMemo(() => {
    const base = productImages(product).map((i) => ({ url: i.url, alt: i.alt }));
    // A variant with its own image leads, so picking a colour shows that colour.
    const variantImage = vs.variant?.image_url;
    if (!variantImage) return base;
    const rest = base.filter((i) => i.url !== variantImage);
    return [{ url: variantImage, alt: "" }, ...rest];
  }, [product, vs.variant]);

  if (!product) return null;

  const name = productName(product, locale) || product.name;
  const price = vs.variant?.price ?? product.price;
  const compareAt = vs.variant?.compare_at_price ?? product.compare_at_price;
  // H3: NOT `product.options ?? []`. The API returns an empty `options` array
  // for canonical opt-in-variant products while the variants still carry
  // `option_values`, so reading it directly rendered no picker at all and the
  // Add button shipped whatever variant happened to be first.
  const axes = productForVariants.options ?? [];
  const colorAxis = axes.find((a) => COLOR_AXIS.test(a.name));
  const sizeAxis = axes.find((a) => SIZE_AXIS.test(a.name));
  const otherAxes = axes.filter((a) => a !== colorAxis && a !== sizeAxis);

  const inStock = vs.variant ? vs.variant.is_in_stock !== false : product.in_stock !== false;
  const canBuy = inStock && (axes.length === 0 || vs.isComplete);
  const remaining = vs.variant?.inventory_quantity ?? 0;
  const lowStock = asBool(s.show_low_stock, true) && inStock && remaining > 0 && remaining <= 3;

  const fit = FIT_KEYS.map((key) => {
    const mf = metafields.find((m) => m.key === key);
    const value = mf ? String(mf.value ?? "") : "";
    return { key, value };
  }).filter((f) => f.value);

  const add = async (thenCheckout: boolean) => {
    if (!canBuy) {
      setError(t("product.choose_options", "Choose your options first"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await addItem(product.id, vs.variant?.id, qty, vs.selection);
      if (res && (res as { success?: boolean }).success === false) {
        setError(t("product.add_failed", "Couldn’t add that — try again"));
        return;
      }
      if (thenCheckout && typeof window !== "undefined") {
        window.location.href = "/checkout";
        return;
      }
      setAdded(true);
      // Confirm in the bag drawer rather than only inline: the shopper sees the
      // whole bag, the free-shipping progress and the offer nudge at the exact
      // moment they have committed to one item.
      bag.open(name);
    } catch {
      setError(t("product.add_failed", "Couldn’t add that — try again"));
    } finally {
      setBusy(false);
    }
  };

  const accordions = (
    [
      ["description", t("product.description", "Description"), product.description ?? ""],
      ["features", t("product.features", "Features"), asString(s.features_text)],
      ["details", t("product.details", "Details"), asString(s.details_text)],
      ["composition", t("product.composition", "Composition"), asString(s.composition_text)],
      ["care", t("product.care", "Care"), asString(s.care_text)],
      ["origin", t("product.origin", "Origin"), asString(s.origin_text)],
    ] as const
  ).filter(([key, , body]) => body && asBool(s[`show_${key}`], true));


  return (
    // Product microdata over the real panel — price, currency and availability
    // are the SAME values rendered above, so the markup cannot disagree with
    // the page. `<meta>` carries the machine-readable forms (ISO currency, a
    // schema.org availability URL) that the visible text doesn't spell out.
    <section className="gn-pdp" itemScope itemType="https://schema.org/Product">
      <div className="gn-container gn-pdp-grid">
        <div className="gn-pdp-media">
          <Gallery
            images={images}
            layout={asString(s.gallery_layout, "thumbs-start") as "thumbs-start" | "below"}
            showZoom={asBool(s.show_zoom, true)}
            title={name}
          />
        </div>

        <div className="gn-pdp-panel">
          <h1 className="gn-pdp-title" itemProp="name">
            {name}
          </h1>
          <div itemProp="offers" itemScope itemType="https://schema.org/Offer">
            <meta itemProp="price" content={String(price)} />
            <meta itemProp="priceCurrency" content={product.currency} />
            <meta
              itemProp="availability"
              content={
                inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
              }
            />
          </div>
          <Price amount={price} compareAt={compareAt} currency={product.currency} size="lg" />
          {/* Only renders when the offer genuinely beats N × the unit price —
              see lib/offers.tsx. */}
          <ProductOfferLine
            productId={String(product.id)}
            // H4: the payload field is `category_id`, not `category`. Reading
            // the wrong one made `offerIncludesProduct` under-promise on every
            // category-scoped offer, so the PDP strip never rendered — while
            // the cart nudge worked, because cart lines DO carry `category_id`.
            categoryId={
              (product as unknown as { category_id?: string | null }).category_id ??
              product.category ??
              null
            }
            unitPrice={price}
          />

          {asBool(s.show_rating, true) && stats.count > 0 && (
            <a href="#gn-pdp-reviews" className="gn-pdp-rating">
              <span aria-hidden="true">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={cx("gn-star", roundHalf(stats.average) >= n ? "is-full" : "is-empty")}
                  >
                    ★
                  </span>
                ))}
              </span>
              <span className="gn-label">
                {t("reviews.from_n", "from {{n}} reviews").replace("{{n}}", String(stats.count))}
              </span>
            </a>
          )}

          {colorAxis && asBool(s.show_color_swatches, true) && (
            <fieldset className="gn-axis">
              <legend className="gn-label gn-axis-legend">
                {colorAxis.name}
                {vs.selection[colorAxis.name] && (
                  <span className="gn-axis-chosen">{vs.selection[colorAxis.name]}</span>
                )}
              </legend>
              <div className="gn-axis-values">
                {colorAxis.values.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="gn-swatch"
                    title={value}
                    aria-label={value}
                    aria-pressed={vs.selection[colorAxis.name] === value}
                    data-selected={vs.selection[colorAxis.name] === value || undefined}
                    onClick={() => vs.select(colorAxis.name, value)}
                  >
                    <span className="gn-swatch-label">{value}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {[sizeAxis, ...otherAxes].filter(Boolean).map((axis) => {
            const a = axis!;
            const avail = vs.availability[a.name];
            return (
              <fieldset key={a.name} className="gn-axis">
                <legend className="gn-label gn-axis-legend">
                  {a.name}
                  {SIZE_AXIS.test(a.name) && asBool(s.show_size_guide, true) && (
                    <button
                      type="button"
                      className="gn-textlink gn-axis-guide"
                      onClick={() => setGuideOpen(true)}
                    >
                      {t("product.size_guide", "Size guide")}
                    </button>
                  )}
                </legend>
                <div className="gn-axis-values">
                  {a.values.map((value) => {
                    const selected = vs.selection[a.name] === value;
                    const unavailable = avail ? !avail.has(value) : false;
                    return (
                      <button
                        key={value}
                        type="button"
                        className="gn-chip"
                        aria-pressed={selected}
                        data-selected={selected || undefined}
                        data-unavailable={unavailable || undefined}
                        onClick={() => vs.select(a.name, value)}
                      >
                        {value}
                        {unavailable && (
                          <span className="gn-sr-only">{` — ${t("product.sold_out", "Sold out")}`}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          {lowStock && (
            <p className="gn-pdp-lowstock gn-label">
              {t("product.only_n_left", "Only {{count}} left").replace(
                "{{count}}",
                String(remaining),
              )}
            </p>
          )}

          {asBool(s.show_quantity, true) && (
            <div className="gn-qty">
              <span className="gn-label">{t("product.quantity", "Quantity")}</span>
              <div className="gn-qty-control">
                <button
                  type="button"
                  aria-label={t("product.decrease", "Decrease quantity")}
                  disabled={qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <span aria-live="polite">{qty}</span>
                <button
                  type="button"
                  aria-label={t("product.increase", "Increase quantity")}
                  onClick={() => setQty((q) => q + 1)}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="gn-pdp-actions">
            <button
              type="button"
              className="gn-btn gn-btn-primary"
              disabled={busy || !inStock}
              onClick={() => add(false)}
            >
              {!inStock
                ? t("product.sold_out", "Sold out")
                : busy
                  ? t("product.adding", "Adding…")
                  : t("product.add_to_cart", "Add to cart")}
            </button>
            {asBool(s.show_buy_now, true) && inStock && (
              <button
                type="button"
                className="gn-btn gn-btn-secondary"
                disabled={busy}
                onClick={() => add(true)}
              >
                {t("product.buy_now", "Buy it now")}
              </button>
            )}
          </div>

          {error && (
            <p className="gn-formnote" role="alert">
              {error}
            </p>
          )}
          {/* Returns promise sits directly under the buttons — the objection
              belongs where the decision is being made, not below the fold.
              Same placement as the reference PDP.

              Gating on the setting alone meant it never appeared: presets seed
              `settings: {}`, and schema defaults do not exist at render time.
              The single highest-intent line on the page shipped invisible.
              Fall back to the locale string, exactly as every other copy slot
              in this theme does. `show_return_note` still turns it off. */}
          {s.show_return_note !== false && (
            <p className="gn-pdp-assure">
              <IconShield size={16} />
              {asString(s.return_note) ||
                t("product.return_note", "Free returns within 14 days")}
            </p>
          )}

          {added && (
            <p className="gn-formnote is-ok" role="status">
              {t("product.added", "Added to your bag")} ·{" "}
              <Link to="/cart" className="gn-textlink">
                {t("general.cart", "Cart")}
              </Link>
            </p>
          )}

          {fit.length > 0 && (
            <dl className="gn-fitspec">
              {fit.map(({ key, value }) => (
                <div key={key} className="gn-fitspec-row">
                  <dt className="gn-label">{t(`fit.${key}`, key.replace(/_/g, " "))}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {accordions.length > 0 && (
            <div className="gn-pdp-accordions">
              {accordions.map(([key, label, body], i) => (
                <AccordionItem key={key} title={label} defaultOpen={i === 0}>
                  <div
                    className="gn-richtext"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
                  />
                </AccordionItem>
              ))}
            </div>
          )}

          {/* A second buy button after the content sections. By the time a
              shopper has read composition and care they are at the bottom of a
              long panel, and making them scroll back up to act is friction for
              nothing. The reference PDP does the same. */}
          {accordions.length > 0 && inStock && (
            <button
              type="button"
              className="gn-btn gn-btn-primary gn-pdp-repeat-cta"
              disabled={busy}
              onClick={() => add(false)}
            >
              {busy ? t("product.adding", "Adding…") : t("product.add_to_cart", "Add to cart")}
            </button>
          )}

          {asBool(s.show_payment_marks, true) && (
            <div className="gn-pdp-pay">
              <PaymentMarks />
            </div>
          )}
        </div>
      </div>

      {asBool(s.show_related, true) && related.length > 0 && (
        <div className="gn-rail-section">
          <div className="gn-container gn-rail-head">
            <h2 className="gn-section-heading">
              {asString(s.related_title) || t("product.related", "You may also like")}
            </h2>
          </div>
          <div className="gn-container gn-rail-track" style={{ ["--gn-rail-per-view" as string]: "4" }}>
            {related.map((p: Product) => (
              <div key={p.id} className="gn-rail-item">
                <ProductCard product={p} locale={locale} onQuickAdd={quickAdd.open} />
              </div>
            ))}
          </div>
        </div>
      )}

      <span id="gn-pdp-reviews" />

      {/* Size guide — the product's own chart, or the store default, resolved by
          the SDK. Never invented: a wrong measurement table causes returns. */}
      {guideOpen && (
        <>
          <div className="gn-sheet-scrim is-open" onClick={() => setGuideOpen(false)} aria-hidden="true" />
          <div
            ref={guideRef}
            className="gn-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("product.size_guide", "Size guide")}
          >
            <div className="gn-sheet-head">
              <span className="gn-label">{t("product.size_guide", "Size guide")}</span>
              <button
                type="button"
                className="gn-icon-btn"
                aria-label={t("general.close", "Close")}
                onClick={() => setGuideOpen(false)}
              >
                <IconClose />
              </button>
            </div>
            <div className="gn-sheet-body">
              {sizeChart && sizeChart.rows && sizeChart.rows.length > 0 ? (
                <div className="gn-table-wrap">
                  <table className="gn-table">
                    <thead>
                      <tr>
                        <th scope="col">{t("product.size", "Size")}</th>
                        {(sizeChart.column_headers ?? []).map((col: string) => (
                          <th key={col} scope="col">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sizeChart.rows.map((row, i) => (
                        <tr key={i}>
                          {/* `size` is its own column, then `values` aligns to
                              `column_headers` — flattening them into one array
                              would shift every measurement one column left. */}
                          <th scope="row">{row.size}</th>
                          {(row.values ?? []).map((cell: string, j: number) => (
                            <td key={j}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="gn-pdp-return">
                  {t("product.size_guide_empty", "Message us on WhatsApp and we’ll help you pick.")}
                </p>
              )}
              {asString(s.size_guide_link) && (
                <Link to={asString(s.size_guide_link)} className="gn-textlink">
                  {t("product.full_fit_guide", "See the full fit guide")}
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      {/* Sticky buy bar, phones only. On mobile the buttons scroll out of view
          within one swipe of the gallery and never come back — this keeps the
          price and the action reachable from anywhere on the page, which is the
          single largest conversion lever on a long PDP. Hidden above 900px,
          where the panel is already sticky. */}
      <div className="gn-pdp-stickybar">
        <div className="gn-pdp-stickybar-inner">
          <div className="gn-pdp-stickybar-info">
            <p className="gn-pdp-stickybar-name">{name}</p>
            <Price amount={price} compareAt={compareAt} currency={product.currency} />
          </div>
          <button
            type="button"
            className="gn-btn gn-btn-primary"
            disabled={busy || !inStock}
            onClick={() => add(false)}
          >
            {!inStock
              ? t("product.sold_out", "Sold out")
              : busy
                ? t("product.adding", "Adding…")
                : t("product.add_to_cart", "Add to cart")}
          </button>
        </div>
      </div>

      {quickAdd.product && <QuickAddSheet product={quickAdd.product} onClose={quickAdd.close} />}
    </section>
  );
}
