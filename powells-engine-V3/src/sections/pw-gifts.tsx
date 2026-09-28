/**
 * pw-gifts — the gift guide.
 *
 * A bookseller's gift table: the promise (wrapped, with a card, or a gift
 * card), a few books picked for giving, and ways in by who it is for or what
 * it costs. The ways in are merchant blocks that link to a collection or a
 * price, so the guide sends shoppers to shelves that already exist.
 *
 * Wrapping and the card are taken at checkout (see pw-checkout), so the perks
 * listed here should only name what the store really offers.
 */

import { Image, Link, useProducts, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asImageAlt,
  asImageUrl,
  asNumber,
  asString,
  isInlineImage,
  readBlockNodes,
  type SectionRenderProps,
} from "../lib/shared";
import { ProductCard } from "../lib/product-card";
import type { BookSource } from "../lib/pick-books";
import { useShelfBooks } from "../lib/shelf-books";
import { IconArrow, SceneGift } from "../lib/ornaments";

export default function PwGifts({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const { products } = useProducts({ limit: 300, fetchIfMissing: true });

  const source = (asString(s.source) || "collection") as BookSource;
  const books = useShelfBooks(products, source, asString(s.collection), asNumber(s.limit, 3), {
    books: asString(s.books),
    maxPrice: asNumber(s.max_price, 0),
  });

  const heading = asString(s.heading);
  const image = asImageUrl(s.image);
  const perks = asString(s.perks)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const ways = readBlockNodes(instance, "way")
    .map((b) => ({ label: asString(b.settings.label), note: asString(b.settings.note), link: asString(b.settings.link) }))
    .filter((way) => way.label);
  const ctaText = asString(s.cta_text);

  if (!heading && books.length === 0 && ways.length === 0) return null;

  return (
    <section className="pw-section">
      <div className="pw-campaign" data-tone={asString(s.tone) || "lavender"}>
        <div className="pw-campaign-visual" data-kind={image ? "photo" : "gift"}>
          {image ? (
            <Image src={image} alt={asImageAlt(s.image) || heading} loading="lazy" responsive={!isInlineImage(image)} />
          ) : (
            <SceneGift width={320} />
          )}
        </div>

        <div className="pw-campaign-copy">
          {asString(s.eyebrow) && <p className="pw-kicker">{asString(s.eyebrow)}</p>}
          {heading && <h2>{heading}</h2>}
          {asString(s.body) && (
            <div className="pw-campaign-body">
              <p>{asString(s.body)}</p>
            </div>
          )}
          {perks.length > 0 && (
            <ul className="pw-gift-perks">
              {perks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
          )}
          {books.length > 0 && (
            <div className="pw-campaign-books" data-count={books.length}>
              {books.map((book) => (
                <ProductCard key={book.id} product={book} showQuickAdd={false} showWishlist={false} />
              ))}
            </div>
          )}
          {ctaText && (
            <Link className="pw-btn pw-btn-primary pw-campaign-cta" to={asString(s.cta_link) || "/products"}>
              {ctaText}
              <IconArrow />
            </Link>
          )}
        </div>
      </div>

      {ways.length > 0 && (
        <nav className="pw-gift-ways" aria-label={heading || undefined}>
          {ways.map((way) => (
            <Link key={way.label} className="pw-gift-way" to={way.link || "/products"}>
              <b>{way.label}</b>
              {way.note && <span>{way.note}</span>}
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}
