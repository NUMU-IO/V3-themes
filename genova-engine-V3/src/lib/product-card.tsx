/**
 * ProductCard — the single most reused component in the theme.
 *
 * Reference anatomy: a 3:4 image plate that crossfades to a SECOND image on
 * hover, then title, price, and an optional colour label, with `+ Quick add`
 * appearing over the image.
 *
 * The hover swap is the interaction to get exactly right: both images are
 * absolutely stacked inside a fixed-ratio plate and only `opacity` animates, so
 * there is **zero layout shift** and no second reflow when the second image
 * finally loads. Swapping `src` instead (the obvious implementation) flashes
 * the plate on every hover and costs a network round trip mid-interaction.
 *
 * Status precedence, highest first: Coming soon → Sold out → Sale. "Coming
 * soon" suppresses quick add entirely rather than offering an add that fails.
 */

import { Image, Link, type Product } from "@numueg/theme-sdk";
import { cx, productImages, productName } from "./shared";
import { useT } from "./i18n";
import { Price, Tag, discountPercent, isDiscounted } from "./price";

export interface ProductCardProps {
  product: Product;
  locale?: string;
  showQuickAdd?: boolean;
  showColorLabel?: boolean;
  showLowStock?: boolean;
  lowStockThreshold?: number;
  onQuickAdd?: (product: Product) => void;
  /** Above-the-fold cards skip lazy-loading so they don't delay LCP. */
  eager?: boolean;
}

/** Colour axis, if the product has one — shown under the title as a subtitle. */
function colorLabel(product: Product): string {
  const axis = (product.options ?? []).find((o) => /colou?r|لون/i.test(o.name));
  if (!axis) return "";
  return axis.values.length === 1 ? axis.values[0] : `${axis.values.length} colours`;
}

function lowStockCount(product: Product): number {
  const variants = product.variants ?? [];
  if (variants.length === 0) return 0;
  return variants.reduce((n, v) => n + Math.max(0, v.inventory_quantity ?? 0), 0);
}

export function ProductCard({
  product,
  locale,
  showQuickAdd = true,
  showColorLabel = true,
  showLowStock = false,
  lowStockThreshold = 3,
  onQuickAdd,
  eager = false,
}: ProductCardProps) {
  const t = useT();
  const images = productImages(product);
  const primary = images[0];
  const secondary = images[1];

  const name = productName(product, locale) || product.name;
  const href = `/products/${product.slug ?? product.id}`;

  const comingSoon = Boolean(
    (product.tags ?? []).some((tag) => /coming[\s-]?soon/i.test(tag)),
  );
  const soldOut = !comingSoon && product.in_stock === false;
  // `isDiscounted` parses numeric STRINGS. The old `typeof === "number"` guard
  // never matched — the API sends '30.00' — so no card in this theme has ever
  // shown a sale badge, a compare-at price or a saving.
  const onSale = isDiscounted(product.price, product.compare_at_price);
  const saving = discountPercent(product.price, product.compare_at_price);

  const remaining = lowStockCount(product);
  const lowStock =
    showLowStock && !soldOut && !comingSoon && remaining > 0 && remaining <= lowStockThreshold;

  const color = showColorLabel ? colorLabel(product) : "";

  // Quick add used to be withheld on listings entirely: the LIST endpoint
  // returns `options: []` and `variants: []` for every product, so the card
  // could not tell a one-size product from a five-size one, and this theme
  // will not guess a size.
  //
  // That constraint is gone. The sheet now hydrates from the detail endpoint
  // (via the new `/api/storefront/products/{id}` host route) when it opens, so
  // the shopper always gets a real picker and the rule is still intact — the
  // sheet refuses to add anything whose variants it could not read.
  const canQuickAdd = showQuickAdd && !comingSoon && !soldOut && Boolean(onQuickAdd);

  return (
    <article className="gn-card">
      {/* No aria-label: the title link below carries the product name, so an
          aria-label here creates a second link with the same name whose visible
          text does not match it (WCAG 2.5.3). aria-hidden keeps the image link
          out of the a11y tree entirely — it is a duplicate target. */}
      <div className="gn-card-mediawrap">
      <Link to={href} className="gn-card-media" aria-hidden="true" tabIndex={-1}>
        <span className="gn-plate">
          {primary ? (
            <Image
              className="gn-card-img is-primary"
              src={primary.url}
              alt={primary.alt || name}
              // A card is a quarter to a third of the viewport on desktop and
              // half on a phone; without this every card downloads a 1920px
              // original for a 370px box.
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              loading={eager ? "eager" : "lazy"}
              priority={eager}
            />
          ) : null}
          {/* Stacked, opacity-only. Never a src swap. */}
          {secondary ? (
            <Image
              className="gn-card-img is-secondary"
              src={secondary.url}
              alt=""
              aria-hidden="true"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              loading="lazy"
            />
          ) : null}
        </span>

        {(comingSoon || soldOut || onSale) && (
          <span className="gn-card-tags">
            {comingSoon ? (
              <Tag>{t("product.coming_soon", "Coming soon")}</Tag>
            ) : soldOut ? (
              <Tag>{t("product.sold_out", "Sold out")}</Tag>
            ) : (
              // The percentage IS the signal — "SALE" alone makes a shopper do
              // the arithmetic before they know whether to care.
              <Tag tone="sale">
                {saving > 0
                  ? `−${saving}%`
                  : t("product.sale", "Sale")}
              </Tag>
            )}
          </span>
        )}
      </Link>

      {/* Inside the media wrapper so `bottom` measures from the image edge.
          As a sibling of the card it anchored to the WHOLE card and sat on top
          of the price — invisible while it was hover-only, glaring the moment
          it became always-visible. */}
      {canQuickAdd && (
        <button
          type="button"
          className="gn-card-quickadd"
          // The visible label is short; the accessible name has to say WHICH
          // product, because a screen reader hears a page of identical
          // "Quick add" buttons otherwise.
          aria-label={`${t("product.quick_add", "Quick add")} — ${name}`}
          onClick={() => onQuickAdd?.(product)}
        >
          {`+ ${t("product.quick_add", "Quick add")}`}
        </button>
      )}
      </div>

      <div className="gn-card-info">
        <Link to={href} className="gn-card-title">
          {name}
        </Link>
        {color && <p className="gn-card-color">{color}</p>}
        <Price
          amount={product.price}
          compareAt={product.compare_at_price}
          currency={product.currency}
        />
        {lowStock && (
          // Coloured as of 2026-08-14 (supersedes §2.1a) — scarcity is the one
          // non-price signal that shares the discount's job.
          <p className="gn-card-lowstock gn-label">
            {t("product.only_n_left", "Only {{count}} left").replace(
              "{{count}}",
              String(remaining),
            )}
          </p>
        )}
      </div>
    </article>
  );
}

/** Skeleton with the card's exact geometry, so loading never shifts the grid. */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cx("gn-card", "is-skeleton", className)} aria-hidden="true">
      <span className="gn-plate" />
      <div className="gn-card-info">
        <span className="gn-skel-line" />
        <span className="gn-skel-line is-short" />
      </div>
    </div>
  );
}
