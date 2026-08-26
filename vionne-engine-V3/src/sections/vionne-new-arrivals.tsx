"use client";
import { useMemo } from "react";
import { Link, useLocale, useProducts, useResolvedSettings } from "@numueg/theme-sdk";
import { ArrowRight } from "lucide-react";
import {
  asString,
  localized,
  merchantLabelKey,
  merchantLabelText,
  productImage,
  responsiveImg,
  NA_CARD_IMG,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { QuickAddButton } from "./_quick-add";
import { QuickPreviewButton } from "./_quick-preview";
import { PricePair } from "./_price";

/**
 * Cards per half of the track, before duplication.
 *
 * A card is 200px + 16px of margin on desktop, so 12 spans ~2,590px — wider
 * than any realistic viewport. Below that the ribbon shows dead space instead
 * of a continuous run; six labelled products measured 1,176px against a
 * 1,265px track.
 */
const MIN_TRACK_CARDS = 12;

/**
 * A continuously scrolling strip of newly-labelled products.
 *
 * Membership is driven by the merchant's PRODUCT LABEL, not by a hand-picked
 * list: set a product's label to "New" in the dashboard and it appears here on
 * the next render, drop the label and it leaves. That is the whole point — the
 * strip maintains itself, so a new arrival never sits unadvertised because
 * someone forgot to also edit the homepage.
 *
 * Matching is on the label KEY (`merchantLabelKey`), never the badge text: the
 * text is merchant-editable per locale, so filtering on it would silently empty
 * the strip the moment someone reworded the badge or switched to Arabic.
 *
 * Conversion/AOV surface, in the order a shopper meets it: the label pill says
 * it is new, the strikethrough price says what they save, the promo line states
 * the free-delivery threshold (the reason to add a second item), and quick-add
 * removes the trip to the product page. Everything is one tap from buying.
 */
const VionneNewArrivals = ({ instance, sectionId }: SectionRenderProps) => {
  const { products } = useProducts();
  const locale = useLocale();
  const s = useResolvedSettings(instance);

  const title = asString(s.title) || localized(locale, "Just In", "وصل حديثًا");
  const subtitle = asString(s.subtitle);
  const labelKey = (asString(s.label_key) || "new").trim().toLowerCase();
  const maxItems = Math.max(2, Number(s.max_items ?? 12));
  const speed = Math.max(10, Number(s.speed ?? 45));
  const showPromo = s.show_promo !== false;
  const promoText =
    asString(s.promo_text) ||
    localized(
      locale,
      "Free delivery on orders over EGP 1,500",
      "شحن مجاني للطلبات فوق ١٥٠٠ جنيه",
    );
  const ctaText = asString(s.cta_text) || localized(locale, "Shop new in", "تسوّقي الجديد");
  const ctaLink = asString(s.cta_link) || "/products";
  const fallbackWhenEmpty = s.fallback_when_empty !== false;

  const items = useMemo(() => {
    const labelled =
      labelKey === "any"
        ? products.filter((p) => merchantLabelKey(p) !== "")
        : products.filter((p) => merchantLabelKey(p) === labelKey);
    // Falling back to the head of the catalogue keeps the strip from vanishing
    // the day the last "New" label is cleared — the same "degrade to showing
    // something" rule the featured rows follow. Merchants who would rather the
    // section disappear than show unlabelled stock can turn it off.
    const chosen = labelled.length > 0 ? labelled : fallbackWhenEmpty ? products : [];
    return chosen.slice(0, maxItems);
  }, [products, labelKey, maxItems, fallbackWhenEmpty]);

  /**
   * The cards actually laid out, as ONE flat list rendered twice.
   *
   * Two things this fixes, both of which made the ribbon look broken:
   *
   * 1. A short label set could not fill the viewport. Six products came to
   *    1,176px against a 1,265px track, so the "loop" was mostly empty space
   *    with a clump of cards sliding through it. The set is repeated until it
   *    comfortably exceeds any realistic viewport, so the ribbon always reads
   *    as continuous regardless of how many products carry the label.
   *
   * 2. The halves must be exactly equal for `translateX(-50%)` to seam. They
   *    were not: the originals sat as direct flex children and the duplicate
   *    inside a wrapper, so the flex `gap` was counted once more on one side —
   *    measured 2,336px against 1,160px, a 16px discrepancy that showed up as
   *    a jump on every pass. Now both halves are the same flat list, and the
   *    spacing lives in each card's margin rather than the track's `gap`, so
   *    half the width is exactly one set.
   */
  const half = useMemo(() => {
    if (items.length === 0) return [];
    const copies = Math.max(1, Math.ceil(MIN_TRACK_CARDS / items.length));
    return Array.from({ length: copies }, () => items).flat();
  }, [items]);

  if (items.length === 0) return null;

  // Duration scales with the number of cards so the ribbon travels at the same
  // apparent speed whether the merchant labels three products or twenty — a
  // fixed total duration would make a long strip crawl and a short one whip past.
  const durationSeconds = Math.max(8, half.length * speed);

  // The track is rendered twice and translated by -50%, which is what makes the
  // loop seamless. The clone is aria-hidden so screen readers and the a11y tree
  // see each product exactly once.
  const renderCard = (product: (typeof items)[number], clone: boolean, i: number) => {
    const labelText = merchantLabelText(product, locale);
    const img = productImage(product);
    return (
      <Link
        key={`${clone ? "c" : "o"}-${i}-${product.id}`}
        to={`/product/${product.slug || product.id}`}
        className="vn-na-card group"
        // The duplicate exists only so the loop has something to run into. Hide
        // it from assistive tech and keyboard order so each product is
        // announced and tabbed exactly once.
        aria-hidden={clone || undefined}
        tabIndex={clone ? -1 : undefined}
        data-testid={clone ? undefined : "storefront-product-card"}
      >
        <div className="vn-na-media">
          {img ? (
            <img
              {...responsiveImg(img, NA_CARD_IMG)}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 vn-shimmer" />
          )}
          {labelText && <span className="vn-na-pill">{labelText}</span>}
          <QuickAddButton product={product} locale={locale} />
          <QuickPreviewButton product={product} locale={locale} />
        </div>
        <div className="vn-na-meta">
          <span className="vn-na-name">{product.name}</span>
          <PricePair
            price={product.variants?.[0]?.price ?? product.price ?? 0}
            compareAt={product.variants?.[0]?.compare_at_price ?? product.compare_at_price}
            currency={product.currency}
            size="sm"
          />
        </div>
      </Link>
    );
  };

  return (
    <section className="vn-na" aria-labelledby={`${sectionId}-na-title`}>
      <div className="container mx-auto px-4">
        <div className="vn-na-head">
          <div>
            {subtitle && (
              <span className="vn-eyebrow block mb-1.5">
                <InlineEditable sectionId={sectionId} settingKey="subtitle" value={subtitle} />
              </span>
            )}
            <h2 id={`${sectionId}-na-title`} className="vn-heading text-2xl md:text-3xl">
              <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
            </h2>
          </div>
          {showPromo && (
            <p className="vn-na-promo">
              <InlineEditable sectionId={sectionId} settingKey="promo_text" value={promoText} />
            </p>
          )}
        </div>
      </div>

      {/* Full-bleed on purpose: the strip reads as a moving ribbon across the
          page, and containing it would put hard edges mid-animation. */}
      <div
        className="vn-na-viewport"
        style={{ "--vn-na-speed": `${durationSeconds}s` } as React.CSSProperties}
      >
        {/* Both halves are the same flat list, so -50% lands exactly on the
            start of the duplicate — see the `half` note above. */}
        <div className="vn-na-track">
          {half.map((p, i) => renderCard(p, false, i))}
          {half.map((p, i) => renderCard(p, true, i))}
        </div>
      </div>

      <div className="container mx-auto px-4 text-center mt-6">
        <Link to={ctaLink} className="vn-btn vn-btn-outline-dark">
          <InlineEditable sectionId={sectionId} settingKey="cta_text" value={ctaText} />
          <ArrowRight size={14} className="rtl:rotate-180" />
        </Link>
      </div>
    </section>
  );
};

export default VionneNewArrivals;
