/**
 * Series: the reading order, and buying all of it at once.
 *
 * The platform ships each book's series membership with the book — its
 * position, the count, and every volume — so the card can say "Book 1 of 5"
 * and the book page can list the order without another request.
 *
 * "Buy complete series" adds every volume not already in the cart, each in the
 * edition closest to the one the shopper picked here (a shopper who chose the
 * hardcover of book one wants hardcovers). Volumes are resolved through the
 * shared detail cache on click, never on render.
 */

import { useState } from "react";
import {
  Image,
  Link,
  useCart,
  type Product,
  type ProductSeriesMembership,
  type ProductVariant,
} from "@numueg/theme-sdk";
import { fetchProductDetail } from "./product-detail";
import { setCartDrawer } from "./cart-drawer";
import { variantMajor } from "./variants";
import { fill, useT, type TFunction } from "./i18n";
import { IconArrow, IconCheck } from "./ornaments";

export function seriesOf(product: Product | null | undefined): ProductSeriesMembership | null {
  return (product?.series ?? []).find((series) => (series.count ?? series.products?.length ?? 0) > 1) ?? null;
}

export function seriesLine(series: ProductSeriesMembership, t: TFunction): string {
  return fill(t("series.book_of", "Book {{number}} of {{count}}"), {
    number: series.volume_label || series.position,
    count: series.count ?? series.products.length,
  });
}

export const volumeNumber = (label: string | null | undefined, position: number): string => {
  const value = label || String(position);
  return /^\d$/.test(value) ? `0${value}` : value;
};

const norm = (value: unknown) => String(value ?? "").trim().toLowerCase();

function editionFor(book: Product, wanted: Record<string, string>): ProductVariant | undefined {
  const variants = (book.variants ?? []).filter((variant) => variant.is_in_stock !== false);
  const pairs = Object.entries(wanted).map(([axis, value]) => [norm(axis), norm(value)]);
  const score = (variant: ProductVariant) =>
    pairs.filter(([axis, value]) =>
      Object.entries(variant.option_values ?? {}).some(([a, v]) => norm(a) === axis && norm(v) === value),
    ).length;
  return [...variants].sort(
    (a, b) => score(b) - score(a) || variantMajor(book, a.price) - variantMajor(book, b.price),
  )[0];
}

export function useBuySeries(series: ProductSeriesMembership | null, selection: Record<string, string> = {}) {
  const { cart, addItem } = useCart();
  const [busy, setBusy] = useState(false);
  const inCart = new Set((cart?.items ?? []).map((item) => String(item.product_id)));
  const missing = (series?.products ?? []).filter((book) => !inCart.has(String(book.product_id)));

  const buy = async () => {
    if (!series || busy) return;
    setBusy(true);
    for (const book of missing) {
      const detail = await fetchProductDetail(String(book.product_id));
      if (!detail || detail.in_stock === false) continue;
      const variant = editionFor(detail, selection);
      await addItem(String(detail.id), variant ? String(variant.id) : undefined, 1, variant?.option_values);
    }
    setBusy(false);
    setCartDrawer(true);
  };

  return { buy, busy, missing: missing.length, inCart };
}

export function BuySeriesButton({
  series,
  selection,
  ghost = false,
}: {
  series: ProductSeriesMembership;
  selection?: Record<string, string>;
  ghost?: boolean;
}) {
  const t = useT();
  const { buy, busy, missing } = useBuySeries(series, selection);
  if (missing === 0) return <p className="pw-note pw-series-done">{t("series.all_in_cart", "The whole series is in your cart.")}</p>;
  const label =
    missing === series.products.length
      ? t("series.buy_all", "Buy complete series")
      : fill(t("series.buy_rest", "Add the other {{count}} books"), { count: missing });
  return (
    <button
      type="button"
      className={`pw-btn ${ghost ? "pw-btn-ghost" : "pw-btn-primary"} pw-series-buy`}
      disabled={busy}
      onClick={() => void buy()}
    >
      {busy ? t("product.adding", "Adding...") : label}
      {!busy && <IconArrow />}
    </button>
  );
}

/** The reading order on a book page, with the book being viewed ticked. */
export function SeriesPanel({ product, selection }: { product: Product; selection: Record<string, string> }) {
  const t = useT();
  const series = seriesOf(product);
  const { inCart } = useBuySeries(series, selection);
  if (!series) return null;

  return (
    <section className="pw-series" aria-label={series.name}>
      <p className="pw-kicker">{t("series.kicker", "Series")}</p>
      <h2 className="pw-series-name">{series.name}</h2>
      <p className="pw-series-count">{seriesLine(series, t)}</p>
      <ol className="pw-series-list">
        {series.products.map((book) => {
          const current = String(book.product_id) === String(product.id);
          return (
            <li key={book.product_id} aria-current={current ? "true" : undefined}>
              <span className="num">{volumeNumber(book.volume_label, book.position)}</span>
              {book.cover_image_url && (
                <Image src={book.cover_image_url} alt="" responsive={false} loading="lazy" />
              )}
              {current ? (
                <span className="title">{book.name}</span>
              ) : (
                <Link className="title" to={`/products/${book.slug}`}>
                  {book.name}
                </Link>
              )}
              {current ? (
                <span className="mark" title={t("series.this_book", "This book")}>
                  <IconCheck size={15} />
                </span>
              ) : (
                inCart.has(String(book.product_id)) && <span className="mark in">{t("series.in_cart", "In cart")}</span>
              )}
            </li>
          );
        })}
      </ol>
      <BuySeriesButton series={series} selection={selection} ghost />
    </section>
  );
}
