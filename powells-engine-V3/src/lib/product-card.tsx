/**
 * The book card.
 *
 * One component behind every grid in the theme — the collection, search,
 * home shelves, campaigns, "Customers Also Bought" and "Recently viewed" — so a
 * change to how a book is presented lands in all of them at once.
 *
 * What a bookseller's card says, top to bottom: the badge (NEW, USED, RARE,
 * LIMITED — only when the merchant set one), the series and volume, the title,
 * the author, the copy's condition or its formats, the price, and Quick add.
 * "Only 2 left" appears only when the stock count really is that low, and a
 * second photograph fades in on hover when the book has one.
 *
 * Two looks over one component:
 *   - `shelf` (default): the cover in a fixed book-shaped frame.
 *   - `tile`: the cover fills the top of a white rounded card.
 *
 * Every cover sits in the same 2:3 frame, and the price and button are pinned
 * to the bottom of the card, so a row of books lines up whatever the jacket's
 * proportions and whichever lines a book has.
 *
 * Quick add never drops a book into the cart blind: it opens quick look, where
 * the shopper sees the editions and presses Add there.
 */

import { useState } from "react";
import { Image, Link, Money, type Product } from "@numueg/theme-sdk";
import {
  bookCondition,
  bookFormats,
  bookLabel,
  copiesLeft,
  isInlineImage,
  productAuthor,
  productImages,
} from "./shared";
import { QuickLook } from "./quick-look";
import { WishlistButton } from "./wishlist";
import { seriesLine, seriesOf } from "./series";
import { fill, useT } from "./i18n";

export interface ProductCardProps {
  product: Product;
  showWishlist?: boolean;
  showQuickAdd?: boolean;
  variant?: "shelf" | "tile";
}

export function ProductCard({
  product,
  showWishlist = true,
  showQuickAdd = true,
  variant = "shelf",
}: ProductCardProps) {
  const t = useT();
  const [lookOpen, setLookOpen] = useState(false);

  const href = `/products/${product.slug ?? product.id}`;
  const [cover, second] = productImages(product);
  const author = productAuthor(product);
  const label = bookLabel(product);
  const condition = bookCondition(product);
  const formats = bookFormats(product);
  const left = copiesLeft(product);
  const series = seriesOf(product);

  const meta = condition
    ? `${label?.text ?? t("card.used", "Used")} · ${condition}`
    : formats.length > 2
      ? `${formats.slice(0, 2).join(" · ")} +${formats.length - 2}`
      : formats.join(" · ");

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
      <div className="pw-card-cover" data-alt={second ? "" : undefined}>
        <Link to={href} aria-label={product.name}>
          {cover ? (
            <Image src={cover} alt={product.name} loading="lazy" responsive={!isInlineImage(cover)} />
          ) : (
            <span className="pw-blank">{product.name}</span>
          )}
          {second && (
            <span className="pw-card-alt" aria-hidden="true">
              <Image src={second} alt="" loading="lazy" responsive={!isInlineImage(second)} />
            </span>
          )}
        </Link>
        {label && !condition && (
          <span className="pw-tag" data-kind={label.key}>
            {label.text}
          </span>
        )}
        {showWishlist && <WishlistButton productId={String(product.id)} />}
        {available && left > 0 && (
          <span className="pw-card-left">{fill(t("card.only_left", "Only {{count}} left"), { count: left })}</span>
        )}
      </div>

      {series && (
        <p className="pw-card-series">
          <span>{series.name}</span> · {seriesLine(series, t)}
        </p>
      )}
      <h3>
        <Link to={href}>{product.name}</Link>
      </h3>
      {author && <p className="pw-byline">{author}</p>}
      {meta && <p className="pw-card-meta">{meta}</p>}
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
          aria-label={fill(t("card.quick_add_label", "Quick add: {{name}}"), { name: product.name })}
          disabled={!available}
          onClick={() => setLookOpen(true)}
        >
          {available ? (
            <>
              {t("card.quick_add", "Quick add")}
              <span className="plus" aria-hidden="true">
                +
              </span>
            </>
          ) : (
            t("product.out_of_stock", "Currently unavailable")
          )}
        </button>
      )}

      {lookOpen && <QuickLook product={product} onClose={() => setLookOpen(false)} />}
    </article>
  );
}
