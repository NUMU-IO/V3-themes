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
  CHIP_IMG,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { QuickAddButton } from "./_quick-add";
import { PricePair } from "./_price";

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

  if (items.length === 0) return null;

  // The track is rendered twice and translated by -50%, which is what makes the
  // loop seamless. The clone is aria-hidden so screen readers and the a11y tree
  // see each product exactly once.
  const renderCard = (product: (typeof items)[number], clone: boolean) => {
    const labelText = merchantLabelText(product, locale);
    const img = productImage(product);
    return (
      <Link
        key={`${clone ? "c" : "o"}-${product.id}`}
        to={`/product/${product.slug || product.id}`}
        className="vn-na-card group"
        tabIndex={clone ? -1 : undefined}
        data-testid={clone ? undefined : "storefront-product-card"}
      >
        <div className="vn-na-media">
          {img ? (
            <img
              {...responsiveImg(img, CHIP_IMG)}
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
        style={{ "--vn-na-speed": `${speed}s` } as React.CSSProperties}
      >
        <div className="vn-na-track">
          {items.map((p) => renderCard(p, false))}
          <div className="vn-na-track-clone" aria-hidden="true">
            {items.map((p) => renderCard(p, true))}
          </div>
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
