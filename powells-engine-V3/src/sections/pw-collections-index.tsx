/**
 * pw-collections-index — the shelf of shelves at /collections.
 *
 * Until this existed, `/collections` reused `pw-collection`, which lists
 * PRODUCTS — so a shopper who asked to see the shop's sections got a wall of
 * individual books instead. This lists the sections.
 *
 * Shares the tile styling with `pw-shelf-links` on the home page on purpose: a
 * shopper who taps "Browse by shelf" and lands here should recognise where
 * they are, not meet a second, different design for the same idea.
 */

import { Image, Link, useCollections, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asNumber,
  asString,
  isInlineImage,
  useOrnaments,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { Sprig, Twinkle } from "../lib/ornaments";

export default function PwCollectionsIndex({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();
  const { collections, loading } = useCollections({ fetchIfMissing: true });

  const heading = asString(s.heading) || t("collections.title", "Browse the shelves");

  return (
    <div className="pw-container" style={{ paddingBlock: "38px 80px" }}>
      <div className="pw-page-head">
        {ornaments && (
          <span style={{ color: "var(--pw-ink-soft)", flex: "0 0 auto" }}>
            <Twinkle />
          </span>
        )}
        <h1>{heading}</h1>
        <span className="pw-rule" />
        {ornaments && (
          <span style={{ color: "var(--pw-ink-soft)", flex: "0 0 auto" }}>
            <Sprig size={52} />
          </span>
        )}
      </div>

      {asString(s.intro) && (
        <p className="pw-synopsis" style={{ marginBlockStart: 18 }}>
          {asString(s.intro)}
        </p>
      )}

      {collections.length === 0 ? (
        <div className="pw-empty">
          <p>{loading ? "…" : t("collections.empty", "No shelves yet.")}</p>
          <Link className="pw-btn pw-btn-ghost" to="/products">
            {t("collection.empty_cta", "Browse everything")}
          </Link>
        </div>
      ) : (
        <div className="pw-tiles" style={{ marginBlockStart: 34 }}>
          {collections.slice(0, asNumber(s.limit, 24)).map((collection) => {
            const c = collection as unknown as Record<string, unknown>;
            const image = asString(c.image_url);
            const title = asString(c.name);
            const count = asNumber(c.product_count, 0);
            return (
              <Link
                className="pw-tile"
                to={`/collections/${asString(c.slug) || String(c.id ?? "")}`}
                key={String(c.id ?? title)}
              >
                {image ? (
                  <Image
                    src={image}
                    alt={title}
                    loading="lazy"
                    responsive={!isInlineImage(image)}
                    aspectRatio="4/3"
                  />
                ) : (
                  <span className="pw-tile-plate" aria-hidden="true">
                    {title.slice(0, 1)}
                  </span>
                )}
                <span className="pw-tile-label">
                  {title}
                  {count > 0 && <em>{count}</em>}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
