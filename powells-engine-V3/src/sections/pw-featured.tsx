/**
 * pw-featured — a row of book cards beside one promo card.
 *
 * "Newly released", "Reduced", "From one collection": a heading, a handful of
 * books as white cards, and a promo card that sells one thing.
 *
 * The promo card is the merchant's own banner when they upload an image for it.
 * Without one it is built from a real book: the book named in "Book to feature",
 * or, when that is empty, one picked from the shop. It shows that book's cover
 * large over a blurred, tinted copy of itself, with its name and a Buy now that
 * opens it. A title alone does not count as a banner — the section's preset
 * ships a title, so every new store would otherwise get a panel of text and no
 * book. The label only says "Special discount" when the book really is reduced;
 * this section never invents an offer.
 */

import { useEffect, useState } from "react";
import { Image, Link, useProducts, useResolvedSettings, type Product } from "@numueg/theme-sdk";
import {
  asBool,
  asImageAlt,
  asImageUrl,
  asNumber,
  asString,
  isInlineImage,
  productAuthor,
  productImages,
  useOrnaments,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { ProductCard } from "../lib/product-card";
import { fetchProductDetail } from "../lib/product-detail";
import type { BookSource } from "../lib/pick-books";
import { useShelfBooks } from "../lib/shelf-books";
import { Twinkle } from "../lib/ornaments";

const isReduced = (product: Product) => {
  const was = Number((product as unknown as Record<string, unknown>).compare_at_price);
  return Number.isFinite(was) && was > Number(product.price ?? 0);
};

const same = (a: string | undefined, b: string) => (a ?? "").trim().toLowerCase() === b.trim().toLowerCase();

export default function PwFeatured({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();
  const { products } = useProducts({ limit: 300, fetchIfMissing: true });

  const source = (asString(s.source) || "newest") as BookSource;
  const limit = asNumber(s.limit, 3);
  const collection = asString(s.collection);
  const picks = useShelfBooks(products, source, collection, limit);

  const heading = asString(s.heading);
  const promoTitle = asString(s.promo_title);
  const promoEyebrow = asString(s.promo_eyebrow);
  const promoImage = asImageUrl(s.promo_image);
  const promoAlt = asImageAlt(s.promo_image) || promoTitle;
  const promoButton = asString(s.promo_button) || t("featured.shop_now", "Shop now");
  const promoLink = asString(s.promo_link) || "/products";
  const merchantPromo = Boolean(promoImage);

  // The book the merchant named: from the page's products when it is there,
  // otherwise fetched by handle. While that fetch is pending no other book is
  // shown in its place, so the card never flashes the wrong title.
  const wanted = merchantPromo ? "" : asString(s.promo_product).trim();
  const inPool = wanted ? products.find((p) => same(p.slug, wanted) || same(p.name, wanted)) : undefined;
  const needsFetch = Boolean(wanted) && !inPool;
  const [fetched, setFetched] = useState<Product | null | undefined>(undefined);
  useEffect(() => {
    if (!needsFetch) return;
    let live = true;
    void fetchProductDetail(wanted).then((product) => {
      if (live) setFetched(product);
    });
    return () => {
      live = false;
    };
  }, [wanted, needsFetch]);
  const named = inPool ?? (fetched || undefined);
  const pending = needsFetch && fetched === undefined;

  // Otherwise a book not already in the row beside it, with a cover,
  // preferring one that is actually reduced.
  const shown = new Set(picks.map((p) => String(p.id)));
  const candidates =
    merchantPromo || named || pending
      ? []
      : products.filter((p) => !shown.has(String(p.id)) && productImages(p)[0]);
  const promoBook = merchantPromo ? undefined : (named ?? candidates.find(isReduced) ?? candidates[0]);

  const showPromo = asBool(s.show_promo, true) && (merchantPromo || Boolean(promoBook));

  if (picks.length === 0 && !showPromo) return null;

  return (
    <section className="pw-section pw-featured">
      <div className={showPromo ? "pw-featured-grid has-promo" : "pw-featured-grid"}>
        <div className="pw-featured-books">
          {heading && (
            <h2 className="pw-featured-title">
              {ornaments && <Twinkle size={22} />}
              {heading}
            </h2>
          )}
          <div className="pw-tiles-row">
            {picks.map((product) => (
              <ProductCard key={product.id} product={product} variant="tile" showQuickAdd={false} />
            ))}
          </div>
        </div>

        {showPromo && merchantPromo && (
          <Link to={promoLink} className="pw-promo has-image">
            <Image src={promoImage} alt={promoAlt} responsive={!isInlineImage(promoImage)} loading="lazy" />
            <span className="pw-promo-copy">
              {promoEyebrow && <span className="pw-promo-eyebrow">{promoEyebrow}</span>}
              {promoTitle && <span className="pw-promo-title">{promoTitle}</span>}
              <span className="pw-btn pw-btn-primary pw-promo-btn">{promoButton}</span>
            </span>
          </Link>
        )}

        {showPromo && promoBook && (
          <PromoBook
            book={promoBook}
            eyebrow={
              isReduced(promoBook)
                ? t("featured.special_discount", "Special discount")
                : t("featured.featured_book", "Featured book")
            }
            byLabel={t("product.by", "by")}
            buttonLabel={t("featured.buy_now", "Buy now")}
          />
        )}
      </div>
    </section>
  );
}

function PromoBook({
  book,
  eyebrow,
  byLabel,
  buttonLabel,
}: {
  book: Product;
  eyebrow: string;
  byLabel: string;
  buttonLabel: string;
}) {
  const cover = productImages(book)[0];
  const author = productAuthor(book);
  return (
    <Link to={`/products/${book.slug ?? book.id}`} className="pw-promo pw-promo--book">
      {cover && (
        <span className="pw-promo-backdrop" aria-hidden="true">
          <Image src={cover} alt="" responsive={false} loading="lazy" />
        </span>
      )}
      <span className="pw-promo-copy">
        <span className="pw-promo-eyebrow">{eyebrow}</span>
        <span className="pw-promo-title">{book.name}</span>
        {author && <span className="pw-promo-by">{`${byLabel} ${author}`}</span>}
        <span className="pw-btn pw-btn-primary pw-promo-btn">{buttonLabel}</span>
      </span>
      {cover && (
        <span className="pw-promo-book">
          <Image src={cover} alt={book.name} responsive={!isInlineImage(cover)} loading="lazy" />
        </span>
      )}
    </Link>
  );
}
