/**
 * pw-campaign — an editorial moment between the shelves.
 *
 * "Dark Romance After Midnight", "Start Here: V.E. Schwab", "Collector's
 * Shelf": one large visual beside a short piece of copy and a hand-picked
 * handful of books. It exists to break a run of product rows with something
 * that reads as a bookseller's choice rather than a query.
 *
 * The visual is the merchant's own photograph when they upload one. Without
 * one it is built from what the section already has: the chosen books' covers
 * fanned on the section's colour, or one of the theme's line drawings — never a
 * stock image.
 */

import { Image, Link, useProducts, useResolvedSettings, type Product } from "@numueg/theme-sdk";
import {
  asBool,
  asImageAlt,
  asImageUrl,
  asNumber,
  asString,
  isInlineImage,
  productImages,
  type SectionRenderProps,
} from "../lib/shared";
import { ProductCard } from "../lib/product-card";
import type { BookSource } from "../lib/pick-books";
import { useShelfBooks } from "../lib/shelf-books";
import { IconArrow, SceneGift, SceneGrading, SceneReading, Twinkle } from "../lib/ornaments";

function CoverFan({ books }: { books: Product[] }) {
  const covers = books
    .map((book) => ({ id: String(book.id), src: productImages(book)[0], name: book.name }))
    .filter((book) => Boolean(book.src))
    .slice(0, 3);
  if (covers.length === 0) return null;
  return (
    <div className="pw-fan" data-count={covers.length} aria-hidden="true">
      {covers.map((book) => (
        <span key={book.id} className="pw-fan-book">
          <Image src={book.src} alt="" responsive={!isInlineImage(book.src)} loading="lazy" />
        </span>
      ))}
    </div>
  );
}

export default function PwCampaign({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const { products } = useProducts({ limit: 300, fetchIfMissing: true });

  const source = (asString(s.source) || "collection") as BookSource;
  const books = useShelfBooks(products, source, asString(s.collection), asNumber(s.limit, 3), {
    books: asString(s.books),
    maxPrice: asNumber(s.max_price, 0),
    withCovers: true,
  });

  const eyebrow = asString(s.eyebrow);
  const heading = asString(s.heading);
  const body = asString(s.body);
  const ctaText = asString(s.cta_text);
  const ctaLink = asString(s.cta_link) || "/products";
  const image = asImageUrl(s.image);
  const alt = asImageAlt(s.image) || heading;
  const visual = asString(s.visual) || "covers";
  const tone = asString(s.tone) || "night";

  if (!heading && books.length === 0) return null;

  const drawing =
    visual === "reading" ? <SceneReading width={320} /> : visual === "gift" ? <SceneGift width={320} /> : visual === "grading" ? <SceneGrading width={320} /> : null;

  return (
    <section className="pw-section">
      <div className={`pw-campaign${asBool(s.visual_right, false) ? " flip" : ""}`} data-tone={tone}>
        <div className="pw-campaign-visual" data-kind={image ? "photo" : visual}>
          {image ? (
            <Image src={image} alt={alt} loading="lazy" responsive={!isInlineImage(image)} />
          ) : (
            <>
              {tone === "night" && (
                <span className="pw-campaign-stars" aria-hidden="true">
                  <Twinkle size={14} />
                  <Twinkle size={9} />
                  <Twinkle size={11} />
                </span>
              )}
              {drawing ?? <CoverFan books={books} />}
            </>
          )}
        </div>

        <div className="pw-campaign-copy">
          {eyebrow && <p className="pw-kicker">{eyebrow}</p>}
          {heading && <h2>{heading}</h2>}
          {body && (
            <div className="pw-campaign-body">
              {body.split(/\n{2,}/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          )}
          {books.length > 0 && (
            <div className="pw-campaign-books" data-count={books.length}>
              {books.map((book) => (
                <ProductCard key={book.id} product={book} showQuickAdd={false} showWishlist={false} />
              ))}
            </div>
          )}
          {ctaText && (
            <Link className="pw-btn pw-btn-primary pw-campaign-cta" to={ctaLink}>
              {ctaText}
              <IconArrow />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
