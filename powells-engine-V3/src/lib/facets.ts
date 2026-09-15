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
import { asArray, asRecord, asString } from "@numueg/theme-kit";
import { bookFormat, productAuthor } from "./shared";

export type FacetSource = "category" | "product_type" | "option" | "price" | "brand" | "tag";

export interface FacetRow {
  id: string;
  label: string;
  source: FacetSource;
  /** Which option axis, when `source` is "option". */
  optionName?: string;
  /** The bands this row was built with, when `source` is "price". */
  bands?: PriceBand[];
  values: Array<{ value: string; count: number }>;
}

type PriceBand = [label: string, from: number, below: number];

/** A product's own price, whether the payload shipped it as a number or a string. */
function priceOf(product: Product): number {
  const n = Number((product as unknown as Record<string, unknown>).price);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Price bands drawn from the books on the shelf.
 *
 * Fixed "under 10 / 10–20 / 20–50" bands were written for a dollar shop. In a
 * riyal or pound catalogue every book lands in the top band, the row has one
 * value, and a one-value row is dropped — so the price filter simply vanished.
 * A shelf with a handful of distinct prices gets one band per price; a wider
 * spread is split at its quartiles, rounded to a clean figure. Either way the
 * bands divide the books actually on the page.
 */
export function priceBands(products: Product[]): PriceBand[] {
  const distinct = [...new Set(products.map(priceOf).filter((n) => n > 0))].sort((a, b) => a - b);
  if (distinct.length === 0) return [];
  if (distinct.length <= 6) {
    return distinct.map((price, i): PriceBand => [
      String(price),
      price,
      distinct[i + 1] ?? Number.POSITIVE_INFINITY,
    ]);
  }
  const clean = (n: number) => {
    const step = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / step) * step;
  };
  const edges = [...new Set([0.25, 0.5, 0.75].map((q) => clean(distinct[Math.floor(q * (distinct.length - 1))])))];
  const bands: PriceBand[] = [];
  let from = 0;
  for (const edge of edges) {
    if (edge <= from) continue;
    bands.push([from === 0 ? `Under ${edge}` : `${from} – ${edge}`, from, edge]);
    from = edge;
  }
  bands.push([`${from} and over`, from, Number.POSITIVE_INFINITY]);
  return bands;
}

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
  bands?: PriceBand[],
): string[] {
  const p = product as unknown as Record<string, unknown>;
  switch (source) {
    case "category": {
      // A catalogue imported from a spreadsheet often carries its category as
      // the genre tag and never gets a platform category at all, which left
      // the Category row empty and dropped. The first tag is that genre.
      const name =
        asString(asRecord(p.category).name) || asString(p.category_name) || asString(asArray(p.tags)[0]);
      return name ? [name] : [];
    }
    case "product_type": {
      const value = bookFormat(product);
      return value ? [value] : [];
    }
    case "brand": {
      const value = productAuthor(product);
      return value ? [value] : [];
    }
    case "tag":
      return asArray(p.tags).map((tag) => asString(tag)).filter(Boolean);
    case "option": {
      if (!optionName) return [];
      return axesOf(product)[optionName.toLowerCase()] ?? [];
    }
    case "price": {
      const price = priceOf(product);
      const band = (bands ?? []).find(([, from, below]) => price >= from && price < below);
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
  const bands = priceBands(products);
  return rows
    .map((row) => {
      const counts: Record<string, number> = {};
      for (const product of products) {
        for (const value of valuesFor(product, row.source, row.optionName, bands)) {
          counts[value] = (counts[value] ?? 0) + 1;
        }
      }
      const values = Object.entries(counts).map(([value, count]) => ({ value, count }));
      // Price bands keep their ascending order; everything else is
      // most-common-first, which is what makes a long author list usable.
      if (row.source === "price") {
        values.sort(
          (a, b) => bands.findIndex(([l]) => l === a.value) - bands.findIndex(([l]) => l === b.value),
        );
      } else {
        values.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
      }
      return { ...row, bands, values };
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
    return valuesFor(product, row.source, row.optionName, row.bands).some((v) => wanted.includes(v));
  });
}
