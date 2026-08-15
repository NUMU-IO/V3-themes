/**
 * gn-products-page — the collection / all-products listing.
 *
 * Reference anatomy: a large centred title, an optional collection description,
 * a filter rail on the start side, a sort control on the end side, and a
 * three-column product grid.
 *
 * ⚠ FILTERING IS CLIENT-SIDE, AND BOUNDED (decision D3). The catalog API takes
 * only `category_id`, `page`, `limit`, `search`, `fields` — no sort, price,
 * stock or size facets. So we filter what we have, and past `filter_pool_size`
 * we DISABLE the facets and say so rather than showing a confidently wrong
 * "3 results" for a 300-product catalogue. Backend facets are a separate ticket.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  useCollectionOptional,
  useListingHeading,
  useLocale,
  useProducts,
} from "@numueg/theme-sdk";
import { asBool, asNumber, asString } from "@numueg/theme-kit";
import {
  cx,
  useFocusTrap,
  useOverlayBehaviour,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { ProductCard, ProductCardSkeleton } from "../lib/product-card";
import { QuickAddSheet, useQuickAdd } from "../lib/quick-add";
import {
  activeFilterCount,
  applyFilters,
  EMPTY_FILTERS,
  priceBounds,
  sizeFacet,
  type FilterState,
  type SortKey,
} from "../lib/filters";
import { AccordionItem } from "../lib/accordion";
import { IconClose, IconFilter } from "../lib/icons";

const SORTS: { key: SortKey; label: string; fallback: string }[] = [
  { key: "featured", label: "sort.featured", fallback: "Featured" },
  { key: "best-selling", label: "sort.best_selling", fallback: "Best selling" },
  { key: "a-z", label: "sort.a_z", fallback: "A–Z" },
  { key: "z-a", label: "sort.z_a", fallback: "Z–A" },
  { key: "price-asc", label: "sort.price_asc", fallback: "Price, low to high" },
  { key: "price-desc", label: "sort.price_desc", fallback: "Price, high to low" },
  { key: "newest", label: "sort.newest", fallback: "Newest" },
];

export default function GnProductsPage({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const locale = useLocale();
  const collection = useCollectionOptional();
  const heading = useListingHeading();
  const quickAdd = useQuickAdd();
  const sheetRef = useRef<HTMLDivElement>(null);

  const poolSize = Math.min(500, asNumber(s.filter_pool_size, 250));
  const { products, loading } = useProducts({ limit: poolSize, fetchIfMissing: true });

  const [filters, setFilters] = useState<FilterState>({
    ...EMPTY_FILTERS,
    sort: (asString(s.default_sort, "featured") as SortKey) ?? "featured",
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const closeFilters = useCallback(() => setMobileFiltersOpen(false), []);
  useFocusTrap(mobileFiltersOpen, sheetRef);
  useOverlayBehaviour(mobileFiltersOpen, closeFilters);

  const sizes = useMemo(() => sizeFacet(products), [products]);
  const bounds = useMemo(() => priceBounds(products), [products]);
  const results = useMemo(() => applyFilters(products, filters), [products, filters]);

  // The pool is full, so there are almost certainly products we never fetched.
  // Facets over a partial set produce wrong counts, so they are switched off
  // and the shopper is told why — silently truncating reads as "that's all
  // there is", which is worse than a disabled control.
  const poolExhausted = products.length >= poolSize;

  const showFilters = asBool(s.show_filters, true) && !poolExhausted;
  const columns = asNumber(s.columns_desktop, 3);
  const title = asString(s.heading) || heading.title || t("plp.all_products", "All products");
  const description = collection?.description ?? "";

  const set = (patch: Partial<FilterState>) => setFilters((f) => ({ ...f, ...patch }));

  const filterPanel = (
    <div className="gn-filters">
      {asBool(s.show_in_stock_filter, true) && (
        <label className="gn-filter-row">
          <span>{t("plp.in_stock_only", "In stock only")}</span>
          <input
            type="checkbox"
            className="gn-switch"
            checked={filters.inStockOnly}
            onChange={(e) => set({ inStockOnly: e.target.checked })}
          />
        </label>
      )}

      {asBool(s.show_price_filter, true) && bounds.max > bounds.min && (
        <AccordionItem title={t("plp.price", "Price")} className="gn-filter-acc">
          <div className="gn-filter-price">
            <label className="gn-sr-only" htmlFor="gn-price-min">
              {t("plp.price_min", "Minimum price")}
            </label>
            <input
              id="gn-price-min"
              type="number"
              inputMode="numeric"
              className="gn-input"
              placeholder={String(bounds.min)}
              value={filters.minPrice ?? ""}
              onChange={(e) => set({ minPrice: e.target.value === "" ? null : Number(e.target.value) })}
            />
            <span aria-hidden="true">–</span>
            <label className="gn-sr-only" htmlFor="gn-price-max">
              {t("plp.price_max", "Maximum price")}
            </label>
            <input
              id="gn-price-max"
              type="number"
              inputMode="numeric"
              className="gn-input"
              placeholder={String(bounds.max)}
              value={filters.maxPrice ?? ""}
              onChange={(e) => set({ maxPrice: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
        </AccordionItem>
      )}

      {asBool(s.show_size_filter, true) && sizes.length > 0 && (
        <AccordionItem title={t("plp.size", "Size")} className="gn-filter-acc">
          <div className="gn-filter-sizes">
            {sizes.map((size) => {
              const on = filters.sizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  className="gn-chip"
                  data-selected={on || undefined}
                  aria-pressed={on}
                  onClick={() =>
                    set({
                      sizes: on ? filters.sizes.filter((x) => x !== size) : [...filters.sizes, size],
                    })
                  }
                >
                  {size}
                </button>
              );
            })}
          </div>
        </AccordionItem>
      )}

      {activeFilterCount(filters) > 0 && (
        <button
          type="button"
          className="gn-textlink gn-filter-clear"
          onClick={() => set({ ...EMPTY_FILTERS, sort: filters.sort })}
        >
          {t("plp.clear", "Clear filters")}
        </button>
      )}
    </div>
  );

  return (
    <section className="gn-plp">
      <div className="gn-container gn-plp-head">
        <h1 className="gn-page-title">{title}</h1>
        {asBool(s.show_collection_description, true) && description && (
          <p className="gn-plp-desc">{description}</p>
        )}
      </div>

      <div className="gn-container gn-plp-body" data-with-rail={showFilters ? "true" : "false"}>
        {showFilters && (
          <aside className="gn-plp-rail" aria-label={t("plp.filters", "Filters")}>
            <p className="gn-plp-rail-title gn-label">
              <IconFilter size={16} />
              {t("plp.filters", "Filters")}
            </p>
            {filterPanel}
          </aside>
        )}

        <div className="gn-plp-main">
          <div className="gn-plp-toolbar">
            {asBool(s.show_filters, true) && (
              <button
                type="button"
                className="gn-btn gn-btn-outline gn-plp-filter-btn"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <IconFilter size={16} />
                {t("plp.filters", "Filters")}
                {activeFilterCount(filters) > 0 && ` (${activeFilterCount(filters)})`}
              </button>
            )}

            {asBool(s.show_count, true) && (
              <p className="gn-plp-count gn-label">
                {t("plp.count", "{{n}} products").replace("{{n}}", String(results.length))}
              </p>
            )}

            {asBool(s.show_sort, true) && (
              <label className="gn-plp-sort">
                <span className="gn-label">{t("plp.sort_by", "Sort by:")}</span>
                <select
                  className="gn-select"
                  // The wrapping <label>'s only text is a span that CSS hides
                  // under 900px, so the implicit label contributes nothing and
                  // the control is nameless on mobile. An explicit aria-label
                  // is viewport-independent.
                  aria-label={t("plp.sort_by", "Sort by:")}
                  value={filters.sort}
                  onChange={(e) => set({ sort: e.target.value as SortKey })}
                >
                  {SORTS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {t(o.label, o.fallback)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {poolExhausted && asBool(s.show_filters, true) && (
            <p className="gn-formnote gn-plp-note">
              {t(
                "plp.too_many_to_filter",
                "This collection is too large to filter on this page — browse or search instead.",
              )}
            </p>
          )}

          <div
            className="gn-grid"
            style={{ ["--gn-grid-cols" as string]: String(columns) }}
          >
            {loading && products.length === 0
              ? Array.from({ length: columns * 2 }, (_, i) => <ProductCardSkeleton key={i} />)
              : results.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    locale={locale}
                    showQuickAdd={asBool(s.show_quick_add, true)}
                    onQuickAdd={quickAdd.open}
                    // The first row is above the fold on most viewports.
                    eager={i < columns}
                  />
                ))}
          </div>

          {!loading && results.length === 0 && (
            <div className="gn-empty">
              <p className="gn-empty-title">{t("plp.empty", "Nothing matches those filters")}</p>
              <button
                type="button"
                className="gn-btn gn-btn-outline"
                onClick={() => set({ ...EMPTY_FILTERS, sort: filters.sort })}
              >
                {t("plp.clear", "Clear filters")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: the rail becomes a bottom sheet with an explicit Apply, so a
          shopper on a phone isn't re-filtering the grid under their thumb on
          every tap. */}
      {mobileFiltersOpen && (
        <>
          <div
            className="gn-sheet-scrim is-open"
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={sheetRef}
            className="gn-sheet is-open"
            role="dialog"
            aria-modal="true"
            aria-label={t("plp.filters", "Filters")}
          >
            <div className="gn-sheet-head">
              <span className="gn-label">{t("plp.filters", "Filters")}</span>
              <button
                type="button"
                className="gn-icon-btn"
                aria-label={t("general.close", "Close")}
                onClick={() => setMobileFiltersOpen(false)}
              >
                <IconClose />
              </button>
            </div>
            <div className="gn-sheet-body">{filterPanel}</div>
            <button
              type="button"
              className="gn-btn gn-btn-primary gn-sheet-cta"
              onClick={() => setMobileFiltersOpen(false)}
            >
              {t("plp.apply", "Show {{n}} products").replace("{{n}}", String(results.length))}
            </button>
          </div>
        </>
      )}

      {quickAdd.product && <QuickAddSheet product={quickAdd.product} onClose={quickAdd.close} />}
      <span className={cx("gn-sr-only")} aria-live="polite">
        {t("plp.count", "{{n}} products").replace("{{n}}", String(results.length))}
      </span>
    </section>
  );
}
