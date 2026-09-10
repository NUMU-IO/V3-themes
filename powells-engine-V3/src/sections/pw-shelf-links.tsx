/**
 * pw-shelf-links — "browse by shelf".
 *
 * Tiles for the store's collections. Powell's organises a very large catalogue
 * by room and subject, and this is that idea at home-page scale: the way in
 * for a shopper who does not have a title in mind.
 *
 * Reads the store's real collections and falls back to merchant-authored tiles
 * only where a collection has no image — so a shop with a well-tended
 * collection list gets a finished section with nothing to configure.
 */

import { Image, Link, useCollections, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asNumber,
  asString,
  isInlineImage,
  readBlockNodes,
  useOrnaments,
  type SectionRenderProps,
} from "../lib/shared";
import { Sprig } from "../lib/ornaments";

export default function PwShelfLinks({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const ornaments = useOrnaments();
  const { collections } = useCollections({ fetchIfMissing: true });

  const manual = readBlockNodes(instance, "shelf").map((block) => ({
    id: asString(block.settings.link),
    title: asString(block.settings.title),
    href: asString(block.settings.link) || "/collections",
    image: asString(block.settings.image),
    count: 0,
  }));

  const fromStore = (collections ?? []).map((collection) => {
    const c = collection as unknown as Record<string, unknown>;
    return {
      id: String(c.id ?? ""),
      title: asString(c.name),
      href: `/collections/${asString(c.slug) || String(c.id ?? "")}`,
      image: asString(c.image_url),
      count: asNumber(c.product_count, 0),
    };
  });

  const tiles = (manual.length > 0 ? manual : fromStore).slice(0, asNumber(s.limit, 6));
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

      <div className="pw-tiles">
        {tiles.map((tile) => (
          <Link className="pw-tile" to={tile.href} key={tile.id || tile.title}>
            {tile.image ? (
              <Image
                src={tile.image}
                alt={tile.title}
                loading="lazy"
                responsive={!isInlineImage(tile.image)}
                aspectRatio="4/3"
              />
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
    </section>
  );
}
