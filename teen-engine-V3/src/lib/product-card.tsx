/**
 * ProductCard — the single most reused component in Teen.
 *
 * Reference anatomy: a hairline-outlined white card, a pale 3:4 plate that
 * crossfades to a SECOND image on hover, an orange `On sale` pill at the
 * top-start of the image, a black square `+` at the bottom-end of the image,
 * then a centred two-line title, the price row, and an optional swatch row.
 *
 * Three details are load-bearing and each one has cost a session somewhere:
 *
 * 1. **The hover swap is opacity-only.** Both images are absolutely stacked
 *    inside a fixed-ratio plate, so there is zero layout shift and no reflow
 *    when the second image finally loads. Swapping `src` — the obvious
 *    implementation — flashes the plate on every hover and costs a network
 *    round trip mid-interaction.
 *
 * 2. **The quick-add button lives inside `.tn-card-mediawrap`, not the card.**
 *    Anchored to the card it positions against the whole box and lands on top
 *    of the price. It has to anchor to the image.
 *
 * 3. **Status precedence: Coming soon → Sold out → Sale.** "Coming soon"
 *    suppresses quick add entirely rather than offering an add that fails.
 */

import { useRef } from "react";
import { Image, Link, type Product } from "@numueg/theme-sdk";
import { productCurrency, productImages, productName } from "./shared";
import { useT } from "./i18n";
import { Price, Tag, isDiscounted } from "./price";
import { SwatchRow, SwatchSummary, useCardColorAxis } from "./swatches";
import { IconPlus } from "./icons";

export interface ProductCardProps {
  product: Product;
  locale?: string;
  showQuickAdd?: boolean;
  showSwatches?: boolean;
  onQuickAdd?: (product: Product) => void;
  /** Above-the-fold cards skip lazy-loading so they don't delay LCP. */
  eager?: boolean;
  /**
   * Heading level for the card title.
   *
   * A card in a rail sits under that rail's `<h2>`, so `h3` is right. A card in
   * a listing grid sits directly under the page `<h1>`, where `h3` skips a
   * level — and a skipped level is the single most common heading defect a
   * screen-reader user meets. The caller knows which it is; the card cannot.
   */
  headingLevel?: 2 | 3;
}

export function ProductCard({
  product,
  locale,
  showQuickAdd = true,
  showSwatches = true,
  onQuickAdd,
  eager = false,
  headingLevel = 3,
}: ProductCardProps) {
  const Heading = (headingLevel === 2 ? "h2" : "h3") as "h2" | "h3";
  const t = useT();
  const cardRef = useRef<HTMLElement | null>(null);

  const images = productImages(product);
  const primary = images[0];
  const secondary = images[1];

  const name = productName(product, locale) || product.name;
  const href = `/products/${product.slug ?? product.id}`;
  const currency = productCurrency(product);

  const comingSoon = Boolean((product.tags ?? []).some((tag) => /coming[\s-]?soon/i.test(tag)));
  const soldOut = !comingSoon && product.in_stock === false;
  // `isDiscounted` parses numeric STRINGS. A `typeof === "number"` guard never
  // matches — the API sends '690.00' — and every sale badge in the theme goes
  // silently missing. See price.tsx.
  const onSale = isDiscounted(product.price, product.compare_at_price);

  // D6: from the payload when the store keeps axes in `attributes.variants`,
  // lazily from the detail endpoint when it keeps them in `product.options`,
  // absent when neither. Never a placeholder.
  const colorAxis = useCardColorAxis(product, cardRef, showSwatches);

  // Quick add stays available even though the LIST endpoint returns no
  // `options` and no `variants`: the sheet hydrates from the detail endpoint
  // when it opens, so the shopper always gets a real picker. The rule the sheet
  // enforces is the important one — it refuses to add anything whose variants
  // it could not read, rather than guessing a size.
  const canQuickAdd = showQuickAdd && !comingSoon && !soldOut && Boolean(onQuickAdd);

  const sizes = "(min-width: 990px) 25vw, (min-width: 750px) 33vw, 50vw";

  return (
    <article className="tn-card tn-product-card" ref={cardRef}>
      <div className="tn-card-mediawrap">
        {/* No aria-label: the title link below already carries the product
            name, and a second link with the same accessible name but different
            visible text fails WCAG 2.5.3. aria-hidden keeps this duplicate
            target out of the a11y tree entirely. */}
        <Link to={href} className="tn-card-media" aria-hidden="true" tabIndex={-1}>
          <span className="tn-plate">
            {primary ? (
              <Image
                className="tn-card-img is-primary"
                src={primary.url}
                alt={primary.alt || name}
                // A card is a quarter of the viewport on desktop and half on a
                // phone; without this every card downloads a 1920px original
                // for a 190px box.
                sizes={sizes}
                loading={eager ? "eager" : "lazy"}
                priority={eager}
              />
            ) : null}
            {/* Stacked, opacity-only. Never a src swap. */}
            {secondary ? (
              <Image
                className="tn-card-img is-secondary"
                src={secondary.url}
                alt=""
                aria-hidden="true"
                sizes={sizes}
                loading="lazy"
              />
            ) : null}
          </span>
        </Link>

        {(comingSoon || soldOut || onSale) && (
          <span className="tn-card-tags">
            {comingSoon ? (
              <Tag tone="soldout">{t("product.coming_soon", "Coming soon")}</Tag>
            ) : soldOut ? (
              <Tag tone="soldout">{t("common.sold_out", "Sold out")}</Tag>
            ) : (
              <Tag tone="sale">{t("common.on_sale", "On sale")}</Tag>
            )}
          </span>
        )}

        {canQuickAdd && (
          <button
            type="button"
            className="tn-card-quickadd"
            // The name has to say WHICH product: a grid of twenty buttons all
            // announced as "Add" is unusable with a screen reader.
            aria-label={t("product.quick_add_name", "Quick add {{name}}").replace(
              "{{name}}",
              name,
            )}
            onClick={() => onQuickAdd?.(product)}
          >
            {/* 16px inside the 30px visible square, matching the reference's
                glyph-to-square ratio. */}
            <IconPlus size={16} />
          </button>
        )}
      </div>

      <div className="tn-card-body">
        <Heading className="tn-card-title">
          <Link to={href}>{name}</Link>
        </Heading>
        <Price
          amount={product.price}
          compareAt={product.compare_at_price}
          currency={currency}
          className="tn-card-price"
        />
        {showSwatches && (
          <>
            <SwatchRow axis={colorAxis} />
            <SwatchSummary
              axis={colorAxis}
              template={t("product.available_colors", "Available in {{colors}}")}
            />
          </>
        )}
      </div>
    </article>
  );
}

/**
 * Skeleton card.
 *
 * Same box as the real one — plate, two text lines — so a grid that is still
 * loading has the final height and the page does not jump when products land.
 * A spinner in a grid slot is a layout shift waiting to happen.
 */
export function ProductCardSkeleton() {
  return (
    <article className="tn-card tn-product-card is-skeleton" aria-hidden="true">
      <div className="tn-card-mediawrap">
        <span className="tn-plate" />
      </div>
      <div className="tn-card-body">
        <span className="tn-skel-line" />
        <span className="tn-skel-line is-short" />
      </div>
    </article>
  );
}
