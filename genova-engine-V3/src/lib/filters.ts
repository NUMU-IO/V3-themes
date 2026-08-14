/**
 * Client-side PLP filtering and sorting (decision D3).
 *
 * WHY CLIENT-SIDE — verified against the API: `GET /storefront/store/{id}/products`
 * accepts only `category_id`, `page`, `limit`, `search` and `fields`. There is
 * no sort parameter, no price range, no in-stock flag and no attribute facets.
 * Nothing here is a preference; the server simply cannot do it yet.
 *
 * THE HONEST LIMIT — a client-side filter can only see the products it has
 * fetched. Past `poolSize` the facets would silently lie ("3 results" when the
 * catalogue holds 30), so the caller disables them and says so rather than
 * showing a confidently wrong count. Backend facets are a separate ticket.
 */

import type { Product } from "@numueg/theme-sdk";

export type SortKey = "featured" | "best-selling" | "a-z" | "z-a" | "price-asc" | "price-desc" | "newest";

export interface FilterState {
  inStockOnly: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  sizes: string[];
  sort: SortKey;
}

export const EMPTY_FILTERS: FilterState = {
  inStockOnly: false,
  minPrice: null,
  maxPrice: null,
  sizes: [],
  sort: "featured",
};

const SIZE_AXIS = /size|مقاس/i;

/** Every size value present in the pool, in the catalogue's own order. */
export function sizeFacet(products: Product[]): string[] {
  const seen: string[] = [];
  for (const p of products) {
    for (const axis of p.options ?? []) {
      if (!SIZE_AXIS.test(axis.name)) continue;
      for (const v of axis.values) if (!seen.includes(v)) seen.push(v);
    }
  }
  // Numeric sizes (waist 26–34, shoe 41–45) must sort numerically; lettered
  // ones keep catalogue order, which is already S→M→L→XL.
  const allNumeric = seen.every((v) => /^\d+(\.\d+)?$/.test(v.trim()));
  return allNumeric ? [...seen].sort((a, b) => Number(a) - Number(b)) : seen;
}

/** Price bounds across the pool, rounded outwards to whole units. */
export function priceBounds(products: Product[]): { min: number; max: number } {
  if (products.length === 0) return { min: 0, max: 0 };
  let min = Infinity;
  let max = 0;
  for (const p of products) {
    if (typeof p.price !== "number") continue;
    min = Math.min(min, p.price);
    max = Math.max(max, p.price);
  }
  if (!Number.isFinite(min)) return { min: 0, max: 0 };
  return { min: Math.floor(min), max: Math.ceil(max) };
}

function hasSize(product: Product, wanted: string[]): boolean {
  if (wanted.length === 0) return true;
  for (const axis of product.options ?? []) {
    if (!SIZE_AXIS.test(axis.name)) continue;
    if (axis.values.some((v) => wanted.includes(v))) return true;
  }
  // A product with no size axis is not "size L" — excluding it is correct once
  // the shopper has asked for a specific size.
  return false;
}

export function applyFilters(products: Product[], f: FilterState): Product[] {
  const out = products.filter((p) => {
    if (f.inStockOnly && p.in_stock === false) return false;
    if (f.minPrice !== null && p.price < f.minPrice) return false;
    if (f.maxPrice !== null && p.price > f.maxPrice) return false;
    if (!hasSize(p, f.sizes)) return false;
    return true;
  });
  return sortProducts(out, f.sort);
}

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  // Never sort in place — the input is the memoised page payload, and mutating
  // it reorders the caller's data permanently.
  const list = [...products];
  switch (sort) {
    case "a-z":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "z-a":
      return list.sort((a, b) => b.name.localeCompare(a.name));
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "newest":
      // No `created_at` on the storefront Product, so the catalogue's own order
      // is the best proxy — the API returns newest-first on the default sort.
      return list;
    case "best-selling":
      // Likewise unavailable client-side. Keeping catalogue order is honest;
      // inventing a proxy (lowest stock = best seller) would be a guess
      // dressed up as data.
      return list;
    case "featured":
    default:
      return list;
  }
}

export function activeFilterCount(f: FilterState): number {
  return (
    (f.inStockOnly ? 1 : 0) +
    (f.minPrice !== null || f.maxPrice !== null ? 1 : 0) +
    f.sizes.length
  );
}
