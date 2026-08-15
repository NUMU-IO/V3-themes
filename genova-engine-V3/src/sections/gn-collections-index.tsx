/**
 * gn-collections-index — /collections.
 *
 * A grid of every collection. Reads through `useStoreCollections` so it works
 * even when the host hasn't pre-fetched the list for this route.
 */

import { Image, Link } from "@numueg/theme-sdk";
import { asBool, asNumber, asString } from "@numueg/theme-kit";
import { collectionFields, cx, useStoreCollections, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";

export default function GnCollectionsIndex({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const collections = useStoreCollections();

  const heading = asString(s.heading) || t("collections.heading", "Collections");
  const columns = asNumber(s.columns, 3);
  const aspect = asString(s.aspect, "portrait");
  const showCounts = asBool(s.show_counts, true);

  return (
    <section className="gn-collections">
      <div className="gn-container gn-plp-head">
        <h1 className="gn-page-title">{heading}</h1>
      </div>

      {collections.length === 0 ? (
        <div className="gn-container gn-empty">
          <p className="gn-empty-title">{t("collections.empty", "No collections yet")}</p>
          <Link to="/products" className="gn-btn gn-btn-outline">
            {t("collections.browse_all", "Browse all products")}
          </Link>
        </div>
      ) : (
        <div
          className="gn-container gn-grid"
          style={{ ["--gn-grid-cols" as string]: String(columns) }}
        >
          {collections.map((raw) => {
            const c = collectionFields(raw);
            const count = (raw as { product_count?: number }).product_count;
            return (
              <Link key={c.id} to={`/collections/${c.slug}`} className="gn-rail-card">
                <span className={cx("gn-plate", "gn-rail-plate", `is-${aspect}`)}>
                  {c.image ? (
                    <Image src={c.image} alt="" sizes="(min-width: 1024px) 33vw, 50vw" loading="lazy" />
                  ) : null}
                </span>
                <span className="gn-rail-card-label gn-label">{c.name}</span>
                {showCounts && typeof count === "number" && (
                  <span className="gn-collections-count">
                    {t("collections.count", "{{n}} products").replace("{{n}}", String(count))}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
