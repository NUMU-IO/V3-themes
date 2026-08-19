/**
 * tn-collection — the product listing.
 *
 * ONE section for two templates: `/collections/<slug>` and the unscoped
 * `/products`. They differ in exactly three ways, all derived rather than
 * configured — the heading (the collection's own name beats any setting), the
 * Collection facet (meaningless inside one collection, so it is omitted), and
 * the empty-state copy. A second section would have been a second place for the
 * grid, the toolbar and the sheet to drift.
 *
 * Reference anatomy, top to bottom: a centred intro (title, one-line subtitle,
 * an editorial paragraph), then the toolbar — orange filter button and the
 * product count on the start side, a native-looking `Sort by` select on the end
 * side — then a four-column grid of cards, then load-more.
 *
 * Everything below the intro is client-side. That is not a shortcut: the
 * catalog endpoint has no `sort` parameter and the host's `/api/products`
 * forwards neither `page` nor `category_id`, so there is no server-side listing
 * to defer to. See the header of lib/filters.ts for the measurements.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  sanitizeHtml,
  useCollectionOptional,
  useLocale,
  useListingHeading,
  useProducts,
  useResolvedSettings,
} from "@numueg/theme-sdk";
import {
  asBool,
  asNumber,
  asString,
  collectionFields,
  localized,
  useStoreCollections,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import {
  applyFilters,
  asProducts,
  availableSorts,
  buildFacets,
  EMPTY_FILTERS,
  hasActiveFilters,
  isCapped,
  sortProducts,
  type FilterState,
  type SortId,
} from "../lib/filters";
import { FilterSheet, PlpEmpty, PlpToolbar, ProductGrid } from "../lib/plp";

export default function TnCollection({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const locale = useLocale();

  const showIntro = asBool(s.show_intro, true);
  const showDescription = asBool(s.show_description, true);
  const showFilters = asBool(s.show_filters, true);
  const showSort = asBool(s.show_sort, true);
  const columnsDesktop = asNumber(s.columns_desktop, 4);
  const pageSize = asNumber(s.products_per_page, 16);

  // `limit` matches the host's own collection pre-fetch. `fetchIfMissing`
  // covers the customizer, which renders this template with no page payload.
  const { products: pool, loading } = useProducts({ limit: 500, fetchIfMissing: true });
  const collection = useCollectionOptional();

  // Used for the TITLE only. `useListingHeading` also resolves a description,
  // but it falls back to the collection's own description — and so does the
  // editorial paragraph below, because that is the slot a paragraph belongs in.
  // Rendering both printed the collection description twice, once as the
  // one-line subtitle and again as the paragraph under it. The subtitle is
  // therefore the merchant's setting and nothing else.
  const heading = useListingHeading({
    title: asString(s.heading) || null,
    defaultTitle: localized(locale, "All products", "كل المنتجات"),
  });
  const subtitle = asString(s.subtitle);

  // Only needed for the Collection facet, which only exists on the unscoped
  // listing — so the hook's own fetch never fires on a collection page.
  const storeCollections = useStoreCollections();
  const collectionNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of storeCollections) {
      const f = collectionFields(c);
      if (f.id && f.name) map.set(f.id, f.name);
    }
    return map;
  }, [storeCollections]);

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const sorts = useMemo(() => availableSorts(pool, false), [pool]);

  const [sort, setSort] = useState<SortId>(() => (asString(s.default_sort, "featured") as SortId));

  /*
   * These two jobs used to be one effect keyed on `[s.default_sort, sorts]`,
   * and that made SORTING COMPLETELY INERT on the storefront.
   *
   * `sorts` is `useMemo(..., [pool])` and `pool` comes from `useProducts({...})`
   * — a fresh options object every render, so a fresh array every render. The
   * effect therefore re-ran on EVERY render and re-applied the merchant's
   * default, wiping whatever the shopper had just picked before the grid could
   * re-sort. Live QA showed the `<select>` snapping straight back to "Featured"
   * after every choice; no static check could see it, because both statements
   * in the effect were individually correct.
   *
   * Split, so each depends only on what it actually reacts to:
   */

  // 1. The merchant's default, re-applied only when the SETTING itself changes
  //    (an editor keystroke) — never on an unrelated re-render.
  const appliedDefault = useRef<string | null>(null);
  useEffect(() => {
    const preferred = asString(s.default_sort, "featured") as SortId;
    if (appliedDefault.current === preferred) return;
    appliedDefault.current = preferred;
    setSort(preferred);
  }, [s.default_sort]);

  // 2. Clamp to what is actually offered. `availableSorts` hides "Best selling"
  //    on a catalogue with no sales data, and a `<select>` whose value is not
  //    among its options renders blank. This only ever fires when the current
  //    choice has genuinely disappeared, so it cannot fight the shopper.
  useEffect(() => {
    setSort((current) =>
      sorts.length === 0 || sorts.includes(current) ? current : (sorts[0] as SortId),
    );
  }, [sorts]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetId = `${sectionId}-filters`;

  const { groups, bounds } = useMemo(
    () =>
      buildFacets(pool, filters, {
        includeCollections: !heading.isCollection,
        collectionNames,
        labels: {
          availability: t("plp.availability", "Availability"),
          inStock: t("plp.in_stock", "In stock"),
          outOfStock: t("plp.out_of_stock", "Out of stock"),
          color: t("plp.color", "Colour"),
          size: t("plp.size", "Size"),
          collection: t("plp.collection", "Collection"),
        },
      }),
    [pool, filters, heading.isCollection, collectionNames, t],
  );

  const results = useMemo(() => {
    const filtered = applyFilters(pool, filters);
    return asProducts(sortProducts(filtered, sort, { locale }));
  }, [pool, filters, sort, locale]);

  const clear = () => setFilters(EMPTY_FILTERS);
  const filtered = hasActiveFilters(filters);
  const resetKey = `${sort}|${JSON.stringify(filters)}`;

  // Prefer the merchant's own paragraph; fall back to the collection's
  // description. Sanitized because a category description is free text a
  // merchant may well have pasted HTML into.
  const editorial = asString(s.editorial) || (showDescription ? (collection?.description ?? "") : "");
  const safeEditorial = useMemo(() => sanitizeHtml(editorial), [editorial]);

  const emptyPool = !loading && pool.length === 0;

  return (
    <section className="tn-section tn-plp">
      <div className="tn-container">
        {showIntro && (
          <header className="tn-plp-intro">
            <h1 className="tn-plp-title">{heading.title}</h1>
            {subtitle ? <p className="tn-plp-subtitle">{subtitle}</p> : null}
            {editorial ? (
              <div
                className="tn-plp-editorial"
                dangerouslySetInnerHTML={{ __html: safeEditorial }}
              />
            ) : null}
          </header>
        )}

        {emptyPool ? (
          <PlpEmpty
            title={t("plp.empty_collection_title", "Nothing here yet")}
            body={t(
              "plp.empty_collection_body",
              "This collection has no products right now. Have a look at everything else in the store.",
            )}
          />
        ) : (
          <>
            <PlpToolbar
              count={results.length}
              sort={sort}
              sorts={sorts}
              onSort={setSort}
              onOpenFilters={() => setSheetOpen(true)}
              filters={filters}
              showFilters={showFilters && groups.length > 0}
              showSort={showSort}
              sheetId={sheetId}
              sheetOpen={sheetOpen}
            />

            <ProductGrid
              products={results}
              locale={locale}
              columnsDesktop={columnsDesktop}
              pageSize={pageSize}
              showQuickAdd={asBool(s.show_quick_add, true)}
              showSwatches={asBool(s.show_swatches, true)}
              loading={loading}
              resetKey={resetKey}
              capped={isCapped(pool.length, collection?.product_count)}
              empty={
                <PlpEmpty
                  title={t("plp.empty_filtered_title", "No products match")}
                  body={t(
                    "plp.empty_filtered_body",
                    "Try removing a filter to see more of the collection.",
                  )}
                  onClear={filtered ? clear : undefined}
                  clearLabel={t("plp.clear_all", "Clear all")}
                />
              }
            />

            {!heading.isCollection ? null : (
              <p className="tn-plp-backlink">
                <Link to="/products" className="tn-textlink">
                  {t("plp.view_everything", "View everything")}
                </Link>
              </p>
            )}
          </>
        )}
      </div>

      {sheetOpen && (
        <FilterSheet
          id={sheetId}
          groups={groups}
          bounds={bounds}
          state={filters}
          onChange={setFilters}
          onClear={clear}
          onClose={() => setSheetOpen(false)}
          resultCount={results.length}
          sort={sort}
          sorts={sorts}
          onSort={setSort}
          showSort={showSort}
        />
      )}
    </section>
  );
}
