/**
 * The book card.
 *
 * One component behind every grid in the theme — the collection, search and
 * "Customers Also Bought" — so a change to how a book is presented lands in
 * all three at once.
 *
 * Two things it does that a generic product card does not:
 *
 *   1. **Covers are contained, never cropped.** Book jackets are not a fixed
 *      ratio: a mass-market paperback is much narrower than a coffee-table
 *      hardcover, and `object-fit: cover` would slice the title off the top of
 *      one and the spine off the side of another. The row is fixed-HEIGHT and
 *      free-width, which is also what makes the shelf read as a shelf.
 *   2. **The format line is the used-bookshop tell.** "Used Trade Paperback"
 *      is what a buyer is actually choosing between, so it sits above the
 *      price, not hidden in a spec table.
 */

import { Image, Link, Money, type Product } from "@numueg/theme-sdk";
import { IconHeart } from "./ornaments";
import { isInlineImage, productAuthor, productImages } from "./shared";
import { useT } from "./i18n";

export interface ProductCardProps {
  product: Product;
  /** Rendered under the byline: "Used Trade Paperback". */
  formatLabel?: string;
  showWishlist?: boolean;
  onWishlist?: (product: Product) => void;
  wishlisted?: boolean;
}

export function ProductCard({
  product,
  formatLabel,
  showWishlist = true,
  onWishlist,
  wishlisted = false,
}: ProductCardProps) {
  const t = useT();
  const href = `/products/${product.slug ?? product.id}`;
  const cover = productImages(product)[0];
  const author = productAuthor(product);

  /**
   * `product.price` is in MAJOR units and `variant.price.amount` is in CENTS.
   * This card reads the product, so it never divides — the one place in the
   * theme where getting that backwards is a silent 100× error on every tile.
   */
  const price = product.price;
  const compareAt = (product as unknown as Record<string, unknown>).compare_at_price;
  const wasPrice = typeof compareAt === "number" && compareAt > (price ?? 0) ? compareAt : null;

  return (
    <article className="pw-card">
      <div className="pw-card-cover">
        <Link to={href} aria-label={product.name}>
          {cover ? (
            <Image src={cover} alt={product.name} loading="lazy" responsive={!isInlineImage(cover)} />
          ) : (
            <span className="pw-blank">{product.name}</span>
          )}
        </Link>
        {showWishlist && (
          <button
            type="button"
            className="pw-fav"
            aria-pressed={wishlisted}
            aria-label={t("product.wishlist", "Add to wishlist")}
            onClick={() => onWishlist?.(product)}
          >
            <IconHeart />
          </button>
        )}
      </div>

      <h3>
        <Link to={href}>{product.name}</Link>
      </h3>
      {author && (
        <p className="pw-byline">
          {t("product.by", "by")} {author}
        </p>
      )}
      {formatLabel && <p className="pw-format">{formatLabel}</p>}
      <p className="pw-price">
        <b>
          <Money amount={price ?? 0} />
        </b>
        {wasPrice !== null && (
          <s>
            <Money amount={wasPrice} />
          </s>
        )}
      </p>
    </article>
  );
}
