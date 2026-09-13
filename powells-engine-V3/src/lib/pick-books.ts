/**
 * Choose the books for a home-page row from the store's product list.
 *
 * Shared by the shelf rail and the books-plus-banner section so both read
 * "newest", "reduced", "cheapest" and "one collection" the same way. A
 * collection handle that matches nothing falls back to everything: a merchant
 * mistyping a collection name should see books, not a hole in the home page.
 */

import type { Product } from "@numueg/theme-sdk";

export type BookSource = "newest" | "sale" | "cheapest" | "collection";

export function pickBooks(products: Product[], source: BookSource, collection: string, limit: number): Product[] {
  const withMeta = products as Array<Product & Record<string, unknown>>;
  const handle = collection.toLowerCase();
  let list = withMeta;

  if (source === "collection" && handle) {
    list = withMeta.filter((p) => {
      const category = (p.category ?? {}) as Record<string, unknown>;
      return (
        String(category.id ?? "").toLowerCase() === handle ||
        String(category.name ?? "").toLowerCase() === handle
      );
    });
    if (list.length === 0) list = withMeta;
  }

  const copy = [...list];
  switch (source) {
    case "sale":
      return copy.filter((p) => Number(p.compare_at_price ?? 0) > Number(p.price ?? 0)).slice(0, limit);
    case "cheapest":
      return copy.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0)).slice(0, limit);
    case "newest":
      return copy
        .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
        .slice(0, limit);
    default:
      return copy.slice(0, limit);
  }
}
