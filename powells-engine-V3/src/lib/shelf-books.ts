/**
 * The books a home shelf shows.
 *
 * A shelf set to one collection asks the server for that collection's books.
 * Choosing them from the page's own product list only works while a catalogue
 * is small: the home page ships a few hundred books, the same slice for every
 * shelf, and on a catalogue of thousands a genre missing from that slice had
 * nothing of its own to show. The collection is matched by id, slug or name,
 * so a merchant can type "Fantasy"; a parent category brings its subcategories'
 * books with it, because the server walks the category tree.
 *
 * A hand-picked list ("books") is resolved title by title through the detail
 * route, in the order the merchant wrote it — that is the whole point of a
 * curated shelf.
 *
 * Everything else — newest, reduced, cheapest, under a price, or a name that
 * matches no platform category (a genre kept only as a tag) — is chosen from
 * the page's list as before. While a collection's books are loading, the shelf
 * shows the page's exact matches for it rather than nothing.
 */

import { useCachedResource, useCollections, useShop, type Product } from "@numueg/theme-sdk";
import { asArray, asRecord } from "./shared";
import { normalizeListingProduct } from "./more-products";
import { pickBooks, type BookSource } from "./pick-books";
import { fetchProductDetail } from "./product-detail";

export const slugOf = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** "the-risk, Sidetracked\nScarlet Angel" → handles, in the order written. */
export const bookList = (text: string): string[] =>
  text
    .split(/[\n,]+/)
    .map((entry) => slugOf(entry))
    .filter(Boolean);

export function useBooksByHandle(handles: string[]): Product[] {
  const { data } = useCachedResource<Product[]>(
    handles.length > 0 ? `pw-books:${handles.join("|")}` : null,
    async () => {
      const found = await Promise.all(handles.map((handle) => fetchProductDetail(handle)));
      return found.filter((product): product is Product => Boolean(product));
    },
  );
  return data ?? [];
}

export function useShelfBooks(
  pool: Product[],
  source: BookSource,
  collection: string,
  limit: number,
  options: { maxPrice?: number; books?: string } = {},
): Product[] {
  const shop = useShop();
  const wanted = collection.trim();
  const byCollection = source === "collection" && wanted.length > 0;
  const { collections } = useCollections({ fetchIfMissing: byCollection });
  const picked = useBooksByHandle(source === "books" ? bookList(options.books ?? "") : []);

  const lowered = wanted.toLowerCase();
  const category = byCollection
    ? collections.find((c) => c.id === wanted || c.slug === slugOf(wanted) || c.name.toLowerCase() === lowered)
    : undefined;
  const categoryId = category?.id ?? "";
  const storeId = String(shop?.id ?? "");

  const { data } = useCachedResource<Product[]>(
    categoryId && storeId ? `pw-shelf:${storeId}:${categoryId}:${limit}` : null,
    async (signal) => {
      const res = await fetch(
        `/api/products?store_id=${encodeURIComponent(storeId)}&category_id=${encodeURIComponent(categoryId)}&limit=${limit}`,
        { signal },
      );
      if (!res.ok) return [];
      const body = asRecord(await res.json());
      const inner = asRecord(body.data ?? body);
      return asArray(inner.items ?? body.data).map(normalizeListingProduct);
    },
  );

  if (source === "books") return picked.slice(0, limit);
  if (category && data) return data.slice(0, limit);
  return pickBooks(pool, source, collection, limit, options.maxPrice ?? 0);
}
