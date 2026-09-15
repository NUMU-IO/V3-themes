/**
 * pw-shelf-links — "browse by shelf" / "shop by genre".
 *
 * Two looks. `tiles`: a grid of the store's collections. `cards`: four large
 * genre cards, each with three of that genre's own covers fanned inside it —
 * the way in for a shopper who does not have a title in mind.
 *
 * Reads the store's real collections and falls back to merchant-authored tiles
 * only where the merchant added them — so a shop with a well-tended collection
 * list gets a finished section with nothing to configure. A hand-added card is
 * matched to its collection by name for the covers and the count.
 */

import { Image, Link, useCollections, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asNumber,
  asString,
  isInlineImage,
  productImages,
  readBlockNodes,
  useOrnaments,
  type SectionRenderProps,
} from "../lib/shared";
import { slugOf, useShelfBooks } from "../lib/shelf-books";
import { fill, useT } from "../lib/i18n";
import { IconArrow, Sprig } from "../lib/ornaments";

interface Tile {
  id: string;
  title: string;
  href: string;
  image: string;
  count: number;
  collection: string;
}

function GenreCard({ tile }: { tile: Tile }) {
  const t = useT();
  const books = useShelfBooks([], "collection", tile.collection, 3, { withCovers: true });
  const covers = books.map((book) => productImages(book)[0]).filter((src): src is string => Boolean(src));

  return (
    <Link className="pw-genre" to={tile.href}>
      <span className="pw-genre-head">
        <span className="pw-genre-name">{tile.title}</span>
        {tile.count > 0 && (
          <span className="pw-genre-count">{fill(t("collection.count_many", "{{count}} books"), { count: tile.count.toLocaleString() })}</span>
        )}
      </span>
      {tile.image ? (
        <span className="pw-genre-photo">
          <Image src={tile.image} alt="" loading="lazy" responsive={!isInlineImage(tile.image)} />
        </span>
      ) : covers.length === 0 ? (
        <span className="pw-genre-initial" aria-hidden="true">
          {tile.title.slice(0, 1)}
        </span>
      ) : (
        <span className="pw-genre-covers" data-count={covers.length} aria-hidden="true">
          {covers.map((src) => (
            <span key={src} className="pw-genre-book">
              <Image src={src} alt="" loading="lazy" responsive={!isInlineImage(src)} />
            </span>
          ))}
        </span>
      )}
      <span className="pw-genre-go" aria-hidden="true">
        <IconArrow />
      </span>
    </Link>
  );
}

export default function PwShelfLinks({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const ornaments = useOrnaments();
  const { collections } = useCollections({ fetchIfMissing: true });
  const layout = asString(s.layout) || "tiles";

  const storeTiles: Tile[] = (collections ?? []).map((collection) => {
    const c = collection as unknown as Record<string, unknown>;
    return {
      id: String(c.id ?? ""),
      title: asString(c.name),
      href: `/collections/${asString(c.slug) || String(c.id ?? "")}`,
      image: asString(c.image_url),
      count: asNumber(c.product_count, 0),
      collection: asString(c.name),
    };
  });

  const manual: Tile[] = readBlockNodes(instance, "shelf").map((block) => {
    const title = asString(block.settings.title);
    const name = asString(block.settings.collection) || title;
    const match = storeTiles.find((tile) => tile.title.toLowerCase() === name.toLowerCase() || slugOf(tile.title) === slugOf(name));
    return {
      id: asString(block.settings.link) || title,
      title,
      href: asString(block.settings.link) || match?.href || "/collections",
      image: asString(block.settings.image),
      count: match?.count ?? 0,
      collection: name,
    };
  });

  const tiles = (manual.length > 0 ? manual : storeTiles).slice(0, asNumber(s.limit, 6));
  if (tiles.length === 0) return null;

  const heading = asString(s.heading);

  return (
    <section className="pw-section">
      <div className="pw-section-head">
        {heading && <h2>{heading}</h2>}
        <span className="pw-rule" />
        {ornaments && (
          <span style={{ color: "var(--pw-ink-soft)", flex: "0 0 auto" }}>
            <Sprig size={44} />
          </span>
        )}
      </div>

      {layout === "cards" ? (
        <div className="pw-genres">
          {tiles.map((tile) => (
            <GenreCard key={tile.id || tile.title} tile={tile} />
          ))}
        </div>
      ) : (
        <div className="pw-tiles">
          {tiles.map((tile) => (
            <Link className="pw-tile" to={tile.href} key={tile.id || tile.title}>
              {tile.image ? (
                <Image src={tile.image} alt={tile.title} loading="lazy" responsive={!isInlineImage(tile.image)} aspectRatio="4/3" />
              ) : (
                /* No photograph is a normal state for a collection, so the
                   fallback is a designed plate rather than a broken frame. */
                <span className="pw-tile-plate" aria-hidden="true">
                  {tile.title.slice(0, 1)}
                </span>
              )}
              <span className="pw-tile-label">
                {tile.title}
                {tile.count > 0 && <em>{tile.count}</em>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
