/**
 * tn-collections-index — the `/collections` page.
 *
 * Deliberately renders the SAME card as `tn-collection-links` (`.tn-collink`,
 * `.tn-count-pill`): a collection is one object, and it should not look like
 * two different things depending on whether the shopper reached it from the
 * footer grid or from the index. A second card style here would also be a
 * second place to fix every future card change.
 *
 * Reads through `useStoreCollections()`. The host DOES pre-fetch
 * `page.data.collections` on this route, so the hook's own fetch never fires —
 * but the same section renders correctly if a merchant drops it on a CMS page,
 * where the host ships nothing.
 */

import { Link, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asBool,
  asNumber,
  asString,
  collectionFields,
  useStoreCollections,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { PlpEmpty } from "../lib/plp";

export default function TnCollectionsIndex({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const collections = useStoreCollections();

  const showCounts = asBool(s.show_counts, true);
  const columns = asNumber(s.columns_desktop, 3);
  const viewAll = asString(s.view_all_label) || t("common.view_all", "View all");

  const cards = collections.map(collectionFields).filter((c) => c.name);

  return (
    <section className="tn-section tn-plp">
      <div className="tn-container">
        <header className="tn-plp-intro">
          <h1 className="tn-plp-title">
            {asString(s.heading) || t("plp.collections", "Collections")}
          </h1>
          {asString(s.subtitle) ? (
            <p className="tn-plp-subtitle">{asString(s.subtitle)}</p>
          ) : null}
        </header>

        {cards.length === 0 ? (
          <PlpEmpty
            title={t("plp.empty_collections_title", "No collections yet")}
            body={t(
              "plp.empty_collections_body",
              "Once products are grouped into collections they show up here.",
            )}
          />
        ) : (
          <div
            className="tn-grid tn-collinks"
            /* No `--tn-cols` — an inline value outranks the media queries
               inside `.tn-grid` and pins the grid to two columns forever.
               See the same note in tn-collection-links.tsx. */
            style={
              {
                "--tn-cols-tablet": Math.min(3, columns),
                "--tn-cols-desktop": columns,
              } as React.CSSProperties
            }
          >
            {cards.map((c) => (
              <Link key={c.id || c.slug} to={`/collections/${c.slug}`} className="tn-collink">
                {c.image ? (
                  <img src={c.image} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="tn-collink-plate" aria-hidden="true" />
                )}
                <span className="tn-collink-card">
                  {/* Suppressed rather than shown as "0 items" — not every store
                      reports a count, and "0" on a stocked collection reads as
                      out of stock. */}
                  {showCounts && c.count > 0 ? (
                    <span className="tn-count-pill">
                      {t("common.items_count", "{{n}} items").replace("{{n}}", String(c.count))}
                    </span>
                  ) : null}
                  <span className="tn-collink-name">{c.name}</span>
                  <span className="tn-collink-viewall">{viewAll}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
