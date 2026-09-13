/**
 * The book card.
 *
 * One component behind every grid in the theme — the collection, search,
 * home shelves, "Customers Also Bought" and "Recently viewed" — so a change to
 * how a book is presented lands in all of them at once.
 *
 * What it does that a generic product card does not:
 *
 *   1. **Covers are contained, never cropped.** Book jackets are not a fixed
 *      ratio: a mass-market paperback is much narrower than a coffee-table
 *      hardcover, and `object-fit: cover` would slice the title off the top of
 *      one and the spine off the side of another. The row is fixed-HEIGHT and
 *      free-width, which is also what makes the shelf read as a shelf.
 *   2. **The format line is the used-bookshop tell.** "Used Trade Paperback"
 *      is what a buyer is actually choosing between, so it sits above the
 *      price, not hidden in a spec table.
 *   3. **Quick-add never guesses an edition.** Listing payloads report
 *      `variants: []` whether or not a book has editions, so a card that cannot
 *      name its variant resolves the detail payload on click. A book with
 *      editions to choose opens quick look instead of adding "some copy" —
 *      which would also open a second cart line beside the same book added from
 *      its page. The engine's `{ ok }` decides whether the add happened.
 */

import { useState } from "react";
import { Image, Link, Money, useCart, type Product } from "@numueg/theme-sdk";
import { IconEye, IconHeart } from "./ornaments";
import { isInlineImage, productAuthor, productImages } from "./shared";
import { setCartDrawer } from "./cart-drawer";
import { fetchProductDetail } from "./product-detail";
import { QuickLook } from "./quick-look";
import { fill, useT } from "./i18n";

export interface ProductCardProps {
  product: Product;
  /** Rendered under the byline: "Used Trade Paperback". */
  formatLabel?: string;
  showWishlist?: boolean;
  showQuickAdd?: boolean;
  onWishlist?: (product: Product) => void;
  wishlisted?: boolean;
}

const hasChoices = (product: Product) =>
  (product.variants?.length ?? 0) > 1 ||
  (product.options ?? []).some((option) => (option.values?.length ?? 0) > 1);

export function ProductCard({
  product,
  formatLabel,
  showWishlist = true,
  showQuickAdd = true,
  onWishlist,
  wishlisted = false,
}: ProductCardProps) {
  const t = useT();
  const { addItem } = useCart();
  const [addState, setAddState] = useState<"idle" | "adding" | "failed" | "soldout">("idle");
  const [lookOpen, setLookOpen] = useState(false);

  const href = `/products/${product.slug ?? product.id}`;
  const cover = productImages(product)[0];
  const author = productAuthor(product);

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
  const available = listedStock !== false && addState !== "soldout";

  const onQuickAdd = async () => {
    setAddState("adding");
    const resolved =
      (product.variants?.length ?? 0) > 0
        ? product
        : ((await fetchProductDetail(String(product.id))) ?? product);
    if (hasChoices(resolved)) {
      setAddState("idle");
      setLookOpen(true);
      return;
    }
    if (resolved.in_stock === false) {
      setAddState("soldout");
      return;
    }
    const variant = resolved.variants?.[0];
    const result = await addItem(
      String(product.id),
      variant ? String(variant.id) : undefined,
      1,
      variant?.option_values,
    );
    setAddState(result?.ok ? "idle" : "failed");
    if (result?.ok) setCartDrawer(true);
  };

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
        {showQuickAdd && (
          <button
            type="button"
            className="pw-card-look"
            aria-haspopup="dialog"
            aria-label={fill(t("preview.open", "Quick look: {{name}}"), { name: product.name })}
            onClick={() => setLookOpen(true)}
          >
            <IconEye />
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
          <Money amount={price ?? 0} currency={product.currency} />
        </b>
        {wasPrice !== null && (
          <s>
            <Money amount={wasPrice} currency={product.currency} />
          </s>
        )}
      </p>

      {showQuickAdd &&
        (addState === "failed" ? (
          <Link className="pw-card-add" to={href}>
            {t("product.see_details", "See details")}
          </Link>
        ) : hasChoices(product) ? (
          <button type="button" className="pw-card-add" aria-haspopup="dialog" onClick={() => setLookOpen(true)}>
            {t("product.choose_options", "Choose edition")}
          </button>
        ) : (
          <button
            type="button"
            className="pw-card-add"
            disabled={!available || addState === "adding"}
            onClick={onQuickAdd}
          >
            {!available
              ? t("product.out_of_stock", "Currently unavailable")
              : addState === "adding"
                ? t("product.adding", "Adding...")
                : t("product.add_to_cart", "Add to Cart")}
          </button>
        ))}

      {lookOpen && <QuickLook product={product} onClose={() => setLookOpen(false)} />}
    </article>
  );
}
