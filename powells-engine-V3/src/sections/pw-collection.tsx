/**
 * pw-collection — the shelf: filter rail on the inline-start edge, sorted
 * grid beside it.
 *
 * One section serves BOTH `/collections/<slug>` and `/products`. They are the
 * same page with a different heading and a different product source, and
 * splitting them into two sections would mean two places to fix every layout
 * bug. `useListingHeading` resolves the title from the collection when there
 * is one and the merchant's setting when there is not.
 *
 * ## About the filters
 *
 * The rail's ROWS are merchant blocks (label + source), so the list reads as a
 * deliberate promise about how the shop is organised. Their VALUES are derived
 * from the products on the page — see lib/facets.ts for why counts are not
 * fetched, and why a row with nothing under it is dropped instead of shown.
 */

import { useMemo, useState } from "react";
import {
  Link,
  useCollectionOptional,
  useListingHeading,
  useProducts,
  useResolvedSettings,
} from "@numueg/theme-sdk";
import {
  asBool,
  asNumber,
  asString,
  cx,
  readBlockNodes,
  useOrnaments,
  type SectionRenderProps,
} from "../lib/shared";
import { buildFacets, matchesFilters, type FacetSource } from "../lib/facets";
import { useT } from "../lib/i18n";
import { ProductCard } from "../lib/product-card";
import { BookStack, IconChevron, Sprig, Twinkle } from "../lib/ornaments";

type SortKey = "relevance" | "price_asc" | "price_desc" | "newest" | "title";

export default function PwCollection({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();
  const collection = useCollectionOptional();

  // `fetchIfMissing` because this section is also mounted on routes where the
  // host ships no `page.data.products` — /search with an empty query, and a
  // collection the storefront rendered from cache.
  const { products, loading } = useProducts({
    limit: asNumber(s.max_products, 48),
    fetchIfMissing: true,
  });

  const heading = useListingHeading({
    title: asString(s.heading),
    defaultTitle: t("collection.browse", "Browse"),
  });

  const [sort, setSort] = useState<SortKey>("relevance");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  /**
   * The rail's rows are merchant blocks — the labels and their order are a
   * design decision, not a property of the data. Their VALUES are derived from
   * the products on the page. See lib/facets.ts for why.
   */
  const rows = useMemo(
    () =>
      readBlockNodes(instance, "filter").map((block, i) => ({
        id: `${asString(block.settings.source) || "option"}-${asString(block.settings.option_name)}-${i}`,
        label: asString(block.settings.label),
        source: (asString(block.settings.source) || "option") as FacetSource,
        optionName: asString(block.settings.option_name) || undefined,
      })),
    [instance],
  );

  const facets = useMemo(() => buildFacets(products, rows), [products, rows]);

  const filtered = useMemo(() => {
    const anyActive = Object.values(selected).some((v) => v.length > 0);
    if (!anyActive) return products;
    return products.filter((product) => matchesFilters(product, facets, selected));
  }, [products, facets, selected]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (sort) {
      case "price_asc":
        return copy.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      case "price_desc":
        return copy.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      case "title":
        return copy.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
      case "newest":
        return copy.sort((a, b) => {
          const at = String((a as unknown as Record<string, unknown>).created_at ?? "");
          const bt = String((b as unknown as Record<string, unknown>).created_at ?? "");
          return bt.localeCompare(at);
        });
      default:
        return copy;
    }
  }, [filtered, sort]);

  const toggle = (axis: string, value: string) =>
    setSelected((prev) => {
      const current = prev[axis] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [axis]: next };
    });

  const anySelected = Object.values(selected).some((v) => v.length > 0);
  const railTitle = asString(s.rail_title) || t("collection.browse", "Browse");
  const railNote = asString(s.rail_note);
  const resultsNote = asString(s.results_note);

  return (
    <div className="pw-body">
      <aside className="pw-rail">
        {ornaments && (
          <span style={{ color: "var(--pw-ink-soft)", opacity: 0.75, display: "block" }}>
            <Sprig size={72} />
          </span>
        )}
        <h2>{railTitle}</h2>

        <div className="pw-filters">
          {facets.map((facet) => {
            const isOpen = open[facet.id] ?? false;
            return (
              <div key={facet.id}>
                <button
                  type="button"
                  className="pw-filter"
                  aria-expanded={isOpen}
                  onClick={() => setOpen((p) => ({ ...p, [facet.id]: !isOpen }))}
                >
                  {facet.label}
                  <span className="pw-sign" aria-hidden="true">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div className="pw-filter-body">
                    {facet.values.map(({ value, count }) => (
                      <label className="pw-check" key={value}>
                        <input
                          type="checkbox"
                          checked={(selected[facet.id] ?? []).includes(value)}
                          onChange={() => toggle(facet.id, value)}
                        />
                        <span>{value}</span>
                        <span className="n">{count}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {anySelected && (
          <button
            type="button"
            className="pw-linkbtn"
            style={{ marginBlockStart: 18 }}
            onClick={() => setSelected({})}
          >
            {t("collection.clear_filters", "Clear filters")}
          </button>
        )}

        {ornaments && railNote && (
          <div className="pw-rail-foot">
            <span style={{ color: "var(--pw-ink-soft)" }}>
              <BookStack />
            </span>
            <span className="pw-hand">
              {railNote.split("\n").map((line, i) => (
                <span key={`${line}-${i}`} style={{ display: "block" }}>
                  {line}
                </span>
              ))}
            </span>
          </div>
        )}
      </aside>

      <div className="pw-main">
        {ornaments && resultsNote && (
          <>
            <span className="pw-main-note">
              {resultsNote.split("\n").map((line, i) => (
                <span key={`${line}-${i}`} style={{ display: "block" }}>
                  {line}
                </span>
              ))}
            </span>
            <span className="pw-main-sprig" style={{ color: "var(--pw-ink-soft)" }}>
              <Sprig size={64} />
            </span>
          </>
        )}

        <div className="pw-page-head">
          {ornaments && (
            <span style={{ color: "var(--pw-ink-soft)", flex: "0 0 auto" }}>
              <Twinkle />
            </span>
          )}
          <h1>{heading.title || t("collection.browse", "Browse")}</h1>
          <span className="pw-rule" />
        </div>

        {collection?.description && (
          <p className="pw-synopsis" style={{ marginBlockStart: 18 }}>
            {collection.description}
          </p>
        )}

        <div className="pw-sortbar">
          <label htmlFor={`pw-sort-${instance.type}`}>
            {t("collection.sort_by", "Sort By")}
          </label>
          <span className="pw-select">
            <select
              id={`pw-sort-${instance.type}`}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="relevance">{t("collection.sort_relevance", "Relevance")}</option>
              <option value="price_asc">{t("collection.sort_price_asc", "Price, low to high")}</option>
              <option value="price_desc">{t("collection.sort_price_desc", "Price, high to low")}</option>
              <option value="newest">{t("collection.sort_newest", "Newest arrivals")}</option>
              <option value="title">{t("collection.sort_title", "Title, A–Z")}</option>
            </select>
            <IconChevron />
          </span>
          {sorted.length > 0 && (
            <span className="pw-count">
              {sorted.length === 1
                ? t("collection.count_one", "1 book")
                : t("collection.count_many", "{{count}} books").replace(
                    "{{count}}",
                    String(sorted.length),
                  )}
            </span>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="pw-empty">
            {/* `loading` is deliberately NOT a spinner: this grid server-renders
                with its products already in place on a normal navigation, and a
                spinner would flash on every one of them. It only shows on the
                fetch-if-missing path, where there is genuinely nothing yet. */}
            <p>{loading ? "…" : t("collection.empty", "No books on this shelf yet.")}</p>
            {!loading && (
              <Link className="pw-btn pw-btn-ghost" to="/products">
                {t("collection.empty_cta", "Browse everything")}
              </Link>
            )}
          </div>
        ) : (
          <div className={cx("pw-grid")}>
            {sorted.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                showWishlist={asBool(s.show_wishlist, true)}
                formatLabel={asString(
                  (product as unknown as Record<string, unknown>).product_type,
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
