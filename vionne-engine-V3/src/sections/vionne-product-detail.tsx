"use client";
import { useEffect, useState } from "react";
import {
  Link,
  Money,
  AddToCartButton,
  sanitizeHtml,
  useLocale,
  useProductOptional,
  useResolvedSettings,
  useTranslation,
  useVariantSelection,
  useRelatedProducts,
  useCart,
  useProducts,
  type Product,
  type ProductVariant,
} from "@numueg/theme-sdk";
import { Check, Minus, Plus, ShoppingBag, Tag, Truck, RotateCcw, ShieldCheck, ArrowRight, X } from "lucide-react";
import { motion } from "framer-motion";
import { asNumber, asString, localized, productCurrency, productImage, type SectionRenderProps } from "./_shared";
import { bestCartNudge, pdpOfferLine, qtyBogoHint, useActivePromotions } from "./_promotions";
import { InlineEditable } from "./_inline-editable";
import { PricePair } from "./_price";
import { recordRecentlyViewed, useRecentlyViewed } from "./_recently-viewed";
import { ReviewsSection, Stars, useProductReviews } from "./_reviews";

/**
 * Vionne product-detail section.
 *
 * Faithful port of the V2 Vionne PDP look (gallery-left / info-right, the
 * `vn-*` utility classes + Vionne tokens) re-plumbed on the V3 SDK.
 *
 * V2 sources mirrored:
 *  - themes/sections/product-detail/ProductDetailSection.tsx (settings → flags)
 *  - components/store/shared/BaseProductDetailPage.tsx (markup: breadcrumb,
 *    2-col grid, thumbnail rail, tags/name/price/description, size + color
 *    selectors with sold-out treatment, quantity stepper + add-to-cart,
 *    trust guarantees row, related-products grid)
 *  - components/store/shared/useProductDetail.ts (derived: discount %, related,
 *    per-axis sold-out lookup → here delegated to the SDK's useVariantSelection
 *    availability map)
 *  - components/store/vionne/VionneProductCard.tsx (related card markup +
 *    vn-product-card / vn-product-image / sale-badge classes)
 *
 * Data/actions are SDK-native: the host wraps the PDP in ProductProvider so the
 * current product comes from `useProductOptional()`; variant pick + selected
 * variant from `useVariantSelection()`; add-to-cart drives `useCart().addItem`
 * via the chosen variant id; related rail from `useRelatedProducts()`.
 *
 * Null-safety: when there's no product in context (editor with no product, or a
 * not-found slug) we render a graceful placeholder card with a "Back to shop"
 * link instead of crashing or showing a blank page.
 */
const GALLERY_ASPECT: Record<string, string> = {
  "3-4": "aspect-[3/4]",
  "4-5": "aspect-[4/5]",
  "1-1": "aspect-square",
  "4-3": "aspect-[4/3]",
};

export default function VionneProductDetail({ instance, sectionId }: SectionRenderProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const s = useResolvedSettings(instance);

  const showRating = s.show_rating ?? true;
  const showStock = s.show_stock ?? true;
  const showGuarantees = s.show_guarantees ?? true;
  const showRelated = s.show_related_products ?? true;
  const showDescription = s.show_description !== false;
  const relatedCount = asNumber(s.related_products_count, 4);
  const relatedTitle =
    asString(s.related_title) || localized(locale, "You may also like", "ممكن يعجبك كمان");
  const galleryAspectClass =
    GALLERY_ASPECT[asString(s.gallery_aspect, "3-4")] ?? GALLERY_ASPECT["3-4"];
  // Trust guarantees — V2 copy as bilingual defaults, now each editable
  // (label + detail) instead of hardcoded in the markup. Icons stay fixed
  // per slot (shipping / returns / authentic).
  const guarantees = [
    { icon: Truck, key: "guarantee_1", label: asString(s.guarantee_1_label) || localized(locale, "Fast Shipping", "شحن سريع"), desc: asString(s.guarantee_1_desc) || localized(locale, "3-5 days", "٣-٥ أيام") },
    { icon: RotateCcw, key: "guarantee_2", label: asString(s.guarantee_2_label) || localized(locale, "Easy Returns", "إرجاع سهل"), desc: asString(s.guarantee_2_desc) || localized(locale, "14 days", "١٤ يوم") },
    { icon: ShieldCheck, key: "guarantee_3", label: asString(s.guarantee_3_label) || localized(locale, "Authentic", "أصلي"), desc: asString(s.guarantee_3_desc) || localized(locale, "100% Genuine", "أصلي ١٠٠٪") },
  ];

  const product = useProductOptional();

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  // useVariantSelection wants a {options, variants}-shaped object; it tolerates
  // missing axes (single-variant products get `{}` selections). Always call the
  // hook (hooks can't be conditional) — pass a safe empty shell when product is
  // null so the rules-of-hooks stay satisfied.
  const vs = useVariantSelection(
    product ?? { options: [], variants: [] },
  );

  const related = useRelatedProducts(showRelated && product ? product.id : null, {
    limit: relatedCount,
  });

  // A3 — one compact offer line near the price ("Spend X, save Y%"), sourced
  // from the store's auto-discount promotions. Before the early return
  // (rules of hooks).
  const showOfferLine = s.show_offer_line !== false;
  const promos = useActivePromotions("/product", locale);
  const offerLine = showOfferLine
    ? pdpOfferLine(promos?.auto_discounts, product?.currency || "EGP", locale)
    : null;

  // A4 — post-add-to-cart drawer. The moment after "Add to bag" is the
  // highest-attention point in the session; instead of only bumping the cart
  // badge, confirm the add + show the offer nudge + two suggestions. All
  // hooks live before the early return (rules of hooks).
  const showAddedDrawer = s.show_added_drawer !== false;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { cart } = useCart();
  const { products: catalogProducts } = useProducts();
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  // Honest reviews — real aggregate for the header stars + the reviews block.
  const showReviews = s.show_reviews !== false;
  const { stats: reviewStats } = useProductReviews(product?.id);

  // A8 — recently-viewed trail. Record this visit + read the prior trail
  // (excluding this product). Hooks before the early return.
  const showRecentlyViewed = s.show_recently_viewed !== false;
  const recentlyViewedTitle =
    asString(s.recently_viewed_title) || localized(locale, "Recently viewed", "شفتيها قريب");
  const recentlyViewed = useRecentlyViewed(product?.id);
  useEffect(() => {
    if (product) recordRecentlyViewed(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // ── Graceful no-product state (editor preview / not-found) ─────────
  if (!product) {
    return (
      <div className="bg-background min-h-[50vh] flex items-center justify-center px-4 py-20 text-center">
        <div className="max-w-sm">
          <span className="vn-eyebrow block mb-3 text-[var(--vn-muted)]">{localized(locale, "Product", "المنتج")}</span>
          <h1 className="vn-heading text-2xl md:text-3xl text-[var(--vn-ink)] mb-3">
            {localized(locale, "No product to show yet", "لا يوجد منتج لعرضه بعد")}
          </h1>
          <p className="text-sm text-[var(--vn-muted)] mb-7 leading-relaxed">
            {localized(locale, "Open a product from the shop to see its details here.", "افتحي أي منتج من المتجر علشان تشوفي تفاصيله هنا.")}
          </p>
          <Link to="/products" className="vn-btn vn-btn-filled inline-flex">
            {localized(locale, "Browse products", "تصفّحي المنتجات")}
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images ?? [];
  const mainImage = images[activeImage]?.url ?? images[0]?.url;
  // Prefer the (selected or first) VARIANT price — that's the cents value the
  // catalog/Money expects. `product.price` is a different scale on some rows
  // (showed 100×), so only use it as a last resort, matching the home grid's
  // `variants?.[0]?.price ?? price` logic.
  const variantPrice =
    vs.variant?.price ?? product.variants?.[0]?.price ?? product.price ?? 0;
  const compareAt =
    vs.variant?.compare_at_price ??
    product.variants?.[0]?.compare_at_price ??
    product.compare_at_price ??
    undefined;
  const hasDiscount = typeof compareAt === "number" && compareAt > variantPrice;
  const discountPercent = hasDiscount
    ? Math.round(((compareAt - variantPrice) / compareAt) * 100)
    : 0;

  // Selected variant stock — used for the stock badge + buy-button disable.
  const selectedVariant: ProductVariant | null = vs.variant;
  const inStock = selectedVariant
    ? selectedVariant.is_in_stock !== false
    : product.in_stock !== false;
  const stockQty = selectedVariant?.inventory_quantity;
  const maxQty = typeof stockQty === "number" && stockQty > 0 ? stockQty : Infinity;

  // Tags drive the eyebrow labels (V2 showed product.tags as uppercase chips).
  const tags = (product.tags ?? []).filter(Boolean);

  const options = product.options ?? [];

  return (
    <div className="bg-background" data-testid="storefront-product-detail">
      {/* Extra mobile bottom padding clears the sticky add-to-cart bar (which
          sits above the dock); md restores the normal rhythm (no sticky bar). */}
      <div className="container mx-auto px-4 pt-6 pb-16 md:py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 vn-label text-[10px] text-[var(--vn-muted)] mb-6">
          <Link to="/" className="hover:text-[var(--vn-ink)] transition-colors">
            {t("nav.home", localized(locale, "Home", "الرئيسية"))}
          </Link>
          <ArrowRight size={10} className="rtl:rotate-180" />
          <Link to="/products" className="hover:text-[var(--vn-ink)] transition-colors">
            {localized(locale, "Shop", "المتجر")}
          </Link>
          <ArrowRight size={10} className="rtl:rotate-180" />
          <span className="text-[var(--vn-ink)] line-clamp-1 normal-case tracking-normal">
            {product.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* ── Gallery (left) ─────────────────────────────────────── */}
          <div>
            <motion.div
              key={activeImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`relative overflow-hidden bg-[var(--vn-band)] ${galleryAspectClass} mb-3`}
              data-testid="storefront-product-detail-main-image"
            >
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 vn-shimmer" />
              )}
              {hasDiscount && (
                <span className="absolute top-3 start-3 vn-label px-2.5 py-1 bg-[var(--vn-sale)] text-white rounded-full text-[10px]">
                  -{discountPercent}%
                </span>
              )}
            </motion.div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    type="button"
                    key={img.id ?? i}
                    aria-label={`Image ${i + 1}`}
                    onClick={() => setActiveImage(i)}
                    className={
                      "w-20 h-24 shrink-0 overflow-hidden transition-all border-b-2 " +
                      (i === activeImage
                        ? "border-[var(--vn-ink)] opacity-100"
                        : "border-transparent opacity-60 hover:opacity-90")
                    }
                    data-testid="storefront-product-detail-thumbnail"
                  >
                    <img
                      src={img.url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info (right) ───────────────────────────────────────── */}
          <div>
            {/* Tags / eyebrow */}
            {tags.length > 0 && (
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {tags.map((tag) => (
                  <span key={tag} className="vn-eyebrow text-[10px] text-[var(--vn-muted)]">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Name */}
            <h1
              className="vn-heading text-3xl md:text-4xl text-[var(--vn-ink)] mb-3"
              data-testid="storefront-product-detail-name"
            >
              {product.name}
            </h1>

            {/* Rating (static — review data not exposed on the SDK product) */}
            {/* REAL rating aggregate — decorative 5 stars with "(reviews)"
                advertised ratings that didn't exist; nothing erodes trust
                faster. Renders only when approved reviews exist. */}
            {showRating && reviewStats.count > 0 && (
              <div className="flex items-center gap-2 mb-4 text-[var(--vn-muted)]">
                <Stars value={reviewStats.average} />
                <span className="text-xs">
                  {reviewStats.average.toFixed(1)} ({reviewStats.count})
                </span>
              </div>
            )}

            {/* Price — original struck in sale red BEFORE the bold current
                price (merchant-requested order: ~~LE 500~~ **LE 450**). */}
            <div className="flex items-baseline gap-3 mb-5">
              <PricePair
                price={variantPrice}
                compareAt={compareAt}
                currency={product.currency}
                size="lg"
              />
            </div>

            {/* A3 — active-offer line. The merchant's "spend X save Y%" style
                offers were configured in the platform but never surfaced on
                the PDP, so they couldn't nudge a bigger order. */}
            {offerLine && (
              <p
                className="inline-flex items-center gap-1.5 mb-5 -mt-2 px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase bg-[var(--vn-band)] text-[var(--vn-ink)] rounded-full"
                data-testid="storefront-pdp-offer-line"
              >
                <Tag size={11} aria-hidden="true" />
                {offerLine}
              </p>
            )}

            {/* Description */}
            {showDescription && product.description && (
              <div
                className="text-sm text-[var(--vn-muted)] leading-relaxed mb-8 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ps-5"
                data-testid="storefront-product-detail-description"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
              />
            )}

            {/* Stock */}
            {showStock && (
              <div className="flex items-center gap-2 mb-6 vn-label text-[10px]">
                {/* A8 — low stock reads in the sale accent: "Only 3 left" in
                    muted gray was invisible as urgency. */}
                <span
                  className={
                    "w-1.5 h-1.5 rounded-full " +
                    (!inStock || (typeof stockQty === "number" && stockQty > 0 && stockQty <= 5)
                      ? "bg-[var(--vn-sale)]"
                      : "bg-[var(--vn-ink)]/50")
                  }
                />
                <span
                  className={
                    !inStock || (typeof stockQty === "number" && stockQty > 0 && stockQty <= 5)
                      ? "text-[var(--vn-sale)]"
                      : "text-[var(--vn-muted)]"
                  }
                >
                  {inStock
                    ? typeof stockQty === "number" && stockQty > 0 && stockQty <= 5
                      ? localized(locale, `Only ${stockQty} left`, `باقي ${stockQty} بس`)
                      : localized(locale, "In stock", "متوفر")
                    : localized(locale, "Sold out", "خلص المخزون")}
                </span>
              </div>
            )}

            {/* Variant option axes (Size / Color / ...) */}
            {options.map((opt) => {
              const selected = vs.selection[opt.name];
              const avail = vs.availability[opt.name];
              const isColor = opt.name.toLowerCase().includes("color")
                || opt.name.toLowerCase().includes("colour")
                || opt.name.toLowerCase().includes("لون");
              return (
                <div key={opt.name} className="mb-6">
                  <label className="vn-label text-[10px] text-[var(--vn-muted)] mb-2 block">
                    {opt.name}
                    {selected ? `: ${selected}` : ""}
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {opt.values.map((value) => {
                      // availability map only lists values for *unselected* axes;
                      // when an axis is already chosen treat all its values as
                      // pickable (so the customer can switch).
                      const soldOut = avail ? !avail.has(value) : false;
                      const active = selected === value;
                      return (
                        <button
                          type="button"
                          key={value}
                          onClick={() => vs.select(opt.name, value)}
                          aria-label={soldOut ? `${value} — sold out` : value}
                          className={
                            isColor
                              ? "flex items-center gap-2 px-3 py-2 text-sm transition-colors border " +
                                (active
                                  ? "border-[var(--vn-ink)]"
                                  : "border-[var(--vn-border)] hover:border-[var(--vn-ink)]/50") +
                                (soldOut ? " opacity-50 line-through" : "")
                              : "min-w-[44px] h-10 px-3 text-sm font-medium transition-colors border " +
                                (active
                                  ? "border-[var(--vn-ink)] bg-[var(--vn-ink)] text-[var(--vn-white)]"
                                  : "border-[var(--vn-border)] text-[var(--vn-ink)] hover:border-[var(--vn-ink)]") +
                                (soldOut ? " opacity-50 line-through" : "")
                          }
                          data-testid="storefront-product-detail-variant-option"
                          data-value={value}
                          data-sold-out={soldOut || undefined}
                        >
                          {isColor && (
                            <span
                              className="w-4 h-4 rounded-full border border-[var(--vn-border)]"
                              style={{ backgroundColor: value }}
                            />
                          )}
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* A5 — BOGO-aware quantity hint. Quantity-sensitive ("Add 1 more
                to get 1 free" → "You qualify") so the stepper itself sells
                the extra unit. Spend-tier progress lives in the cart nudge. */}
            {(() => {
              const hint = showOfferLine
                ? qtyBogoHint(promos?.auto_discounts, Math.min(quantity, maxQty), locale)
                : null;
              return hint ? (
                <p
                  className={`mb-2 text-[11px] font-medium flex items-center gap-1.5 ${hint.qualified ? "text-[var(--vn-ink)]" : "text-[var(--vn-muted)]"}`}
                  data-testid="storefront-pdp-qty-hint"
                >
                  {hint.qualified && <Check size={12} aria-hidden="true" />}
                  {hint.message}
                </p>
              ) : null;
            })()}

            {/* Quantity + Add to cart */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center border border-[var(--vn-border)] rounded-full">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-3 hover:opacity-70 transition-opacity"
                >
                  <Minus size={14} />
                </button>
                <span
                  className="px-4 text-sm font-medium tabular-nums"
                  data-testid="storefront-product-detail-quantity"
                >
                  {Math.min(quantity, maxQty)}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty}
                  className="p-3 hover:opacity-70 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* The SDK's <AddToCartButton> owns the loading/disabled/error
                  state machine and calls useCart().addItem(product, variant,
                  quantity) under the hood, so we get a variant-aware add
                  without re-implementing it. We only supply Vionne styling. */}
              <AddToCartButton
                product={product}
                variant={selectedVariant ?? undefined}
                quantity={Math.min(quantity, maxQty)}
                onAdded={() => showAddedDrawer && setDrawerOpen(true)}
                className="vn-btn vn-btn-filled flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                label={
                  <>
                    <ShoppingBag size={16} /> {localized(locale, "Add to bag", "أضيفي للشنطة")}
                  </>
                }
                loadingLabel={localized(locale, "Adding…", "بنضيف…")}
                soldOutLabel={
                  <>
                    <ShoppingBag size={16} /> {localized(locale, "Sold out", "خلص المخزون")}
                  </>
                }
                data-testid="storefront-add-to-cart"
              />
            </div>

            {/* Trust guarantees */}
            {showGuarantees && (
              <div className="mt-8 pt-6 border-t border-[var(--vn-border)] flex flex-wrap items-center justify-between gap-4">
                {guarantees.map((item) => (
                  <div key={item.key} className="flex items-center gap-2 text-[var(--vn-muted)]">
                    <item.icon size={15} className="shrink-0" />
                    <div>
                      <span className="text-[11px] font-medium text-[var(--vn-ink)]/80">
                        <InlineEditable sectionId={sectionId} settingKey={`${item.key}_label`} value={item.label} />
                      </span>
                      <span className="text-[10px] text-[var(--vn-muted)] mx-1">·</span>
                      <span className="text-[10px] text-[var(--vn-muted)]">
                        <InlineEditable sectionId={sectionId} settingKey={`${item.key}_desc`} value={item.desc} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Related products ─────────────────────────────────────── */}
        {showRelated && related.items.length > 0 && (
          <section
            className="mt-16 pt-10 border-t border-[var(--vn-border)]"
            data-testid="storefront-related-products"
          >
            <h2 className="vn-eyebrow text-[var(--vn-muted)] mb-6">
              <InlineEditable sectionId={sectionId} settingKey="related_title" value={relatedTitle} />
            </h2>
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5"
              data-testid="storefront-related-products-grid"
            >
              {related.items.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.slug || p.id}`}
                  className="vn-product-card group block"
                  data-testid="storefront-product-card"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-[var(--vn-band)] mb-3">
                    {productImage(p) ? (
                      <img
                        src={productImage(p)}
                        alt={p.name}
                        className="vn-product-image absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 vn-shimmer" />
                    )}
                  </div>
                  <div className="px-1">
                    <h3 className="text-sm font-medium text-[var(--vn-ink)] line-clamp-1">
                      {p.name}
                    </h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-sm font-semibold text-[var(--vn-ink)]">
                        <Money amount={p.variants?.[0]?.price ?? p.price ?? 0} currency={productCurrency(p)} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Honest CRO — customer reviews (real data + submit form). */}
        {showReviews && <ReviewsSection productId={product.id} locale={locale} />}

        {/* A8 — recently-viewed trail (localStorage, zero setup). Below the
            related rail; hidden until there's something to show. */}
        {showRecentlyViewed && recentlyViewed.length > 0 && (
          <section className="mt-12 pt-8 border-t border-[var(--vn-border)]" data-testid="storefront-recently-viewed">
            <h2 className="vn-heading text-lg md:text-xl mb-5 text-[var(--vn-ink)]">
              <InlineEditable sectionId={sectionId} settingKey="recently_viewed_title" value={recentlyViewedTitle} />
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x md:grid md:grid-cols-4 md:overflow-visible">
              {recentlyViewed.slice(0, 4).map((e) => (
                <Link key={e.id} to={`/product/${e.slug || e.id}`} className="group block w-36 shrink-0 snap-start md:w-auto">
                  <div className="aspect-[3/4] overflow-hidden bg-muted/30 mb-2">
                    {e.image && (
                      <img src={e.image} alt={e.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" loading="lazy" />
                    )}
                  </div>
                  <h3 className="text-xs font-medium text-foreground/90 line-clamp-1">{e.name}</h3>
                  <span className="text-xs font-semibold text-foreground">
                    <Money amount={e.price} currency={e.currency} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile sticky add-to-cart bar. md:hidden, and offset upward by the
          header's bottom-dock height so the two never stack (the dock is
          hidden ≥768px). Mirrors the selected variant + quantity. */}
      <div
        className="md:hidden fixed inset-x-0 z-30 bg-[var(--vn-white)] border-t border-[var(--vn-border)] px-4 py-2.5 flex items-center gap-3"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
        data-testid="storefront-pdp-sticky-bar"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--vn-ink)] font-medium truncate">{product.name}</p>
          <p className="text-sm font-semibold text-[var(--vn-ink)]">
            <Money amount={variantPrice} currency={product.currency} />
          </p>
        </div>
        <AddToCartButton
          product={product}
          variant={selectedVariant ?? undefined}
          quantity={Math.min(quantity, maxQty)}
          onAdded={() => showAddedDrawer && setDrawerOpen(true)}
          className="vn-btn vn-btn-filled shrink-0 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
          label={
            <>
              <ShoppingBag size={16} /> {localized(locale, "Add", "أضيفي")}
            </>
          }
          loadingLabel={localized(locale, "Adding…", "بنضيف…")}
          soldOutLabel={localized(locale, "Sold out", "خلص المخزون")}
        />
      </div>

      {/* A4 — "added to bag" drawer: confirmation + subtotal + offer nudge +
          two quick-add suggestions + checkout/keep-shopping. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true"
          aria-label={localized(locale, "Added to bag", "اتضافت للشنطة")}
          data-testid="storefront-added-drawer"
        >
          <div className="vn-sheet-backdrop absolute inset-0 bg-black/45" onClick={() => setDrawerOpen(false)} />
          <div className="vn-sheet-panel absolute inset-x-0 bottom-0 md:inset-y-0 md:end-0 md:inset-x-auto md:w-[420px] bg-[var(--vn-white)] text-[var(--vn-ink)] rounded-t-2xl md:rounded-none max-h-[85vh] md:max-h-none overflow-y-auto p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-2 vn-heading text-base">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--vn-ink)] text-[var(--vn-white)]">
                  <Check size={12} />
                </span>
                {localized(locale, "Added to your bag", "اتضافت للشنطة")}
              </span>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label={localized(locale, "Close", "إغلاق")} className="p-1 hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-4 pb-4 border-b border-[var(--vn-border)]">
              {mainImage && (
                <img src={mainImage} alt={product.name} className="w-16 h-20 object-cover shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                {selectedVariant?.name && (
                  <p className="text-xs text-[var(--vn-muted)]">{selectedVariant.name}</p>
                )}
                <p className="text-sm font-semibold mt-1">
                  <Money amount={variantPrice} currency={product.currency} />
                </p>
              </div>
            </div>

            <div className="flex justify-between items-baseline py-3 text-sm">
              <span className="text-[var(--vn-muted)]">
                {localized(locale, "Bag subtotal", "إجمالي الشنطة")}
                {" "}({cart?.items?.reduce((n, it) => n + it.quantity, 0) ?? 0})
              </span>
              <span className="font-semibold">
                <Money amount={cart?.subtotal ?? 0} currency={cart?.currency || product.currency} />
              </span>
            </div>

            {(() => {
              const nudge = bestCartNudge(
                promos?.auto_discounts, cart?.subtotal ?? 0,
                cart?.currency || product.currency || "EGP", locale, false,
              );
              return nudge ? (
                <div className="mb-4 border border-[var(--vn-border)] p-3">
                  <p className="text-xs flex items-center gap-2">
                    <Tag size={12} aria-hidden="true" /> {nudge.message}
                  </p>
                  {nudge.progressPct !== null && (
                    <div className="mt-2 h-1 rounded-full bg-[var(--vn-border)] overflow-hidden">
                      <div className="h-full bg-[var(--vn-ink)]" style={{ width: `${nudge.progressPct}%` }} />
                    </div>
                  )}
                </div>
              ) : null;
            })()}

            {(() => {
              const inCart = new Set((cart?.items ?? []).map((it) => it.product_id));
              const pool = (related.items.length > 0 ? related.items : catalogProducts)
                .filter((p: Product) => p.id !== product.id && !inCart.has(p.id))
                .slice(0, 2);
              if (pool.length === 0) return null;
              return (
                <div className="mb-4">
                  <p className="vn-eyebrow mb-3">{localized(locale, "Goes well with", "يتناسب معها")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {pool.map((p: Product) => (
                      <Link key={p.id} to={`/product/${p.slug || p.id}`} className="group block" onClick={() => setDrawerOpen(false)}>
                        <div className="aspect-[3/4] overflow-hidden bg-muted/30 mb-1.5">
                          {productImage(p) && (
                            <img src={productImage(p)} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" loading="lazy" />
                          )}
                        </div>
                        <p className="text-xs font-medium line-clamp-1">{p.name}</p>
                        <p className="text-xs font-semibold">
                          <Money amount={p.variants?.[0]?.price ?? p.price ?? 0} currency={productCurrency(p)} />
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })()}

            <Link to="/checkout" className="vn-btn vn-btn-filled w-full flex items-center justify-center gap-2">
              {localized(locale, "Checkout", "إتمام الشراء")}
              <ArrowRight size={13} className="rtl:rotate-180" />
            </Link>
            <Link to="/cart" className="vn-btn vn-btn-outline-dark w-full mt-2.5 flex items-center justify-center">
              {localized(locale, "View bag", "شوفي الشنطة")}
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="mt-3 w-full text-center vn-label text-[10px] text-[var(--vn-muted)] hover:text-[var(--vn-ink)]"
            >
              {localized(locale, "Keep shopping", "كمّلي تسوّق")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
