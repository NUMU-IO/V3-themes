/**
 * The book card.
 *
 * One component behind every grid in the theme — the collection, search,
 * home shelves, the books-plus-banner row, "Customers Also Bought" and
 * "Recently viewed" — so a change to how a book is presented lands in all of
 * them at once.
 *
 * Two looks over one component:
 *   - `shelf` (default): the cover in a fixed book-shaped frame.
 *   - `tile`: the cover fills the top of a white rounded card, for the
 *     books-plus-banner row.
 *
 * Every cover sits in the same 2:3 frame, and the price and button are pinned
 * to the bottom of the card, so a row of books lines up whatever the jacket's
 * proportions and whether or not a book has an author line.
 *
 * The card never adds to the cart by itself. Its button opens quick look,
 * where the shopper sees the book, picks an edition and presses Add there — a
 * button on a grid of forty books is too easy to hit on the way to the cover,
 * and an item landing in the cart unasked reads as a bug.
 */

import { useState } from "react";
import { Image, Link, Money, type Product } from "@numueg/theme-sdk";
import { bookFormat, isInlineImage, productAuthor, productImages } from "./shared";
import { QuickLook } from "./quick-look";
import { WishlistButton } from "./wishlist";
import { fill, useT } from "./i18n";

export interface ProductCardProps {
  product: Product;
  showWishlist?: boolean;
  showQuickAdd?: boolean;
  variant?: "shelf" | "tile";
}

const hasChoices = (product: Product) =>
  (product.variants?.length ?? 0) > 1 ||
  (product.options ?? []).some((option) => (option.values?.length ?? 0) > 1);

export function ProductCard({
  product,
  showWishlist = true,
  showQuickAdd = true,
  variant = "shelf",
}: ProductCardProps) {
  const t = useT();
  const [lookOpen, setLookOpen] = useState(false);

  const href = `/products/${product.slug ?? product.id}`;
  const cover = productImages(product)[0];
  const author = productAuthor(product);
  const format = bookFormat(product);

  /**
   * `product.price` is in MAJOR units and variant prices are in CENTS.
   * This card reads the product, so it never divides — the one place in the
   * theme where getting that backwards is a silent 100× error on every tile.
   */
  const price = product.price;
  const compareAt = (product as unknown as Record<string, unknown>).compare_at_price;
  const wasPrice = typeof compareAt === "number" && compareAt > (price ?? 0) ? compareAt : null;

  // The related route spells stock `is_in_stock`; the listing spells it `in_stock`.
  const listedStock = product.in_stock ?? (product as unknown as { is_in_stock?: boolean }).is_in_stock;
  const available = listedStock !== false;

  return (
    <article className={variant === "tile" ? "pw-card pw-card--tile" : "pw-card"}>
      <div className="pw-card-cover">
        <Link to={href} aria-label={product.name}>
          {cover ? (
            <Image src={cover} alt={product.name} loading="lazy" responsive={!isInlineImage(cover)} />
          ) : (
            <span className="pw-blank">{product.name}</span>
          )}
        </Link>
        {showWishlist && <WishlistButton productId={String(product.id)} />}
      </div>

      <h3>
        <Link to={href}>{product.name}</Link>
      </h3>
      {author && (
        <p className="pw-byline">
          {t("product.by", "by")} {author}
        </p>
      )}
      {format && <p className="pw-format">{format}</p>}
      <p className="pw-price">
        <b>
          <Money amount={price ?? 0} currency={product.currency} />
        </b>
        {wasPrice !== null && (
          <s>
            <Money amount={wasPrice} currency={product.currency} />
          </s>
        )}
      </p>

      {showQuickAdd && (
        <button
          type="button"
          className="pw-card-add"
          aria-haspopup="dialog"
          aria-label={fill(t("preview.open", "Quick look: {{name}}"), { name: product.name })}
          disabled={!available}
          onClick={() => setLookOpen(true)}
        >
          {!available
            ? t("product.out_of_stock", "Currently unavailable")
            : hasChoices(product)
              ? t("product.choose_options", "Choose edition")
              : t("product.add_to_cart", "Add to Cart")}
        </button>
      )}

      {lookOpen && <QuickLook product={product} onClose={() => setLookOpen(false)} />}
    </article>
  );
}
