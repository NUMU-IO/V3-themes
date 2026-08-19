/**
 * tn-collection-links — the collection-card grid that closes most pages.
 *
 * Card anatomy from the reference: a tall image with a white label card inset
 * over its lower edge, carrying an orange item-count pill, the collection name
 * and an underlined "View all".
 *
 * Reads through `useStoreCollections()` rather than `useCollections()` so the
 * automatic mode is populated on EVERY route. This block sits near the footer,
 * which means it appears on `/cart`, `/pages/*` and `/blogs/*` — exactly the
 * routes where the host ships no `page.data.collections`, and exactly where a
 * naive implementation renders an empty grid.
 *
 * The count pill is suppressed per-card when the store does not report a count.
 * An "0 items" pill on a stocked collection is worse than no pill.
 */

import { Link, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asBool,
  asImageUrl,
  asNumber,
  asString,
  collectionFields,
  readBlockNodes,
  useStoreCollections,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";

interface CardData {
  key: string;
  title: string;
  link: string;
  image: string;
  countLabel: string;
}

export default function TnCollectionLinks({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const collections = useStoreCollections();

  const source = asString(s.source, "auto");
  const showCounts = asBool(s.show_counts, true);
  const viewAll = asString(s.view_all_label) || t("common.view_all", "View all");

  const cards: CardData[] =
    source === "manual"
      ? readBlockNodes(instance, "card").map((node, i) => ({
          key: `card-${i}`,
          title: asString(node.settings.title),
          link: asString(node.settings.link, "/collections"),
          image: asImageUrl(node.settings.image),
          countLabel: showCounts ? asString(node.settings.count_label) : "",
        }))
      : collections
          .map(collectionFields)
          .slice(0, asNumber(s.limit, 4))
          .map((c) => ({
            key: c.id || c.slug,
            title: c.name,
            link: `/collections/${c.slug}`,
            image: c.image,
            countLabel:
              showCounts && c.count > 0
                ? t("common.items_count", "{{n}} items").replace("{{n}}", String(c.count))
                : "",
          }));

  const visible = cards.filter((c) => c.title);
  if (visible.length === 0) return null;

  return (
    <section className="tn-section">
      <div className="tn-container">
        {asString(s.heading) ? (
          <h2 className="tn-collinks-title">{asString(s.heading)}</h2>
        ) : null}

        <div
          className="tn-grid tn-collinks"
          /* ⚠ Never set `--tn-cols` here. `.tn-grid` reads
             `repeat(var(--tn-cols, 2), …)` and RAISES `--tn-cols` inside its
             own media queries; an inline value is a style-attribute
             declaration, which outranks every one of them, so the grid would
             be pinned to two columns at every width while the tablet and
             desktop variables sit there looking wired. Set only the ladder
             inputs and let the fallback supply the mobile count. */
          style={
            {
              "--tn-cols-tablet": Math.min(3, asNumber(s.columns_desktop, 4)),
              "--tn-cols-desktop": asNumber(s.columns_desktop, 4),
            } as React.CSSProperties
          }
        >
          {visible.map((c) => (
            <Link key={c.key} to={c.link} className="tn-collink">
              {c.image ? (
                <img src={c.image} alt="" loading="lazy" decoding="async" />
              ) : (
                <span className="tn-collink-plate" aria-hidden="true" />
              )}
              <span className="tn-collink-card">
                {c.countLabel ? <span className="tn-count-pill">{c.countLabel}</span> : null}
                <span className="tn-collink-name">{c.title}</span>
                {/* Not a nested link — the whole card is already the link. A
                    second <a> inside would be an invalid nesting and a second
                    tab stop to the same place. */}
                <span className="tn-collink-viewall">{viewAll}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
