/**
 * The book card.
 *
 * One component behind every grid in the theme — the collection, search,
 * home shelves, the books-plus-banner row, "Customers Also Bought" and
 * "Recently viewed" — so a change to how a book is presented lands in all of
 * them at once.
 *
 * Two looks over one component:
 *   - `shelf` (default): the cover stands free with a drop shadow, contained,
 *     never cropped — jackets are not a fixed ratio, and the row reads as a
 *     shelf.
 *   - `tile`: the cover fills the top of a white rounded card, for the
 *     books-plus-banner row.
 *
 * Quick-add never guesses an edition. Listing payloads report `variants: []`
 * whether or not a book has editions, so a card that cannot name its variant
 * resolves the detail payload on click. A book with editions to choose opens
 * quick look instead of adding "some copy". The engine's `{ ok }` decides
 * whether the add happened.
 */

import { useState } from "react";
import { Image, Link, Money, useCart, type Product } from "@numueg/theme-sdk";
import { IconEye } from "./ornaments";
import { bookFormat, isInlineImage, productAuthor, productImages } from "./shared";
import { setCartDrawer } from "./cart-drawer";
import { fetchProductDetail } from "./product-detail";
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
  const { addItem } = useCart();
  const [addState, setAddState] = useState<"idle" | "adding" | "failed" | "soldout">("idle");
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
    const firstVariant = resolved.variants?.[0];
    const result = await addItem(
      String(product.id),
      firstVariant ? String(firstVariant.id) : undefined,
      1,
      firstVariant?.option_values,
    );
    setAddState(result?.ok ? "idle" : "failed");
    if (result?.ok) setCartDrawer(true);
  };

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
