/**
 * Choose the books for a home-page row from the store's product list.
 *
 * Shared by the shelf rail and the books-plus-banner section so both read
 * "newest", "reduced", "cheapest" and "one collection" the same way.
 *
 * A collection handle that matches nothing returns nothing. It used to fall
 * back to every book, meant as forgiveness for a typo — but on a real store a
 * genre simply missing from the page's slice of the catalogue produced four
 * shelves titled Romance, Classics, Literary fiction and Best prices showing the
 * same three books. An absent shelf is honest; a mislabelled one is not.
 */

import type { Product } from "@numueg/theme-sdk";

export type BookSource = "newest" | "sale" | "cheapest" | "collection" | "under" | "books" | "recent";

export function pickBooks(
  products: Product[],
  source: BookSource,
  collection: string,
  limit: number,
  maxPrice = 0,
): Product[] {
  const withMeta = products as Array<Product & Record<string, unknown>>;
  const handle = collection.toLowerCase();
  let list = withMeta;

  if (source === "collection" && handle) {
    // A genre tag counts as the collection too: a catalogue imported from a
    // spreadsheet carries its categories as tags and has no platform category
    // for a shelf to name.
    list = withMeta.filter((p) => {
      const category = (p.category ?? {}) as Record<string, unknown>;
      const tags = Array.isArray(p.tags) ? p.tags.map((tag) => String(tag).toLowerCase()) : [];
      return (
        String(category.id ?? "").toLowerCase() === handle ||
        String(category.name ?? "").toLowerCase() === handle ||
        tags.includes(handle)
      );
    });
  }

  const copy = [...list];
  switch (source) {
    case "sale":
      return copy.filter((p) => Number(p.compare_at_price ?? 0) > Number(p.price ?? 0)).slice(0, limit);
    case "cheapest":
      return copy.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0)).slice(0, limit);
    case "under":
      return copy
        .filter((p) => maxPrice > 0 && Number(p.price ?? 0) > 0 && Number(p.price) < maxPrice)
        .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
        .slice(0, limit);
    case "newest":
      return copy
        .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
        .slice(0, limit);
    default:
      return copy.slice(0, limit);
  }
}
