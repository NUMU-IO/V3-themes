/**
 * tn-product — the product detail page.
 *
 * Reference anatomy (§7): a three-column desktop composition — gallery, then an
 * information column (rating · H1 · price row with the Save badge · assurance
 * strip · facts · variant rows), then a bordered purchase card holding the
 * quantity stepper, share, a charcoal `Add to cart ↗` and an orange
 * `Buy it now ↗`. Three accordions span the first two columns. Below 750 the
 * whole thing stacks and a sticky purchase bar follows the shopper down (D13).
 *
 * ## Everything on this page is DERIVED, never configured
 *
 * The reference's three product types look like three templates and are not:
 *
 *   • a **cap** shows colour swatches and no size row and no facts,
 *   • a **towel** shows one fixed `150x90` size chip and no colour,
 *   • a **tee** shows a fact list and S/M/L/XL and `Find my size`.
 *
 * All three fall out of the product's own data. There is deliberately no
 * "product type" setting: a merchant who adds a colour axis to a towel gets
 * swatches the moment they save, and nobody has to remember to flip a switch on
 * the theme as well. The only settings here turn features OFF.
 *
 * ## autoSelect: true — the opposite of quick add, on purpose
 *
 * `lib/quick-add.tsx` refuses to pick a size for the shopper, because in a grid
 * the choice would be invisible. Here the selection is on screen and labelled
 * ("Size (S)", "Color (Pink)"), exactly as the reference shows it, so
 * pre-selecting the default variant is honest and saves a tap. Same hook, other
 * setting, and the difference is the visibility of the choice.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Link,
  requestNavigate,
  sanitizeHtml,
  useCart,
  useLocale,
  useMetafields,
  useProductOptional,
  useProductSizeChart,
  useRelatedProducts,
  useResolvedSettings,
  useVariantSelection,
  type Product,
} from "@numueg/theme-sdk";
import {
  asBool,
  asNumber,
  asString,
  cx,
  productCurrency,
  productImages,
  productName,
  useInsideEditor,
  type SectionRenderProps,
} from "../lib/shared";
import { useT, type TFunction } from "../lib/i18n";
import { Price, SaveBadge } from "../lib/price";
import { isColorAxis, isSizeAxis, productAxes } from "../lib/filters";
import { optionAxes } from "../lib/quick-add";
import { ProductGallery, isVideoUrl, type GalleryItem } from "../lib/gallery";
import { Accordion } from "../lib/accordion";
import { useReviewSummary } from "../lib/reviews";
import { ProductCard } from "../lib/product-card";
import { QuickAddSheet, useQuickAdd } from "../lib/quick-add";
import {
  IconArrowUpRight,
  IconMinus,
  IconPlus,
  IconRefresh,
  IconShare,
  IconStar,
  IconTruck,
} from "../lib/icons";

/* Attribute keys that are machinery, not facts. Rendering these would put
   `variants: [object Object]` and the Arabic copy fields into the spec list. */
const NON_FACT_KEYS = new Set([
  "variants",
  "name_ar",
  "namear",
  "description_ar",
  "descriptionar",
  "size_chart",
  "sizechart",
  "video_url",
  "video",
  "label",
  "labels",
  "badges",
  "seo",
  "tags",
]);

const MAX_FACTS = 10;

/** `fabric_weight` → `Fabric weight`. Merchant keys are snake or camel case. */
function prettifyKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

interface Fact {
  label: string;
  value: string;
}

/**
 * The spec list.
 *
 * Public **metafields** first — that is the platform's intended mechanism for
 * merchant-defined typed fields, and `useMetafields` returns only public ones.
 * Then scalar `attributes`, because most stores today keep this information
 * there and a theme that ignored it would show an empty fact list on a
 * catalogue that plainly has facts in it.
 *
 * Only scalars: an object or array in `attributes` is structure, not a fact,
 * and stringifying it produces `[object Object]` on a live PDP.
 */
function readFacts(product: Product, metafields: { key: string; value: unknown }[]): Fact[] {
  const out: Fact[] = [];
  const seen = new Set<string>();

  const push = (rawKey: string, rawValue: unknown) => {
    if (out.length >= MAX_FACTS) return;
    const key = rawKey.trim();
    if (!key || NON_FACT_KEYS.has(key.toLowerCase()) || seen.has(key.toLowerCase())) return;
    if (rawValue === null || rawValue === undefined) return;
    if (typeof rawValue === "object") return;
    const value = String(rawValue).trim();
    if (!value || value === "null" || value === "undefined") return;
    seen.add(key.toLowerCase());
    out.push({ label: prettifyKey(key), value });
  };

  for (const m of metafields) push(m.key, m.value);
  const attrs = (product.attributes ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(attrs)) push(k, v);
  return out;
}

export default function TnProduct({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const locale = useLocale();
  const insideEditor = useInsideEditor();
  const product = useProductOptional();

  // `useProductOptional`, not `useProduct`: `useProduct` throws off a product
  // route, so a merchant who drags this section onto the homepage would blank
  // their whole storefront rather than see an empty slot.
  if (!product) {
    return insideEditor ? (
      <section className="tn-container tn-section">
        <div className="tn-editor-note">
          <p className="tn-label">{t("editor.pdp_note_title", "Product page only")}</p>
          <p className="tn-footer-text">
            {t(
              "editor.pdp_note",
              "This section renders a product, so it only has something to show on a product page.",
            )}
          </p>
        </div>
      </section>
    ) : null;
  }

  return <ProductBody instance={instance} settings={s} product={product} locale={locale} t={t} />;
}

/* The body is a separate component so the early return above can happen before
   any product-dependent hook runs — calling hooks conditionally is the one
   thing React will not forgive. */
function ProductBody({
  settings: s,
  product,
  locale,
  t,
}: {
  instance: SectionRenderProps["instance"];
  settings: Record<string, unknown>;
  product: Product;
  locale: string;
  t: TFunction;
}) {
  const { addItem } = useCart();
  const insideEditor = useInsideEditor();
  const metafields = useMetafields("product");
  const sizeChart = useProductSizeChart(product);
  const reviews = useReviewSummary(product.id);
  const vs = useVariantSelection(product, { autoSelect: true });

  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [shared, setShared] = useState("");
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const variantsRef = useRef<HTMLDivElement | null>(null);

  const name = productName(product, locale) || product.name;
  const currency = productCurrency(product);
  const price = vs.variant?.price ?? product.price;
  const compareAt = vs.variant?.compare_at_price ?? product.compare_at_price;
  const soldOut =
    product.in_stock === false || (vs.variant ? vs.variant.is_in_stock === false : false);

  /* ── Gallery ─────────────────────────────────────────────────────────── */
  const items = useMemo<GalleryItem[]>(() => {
    const images = productImages(product).map((img) => ({
      url: img.url,
      alt: img.alt,
      video: isVideoUrl(img.url),
    }));
    // A product video has no column of its own on this platform; merchants who
    // have one keep it in `attributes`. Read both spellings, append it last —
    // which is where the reference puts its video thumb.
    const attrs = (product.attributes ?? {}) as Record<string, unknown>;
    const videoUrl = asString(attrs.video_url) || asString(attrs.video);
    if (videoUrl) images.push({ url: videoUrl, alt: "", video: true });
    return images;
  }, [product]);

  /* ── Variant axes ────────────────────────────────────────────────────── */
  // `optionAxes` from quick-add.tsx, NOT `product.options ?? []`. On an
  // opt-in-variant product the API returns `options: []` while the variants
  // still carry `option_values`; reading only `options` renders no picker at
  // all and the PDP silently adds whatever variant came first.
  const axes = useMemo(() => optionAxes(product), [product]);
  // Swatch colours live on the axis metadata, which is a different shape again.
  const colorMeta = useMemo(() => {
    const map = new Map<string, { hex?: string; image?: string }>();
    for (const axis of productAxes(product)) {
      if (!isColorAxis(axis.name)) continue;
      for (const v of axis.values) map.set(v.label.toLowerCase(), { hex: v.hex, image: v.image });
    }
    return map;
  }, [product]);

  const facts = useMemo(() => readFacts(product, metafields), [product, metafields]);

  /**
   * Which values on each axis still lead to something buyable.
   *
   * NOT `vs.availability`: the SDK computes that only for axes that are still
   * UNSELECTED ("given Size=M, which colours are left"). This PDP auto-selects
   * every axis on first render, so there are never any unselected axes and the
   * SDK's map is permanently empty — meaning a sold-out size would render as an
   * ordinary, clickable chip and the shopper would only discover it on Add to
   * cart. Same question, asked per value with the OTHER axes held at the
   * current selection.
   *
   * A store whose axes come only from `attributes.variants` has no variant rows
   * to check, so nothing is greyed — unknown is not the same as unavailable.
   */
  const axisAvailability = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const variants = product.variants ?? [];
    if (variants.length === 0) return map;
    for (const axis of axes) {
      const ok = new Set<string>();
      for (const value of axis.values) {
        const probe = { ...vs.selection, [axis.name]: value };
        const buyable = variants.some((v) => {
          const ov = (v.option_values ?? v.options ?? {}) as Record<string, string>;
          const matches = Object.entries(probe).every(([k, val]) => ov[k] === val);
          return matches && (v.is_in_stock ?? v.in_stock ?? true);
        });
        if (buyable) ok.add(value);
      }
      map.set(axis.name, ok);
    }
    return map;
  }, [product.variants, axes, vs.selection]);

  /* ── Actions ─────────────────────────────────────────────────────────── */
  const add = useCallback(async (): Promise<boolean> => {
    if (axes.length > 0 && !vs.isComplete) {
      setError(t("product.choose_options", "Choose your options first"));
      variantsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    setBusy(true);
    setError("");
    try {
      const res = await addItem(product.id, vs.variant?.id, quantity, vs.selection);
      if (res && (res as { success?: boolean }).success === false) {
        setError(t("product.add_failed", "Couldn’t add that — try again"));
        return false;
      }
      setAdded(true);
      return true;
    } catch {
      setError(t("product.add_failed", "Couldn’t add that — try again"));
      return false;
    } finally {
      setBusy(false);
    }
  }, [addItem, axes.length, product.id, quantity, t, vs.isComplete, vs.selection, vs.variant?.id]);

  // Buy it now = add, then go to checkout. The platform has no direct
  // "checkout with this line" endpoint, and inventing one client-side would
  // bypass the cart the checkout actually reads.
  const buyNow = useCallback(async () => {
    if (!(await add())) return;
    if (!requestNavigate("/checkout") && typeof window !== "undefined") {
      window.location.href = "/checkout";
    }
  }, [add]);

  const share = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    try {
      if (typeof nav.share === "function") {
        await nav.share({ title: name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      // A silent copy is indistinguishable from a broken button.
      setShared(t("product.link_copied", "Link copied"));
      window.setTimeout(() => setShared(""), 2500);
    } catch {
      /* The share sheet was dismissed, or the clipboard was denied. Neither is
         an error worth showing. */
    }
  }, [name, t]);

  /* ── Settings ────────────────────────────────────────────────────────── */
  const showRating = asBool(s.show_rating, true);
  const showSave = asBool(s.show_save_badge, true);
  const showAssurance = asBool(s.show_assurance_strip, true);
  const showFacts = asBool(s.show_facts, true);
  const showQuantity = asBool(s.show_quantity, true);
  const showShare = asBool(s.show_share, true);
  const showBuyNow = asBool(s.show_buy_now, true);
  const showSticky = asBool(s.show_sticky_bar, true);
  const showRelated = asBool(s.show_related, true);
  const sizeGuideLink = asString(s.size_guide_link, "/size-guide");
  // Gated on there BEING a chart. The reference shows "Find my size" on the tee
  // and not on the towel, and the difference is not the product type — it is
  // that only one of them has sizing to show. A link to an empty size guide is
  // worse than no link.
  const showFindMySize =
    asBool(s.show_find_my_size, true) && Boolean(sizeGuideLink) && Boolean(sizeChart);

  const description = product.description ?? "";
  const safeDescription = useMemo(() => sanitizeHtml(description), [description]);
  const shippingBody = asString(s.shipping_body);
  const safeShipping = useMemo(() => sanitizeHtml(shippingBody), [shippingBody]);
  const returnsBody = asString(s.returns_body);
  const safeReturns = useMemo(() => sanitizeHtml(returnsBody), [returnsBody]);

  const addLabel = soldOut
    ? t("common.sold_out", "Sold out")
    : busy
      ? t("product.adding", "Adding…")
      : added
        ? t("product.added", "Added to bag")
        : t("common.add_to_cart", "Add to cart");

  /* ── Purchase controls, shared by the card and the sticky bar ────────── */
  const purchase = (
    <>
      {showQuantity && (
        <div className="tn-buy-row">
          <div className="tn-qty">
            <button
              type="button"
              className="tn-qty-btn"
              aria-label={t("product.decrease", "Decrease quantity")}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <IconMinus size={16} />
            </button>
            <input
              type="number"
              className="tn-qty-input"
              min={1}
              value={quantity}
              aria-label={t("product.quantity", "Quantity")}
              onChange={(e) => {
                const n = Number(e.target.value);
                setQuantity(Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1);
              }}
            />
            <button
              type="button"
              className="tn-qty-btn"
              aria-label={t("product.increase", "Increase quantity")}
              onClick={() => setQuantity((q) => q + 1)}
            >
              <IconPlus size={16} />
            </button>
          </div>
          {showShare && (
            <button
              type="button"
              className="tn-icon-btn tn-share-btn"
              aria-label={t("product.share", "Share")}
              onClick={share}
            >
              <IconShare size={18} />
            </button>
          )}
        </div>
      )}

      <div className="tn-buy-actions" ref={ctaRef}>
        <button
          type="button"
          className="tn-btn tn-btn-dark tn-buy-cta"
          onClick={add}
          disabled={busy || soldOut}
        >
          {addLabel}
          {!soldOut && <IconArrowUpRight size={14} className="tn-flip-rtl" />}
        </button>
        {showBuyNow && (
          <button
            type="button"
            className="tn-btn tn-btn-primary tn-buy-cta"
            onClick={buyNow}
            disabled={busy || soldOut}
          >
            {t("common.buy_now", "Buy it now")}
            <IconArrowUpRight size={14} className="tn-flip-rtl" />
          </button>
        )}
      </div>

      {/* Colour is never the only carrier — the words are the message. */}
      {error && (
        <p className="tn-formnote is-error" role="alert">
          {error}
        </p>
      )}
      {shared && (
        <p className="tn-formnote" role="status" aria-live="polite">
          {shared}
        </p>
      )}
    </>
  );

  return (
    <section className="tn-section tn-pdp">
      <div className="tn-container">
        <div className="tn-pdp-grid">
          <div className="tn-pdp-media">
            <ProductGallery
              items={items}
              ratio={asString(s.gallery_ratio, "natural")}
              showZoom={asBool(s.show_zoom, true)}
              showThumbs={asBool(s.show_thumbs, true)}
              productName={name}
            />
          </div>

          <div className="tn-pdp-info">
            {/* Real reviews or none. `count === 0` renders nothing rather than
                five empty stars, which reads as a rating rather than an
                absence. */}
            {showRating && reviews && reviews.count > 0 && (
              <p className="tn-pdp-rating">
                <Stars value={reviews.average} />
                <span className="tn-pdp-reviewcount">
                  {(reviews.count === 1
                    ? t("product.review_one", "{{n}} review")
                    : t("product.review_other", "{{n}} reviews")
                  ).replace("{{n}}", String(reviews.count))}
                </span>
                <span className="tn-sr">
                  {t("reviews.rating_of_5", "{{n}} out of 5").replace(
                    "{{n}}",
                    reviews.average.toFixed(1),
                  )}
                </span>
              </p>
            )}

            <h1 className="tn-pdp-title">{name}</h1>

            <div className="tn-pdp-pricerow">
              <Price amount={price} compareAt={compareAt} currency={currency} size="lg" />
              {showSave && (
                <SaveBadge
                  amount={price}
                  compareAt={compareAt}
                  currency={currency}
                  label={t("product.save", "Save")}
                />
              )}
            </div>

            {showAssurance && (
              <ul className="tn-assure">
                <li>
                  <IconTruck size={14} />
                  {asString(s.assurance_1, "Delivery 2–3 days")}
                </li>
                <li>
                  <IconRefresh size={14} />
                  {asString(s.assurance_2, "Easy exchange & returns")}
                </li>
              </ul>
            )}

            {showFacts && facts.length > 0 && (
              <ul className="tn-facts">
                {facts.map((f) => (
                  <li key={f.label}>
                    <strong>{f.label}:</strong> {f.value}
                  </li>
                ))}
              </ul>
            )}

            {/* Rendered only when there ARE axes — the block carries a hairline
                above it (the reference draws one over "Color (Pink)"), and an
                empty bordered div would leave a stray rule across the column on
                every product that has no options at all. */}
            {axes.length > 0 && (
              <div ref={variantsRef} className="tn-pdp-axes">
                {axes.map((axis) => {
                const chosen = vs.selection[axis.name];
                const isColor = isColorAxis(axis.name);
                return (
                  <fieldset key={axis.name} className="tn-axis">
                    <legend className="tn-axis-legend tn-pdp-axislabel">
                      {axis.name}
                      {chosen ? ` (${chosen})` : ""}
                    </legend>
                    <div className={cx("tn-axis-values", isColor && "is-swatches")}>
                      {axis.values.map((value) => {
                        const selected = chosen === value;
                        const avail = axisAvailability.get(axis.name);
                        const unavailable = avail ? !avail.has(value) : false;
                        const meta = colorMeta.get(value.toLowerCase());
                        return (
                          <button
                            key={value}
                            type="button"
                            className={cx(isColor ? "tn-swatch-btn" : "tn-chip")}
                            data-selected={selected || undefined}
                            data-unavailable={unavailable || undefined}
                            aria-pressed={selected}
                            /* A swatch shows no text, so the colour name has to
                               reach assistive tech some other way. */
                            aria-label={isColor ? `${axis.name}: ${value}` : undefined}
                            onClick={() => vs.select(axis.name, value)}
                          >
                            {isColor ? (
                              <span
                                className={cx(
                                  "tn-swatch",
                                  !meta?.hex && !meta?.image && "is-unknown",
                                )}
                                style={
                                  meta?.image
                                    ? { backgroundImage: `url(${meta.image})` }
                                    : meta?.hex
                                      ? { background: meta.hex }
                                      : undefined
                                }
                                aria-hidden="true"
                              />
                            ) : (
                              value
                            )}
                            {unavailable && (
                              <span className="tn-sr">{` — ${t("common.sold_out", "Sold out")}`}</span>
                            )}
                          </button>
                        );
                      })}

                      {/* Only on the SIZE axis — a "find my size" link next to a
                          colour row is noise. */}
                      {showFindMySize && isSizeAxis(axis.name) && (
                        <Link to={sizeGuideLink} className="tn-btn tn-btn-dark tn-findsize">
                          {t("product.find_my_size", "Find my size")}
                        </Link>
                      )}
                    </div>
                  </fieldset>
                );
                })}
              </div>
            )}
          </div>

          {/* ONE purchase block, moved by grid placement — never rendered twice
              and hidden with CSS. A duplicated block puts two of every control
              in the DOM, and `ctaRef` would then point at whichever copy
              rendered last: on a phone that is the hidden desktop card, so the
              IntersectionObserver below would see an element that is never
              visible and pin the sticky bar open for the whole page. */}
          <aside className="tn-pdp-buy" aria-label={t("product.purchase", "Purchase")}>
            <div className="tn-card tn-pdp-buycard">
              {showQuantity && <p className="tn-pdp-qtylabel">{t("product.quantity", "Quantity")}</p>}
              {purchase}
            </div>
          </aside>

          <div className="tn-pdp-accordions">
            {(description || sizeChart) && (
              <Accordion title={asString(s.acc_1_title, "Size chart & description")}>
                {sizeChart && <SizeTable chart={sizeChart} t={t} />}
                {description && (
                  <div
                    className="tn-richtext"
                    dangerouslySetInnerHTML={{ __html: safeDescription }}
                  />
                )}
              </Accordion>
            )}
            {shippingBody && (
              <Accordion title={asString(s.acc_2_title, "Shipping information")}>
                <div className="tn-richtext" dangerouslySetInnerHTML={{ __html: safeShipping }} />
              </Accordion>
            )}
            {returnsBody && (
              <Accordion title={asString(s.acc_3_title, "Return policy")}>
                <div className="tn-richtext" dangerouslySetInnerHTML={{ __html: safeReturns }} />
              </Accordion>
            )}

            {/* Same pattern as the footer's newsletter block: an empty
                accordion is hidden on the storefront, and the merchant is told
                WHY in the editor. Shipping times and the return window are the
                two things a COD shopper looks for hardest, so silently
                shipping a PDP without them is expensive and invisible. */}
            {insideEditor && !shippingBody && !returnsBody && (
              <div className="tn-editor-note">
                <p className="tn-label">
                  {t("editor.acc_note_title", "Shipping and returns are hidden")}
                </p>
                <p className="tn-footer-text">
                  {t(
                    "editor.acc_note",
                    "Fill in Shipping information and Return policy on this section and the two accordions appear. Empty ones stay hidden from shoppers.",
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showRelated && (
        <RelatedRail
          productId={product.id}
          locale={locale}
          title={asString(s.related_title) || t("product.related", "You may also like")}
          limit={asNumber(s.related_limit, 4)}
        />
      )}

      {/* Reserves the height the fixed bar occupies, so the last of the footer
          is not permanently hidden behind it. Rendered only when the bar is
          enabled, rather than as a blanket rule on the product template — a
          merchant who turns the bar off should not get dead space instead. */}
      {showSticky && <div className="tn-stickybar-spacer" aria-hidden="true" />}

      {showSticky && (
        <StickyBar
          ctaRef={ctaRef}
          product={product}
          name={name}
          price={price}
          compareAt={compareAt}
          currency={currency}
          selection={vs.selection}
          soldOut={soldOut}
          busy={busy}
          label={addLabel}
          onAdd={add}
          onChoose={() =>
            variantsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
          }
          hasAxes={axes.length > 0}
          t={t}
        />
      )}
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Pieces
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Five stars, filled to the nearest whole one.
 *
 * Whole stars only, deliberately: `IconStar` is a solid path filled with
 * `currentColor`, so a "half" would have to be faked with a second clipped
 * copy — and a fake half star is a rating claim rendered by CSS. The exact
 * average goes to assistive tech as text in the row above, which is where a
 * precise number is actually readable.
 *
 * `aria-hidden` because the row already states the rating and the review count
 * in words; five unlabelled glyphs announced individually are noise.
 */
function Stars({ value }: { value: number }) {
  const filled = Math.round(value);
  return (
    <span className="tn-stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar key={i} size={14} className={cx(i <= filled && "is-full")} />
      ))}
    </span>
  );
}

/**
 * The size chart, as a real `<table>`.
 *
 * A grid of divs looks identical and tells a screen reader nothing about which
 * measurement belongs to which size — which is the entire content of the table.
 */
function SizeTable({ chart, t }: { chart: { column_headers: string[]; rows: Array<{ size: string; values: string[] }>; unit?: string; notes?: string }; t: TFunction }) {
  if (!chart.rows?.length) return null;
  return (
    <div className="tn-sizetable-wrap">
      <table className="tn-sizetable">
        <caption className="tn-sr">{t("product.size_chart", "Size chart")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("product.size", "Size")}</th>
            {chart.column_headers.map((h) => (
              <th key={h} scope="col">
                {h}
                {chart.unit ? ` (${chart.unit})` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((row) => (
            <tr key={row.size}>
              <th scope="row">{row.size}</th>
              {row.values.map((v, i) => (
                <td key={`${row.size}-${i}`}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {chart.notes && <p className="tn-footer-text tn-sizetable-note">{chart.notes}</p>}
    </div>
  );
}

/**
 * Related products.
 *
 * `useRelatedProducts` hits `/api/storefront/products/{id}/related`, a host
 * route that exists — before it did, the SDK's request fell through to the
 * no-404 catch-all, got HTML with a 200, and every V3 theme's PDP silently
 * showed nothing. Renders nothing at all when there is nothing to show, rather
 * than an empty heading.
 */
function RelatedRail({
  productId,
  locale,
  title,
  limit,
}: {
  productId: string;
  locale: string;
  title: string;
  limit: number;
}) {
  const { items, loading } = useRelatedProducts(productId, { limit });
  const quickAdd = useQuickAdd();
  if (loading || items.length === 0) return null;
  return (
    <div className="tn-container tn-pdp-related">
      <h2 className="tn-rail-title">{title}</h2>
      <div
        className="tn-grid"
        style={
          { "--tn-cols-tablet": 4, "--tn-cols-desktop": 4 } as React.CSSProperties
        }
      >
        {items.map((p) => (
          <ProductCard key={p.id} product={p} locale={locale} onQuickAdd={quickAdd.open} />
        ))}
      </div>
      {quickAdd.product && <QuickAddSheet product={quickAdd.product} onClose={quickAdd.close} />}
    </div>
  );
}

/**
 * The sticky mobile purchase bar (D13).
 *
 * Shown only once the real Add-to-cart has scrolled out of view — a bar that is
 * present while the button it duplicates is on screen is two buttons doing one
 * job, and it eats 90px of a phone screen for nothing.
 *
 * IntersectionObserver rather than a scroll listener: it costs nothing per
 * frame and it asks the question directly ("is the CTA visible") instead of
 * inferring it from a pixel offset that breaks the moment the page above it
 * changes height.
 */
function StickyBar({
  ctaRef,
  product,
  name,
  price,
  compareAt,
  currency,
  selection,
  soldOut,
  busy,
  label,
  onAdd,
  onChoose,
  hasAxes,
  t,
}: {
  ctaRef: React.RefObject<HTMLDivElement | null>;
  product: Product;
  name: string;
  price: number | string | null | undefined;
  compareAt: number | string | null | undefined;
  currency?: string;
  selection: Record<string, string>;
  soldOut: boolean;
  busy: boolean;
  label: string;
  onAdd: () => void;
  onChoose: () => void;
  hasAxes: boolean;
  t: TFunction;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => setVisible(entries.some((e) => !e.isIntersecting)),
      { rootMargin: "0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ctaRef]);

  const image = productImages(product)[0];
  const chosen = Object.values(selection).filter(Boolean).join(" · ");

  return (
    <div className={cx("tn-stickybar", visible && "is-visible")} aria-hidden={!visible}>
      <div className="tn-stickybar-main">
        {image && (
          <span className="tn-plate tn-stickybar-thumb">
            <Image src={image.url} alt="" sizes="48px" loading="lazy" />
          </span>
        )}
        <div className="tn-stickybar-meta">
          <p className="tn-stickybar-title">{name}</p>
          <span className="tn-stickybar-prices">
            <Price amount={price} compareAt={compareAt} currency={currency} />
            {/* Same component as the main price row, not a second hand-rolled
                copy of the arithmetic — one place decides what "Save" means. */}
            <SaveBadge
              amount={price}
              compareAt={compareAt}
              currency={currency}
              label={t("product.save", "Save")}
            />
          </span>
        </div>
        <button
          type="button"
          className="tn-btn tn-btn-dark tn-stickybar-cta"
          onClick={onAdd}
          disabled={busy || soldOut}
          /* Not reachable by keyboard while the bar is hidden — otherwise Tab
             lands on an invisible control halfway up the page. */
          tabIndex={visible ? undefined : -1}
        >
          {label}
        </button>
      </div>
      {hasAxes && (
        <div className="tn-stickybar-variant">
          <span className="tn-stickybar-chosen">{chosen}</span>
          <button
            type="button"
            className="tn-textlink"
            onClick={onChoose}
            tabIndex={visible ? undefined : -1}
          >
            {t("product.choose_options_short", "Choose options")}
          </button>
        </div>
      )}
    </div>
  );
}
