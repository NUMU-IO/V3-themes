/**
 * Teen — the shared listing UI: toolbar, filter sheet, grid, load-more.
 *
 * Used by `tn-collection` (which serves both `/collections/<slug>` and the
 * unscoped `/products`) and by `tn-search`. One implementation, because the two
 * pages drift apart the moment they are written twice — on Genova the PLP
 * filter sheet had neither Escape-to-close nor a scroll lock while the quick-add
 * sheet had both, so on a phone the page scrolled behind an "open" modal that
 * `aria-modal="true"` had already promised assistive tech was modal.
 *
 * ## Filters apply live; "Apply" closes
 *
 * The plan sketched a draft-then-Apply sheet. Built live instead, and the
 * footer button reads **"Show 12 results"**: the count is then always the truth
 * about what is behind the sheet, and a shopper cannot lose a selection by
 * dismissing the panel. It is also what the mobile grid needs — the sheet
 * covers the grid, so the only feedback available IS that number.
 *
 * ## No viewport hook in the toolbar
 *
 * The desktop toolbar says "Filter" with a separate sort dropdown; the ≤749
 * toolbar says "Filter and sort" and folds the sort INTO the sheet. Both labels
 * are in the markup and CSS picks one. Doing it with `useIsMobile()` would cost
 * a client-only settle — the server would render "Filter and sort", the first
 * paint would agree, and the label would then flip on hydration. `display:none`
 * also removes the unused label from the accessibility tree, so a screen reader
 * gets exactly one.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { type Product } from "@numueg/theme-sdk";
import { cx, useFocusTrap, useOverlayBehaviour } from "./shared";
import { useT, type TFunction } from "./i18n";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import { QuickAddSheet, useQuickAdd } from "./quick-add";
import { IconClose, IconFilter } from "./icons";
import {
  activeFilterCount,
  type FacetGroup,
  type FilterState,
  type SortId,
} from "./filters";

/* ═════════════════════════════════════════════════════════════════════════
   Wording
   ═════════════════════════════════════════════════════════════════════════ */

/** The nine sort labels, in the reference's own order. */
export function sortLabel(id: SortId, t: TFunction): string {
  switch (id) {
    case "featured":
      return t("sort.featured", "Featured");
    case "relevance":
      return t("sort.relevance", "Most relevant");
    case "best":
      return t("sort.best", "Best selling");
    case "az":
      return t("sort.az", "Alphabetically, A–Z");
    case "za":
      return t("sort.za", "Alphabetically, Z–A");
    case "price-asc":
      return t("sort.price_asc", "Price, low to high");
    case "price-desc":
      return t("sort.price_desc", "Price, high to low");
    case "date-asc":
      return t("sort.date_asc", "Date, old to new");
    case "date-desc":
      return t("sort.date_desc", "Date, new to old");
  }
}

/** "(6 products)" / "(1 product)" — the count beside the Filter button. */
export function productCountLabel(n: number, t: TFunction): string {
  const template =
    n === 1 ? t("plp.count_one", "({{n}} product)") : t("plp.count_other", "({{n}} products)");
  return template.replace("{{n}}", String(n));
}

/* ═════════════════════════════════════════════════════════════════════════
   Toolbar
   ═════════════════════════════════════════════════════════════════════════ */

export interface PlpToolbarProps {
  count: number;
  sort: SortId;
  sorts: SortId[];
  onSort: (id: SortId) => void;
  onOpenFilters: () => void;
  filters: FilterState;
  showFilters: boolean;
  showSort: boolean;
  sheetId: string;
  sheetOpen: boolean;
}

export function PlpToolbar({
  count,
  sort,
  sorts,
  onSort,
  onOpenFilters,
  filters,
  showFilters,
  showSort,
  sheetId,
  sheetOpen,
}: PlpToolbarProps) {
  const t = useT();
  const selectId = useId();
  const active = activeFilterCount(filters);

  return (
    <div className="tn-plp-toolbar">
      {showFilters && (
        <button
          type="button"
          className="tn-filter-btn"
          onClick={onOpenFilters}
          aria-expanded={sheetOpen}
          aria-controls={sheetId}
        >
          <span className="tn-filter-icon" aria-hidden="true">
            <IconFilter size={16} />
          </span>
          {/* One of these two is display:none at any width — see the header
              comment. Never both, never a JS-settled label. */}
          <span className="tn-only-wide">{t("plp.filter", "Filter")}</span>
          <span className="tn-only-narrow">{t("plp.filter_and_sort", "Filter and sort")}</span>
          {active > 0 && (
            <span className="tn-filter-count">
              {active}
              <span className="tn-sr">{` ${t("plp.filters_active", "filters applied")}`}</span>
            </span>
          )}
        </button>
      )}

      {/* aria-live so a screen-reader user hears the grid change size when a
          filter is toggled — the visual count updating is the only feedback a
          sighted user needs, and this is its equivalent. */}
      <span className="tn-plp-count" role="status" aria-live="polite">
        {productCountLabel(count, t)}
      </span>

      {showSort && sorts.length > 1 && (
        <div className="tn-plp-sort">
          <label className="tn-plp-sortlabel" htmlFor={selectId}>
            {t("plp.sort_by", "Sort by:")}
          </label>
          <select
            id={selectId}
            className="tn-select"
            value={sort}
            onChange={(e) => onSort(e.target.value as SortId)}
          >
            {sorts.map((id) => (
              <option key={id} value={id}>
                {sortLabel(id, t)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Filter sheet
   ═════════════════════════════════════════════════════════════════════════ */

export interface FilterSheetProps {
  id: string;
  groups: FacetGroup[];
  bounds: { min: number; max: number } | null;
  state: FilterState;
  onChange: (next: FilterState) => void;
  onClear: () => void;
  onClose: () => void;
  resultCount: number;
  /** Mobile folds sort into the sheet; pass the options to render it. */
  sort: SortId;
  sorts: SortId[];
  onSort: (id: SortId) => void;
  showSort: boolean;
  currency?: string;
}

export function FilterSheet({
  id,
  groups,
  bounds,
  state,
  onChange,
  onClear,
  onClose,
  resultCount,
  sort,
  sorts,
  onSort,
  showSort,
}: FilterSheetProps) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const sortName = useId();

  useFocusTrap(true, panelRef);
  useOverlayBehaviour(true, onClose);

  const toggle = (key: "availability" | "colors" | "sizes" | "collections", value: string) => {
    const current = state[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...state, [key]: next });
  };

  const keyFor = (groupId: FacetGroup["id"]): "availability" | "colors" | "sizes" | "collections" =>
    groupId === "color"
      ? "colors"
      : groupId === "size"
        ? "sizes"
        : groupId === "collection"
          ? "collections"
          : "availability";

  // A blank field is "no bound", not zero. Parsing "" as 0 turns an emptied
  // maximum into "at most LE 0" and empties the grid.
  const readBound = (raw: string): number | null => {
    const v = raw.trim();
    if (v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const active = activeFilterCount(state);

  return (
    <>
      <div className="tn-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        id={id}
        className="tn-sheet tn-filter-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="tn-sheet-head">
          <span className="tn-label" id={titleId}>
            {t("plp.filter_and_sort", "Filter and sort")}
          </span>
          <div className="tn-filter-headtools">
            {active > 0 && (
              <button type="button" className="tn-textlink tn-filter-clear" onClick={onClear}>
                {t("plp.clear_all", "Clear all")}
              </button>
            )}
            <button
              type="button"
              className="tn-icon-btn"
              aria-label={t("common.close", "Close")}
              onClick={onClose}
            >
              <IconClose />
            </button>
          </div>
        </div>

        <div className="tn-sheet-body">
          {/* Sort lives here only ≤749px, where the toolbar has no room for a
              dropdown. Hidden by CSS above that, not unmounted, so the sheet
              markup is identical at every width. */}
          {showSort && sorts.length > 1 && (
            <fieldset className="tn-facet tn-facet-sort">
              <legend className="tn-facet-legend">{t("plp.sort_by", "Sort by:")}</legend>
              <div className="tn-facet-values">
                {sorts.map((id2) => (
                  <label key={id2} className="tn-facet-row">
                    <input
                      type="radio"
                      name={sortName}
                      value={id2}
                      checked={sort === id2}
                      onChange={() => onSort(id2)}
                    />
                    <span className="tn-facet-name">{sortLabel(id2, t)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {groups.map((group) => {
            const key = keyFor(group.id);
            return (
              <fieldset key={group.id} className="tn-facet">
                <legend className="tn-facet-legend">{group.label}</legend>
                <div className={cx("tn-facet-values", group.kind === "swatch" && "is-swatch")}>
                  {group.values.map((v) => {
                    const checked = state[key].includes(v.value);
                    // Zero-count values stay visible so the shopper can see the
                    // axis exists, but cannot be selected into an empty grid.
                    const disabled = v.count === 0 && !checked;
                    return (
                      <label
                        key={v.value}
                        className={cx("tn-facet-row", disabled && "is-disabled")}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(key, v.value)}
                        />
                        {group.kind === "swatch" && (
                          <span
                            className={cx("tn-swatch", !v.hex && !v.image && "is-unknown")}
                            style={
                              v.image
                                ? { backgroundImage: `url(${v.image})` }
                                : v.hex
                                  ? { background: v.hex }
                                  : undefined
                            }
                            aria-hidden="true"
                          />
                        )}
                        <span className="tn-facet-name">{v.label}</span>
                        <span className="tn-facet-count">{v.count}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          {/* On sale is one boolean, not a facet group — it is derived from the
              price pair rather than read off an axis. */}
          <fieldset className="tn-facet">
            <legend className="tn-facet-legend">{t("plp.offers", "Offers")}</legend>
            <div className="tn-facet-values">
              <label className="tn-facet-row">
                <input
                  type="checkbox"
                  checked={state.onSale}
                  onChange={() => onChange({ ...state, onSale: !state.onSale })}
                />
                <span className="tn-facet-name">{t("plp.on_sale_only", "On sale only")}</span>
              </label>
            </div>
          </fieldset>

          {bounds && (
            <fieldset className="tn-facet">
              <legend className="tn-facet-legend">{t("plp.price", "Price")}</legend>
              <div className="tn-price-range">
                <label className="tn-price-field">
                  <span className="tn-facet-name">{t("plp.price_from", "From")}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="tn-input"
                    min={bounds.min}
                    max={bounds.max}
                    placeholder={String(bounds.min)}
                    value={state.priceMin ?? ""}
                    onChange={(e) => onChange({ ...state, priceMin: readBound(e.target.value) })}
                  />
                </label>
                <label className="tn-price-field">
                  <span className="tn-facet-name">{t("plp.price_to", "To")}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="tn-input"
                    min={bounds.min}
                    max={bounds.max}
                    placeholder={String(bounds.max)}
                    value={state.priceMax ?? ""}
                    onChange={(e) => onChange({ ...state, priceMax: readBound(e.target.value) })}
                  />
                </label>
              </div>
            </fieldset>
          )}
        </div>

        <button type="button" className="tn-btn tn-btn-dark tn-sheet-cta" onClick={onClose}>
          {t("plp.show_results", "Show {{n}} results").replace("{{n}}", String(resultCount))}
        </button>
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Grid
   ═════════════════════════════════════════════════════════════════════════ */

export interface ProductGridProps {
  products: Product[];
  locale?: string;
  columnsDesktop?: number;
  pageSize?: number;
  showQuickAdd?: boolean;
  showSwatches?: boolean;
  loading?: boolean;
  /**
   * Changing this resets paging back to the first page. Pass a signature of
   * the current sort + filters: a shopper who filters after loading four pages
   * should see the top of the new result set, not page four of it.
   */
  resetKey?: string;
  /** Rendered instead of the grid when there is nothing to show. */
  empty?: React.ReactNode;
  /** Listing grids sit under the page <h1>, so their cards are <h2>. */
  headingLevel?: 2 | 3;
  /**
   * The pool is a truncated view of the catalogue. Renders an honest note in
   * place of a "Load more" that cannot load more — the host's `/api/products`
   * accepts neither `page` nor `category_id`, so there is nothing to fetch.
   */
  capped?: boolean;
}

export function ProductGrid({
  products,
  locale,
  columnsDesktop = 4,
  pageSize = 16,
  showQuickAdd = true,
  showSwatches = true,
  loading = false,
  resetKey = "",
  empty,
  capped = false,
  headingLevel = 2,
}: ProductGridProps) {
  const t = useT();
  const quickAdd = useQuickAdd();
  const [shown, setShown] = useState(pageSize);

  useEffect(() => {
    setShown(pageSize);
  }, [resetKey, pageSize]);

  const visible = useMemo(() => products.slice(0, shown), [products, shown]);
  const remaining = products.length - visible.length;

  if (loading && products.length === 0) {
    return (
      <div
        className="tn-grid tn-plp-grid"
        /* Tablet takes the SAME count as desktop: the reference's 893px
           capture shows four cards, so the catalog grid goes 2 → 4 at 750px
           and does not use the 3-column middle step the home rails do. */
        style={
          {
            "--tn-cols-tablet": columnsDesktop,
            "--tn-cols-desktop": columnsDesktop,
          } as React.CSSProperties
        }
      >
        {Array.from({ length: Math.min(pageSize, 8) }, (_, i) => (
          <ProductCardSkeleton key={`sk-${i}`} />
        ))}
      </div>
    );
  }

  if (products.length === 0) return <>{empty ?? null}</>;

  return (
    <>
      <div
        className="tn-grid tn-plp-grid"
        /* Tablet takes the SAME count as desktop: the reference's 893px
           capture shows four cards, so the catalog grid goes 2 → 4 at 750px
           and does not use the 3-column middle step the home rails do. */
        style={
          {
            "--tn-cols-tablet": columnsDesktop,
            "--tn-cols-desktop": columnsDesktop,
          } as React.CSSProperties
        }
      >
        {visible.map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            locale={locale}
            showQuickAdd={showQuickAdd}
            showSwatches={showSwatches}
            onQuickAdd={quickAdd.open}
            headingLevel={headingLevel}
            /* Only the first row is above the fold. */
            eager={i < columnsDesktop}
          />
        ))}
      </div>

      {remaining > 0 ? (
        <div className="tn-plp-more">
          <button
            type="button"
            className="tn-btn tn-btn-outline"
            onClick={() => setShown((n) => n + pageSize)}
          >
            {t("plp.load_more", "Load more")}
          </button>
          <p className="tn-plp-progress" role="status" aria-live="polite">
            {t("plp.showing", "Showing {{shown}} of {{total}}")
              .replace("{{shown}}", String(visible.length))
              .replace("{{total}}", String(products.length))}
          </p>
        </div>
      ) : capped ? (
        <div className="tn-plp-more">
          <p className="tn-plp-progress">
            {t("plp.capped", "Showing the first {{n}} products.").replace(
              "{{n}}",
              String(products.length),
            )}
          </p>
        </div>
      ) : null}

      {quickAdd.product && <QuickAddSheet product={quickAdd.product} onClose={quickAdd.close} />}
    </>
  );
}

/** The bordered "nothing here" card, shared by every listing. */
export function PlpEmpty({
  title,
  body,
  onClear,
  clearLabel,
}: {
  title: string;
  body: string;
  onClear?: () => void;
  clearLabel?: string;
}) {
  return (
    <div className="tn-plp-empty tn-card">
      <p className="tn-plp-empty-title">{title}</p>
      <p className="tn-footer-text">{body}</p>
      {onClear && clearLabel && (
        <button type="button" className="tn-btn tn-btn-outline" onClick={onClear}>
          {clearLabel}
        </button>
      )}
    </div>
  );
}
