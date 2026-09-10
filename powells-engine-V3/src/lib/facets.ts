/**
 * Filter rows for the shelf rail.
 *
 * ## Why the rows are merchant-declared and the VALUES are derived
 *
 * The reference rail is a fixed list of labels — Category, Product Type,
 * Format, Price and so on — and a shopper reads that list as a promise about
 * how the shop is organised. So the LABELS are blocks the merchant controls,
 * in the order they choose.
 *
 * The values under each label are computed from the products actually on the
 * page. NUMU exposes no facet-count endpoint to themes, so the alternative is
 * inventing counts that disagree with the grid as soon as a second page loads.
 * Faceting what is on screen means every number matches something the shopper
 * can see.
 *
 * A row whose source yields nothing is dropped rather than rendered empty: an
 * always-present row that never opens is worse than an absent one, because it
 * tells the shopper the shop records something it does not.
 */

import type { Product } from "@numueg/theme-sdk";
import { asArray, asNumber, asRecord, asString } from "@numueg/theme-kit";

export type FacetSource = "category" | "product_type" | "option" | "price" | "brand" | "tag";

export interface FacetRow {
  id: string;
  label: string;
  source: FacetSource;
  /** Which option axis, when `source` is "option". */
  optionName?: string;
  values: Array<{ value: string; count: number }>;
}

/** Price bands, in the store's own units. Open-ended at the top. */
const PRICE_BANDS: Array<[string, number, number]> = [
  ["Under 10", 0, 10],
  ["10 – 20", 10, 20],
  ["20 – 50", 20, 50],
  ["50 and over", 50, Number.POSITIVE_INFINITY],
];

/** Every option axis on a product, read from both shapes in the wild. */
export function axesOf(product: Product): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const add = (axis: string, value: unknown) => {
    const v = asString(value);
    if (!axis || !v) return;
    const key = axis.toLowerCase();
    out[key] = out[key] ?? [];
    if (!out[key].includes(v)) out[key].push(v);
  };
  const p = product as unknown as Record<string, unknown>;
  for (const variant of asArray(p.variants)) {
    const values = asRecord(asRecord(variant).option_values);
    for (const [axis, value] of Object.entries(values)) add(axis, value);
  }
  for (const option of asArray(p.options)) {
    const rec = asRecord(option);
    const axis = asString(rec.name);
    for (const value of asArray(rec.values)) add(axis, value);
  }
  return out;
}

/** The values a single product contributes to one facet source. */
export function valuesFor(
  product: Product,
  source: FacetSource,
  optionName?: string,
): string[] {
  const p = product as unknown as Record<string, unknown>;
  switch (source) {
    case "category": {
      const name = asString(asRecord(p.category).name) || asString(p.category_name);
      return name ? [name] : [];
    }
    case "product_type": {
      const value = asString(p.product_type);
      return value ? [value] : [];
    }
    case "brand": {
      const value = asString(p.brand) || asString(p.vendor);
      return value ? [value] : [];
    }
    case "tag":
      return asArray(p.tags).map((tag) => asString(tag)).filter(Boolean);
    case "option": {
      if (!optionName) return [];
      return axesOf(product)[optionName.toLowerCase()] ?? [];
    }
    case "price": {
      const price = asNumber(p.price, 0);
      const band = PRICE_BANDS.find(([, lo, hi]) => price >= lo && price < hi);
      return band ? [band[0]] : [];
    }
    default:
      return [];
  }
}

/** Build the rail's rows: declared labels, derived values, empties dropped. */
export function buildFacets(
  products: Product[],
  rows: Array<{ id: string; label: string; source: FacetSource; optionName?: string }>,
): FacetRow[] {
  return rows
    .map((row) => {
      const counts: Record<string, number> = {};
      for (const product of products) {
        for (const value of valuesFor(product, row.source, row.optionName)) {
          counts[value] = (counts[value] ?? 0) + 1;
        }
      }
      const values = Object.entries(counts).map(([value, count]) => ({ value, count }));
      // Price bands keep their declared order; everything else is
      // most-common-first, which is what makes a long author list usable.
      if (row.source === "price") {
        values.sort(
          (a, b) =>
            PRICE_BANDS.findIndex(([l]) => l === a.value) -
            PRICE_BANDS.findIndex(([l]) => l === b.value),
        );
      } else {
        values.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
      }
      return { ...row, values };
    })
    // One value cannot narrow anything — it is a label, not a filter.
    .filter((row) => row.values.length > 1);
}

/** Does a product satisfy every active row? AND across rows, OR within one. */
export function matchesFilters(
  product: Product,
  rows: FacetRow[],
  selected: Record<string, string[]>,
): boolean {
  return rows.every((row) => {
    const wanted = selected[row.id] ?? [];
    if (wanted.length === 0) return true;
    return valuesFor(product, row.source, row.optionName).some((v) => wanted.includes(v));
  });
}
