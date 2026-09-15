/**
 * pw-shelf — a row of books under a heading.
 *
 * The home page's workhorse: "New arrivals", "Staff picks", "Under $10". One
 * section, used several times with different sources, rather than one section
 * per row — the layout is identical and only the query differs.
 *
 * Rendered as a horizontal RAIL that scrolls, not a wrapping grid: a shelf is
 * a line of books, and a rail keeps the home page's vertical rhythm no matter
 * how many titles a merchant points it at. The listing page is where a grid
 * belongs.
 */

import { Link, useProducts, useResolvedSettings } from "@numueg/theme-sdk";
import { asBool, asNumber, asString, useOrnaments, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { ProductCard } from "../lib/product-card";
import type { BookSource } from "../lib/pick-books";
import { useShelfBooks } from "../lib/shelf-books";
import { Twinkle } from "../lib/ornaments";

export default function PwShelf({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();

  // Home ships `page.data.products`, but this section is also usable on routes
  // that ship none — hence fetchIfMissing. The limit is the size of the pool a
  // shelf CHOOSES from, not how many it shows: home ships 300 books, and a
  // genre shelf picking from only the first 48 found three or four of its own.
  const { products } = useProducts({ limit: 300, fetchIfMissing: true });

  const source = (asString(s.source) || "newest") as BookSource;
  const limit = asNumber(s.limit, 5);
  const collection = asString(s.collection);

  const picks = useShelfBooks(products, source, collection, limit);

  if (picks.length === 0) return null;

  const heading = asString(s.heading);
  const note = asString(s.note);
  const viewAllText = asString(s.view_all_text);
  const viewAllLink = asString(s.view_all_link) || "/products";

  return (
    <section className="pw-section">
      <div className="pw-section-head">
        {ornaments && (
          <span style={{ color: "var(--pw-ink-soft)", flex: "0 0 auto" }}>
            <Twinkle size={20} />
          </span>
        )}
        {heading && <h2>{heading}</h2>}
        <span className="pw-rule" />
        {note && ornaments && <span className="pw-hand">{note}</span>}
        {viewAllText && (
          <Link className="pw-linkbtn" to={viewAllLink}>
            {viewAllText}
          </Link>
        )}
      </div>

      <div className="pw-rail-scroll">
        {picks.map((product) => (
          <div className="pw-rail-item" key={product.id}>
            <ProductCard product={product} showWishlist={asBool(s.show_wishlist, true)} />
          </div>
        ))}
      </div>

      <p className="pw-sr">{t("collection.count_many", "{{count}} books").replace("{{count}}", String(picks.length))}</p>
    </section>
  );
}
